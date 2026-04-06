export const MOIS_NOMS_BULLETIN: string[] = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export interface LigneGain {
  libelle: string;
  nombre?: number;
  base?: number;
  montant?: number;
}

export interface LigneCotisation {
  libelle: string;
  base: number | null;
  taux_sal: number | null;
  deduction: number;
  taux_pat: number | null;
  patronale: number;
}

export interface LigneIndemnite {
  libelle: string;
  nombre?: number;
  base?: number;
  montant?: number;
}

export interface VariableMois {
  date: string;
  pointage: string;
  quantite: string;
}

export interface BulletinPrime {
  libelle: string;
  nombre?: number;
  base?: number;
  montant: number;
}

export interface BulletinIndemniteItem {
  libelle: string;
  nombre?: number;
  base?: number;
  montant: number;
}

export interface BulletinData {
  salaire_base?: number;
  salaire_base_montant?: number;
  sursalaire?: number;
  sursalaire_base?: number;
  prime_fonction?: number;
  prime_logement?: number;
  prime_energie?: number;
  prime_diplome?: number;
  forfait_hs?: number;
  forfait_hs_base?: number;
  primes?: BulletinPrime[];
  brut?: number;
  cnss_salariale?: number;
  cnss_base_plafond1?: number;
  cnss_patronale?: number;
  cnss_patronale_plafond2?: number;
  its?: number;
  taxe_locaux?: number;
  camu_salariale?: number;
  camu_base?: number;
  taxe_regionale?: number;
  tus_impot?: number;
  tus_cnss?: number;
  total_retenues?: number;
  total_patronales?: number;
  indemnite_transport?: number;
  indemnite_transport_base?: number;
  indemnite_salissure?: number;
  indemnite_vestimentaire?: number;
  indemnite_panier?: number;
  allocation_scolaire?: number;
  indemnite_outillage?: number;
  indemnites?: BulletinIndemniteItem[];
  total_gains?: number;
  net_a_payer?: number;
  net_imposable?: number;
  avantages_nature?: number;
  cumul_brut?: number;
  cumul_retenues?: number;
  cumul_patronales?: number;
  cumul_avantages?: number;
  cumul_net_imposable?: number;
  cumul_jours?: string;
  droit_conges?: number;
  conges_pris?: number;
  pointage_s1?: number;
  pointage_s2?: number;
  pointage_s3?: number;
  pointage_s4?: number;
  pointage_s5?: number;
  pointage_s6?: number;
  [key: string]: number | string | BulletinPrime[] | BulletinIndemniteItem[] | undefined;
}

export interface SalarieInfo {
  civilite?: string;
  nom?: string;
  prenom?: string;
  matricule?: string;
  numero_cnss?: string;
  nui?: string;
  emploi?: string;
  poste?: string;
  situation_matrimoniale?: string;
  affectation?: string;
  service?: string;
  enfants_its?: number;
  nombre_enfants?: number;
  parts_fiscales?: number;
  date_embauche?: string;
  type_contrat?: string;
  anciennete?: string;
  convention_collective?: string;
  categorie?: string;
  mode_paiement?: string;
  rib?: string;
}

export interface EtablissementInfo {
  raison_sociale?: string;
  nom?: string;
  adresse?: string;
  ville?: string;
  rccm?: string;
  nui?: string;
  telephone?: string;
}

export function joursOuvresDuMois(mois: number, annee: number): Date[] {
  const jours: Date[] = [];
  const date = new Date(annee, mois - 1, 1);
  while (date.getMonth() === mois - 1) {
    const jour = date.getDay();
    if (jour >= 1 && jour <= 5) {
      jours.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }
  return jours;
}

export function genererVariablesMois(mois: number, annee: number): VariableMois[] {
  const jours = joursOuvresDuMois(mois, annee);
  return jours.map(d => ({
    date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`,
    pointage: 'FO',
    quantite: '8,00'
  }));
}

export function buildLignesGains(b: BulletinData, nbJoursOuvres: number): LigneGain[] {
  const lignesGains: LigneGain[] = [
    { libelle: 'Salaire de base', nombre: nbJoursOuvres, base: b.salaire_base, montant: b.salaire_base_montant || Math.round((b.salaire_base || 0) * nbJoursOuvres) },
  ];
  if (b.sursalaire) lignesGains.push({ libelle: 'Sursalaire', nombre: nbJoursOuvres, base: b.sursalaire_base, montant: b.sursalaire });
  if (b.prime_fonction) lignesGains.push({ libelle: 'Prime de fonction', base: b.prime_fonction, montant: b.prime_fonction });
  if (b.prime_logement) lignesGains.push({ libelle: 'Prime de logement', base: b.prime_logement, montant: b.prime_logement });
  if (b.prime_energie) lignesGains.push({ libelle: "Prime d'énergie", nombre: 1, base: b.prime_energie, montant: b.prime_energie });
  if (b.prime_diplome) lignesGains.push({ libelle: 'Prime de diplôme', base: b.prime_diplome, montant: b.prime_diplome });
  if (b.forfait_hs) lignesGains.push({ libelle: 'Forfait HS', nombre: nbJoursOuvres, base: b.forfait_hs_base, montant: b.forfait_hs });

  (b.primes || []).forEach(p => {
    lignesGains.push({ libelle: p.libelle, nombre: p.nombre, base: p.base, montant: p.montant });
  });

  return lignesGains;
}

export function buildLignesCotisations(b: BulletinData, totalBrut: number): LigneCotisation[] {
  const lignesCotisations: LigneCotisation[] = [];

  if (b.cnss_salariale !== undefined) {
    lignesCotisations.push({
      libelle: 'CNSS - PVID', base: b.cnss_base_plafond1 || 1200000,
      taux_sal: 4, deduction: b.cnss_salariale,
      taux_pat: 8, patronale: b.cnss_patronale || 0
    });
  }
  if (b.cnss_patronale_plafond2 !== undefined) {
    lignesCotisations.push({
      libelle: 'CNSS / Plafond', base: 600000,
      taux_sal: 0, deduction: 0,
      taux_pat: 12.28, patronale: b.cnss_patronale_plafond2
    });
  }
  lignesCotisations.push({
    libelle: 'ITS (Impôt Traitements & Salaires)', base: null,
    taux_sal: null, deduction: b.its || 0,
    taux_pat: null, patronale: 0
  });
  if (b.taxe_locaux !== undefined) {
    lignesCotisations.push({
      libelle: 'TOL (Taxe Occupation Locaux)', base: null,
      taux_sal: null, deduction: b.taxe_locaux || 0,
      taux_pat: null, patronale: 0
    });
  }
  if (b.camu_salariale !== undefined) {
    lignesCotisations.push({
      libelle: 'Taxe CAMU', base: b.camu_base || 0,
      taux_sal: 0.5, deduction: b.camu_salariale,
      taux_pat: 0, patronale: 0
    });
  }
  if (b.taxe_regionale !== undefined && b.taxe_regionale > 0) {
    lignesCotisations.push({
      libelle: 'Taxe Régionale', base: null,
      taux_sal: null, deduction: b.taxe_regionale,
      taux_pat: null, patronale: 0
    });
  }
  lignesCotisations.push({
    libelle: 'TUS - IMPOT', base: totalBrut,
    taux_sal: 0, deduction: 0,
    taux_pat: 1.5, patronale: b.tus_impot || 0
  });
  lignesCotisations.push({
    libelle: 'TUS - CNSS', base: totalBrut,
    taux_sal: 0, deduction: 0,
    taux_pat: 6, patronale: b.tus_cnss || 0
  });

  return lignesCotisations;
}

export function buildLignesIndemnites(b: BulletinData, nbJoursOuvres: number): LigneIndemnite[] {
  const lignesIndemnites: LigneIndemnite[] = [];
  if (b.indemnite_transport) lignesIndemnites.push({ libelle: 'Indemnité de transport', nombre: nbJoursOuvres, base: b.indemnite_transport_base, montant: b.indemnite_transport });
  if (b.indemnite_salissure) lignesIndemnites.push({ libelle: 'Indemnité de salissure', montant: b.indemnite_salissure });
  if (b.indemnite_vestimentaire) lignesIndemnites.push({ libelle: 'Indemnité vestimentaire', montant: b.indemnite_vestimentaire });
  if (b.indemnite_panier) lignesIndemnites.push({ libelle: 'Forfait Indemnité de panier', montant: b.indemnite_panier });
  if (b.allocation_scolaire) lignesIndemnites.push({ libelle: 'Allocation ramassage scolaire', montant: b.allocation_scolaire });
  if (b.indemnite_outillage) lignesIndemnites.push({ libelle: 'Indemnité outillage', base: b.indemnite_outillage, montant: b.indemnite_outillage });

  (b.indemnites || []).forEach(ind => {
    lignesIndemnites.push({ libelle: ind.libelle, nombre: ind.nombre, base: ind.base, montant: ind.montant });
  });

  return lignesIndemnites;
}
