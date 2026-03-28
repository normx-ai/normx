/**
 * PNI - Primes Non Imposables (Article 38 CGI)
 * Plafond : 15% du brut imposable. L'excedent est reintegre dans la base imposable.
 */

export interface PNIConfig {
  code: string;
  label: string;
  description: string;
}

export const PNI_TYPES: PNIConfig[] = [
  { code: 'TRANSPORT', label: 'Indemnite de transport', description: 'Frais de deplacement domicile-travail' },
  { code: 'REPRESENTATION', label: 'Indemnite de representation', description: 'Frais de representation professionnelle' },
  { code: 'PANIER', label: 'Prime de panier', description: 'Frais de repas sur le lieu de travail' },
  { code: 'SALISSURE', label: 'Prime de salissure', description: 'Compensation pour travaux salissants' },
  { code: 'OUTILLAGE', label: 'Indemnite d\'outillage', description: 'Utilisation d\'outils personnels' },
];

export const PNI_PLAFOND_TAUX = 15; // 15% du brut imposable

export interface PNIInput {
  code: string;
  montant: number;
}

export interface PNIResult {
  primes: PNIInput[];
  totalDeclare: number;
  plafond: number;
  totalAdmis: number;
  excedent: number;
}

/**
 * Calcule les PNI avec plafonnement a 15% du brut imposable (Art. 38 CGI)
 * @param brutImposable - Salaire brut imposable
 * @param primes - Liste des primes non imposables declarees
 * @returns Resultat avec plafond, montant admis et excedent reintegre
 */
export function calculerPNI(brutImposable: number, primes: PNIInput[]): PNIResult {
  const totalDeclare = primes.reduce((sum, p) => sum + p.montant, 0);
  const plafond = Math.round(brutImposable * PNI_PLAFOND_TAUX / 100);
  const totalAdmis = Math.min(totalDeclare, plafond);
  const excedent = Math.max(0, totalDeclare - plafond);
  return { primes, totalDeclare, plafond, totalAdmis, excedent };
}
