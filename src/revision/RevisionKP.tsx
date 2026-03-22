import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { KPLigne, ODEcriture, Suggestion } from './revisionTypes';
import ControleAffectation from './ControleAffectation';
import ControleReserveLegale from './ControleReserveLegale';
import ControleNiveauKP from './ControleNiveauKP';
import JournalOD from './JournalOD';

interface RevisionKPProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

const TRAVAUX_KP = [
  'Dresser un tableau de mouvement des capitaux propres (voir Contrôle 1 ci-dessous)',
  'Vérifier la conformité du capital social avec les statuts de la société',
  'Préparer le procès-verbal de l\'assemblée générale N-1 et vérifier la cohérence avec la variation des capitaux propres',
  'Vérifier les virements bancaires justifiant les apports en capital',
  'Vérifier le traitement fiscal des dividendes payés et préparer les justificatifs (relevés bancaires)',
  'Vérifier le niveau des réserves obligatoires (réserve légale Art. 346 OHADA)',
  'Justifier la prime d\'émission si applicable (décisions AG, protocoles de fusion/apport)',
  'Vérifier la cohérence capital par dotation / fonds de dotation reçus si entreprise publique (décret, arrêté, lettre officielle)',
  'Vérifier que le compte de l\'exploitant (104) est soldé à la clôture si entreprise individuelle',
  'Analyser l\'écart de réévaluation si applicable (évaluation des actifs à la date de réévaluation)',
];

function RevisionKP({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionKPProps): React.ReactElement {
  const [lignes, setLignes] = useState<KPLigne[]>([]);
  const [saved, setSaved] = useState<boolean>(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState<number>(1);
  const [showTravaux, setShowTravaux] = useState<boolean>(true);

  // --- Construction des lignes KP ---
  useEffect(() => {
    const kpLignes: KPLigne[] = [];
    const comptesVus = new Set<string>();

    for (const bl of balanceN) {
      const prefix3 = bl.numero_compte.substring(0, 3);
      const isKP = prefix3 >= '100' && prefix3 <= '139';
      if (!isKP) continue;
      if (comptesVus.has(bl.numero_compte)) continue;
      comptesVus.add(bl.numero_compte);

      const soldeNBal = (parseFloat(String(bl.solde_crediteur)) || 0) - (parseFloat(String(bl.solde_debiteur)) || 0);
      const soldeN1 = (parseFloat(String(bl.si_credit ?? 0)) || 0) - (parseFloat(String(bl.si_debit ?? 0)) || 0);

      kpLignes.push({ compte: bl.numero_compte, designation: bl.libelle_compte, soldeN1, affectation: 0, dividendes: 0, variationCapital: 0, soldeNCalcule: soldeN1, soldeNBalance: soldeNBal, ecart: 0 });
    }

    kpLignes.sort((a, b) => a.compte.localeCompare(b.compte));
    prefill(kpLignes);
    recalc(kpLignes);
    setLignes(kpLignes);
    loadSaved(kpLignes);
  }, [balanceN]);

  // --- Pré-remplissage ---
  const prefill = (l: KPLigne[]): void => {
    for (const row of l) {
      const variation = row.soldeNBalance - row.soldeN1;
      if (Math.abs(variation) < 0.5) continue;
      const p3 = row.compte.substring(0, 3);
      if (p3 === '109' || (p3 >= '101' && p3 <= '106')) {
        row.variationCapital = variation;
      } else if ((p3 >= '111' && p3 <= '118') || p3 === '121' || p3 === '130') {
        row.affectation = variation;
      } else if (p3 >= '131' && p3 <= '139') {
        row.affectation = variation;
      }
    }
  };

  const recalc = (l: KPLigne[]): void => {
    for (const row of l) {
      row.soldeNCalcule = row.soldeN1 + row.affectation + row.dividendes + row.variationCapital;
      row.ecart = row.soldeNBalance - row.soldeNCalcule;
    }
  };

  // --- Load / Save ---
  const loadSaved = (defaultLignes: KPLigne[]): void => {
    fetch(`/api/revision/${entiteId}/${exerciceId}/kp`)
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: { lignes: KPLigne[]; odEcritures?: ODEcriture[] }) => {
        if (data.lignes && data.lignes.length > 0) {
          const merged = defaultLignes.map(dl => {
            const s = data.lignes.find((x: KPLigne) => x.compte === dl.compte);
            return s ? { ...dl, affectation: s.affectation || 0, dividendes: s.dividendes || 0, variationCapital: s.variationCapital || 0 } : dl;
          });
          recalc(merged);
          setLignes(merged);
        }
        if (data.odEcritures && data.odEcritures.length > 0) {
          setOdEcritures(data.odEcritures);
          setNextOdId(Math.max(...data.odEcritures.map(e => e.id)) + 1);
        }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      await fetch(`/api/revision/${entiteId}/${exerciceId}/kp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lignes, odEcritures }),
      });
      setSaved(true);
    } catch { /* silently */ }
  };

  // --- Mise à jour lignes ---
  const updateLigne = (idx: number, field: 'affectation' | 'dividendes' | 'variationCapital', value: number): void => {
    setLignes(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      recalc(next);
      return next;
    });
    setSaved(false);
  };

  // --- Journal OD ---
  const addOdEcriture = (source?: string, compteDebit?: string, compteCredit?: string, montant?: number, libelle?: string): void => {
    const newOd: ODEcriture = {
      id: nextOdId, date: `${exerciceAnnee}-12-31`,
      compteDebit: compteDebit || '', libelleDebit: '',
      compteCredit: compteCredit || '', libelleCredit: '',
      montant: montant || 0, libelle: libelle || '',
      source: source || 'Manuel',
    };
    setOdEcritures(prev => [...prev, newOd]);
    setNextOdId(prev => prev + 1);
    setSaved(false);
  };

  const updateOd = (id: number, field: keyof ODEcriture, value: string | number): void => {
    setOdEcritures(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    setSaved(false);
  };

  const removeOd = (id: number): void => {
    setOdEcritures(prev => prev.filter(e => e.id !== id));
    setSaved(false);
  };

  const odImpact = (compte: string): number => {
    return odEcritures.reduce((sum, od) => {
      if (od.compteDebit === compte) return sum - od.montant;
      if (od.compteCredit === compte) return sum + od.montant;
      return sum;
    }, 0);
  };

  // --- Analyse intelligente des mouvements ---
  // Pour chaque compte KP, on analyse SI, D, C, SF pour comprendre ce qui s'est passé
  interface MouvementAnalyse {
    compte: string;
    libelle: string;
    si: number;       // SI créditeur net
    debit: number;    // mouvements débit
    credit: number;   // mouvements crédit
    sf: number;       // SF créditeur net
    variation: number; // sf - si
    nature: string;    // description du mouvement détecté
  }

  const analyses: MouvementAnalyse[] = balanceN
    .filter(l => {
      const p3 = l.numero_compte.substring(0, 3);
      return p3 >= '100' && p3 <= '139';
    })
    .map(l => {
      const si = (parseFloat(String(l.si_credit ?? 0)) || 0) - (parseFloat(String(l.si_debit ?? 0)) || 0);
      const d = parseFloat(String(l.debit)) || 0;
      const c = parseFloat(String(l.credit)) || 0;
      const sf = (parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0);

      // Déterminer la nature du mouvement
      let nature = '';
      const p3 = l.numero_compte.substring(0, 3);

      if (p3 === '131' || p3 === '130') {
        if (d > 0 && Math.abs(d - si) < 0.5 && Math.abs(sf) < 0.5) {
          nature = 'Résultat N-1 entièrement affecté (soldé)';
        } else if (d > 0) {
          nature = `Résultat partiellement affecté (${d.toLocaleString('fr-FR')} distribué)`;
        }
      } else if (p3 === '121') {
        if (c > 0 && d > 0) {
          nature = `RAN : reçu ${c.toLocaleString('fr-FR')} (affectation résultat), sorti ${d.toLocaleString('fr-FR')} (dividendes/autres)`;
        } else if (c > 0) {
          nature = `RAN : reçu ${c.toLocaleString('fr-FR')} (affectation résultat)`;
        }
      } else if (p3 === '101') {
        if (c > 0 && d === 0) {
          nature = `Augmentation de capital de ${c.toLocaleString('fr-FR')} (apports ou incorporation)`;
        } else if (d > 0 && c === 0) {
          nature = `Réduction de capital de ${d.toLocaleString('fr-FR')} (absorption pertes ou remboursement)`;
        } else if (d > 0 && c > 0) {
          nature = `Mouvements capital D=${d.toLocaleString('fr-FR')} C=${c.toLocaleString('fr-FR')}`;
        }
      } else if (p3 === '102') {
        if (c > 0 && d === 0) {
          nature = `Dotation publique reçue de ${c.toLocaleString('fr-FR')}`;
        } else if (d > 0 && c === 0) {
          nature = `Reprise contractuelle de dettes de ${d.toLocaleString('fr-FR')}`;
        } else if (d > 0 && c > 0) {
          nature = `Mouvements dotation D=${d.toLocaleString('fr-FR')} C=${c.toLocaleString('fr-FR')}`;
        }
      } else if (p3 === '103') {
        if (c > 0 && d === 0) {
          nature = `Apports définitifs exploitant de ${c.toLocaleString('fr-FR')}`;
        } else if (d > 0 && c === 0) {
          nature = `Affectation perte / retraits nets de ${d.toLocaleString('fr-FR')}`;
        } else if (d > 0 && c > 0) {
          nature = `Apports ${c.toLocaleString('fr-FR')}, retraits/affectation ${d.toLocaleString('fr-FR')}`;
        }
      } else if (p3 === '104') {
        if (c > 0 && d > 0) {
          nature = `Apports temporaires ${c.toLocaleString('fr-FR')}, prélèvements ${d.toLocaleString('fr-FR')}`;
        } else if (c > 0) {
          nature = `Apports temporaires exploitant de ${c.toLocaleString('fr-FR')}`;
        } else if (d > 0) {
          nature = `Prélèvements exploitant de ${d.toLocaleString('fr-FR')}`;
        }
      } else if (p3 === '105') {
        if (c > 0 && d === 0) {
          nature = `Primes constatées ${c.toLocaleString('fr-FR')} (émission/fusion/apport/conversion)`;
        } else if (d > 0 && c === 0) {
          nature = `Incorporation ou imputation primes ${d.toLocaleString('fr-FR')}`;
        } else if (d > 0 && c > 0) {
          nature = `Primes : constatées ${c.toLocaleString('fr-FR')}, incorporées/imputées ${d.toLocaleString('fr-FR')}`;
        }
      } else if (p3 === '106') {
        if (c > 0 && d === 0) {
          nature = `Écart de réévaluation constaté de ${c.toLocaleString('fr-FR')}`;
        } else if (d > 0) {
          nature = `Incorporation écart de réévaluation au capital de ${d.toLocaleString('fr-FR')}`;
        }
      } else if (p3 === '109') {
        if (d > 0 && c === 0) {
          nature = `Capital souscrit non appelé ${d.toLocaleString('fr-FR')} (création/augmentation)`;
        } else if (c > 0 && d === 0) {
          nature = `Appel de capital de ${c.toLocaleString('fr-FR')}`;
        } else if (d > 0 && c > 0) {
          nature = `Non appelé ${d.toLocaleString('fr-FR')}, appelé ${c.toLocaleString('fr-FR')}`;
        }
      } else if (p3 === '111' || p3 === '112' || p3 === '113' || p3 === '118') {
        if (c > 0 && d === 0) {
          nature = `Affectation résultat aux réserves ${c.toLocaleString('fr-FR')}`;
        } else if (d > 0 && c === 0) {
          nature = `Prélèvement sur réserves ${d.toLocaleString('fr-FR')} (incorporation capital, distribution ou absorption pertes)`;
        } else if (c > 0 && d > 0) {
          nature = `Affectation ${c.toLocaleString('fr-FR')}, prélèvement ${d.toLocaleString('fr-FR')}`;
        }
      } else if (p3 === '121' || p3 === '129') {
        if (c > 0 && d === 0) {
          nature = `RAN : bénéfice non affecté ${c.toLocaleString('fr-FR')}`;
        } else if (d > 0 && c === 0) {
          nature = `RAN : pertes reportées ou dividendes distribués ${d.toLocaleString('fr-FR')}`;
        } else if (c > 0 && d > 0) {
          nature = `RAN : reçu ${c.toLocaleString('fr-FR')} (affectation), sorti ${d.toLocaleString('fr-FR')} (pertes/dividendes)`;
        }
      }

      return { compte: l.numero_compte, libelle: l.libelle_compte, si, debit: d, credit: c, sf, variation: sf - si, nature };
    });

  // Fonction pour trouver la contrepartie probable d'un écart
  const findContrepartie = (compte: string, ecartPositif: boolean): { compte: string; libelle: string } => {
    const p3 = compte.substring(0, 3);

    // Résultat (131/139/130) — contrepartie selon le sens
    if (p3 === '131' || p3 === '130' || p3 === '139') {
      if (ecartPositif) {
        // Crédit excédentaire (bénéfice) → affecté au RAN, réserves, ou capital
        const ran = analyses.find(a => a.compte.startsWith('121'));
        return ran ? { compte: ran.compte, libelle: 'Report à nouveau' } : { compte: '121000', libelle: 'Report à nouveau' };
      } else {
        // Débit excédentaire (perte à imputer) → absorbé par réserves (11), RAN (12), capital (101/103)
        const a11 = analyses.find(a => a.compte.startsWith('11') && a.debit > 0.5);
        if (a11) return { compte: a11.compte, libelle: 'Réserves (absorption pertes)' };
        const ran = analyses.find(a => a.compte.startsWith('121'));
        if (ran) return { compte: ran.compte, libelle: 'Report à nouveau' };
        const a103 = analyses.find(a => a.compte.startsWith('103'));
        if (a103) return { compte: a103.compte, libelle: 'Capital personnel' };
        return { compte: '121000', libelle: 'Report à nouveau' };
      }
    }

    // Réserves (111-118) — contrepartie selon le sens
    if (p3 >= '111' && p3 <= '118') {
      if (ecartPositif) {
        // Crédit excédentaire → affectation du résultat (D 131) ou du RAN
        const res131 = analyses.find(a => a.compte.startsWith('131'));
        if (res131 && Math.abs(res131.variation) > 0.5) return { compte: res131.compte, libelle: 'Résultat net' };
        const ran = analyses.find(a => a.compte.startsWith('121'));
        return ran ? { compte: ran.compte, libelle: 'Report à nouveau' } : { compte: '131000', libelle: 'Résultat net' };
      } else {
        // Débit excédentaire → incorporation capital (C 101), distribution (C 465), ou absorption pertes (C 129/139)
        const a101 = analyses.find(a => a.compte.startsWith('101'));
        if (a101 && a101.credit > 0.5) return { compte: a101.compte, libelle: 'Capital social (incorporation)' };
        const a465 = analyses.find(a => a.compte.startsWith('465'));
        if (a465) return { compte: a465.compte, libelle: 'Associés, dividendes à payer' };
        const a129 = analyses.find(a => a.compte.startsWith('129'));
        if (a129) return { compte: a129.compte, libelle: 'Report à nouveau débiteur (absorption pertes)' };
        const ran = analyses.find(a => a.compte.startsWith('121'));
        return ran ? { compte: ran.compte, libelle: 'Report à nouveau' } : { compte: '121000', libelle: 'Report à nouveau' };
      }
    }

    // RAN (121/129) — contrepartie selon le sens
    if (p3 === '121' || p3 === '129') {
      if (ecartPositif) {
        // Crédit excédentaire → bénéfice non distribué (D 131)
        const res131 = analyses.find(a => a.compte.startsWith('131'));
        return res131 ? { compte: res131.compte, libelle: 'Résultat net : Bénéfice' } : { compte: '131000', libelle: 'Résultat net : Bénéfice' };
      } else {
        // Débit excédentaire → pertes (C 139) ou dividendes distribués (C 465)
        const a465 = analyses.find(a => a.compte.startsWith('465'));
        if (a465 && a465.credit > 0.5) return { compte: a465.compte, libelle: 'Associés, dividendes à payer' };
        const a139 = analyses.find(a => a.compte.startsWith('139'));
        if (a139) return { compte: a139.compte, libelle: 'Résultat net : Perte' };
        const res131 = analyses.find(a => a.compte.startsWith('131'));
        const resultatSolde = res131 && Math.abs(res131.sf) < 0.5;
        if (resultatSolde) {
          const reserveEnEcart = lignes.find(l => l.compte.startsWith('111') && Math.abs(l.ecart) > 0.5);
          if (reserveEnEcart) return { compte: reserveEnEcart.compte, libelle: 'Réserve légale' };
          const autreReserve = lignes.find(l => (l.compte.startsWith('112') || l.compte.startsWith('113') || l.compte.startsWith('118')) && Math.abs(l.ecart) > 0.5);
          if (autreReserve) return { compte: autreReserve.compte, libelle: autreReserve.designation };
        }
        return res131 ? { compte: res131.compte, libelle: 'Résultat net' } : { compte: '139000', libelle: 'Résultat net : Perte' };
      }
    }

    // 101 — Capital social : contrepartie = 46 (associés), 109 (non appelé), 11 (réserves), 105 (primes)
    if (p3 === '101') {
      const a109 = analyses.find(a => a.compte.startsWith('109'));
      if (a109 && Math.abs(a109.debit) > 0.5) return { compte: a109.compte, libelle: 'Capital souscrit non appelé' };
      const a46 = analyses.find(a => a.compte.startsWith('46'));
      if (a46) return { compte: a46.compte, libelle: 'Associés et groupe' };
      const a105 = analyses.find(a => a.compte.startsWith('105'));
      if (a105) return { compte: a105.compte, libelle: 'Primes liées au capital' };
      return { compte: '461000', libelle: 'Associés, opérations sur le capital' };
    }

    // 102 — Capital par dotation : contrepartie = 4493 (État, fonds de dotation)
    if (p3 === '102') {
      const a4493 = analyses.find(a => a.compte.startsWith('4493'));
      if (a4493) return { compte: a4493.compte, libelle: 'État, fonds de dotation à recevoir' };
      const a45 = analyses.find(a => a.compte.startsWith('45'));
      if (a45) return { compte: a45.compte, libelle: 'Organismes internationaux' };
      return { compte: '449300', libelle: 'État, fonds de dotation à recevoir' };
    }

    // 103 — Capital personnel : contrepartie = 104 (compte exploitant) ou 131/139 (résultat)
    if (p3 === '103') {
      const a104 = analyses.find(a => a.compte.startsWith('104'));
      if (a104) return { compte: a104.compte, libelle: 'Compte de l\'exploitant' };
      if (ecartPositif) {
        const a131 = analyses.find(a => a.compte.startsWith('131'));
        if (a131) return { compte: a131.compte, libelle: 'Résultat net : Bénéfice' };
      } else {
        const a139 = analyses.find(a => a.compte.startsWith('139'));
        if (a139) return { compte: a139.compte, libelle: 'Résultat net : Perte' };
      }
      return { compte: '104000', libelle: 'Compte de l\'exploitant' };
    }

    // 104 — Compte de l'exploitant : contrepartie = 103 (capital personnel) ou trésorerie
    if (p3 === '104') {
      const a103 = analyses.find(a => a.compte.startsWith('103'));
      if (a103) return { compte: a103.compte, libelle: 'Capital personnel' };
      return { compte: '103000', libelle: 'Capital personnel' };
    }

    // 105 — Primes : contrepartie = 101 (incorporation), 12/139 (absorption pertes), 462 (remboursement)
    if (p3 === '105') {
      if (ecartPositif) {
        // Crédit excédentaire → augmentation de capital, contrepartie = associés
        const a46 = analyses.find(a => a.compte.startsWith('46'));
        if (a46) return { compte: a46.compte, libelle: 'Associés' };
        return { compte: '461000', libelle: 'Associés, opérations sur le capital' };
      } else {
        // Débit excédentaire → incorporation au capital ou absorption pertes
        const a101 = analyses.find(a => a.compte.startsWith('101'));
        if (a101 && a101.credit > 0) return { compte: a101.compte, libelle: 'Capital social (incorporation)' };
        const a12 = analyses.find(a => a.compte.startsWith('12'));
        if (a12) return { compte: a12.compte, libelle: 'Report à nouveau (absorption pertes)' };
        return { compte: '101000', libelle: 'Capital social' };
      }
    }

    // 106 — Écarts de réévaluation : contrepartie = 10 (capital, incorporation)
    if (p3 === '106') {
      if (!ecartPositif) {
        const a10 = analyses.find(a => a.compte.startsWith('101'));
        if (a10) return { compte: a10.compte, libelle: 'Capital social (incorporation)' };
        return { compte: '101000', libelle: 'Capital social' };
      }
      return { compte: '______', libelle: '(actifs réévalués)' };
    }

    // 109 — Capital souscrit non appelé : contrepartie = 101 ou 467
    if (p3 === '109') {
      if (ecartPositif) {
        // Crédit = appel de capital → 467
        const a467 = analyses.find(a => a.compte.startsWith('467'));
        if (a467) return { compte: a467.compte, libelle: 'Actionnaires, restant dû sur capital appelé' };
        return { compte: '467000', libelle: 'Actionnaires, restant dû sur capital appelé' };
      }
      const cap = analyses.find(a => a.compte.startsWith('101'));
      return cap ? { compte: cap.compte, libelle: 'Capital social' } : { compte: '101000', libelle: 'Capital social' };
    }

    // Défaut : chercher le compte avec le mouvement symétrique le plus proche
    const montantRef = ecartPositif
      ? balanceN.find(l => l.numero_compte === compte)?.credit || 0
      : balanceN.find(l => l.numero_compte === compte)?.debit || 0;

    if (montantRef > 0) {
      const match = analyses.find(a => a.compte !== compte && (
        (ecartPositif && Math.abs((a.debit || 0) - montantRef) < montantRef * 0.1) ||
        (!ecartPositif && Math.abs((a.credit || 0) - montantRef) < montantRef * 0.1)
      ));
      if (match) return { compte: match.compte, libelle: match.libelle };
    }

    return { compte: '______', libelle: '(à déterminer)' };
  };

  // --- Suggestions automatiques ---
  const suggestions: Suggestion[] = [];

  // Comptes couverts par le contrôle 2 (réserve légale) — pas de doublon
  const comptesControle2 = new Set<string>();
  const reserveLegaleLigneCheck = lignes.find(l => l.compte.startsWith('111'));
  if (reserveLegaleLigneCheck) {
    comptesControle2.add(reserveLegaleLigneCheck.compte);
    const ran = lignes.find(l => l.compte.startsWith('121'));
    if (ran) comptesControle2.add(ran.compte);
  }

  for (const l of lignes) {
    const ecartNet = l.ecart - odImpact(l.compte);
    if (Math.abs(ecartNet) < 0.5) continue;
    // Skip si couvert par contrôle 2
    if (comptesControle2.has(l.compte)) continue;
    const dejaPropose = odEcritures.some(od => od.source === `Contrôle 1 — ${l.compte}`);
    if (dejaPropose) continue;

    const analyse = analyses.find(a => a.compte === l.compte);
    const natureInfo = analyse?.nature ? ` (${analyse.nature})` : '';

    if (ecartNet > 0) {
      // Balance > Calculé → crédit excédentaire
      const cp = findContrepartie(l.compte, true);
      suggestions.push({ compteDebit: cp.compte, libelleDebit: cp.libelle, compteCredit: l.compte, libelleCredit: l.designation, montant: ecartNet, libelle: `Régularisation ${l.designation}${natureInfo}`, source: `Contrôle 1 — ${l.compte}` });
    } else {
      // Balance < Calculé → crédit insuffisant
      const cp = findContrepartie(l.compte, false);
      suggestions.push({ compteDebit: l.compte, libelleDebit: l.designation, compteCredit: cp.compte, libelleCredit: cp.libelle, montant: Math.abs(ecartNet), libelle: `Régularisation ${l.designation}${natureInfo}`, source: `Contrôle 1 — ${l.compte}` });
    }
  }

  // --- Données contrôle 2 : Réserve légale ---
  const resultatN1 = balanceN
    .filter(l => l.numero_compte.startsWith('131'))
    .reduce((s, l) => s + (parseFloat(String(l.si_credit ?? 0)) || 0) - (parseFloat(String(l.si_debit ?? 0)) || 0), 0);

  const pertesAnterieures = balanceN
    .filter(l => l.numero_compte.startsWith('121'))
    .reduce((s, l) => {
      const sid = parseFloat(String(l.si_debit ?? 0)) || 0;
      const sic = parseFloat(String(l.si_credit ?? 0)) || 0;
      return s + Math.max(0, sid - sic);
    }, 0);

  const reserveN1 = balanceN
    .filter(l => l.numero_compte.startsWith('111'))
    .reduce((s, l) => s + (parseFloat(String(l.si_credit ?? 0)) || 0) - (parseFloat(String(l.si_debit ?? 0)) || 0), 0);

  const baseReserve = Math.max(0, resultatN1 - pertesAnterieures);
  const dixPourcent = baseReserve * 0.1;

  const capitalSocial = lignes
    .filter(l => l.compte.startsWith('101') || l.compte.startsWith('102') || l.compte.startsWith('103'))
    .reduce((s, l) => s + l.soldeNBalance, 0);

  const plafondReserve = capitalSocial / 5;
  const dotationObligatoire = reserveN1 >= plafondReserve ? 0 : Math.min(dixPourcent, plafondReserve - reserveN1);
  const reserveRecalculee = reserveN1 + dotationObligatoire;
  const reserveLegaleLigne = lignes.find(l => l.compte.startsWith('111'));
  const reserveBalance = reserveLegaleLigne ? reserveLegaleLigne.soldeNBalance : 0;
  const ecartReserve = reserveBalance - reserveRecalculee;
  const plafondAtteint = reserveN1 >= plafondReserve;

  // Suggestion contrôle 2 — détermine intelligemment la contrepartie
  if (reserveLegaleLigne && Math.abs(ecartReserve) > 0.5) {
    const dejaPropose = odEcritures.some(od => od.source === 'Contrôle 2 — Réserve légale');
    if (!dejaPropose) {
      // Analyser d'où vient la dotation : si le 131 est déjà soldé → le résultat est au RAN
      const res131 = analyses.find(a => a.compte.startsWith('131'));
      const ran121 = analyses.find(a => a.compte.startsWith('121'));
      const resultatSolde = res131 && Math.abs(res131.sf) < 0.5; // 131 soldé = affecté

      // Si résultat soldé → la contrepartie est le RAN, sinon c'est le résultat
      const cp = resultatSolde && ran121
        ? { compte: ran121.compte, libelle: 'Report à nouveau' }
        : res131
        ? { compte: res131.compte, libelle: 'Résultat net' }
        : { compte: '121100', libelle: 'Report à nouveau' };

      if (ecartReserve < 0) {
        const explication = resultatSolde
          ? 'Dotation réserve légale (Art. 346 OHADA) — virement du RAN (résultat déjà affecté)'
          : 'Dotation réserve légale (Art. 346 OHADA)';
        suggestions.push({ compteDebit: cp.compte, libelleDebit: cp.libelle, compteCredit: reserveLegaleLigne.compte, libelleCredit: 'Réserve légale', montant: Math.abs(ecartReserve), libelle: explication, source: 'Contrôle 2 — Réserve légale' });
      } else {
        suggestions.push({ compteDebit: reserveLegaleLigne.compte, libelleDebit: 'Réserve légale', compteCredit: cp.compte, libelleCredit: cp.libelle, montant: ecartReserve, libelle: 'Correction dotation excédentaire réserve légale', source: 'Contrôle 2 — Réserve légale' });
      }
    }
  }

  // --- Données contrôle 3 ---
  const totalBalance = lignes.reduce((s, l) => s + l.soldeNBalance, 0);
  const moitieCapital = capitalSocial / 2;

  return (
    <div className="revision-kp">
      <div className="revision-section-header">
        <h3>Capitaux propres</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      {/* Objectif */}
      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer que les capitaux propres sont correctement constitués, que l'affectation du résultat N-1 est conforme aux décisions de l'assemblée générale, et que les obligations légales (réserve légale, niveau des KP) sont respectées.
      </div>

      {/* Travaux à effectuer */}
      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux à effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_KP.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      <ControleAffectation
        lignes={lignes}
        exerciceAnnee={exerciceAnnee}
        onUpdateLigne={updateLigne}
        odImpact={odImpact}
      />

      {reserveLegaleLigne && (
        <ControleReserveLegale
          resultatN1={resultatN1}
          pertesAnterieures={pertesAnterieures}
          baseReserve={baseReserve}
          dixPourcent={dixPourcent}
          capitalSocial={capitalSocial}
          plafondReserve={plafondReserve}
          reserveN1={reserveN1}
          dotationObligatoire={dotationObligatoire}
          reserveRecalculee={reserveRecalculee}
          reserveBalance={reserveBalance}
          ecartReserve={ecartReserve}
          plafondAtteint={plafondAtteint}
          exerciceAnnee={exerciceAnnee}
        />
      )}

      <ControleNiveauKP
        capitalSocial={capitalSocial}
        moitieCapital={moitieCapital}
        totalBalance={totalBalance}
      />

      <JournalOD
        suggestions={suggestions}
        odEcritures={odEcritures}
        onAddOd={addOdEcriture}
        onUpdateOd={updateOd}
        onRemoveOd={removeOd}
      />
    </div>
  );
}

export default RevisionKP;
