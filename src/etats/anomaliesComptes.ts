// ===================== DETECTION D'ANOMALIES DE SOLDE =====================
// Le sens attendu d'un compte (debiteur/crediteur/mixte) est lu directement
// depuis le plan comptable SYSCOHADA charge par l'API /api/plan-comptable.
// Chacun des 1409 comptes du plan possede un champ `sens` officiel. On evite
// ainsi toute regle codee en dur qui derive du plan reel et provoque des
// faux positifs (ex: 6594 Charges provisionnees exploitation, 1309 Resultat
// perte pending, etc.).

import { BalanceLigne } from '../types';

export type SoldeAttendu = 'debiteur' | 'crediteur' | 'les_deux';

// Entree du plan comptable telle que retournee par l'API /api/plan-comptable
export interface PlanCompteEntry {
  numero: string;
  libelle: string;
  classe?: string | number;
  sens?: 'debiteur' | 'crediteur' | 'mixte';
}

// Map numero -> sens, construite une fois pour eviter de parser le plan a
// chaque appel de getSoldeAttendu.
export type PlanComptableSensMap = Map<string, SoldeAttendu>;

function normalizeSens(s: string | undefined): SoldeAttendu {
  if (s === 'debiteur') return 'debiteur';
  if (s === 'crediteur') return 'crediteur';
  return 'les_deux';
}

export function buildPlanComptableSensMap(plan: PlanCompteEntry[]): PlanComptableSensMap {
  const map = new Map<string, SoldeAttendu>();
  for (const c of plan) {
    if (c.numero) map.set(c.numero, normalizeSens(c.sens));
  }
  return map;
}

export interface AnomalieCompte {
  type: 'solde_inverse' | 'solde_residuel' | 'desequilibre';
  severity: 'error' | 'warning';
  message: string;
}

export interface AnomalieEquilibre {
  section: 'SI' | 'MVT' | 'SF';
  label: string;
  ecart: number;
}

export function detectDesequilibres(lignes: BalanceLigne[]): AnomalieEquilibre[] {
  const anomalies: AnomalieEquilibre[] = [];

  const totalSID = lignes.reduce((s, l) => s + (parseFloat(String(l.si_debit)) || 0), 0);
  const totalSIC = lignes.reduce((s, l) => s + (parseFloat(String(l.si_credit)) || 0), 0);
  const ecartSI = totalSID - totalSIC;
  if (Math.abs(ecartSI) >= 0.01) {
    anomalies.push({ section: 'SI', label: 'Soldes initiaux déséquilibrés', ecart: ecartSI });
  }

  const totalDebit = lignes.reduce((s, l) => s + (parseFloat(String(l.debit)) || 0), 0);
  const totalCredit = lignes.reduce((s, l) => s + (parseFloat(String(l.credit)) || 0), 0);
  const ecartMVT = totalDebit - totalCredit;
  if (Math.abs(ecartMVT) >= 0.01) {
    anomalies.push({ section: 'MVT', label: 'Mouvements déséquilibrés', ecart: ecartMVT });
  }

  const totalSD = lignes.reduce((s, l) => s + (parseFloat(String(l.solde_debiteur)) || 0), 0);
  const totalSC = lignes.reduce((s, l) => s + (parseFloat(String(l.solde_crediteur)) || 0), 0);
  const ecartSF = totalSD - totalSC;
  if (Math.abs(ecartSF) >= 0.01) {
    anomalies.push({ section: 'SF', label: 'Soldes finaux déséquilibrés', ecart: ecartSF });
  }

  return anomalies;
}

// Solde normal attendu par compte — resolu depuis le plan comptable officiel.
// On cherche le plus long prefixe du numero de compte qui existe dans le
// plan. Si aucun prefixe ne matche, on retourne 'les_deux' (ne flaggera rien)
// pour eviter les faux positifs sur des comptes analytiques non standards.
export function getSoldeAttendu(numero: string, plan?: PlanComptableSensMap): SoldeAttendu {
  if (!plan || plan.size === 0) return 'les_deux';
  const c = (numero || '').replace(/\s/g, '');
  if (!c) return 'les_deux';
  // Plus long prefixe match : on part du numero complet et on tronque
  // progressivement jusqu'a trouver un match (ou jusqu'a 1 caractere).
  for (let len = c.length; len >= 1; len--) {
    const sens = plan.get(c.substring(0, len));
    if (sens !== undefined) return sens;
  }
  return 'les_deux';
}

export function getLibelleSoldeAttendu(sa: SoldeAttendu): string {
  if (sa === 'debiteur') return 'Solde débiteur attendu';
  if (sa === 'crediteur') return 'Solde créditeur attendu';
  return 'Solde variable';
}

export function detectAnomalies(ligne: BalanceLigne, plan?: PlanComptableSensMap): AnomalieCompte[] {
  const anomalies: AnomalieCompte[] = [];
  const sd = parseFloat(String(ligne.solde_debiteur)) || 0;
  const sc = parseFloat(String(ligne.solde_crediteur)) || 0;
  const soldeAttendu = getSoldeAttendu(ligne.numero_compte, plan);

  // Solde inversé
  if (soldeAttendu === 'debiteur' && sc > 0.5 && sd < 0.5) {
    anomalies.push({
      type: 'solde_inverse',
      severity: 'error',
      message: 'Solde créditeur anormal — ce compte devrait avoir un solde débiteur',
    });
  }
  if (soldeAttendu === 'crediteur' && sd > 0.5 && sc < 0.5) {
    anomalies.push({
      type: 'solde_inverse',
      severity: 'error',
      message: 'Solde débiteur anormal — ce compte devrait avoir un solde créditeur',
    });
  }

  // Compte de gestion (6/7/8) avec solde initial = clôture N-1 incorrecte
  const siD = parseFloat(String(ligne.si_debit)) || 0;
  const siC = parseFloat(String(ligne.si_credit)) || 0;
  const c1 = ligne.numero_compte.charAt(0);
  if ((c1 === '6' || c1 === '7' || c1 === '8') && (siD > 0.5 || siC > 0.5)) {
    anomalies.push({
      type: 'solde_residuel',
      severity: 'warning',
      message: 'Compte de gestion avec solde initial — vérifier que l\'exercice précédent a été correctement clôturé',
    });
  }

  return anomalies;
}
