import React from 'react';
import { formaterMontant } from '../utils/calculPaie';
import './BulletinPaie.css';

const MOIS_NOMS: string[] = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

interface LigneGain {
  libelle: string;
  nombre?: number;
  base?: number;
  montant?: number;
}

interface LigneCotisation {
  libelle: string;
  base: number | null;
  taux_sal: number | null;
  deduction: number;
  taux_pat: number | null;
  patronale: number;
}

interface LigneIndemnite {
  libelle: string;
  nombre?: number;
  base?: number;
  montant?: number;
}

interface VariableMois {
  date: string;
  pointage: string;
  quantite: string;
}

interface BulletinPrime {
  libelle: string;
  nombre?: number;
  base?: number;
  montant: number;
}

interface BulletinIndemniteItem {
  libelle: string;
  nombre?: number;
  base?: number;
  montant: number;
}

interface BulletinData {
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

interface SalarieInfo {
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

interface EtablissementInfo {
  raison_sociale?: string;
  nom?: string;
  adresse?: string;
  ville?: string;
  rccm?: string;
  nui?: string;
  telephone?: string;
}

interface BulletinPaieProps {
  salarie: SalarieInfo | null;
  etablissement: EtablissementInfo | null;
  bulletin: BulletinData | null;
  mois: number;
  annee: number;
  onBack?: () => void;
}

function joursOuvresDuMois(mois: number, annee: number): Date[] {
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

function genererVariablesMois(mois: number, annee: number): VariableMois[] {
  const jours = joursOuvresDuMois(mois, annee);
  return jours.map(d => ({
    date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`,
    pointage: 'FO',
    quantite: '8,00'
  }));
}

function BulletinPaie({ salarie, etablissement, bulletin, mois, annee, onBack }: BulletinPaieProps): React.ReactElement {
  if (!salarie || !bulletin) {
    return (
      <div className="bulletin-container">
        <p>Aucun bulletin a afficher. Selectionnez un salarie et lancez le calcul.</p>
      </div>
    );
  }

  const info = salarie;
  const etab: EtablissementInfo = etablissement || {};
  const b = bulletin;

  const nomMois = MOIS_NOMS[mois] || '';
  const periodeDebut = `01/${String(mois).padStart(2, '0')}/${annee}`;
  const dernierJour = new Date(annee, mois, 0).getDate();
  const periodeFin = `${dernierJour}/${String(mois).padStart(2, '0')}/${annee}`;

  const variables = genererVariablesMois(mois, annee);
  const nbJoursOuvres = variables.length;

  /* --- Lignes de gains --- */
  const lignesGains: LigneGain[] = [
    { libelle: 'Salaire de base', nombre: nbJoursOuvres, base: b.salaire_base, montant: b.salaire_base_montant || Math.round((b.salaire_base || 0) * nbJoursOuvres) },
  ];
  if (b.sursalaire) lignesGains.push({ libelle: 'Sursalaire', nombre: nbJoursOuvres, base: b.sursalaire_base, montant: b.sursalaire });
  if (b.prime_fonction) lignesGains.push({ libelle: 'Prime de fonction', base: b.prime_fonction, montant: b.prime_fonction });
  if (b.prime_logement) lignesGains.push({ libelle: 'Prime de logement', base: b.prime_logement, montant: b.prime_logement });
  if (b.prime_energie) lignesGains.push({ libelle: "Prime d'énergie", nombre: 1, base: b.prime_energie, montant: b.prime_energie });
  if (b.prime_diplome) lignesGains.push({ libelle: 'Prime de diplôme', base: b.prime_diplome, montant: b.prime_diplome });
  if (b.forfait_hs) lignesGains.push({ libelle: 'Forfait HS', nombre: nbJoursOuvres, base: b.forfait_hs_base, montant: b.forfait_hs });

  // Primes supplementaires
  (b.primes || []).forEach(p => {
    lignesGains.push({ libelle: p.libelle, nombre: p.nombre, base: p.base, montant: p.montant });
  });

  const totalBrut = b.brut || lignesGains.reduce((s, l) => s + (l.montant || 0), 0);

  /* --- Lignes de cotisations --- */
  const lignesCotisations: LigneCotisation[] = [];

  // CNSS - PVID (Pension Vieillesse, Invalidite, Deces)
  if (b.cnss_salariale !== undefined) {
    lignesCotisations.push({
      libelle: 'CNSS - PVID', base: b.cnss_base_plafond1 || 1200000,
      taux_sal: 4, deduction: b.cnss_salariale,
      taux_pat: 8, patronale: b.cnss_patronale || 0
    });
  }
  // CNSS / Plafond (AF 10,03% + AT 2,25% = 12,28%)
  if (b.cnss_patronale_plafond2 !== undefined) {
    lignesCotisations.push({
      libelle: 'CNSS / Plafond', base: 600000,
      taux_sal: 0, deduction: 0,
      taux_pat: 12.28, patronale: b.cnss_patronale_plafond2
    });
  }
  // ITS (Direction des Impots)
  lignesCotisations.push({
    libelle: 'ITS (Impôt Traitements & Salaires)', base: null,
    taux_sal: null, deduction: b.its || 0,
    taux_pat: null, patronale: 0
  });
  // TOL (Direction des Impots)
  if (b.taxe_locaux !== undefined) {
    lignesCotisations.push({
      libelle: 'TOL (Taxe Occupation Locaux)', base: null,
      taux_sal: null, deduction: b.taxe_locaux || 0,
      taux_pat: null, patronale: 0
    });
  }
  // CAMU (Taxe CAMU)
  if (b.camu_salariale !== undefined) {
    lignesCotisations.push({
      libelle: 'Taxe CAMU', base: b.camu_base || 0,
      taux_sal: 0.5, deduction: b.camu_salariale,
      taux_pat: 0, patronale: 0
    });
  }
  // Taxe Regionale
  if (b.taxe_regionale !== undefined && b.taxe_regionale > 0) {
    lignesCotisations.push({
      libelle: 'Taxe Régionale', base: null,
      taux_sal: null, deduction: b.taxe_regionale,
      taux_pat: null, patronale: 0
    });
  }
  // TUS - IMPOT (1,5% part Etat)
  lignesCotisations.push({
    libelle: 'TUS - IMPOT', base: totalBrut,
    taux_sal: 0, deduction: 0,
    taux_pat: 1.5, patronale: b.tus_impot || 0
  });
  // TUS - CNSS (6% part organismes)
  lignesCotisations.push({
    libelle: 'TUS - CNSS', base: totalBrut,
    taux_sal: 0, deduction: 0,
    taux_pat: 6, patronale: b.tus_cnss || 0
  });

  const totalRetenues = b.total_retenues || lignesCotisations.reduce((s, l) => s + (l.deduction || 0), 0);
  const totalPatronales = b.total_patronales || lignesCotisations.reduce((s, l) => s + (l.patronale || 0), 0);

  /* --- Indemnites non soumises --- */
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

  const totalGains = b.total_gains || (totalBrut + lignesIndemnites.reduce((s, l) => s + (l.montant || 0), 0));
  const netAPayer = b.net_a_payer || (totalGains - totalRetenues);

  const netImposable = b.net_imposable || (totalBrut - (b.cnss_salariale || 0));

  // Conges
  const droitConges = b.droit_conges || 2.17;
  const congesPris = b.conges_pris || 0;
  const soldeConges = (droitConges - congesPris).toFixed(2);

  const fmt = (v: number | null | undefined): string => v != null ? formaterMontant(Math.round(v)) : '';
  const fmtTaux = (v: number | null | undefined): string => v != null && v !== 0 ? v.toFixed(3).replace('.', ',') : '';

  return (
    <div className="bulletin-container">
      <div className="bulletin-actions">
        {onBack && <button className="btn-bulletin btn-bulletin-back" onClick={onBack}>← Retour</button>}
        <button className="btn-bulletin btn-bulletin-print" onClick={() => window.print()}>🖨 Imprimer</button>
      </div>

      <div className="bulletin-page">
        {/* EN-TETE */}
        <div className="bulletin-header">
          <div className="bulletin-entreprise">
            <div className="bulletin-entreprise-nom">{etab.raison_sociale || etab.nom || 'Entreprise'}</div>
            <div>{etab.adresse || ''}</div>
            <div>{etab.ville ? `${etab.ville} - République du Congo` : 'République du Congo'}</div>
            {etab.rccm && <div>R.C.C.M : {etab.rccm}</div>}
            {etab.nui && <div>N° NIU : {etab.nui}</div>}
            {etab.telephone && <div>Tél : {etab.telephone}</div>}
          </div>
          <div className="bulletin-titre-wrapper">
            <div className="bulletin-titre">BULLETIN DE PAIE</div>
            <div className="bulletin-periode-titre">{nomMois} {annee}</div>
          </div>
          <div style={{ width: 140 }}></div>
        </div>

        <hr className="bulletin-hr" />

        {/* INFOS SALARIE */}
        <div className="bulletin-infos">
          <div className="bulletin-infos-row">
            <div className="bulletin-infos-cell large">
              <span className="bulletin-infos-label">Nom et Prénom :</span>
              <span className="bulletin-infos-value">{info.civilite || ''} {info.nom || ''} {info.prenom || ''}</span>
            </div>
            <div className="bulletin-infos-cell large">
              <span className="bulletin-infos-label">Période : du</span>
              <span className="bulletin-infos-value">{periodeDebut} au {periodeFin}</span>
            </div>
          </div>
          <div className="bulletin-infos-row">
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">Matricule :</span>
              <span className="bulletin-infos-value">{info.matricule || '-'}</span>
            </div>
            <div className="bulletin-infos-cell large">
              <span className="bulletin-infos-label">Établissement :</span>
              <span className="bulletin-infos-value">{etab.nom || etab.raison_sociale || '-'}</span>
            </div>
          </div>
          <div className="bulletin-infos-row">
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">N° CNSS :</span>
              <span className="bulletin-infos-value">{info.numero_cnss || '-'}</span>
            </div>
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">N° NIU :</span>
              <span className="bulletin-infos-value">{info.nui || etab.nui || '-'}</span>
            </div>
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">Emploi :</span>
              <span className="bulletin-infos-value">{info.emploi || info.poste || '-'}</span>
            </div>
          </div>
          <div className="bulletin-infos-row">
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">Sit. Matrimoniale :</span>
              <span className="bulletin-infos-value">{info.situation_matrimoniale || '-'}</span>
            </div>
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">Affectation :</span>
              <span className="bulletin-infos-value">{info.affectation || info.service || '-'}</span>
            </div>
          </div>
          <div className="bulletin-infos-row">
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">Enfants ITS :</span>
              <span className="bulletin-infos-value">{info.enfants_its ?? info.nombre_enfants ?? '-'}</span>
            </div>
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">Parts Fiscales :</span>
              <span className="bulletin-infos-value">{info.parts_fiscales ? Number(info.parts_fiscales).toFixed(2).replace('.', ',') : '-'}</span>
            </div>
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">Date Embauche :</span>
              <span className="bulletin-infos-value">{info.date_embauche || '-'}</span>
            </div>
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">Nature du contrat :</span>
              <span className="bulletin-infos-value">{info.type_contrat || '-'}</span>
            </div>
          </div>
          <div className="bulletin-infos-row">
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">Ancienneté :</span>
              <span className="bulletin-infos-value">{info.anciennete || '0 an(s) et 0 mois'}</span>
            </div>
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">Conv. Collect. :</span>
              <span className="bulletin-infos-value">{info.convention_collective || '-'}</span>
            </div>
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">Catégorie :</span>
              <span className="bulletin-infos-value">{info.categorie || '-'}</span>
            </div>
          </div>
          <div className="bulletin-infos-row">
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">Mode de Paiement :</span>
              <span className="bulletin-infos-value">{info.mode_paiement || 'Virement'}</span>
            </div>
            <div className="bulletin-infos-cell large">
              <span className="bulletin-infos-label">RIB :</span>
              <span className="bulletin-infos-value">{info.rib || '-'}</span>
            </div>
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">Devise :</span>
              <span className="bulletin-infos-value">XAF</span>
            </div>
            <div className="bulletin-infos-cell">
              <span className="bulletin-infos-label">Date Règlement :</span>
              <span className="bulletin-infos-value">{periodeFin}</span>
            </div>
          </div>
        </div>

        {/* TABLEAU PRINCIPAL */}
        <div className="bulletin-table-wrapper">
          <table className="bulletin-main-table">
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: 24 }}>N°</th>
                <th rowSpan={2} style={{ width: 180 }}>Libellés</th>
                <th rowSpan={2} style={{ width: 50 }}>Nombre</th>
                <th rowSpan={2} style={{ width: 90 }}>Base</th>
                <th colSpan={3} className="section-header">Part salariale</th>
                <th colSpan={2} className="section-header">Part patronale</th>
              </tr>
              <tr>
                <th style={{ width: 50 }}>Taux (%)</th>
                <th style={{ width: 80 }}>Mt. à ajouter</th>
                <th style={{ width: 80 }}>Mt. à déduire</th>
                <th style={{ width: 50 }}>Taux (%)</th>
                <th style={{ width: 80 }}>Montant</th>
              </tr>
            </thead>
            <tbody>
              {/* GAINS */}
              {lignesGains.map((l, i) => (
                <tr key={`gain-${i}`}>
                  <td></td>
                  <td>{l.libelle}</td>
                  <td className="text-right">{l.nombre ? String(l.nombre).replace('.', ',') : ''}</td>
                  <td className="text-right">{l.base ? fmt(l.base) : ''}</td>
                  <td></td>
                  <td className="text-right">{fmt(l.montant)}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}

              {/* TOTAL BRUT */}
              <tr className="total-row">
                <td></td>
                <td className="bold">Total Brut</td>
                <td></td>
                <td></td>
                <td></td>
                <td className="text-right bold">{fmt(totalBrut)}</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>

              {/* COTISATIONS */}
              {lignesCotisations.map((l, i) => (
                <tr key={`cot-${i}`}>
                  <td></td>
                  <td>{l.libelle}</td>
                  <td></td>
                  <td className="text-right">{l.base ? fmt(l.base) : ''}</td>
                  <td className="text-right">{fmtTaux(l.taux_sal)}</td>
                  <td></td>
                  <td className="text-right">{l.deduction ? fmt(l.deduction) : ''}</td>
                  <td className="text-right">{fmtTaux(l.taux_pat)}</td>
                  <td className="text-right">{l.patronale ? fmt(l.patronale) : ''}</td>
                </tr>
              ))}

              {/* TOTAL COTISATIONS */}
              <tr className="total-row">
                <td></td>
                <td className="bold">Total Cotisations</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td className="text-right bold">{fmt(totalRetenues)}</td>
                <td></td>
                <td className="text-right bold">{fmt(totalPatronales)}</td>
              </tr>

              {/* INDEMNITES NON SOUMISES */}
              {lignesIndemnites.map((l, i) => (
                <tr key={`ind-${i}`}>
                  <td></td>
                  <td>{l.libelle}</td>
                  <td className="text-right">{l.nombre ? String(l.nombre).replace('.', ',') : ''}</td>
                  <td className="text-right">{l.base ? fmt(l.base) : ''}</td>
                  <td></td>
                  <td className="text-right">{fmt(l.montant)}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}

              {/* Lignes vides pour remplir */}
              {Array.from({ length: Math.max(0, 3 - lignesIndemnites.length) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                </tr>
              ))}

              {/* TOTAL GAINS */}
              <tr className="grand-total">
                <td></td>
                <td className="bold">TOTAL GAIN(S)</td>
                <td></td>
                <td></td>
                <td></td>
                <td className="text-right bold">{fmt(totalGains)}</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>

              {/* TOTAL RETENUES */}
              <tr className="grand-total">
                <td></td>
                <td className="bold">TOTAL RETENUE(S)</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td className="text-right bold">{fmt(totalRetenues)}</td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>

          {/* VARIABLES DU MOIS */}
          <table className="bulletin-variables-table">
            <thead>
              <tr>
                <th colSpan={3}>VARIABLES DU MOIS</th>
              </tr>
              <tr>
                <th>Date</th>
                <th>Pointage</th>
                <th>Quantités</th>
              </tr>
            </thead>
            <tbody>
              {variables.map((v, i) => (
                <tr key={i}>
                  <td>{v.date}</td>
                  <td>{v.pointage}</td>
                  <td>{v.quantite}</td>
                </tr>
              ))}
              {/* Remplir pour atteindre 31 lignes */}
              {Array.from({ length: Math.max(0, 31 - variables.length) }).map((_, i) => (
                <tr key={`ve-${i}`}>
                  <td></td><td></td><td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CUMULS */}
        <div style={{ display: 'flex', gap: 0 }}>
          <table className="bulletin-cumuls" style={{ flex: 1 }}>
            <thead>
              <tr>
                <th>Cumuls</th>
                <th>Salaire brut</th>
                <th>Charges salariales</th>
                <th>Charges patronales</th>
                <th>Avantages en nature</th>
                <th>Net imposable</th>
                <th>Jours Trav.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Période</td>
                <td>{fmt(totalBrut)}</td>
                <td>{fmt(totalRetenues)}</td>
                <td>{fmt(totalPatronales)}</td>
                <td>{fmt(b.avantages_nature || 0)}</td>
                <td>{fmt(netImposable)}</td>
                <td>{nbJoursOuvres ? `${nbJoursOuvres},00` : '0,00'}</td>
              </tr>
              <tr>
                <td>Année</td>
                <td>{fmt(b.cumul_brut || totalBrut)}</td>
                <td>{fmt(b.cumul_retenues || totalRetenues)}</td>
                <td>{fmt(b.cumul_patronales || totalPatronales)}</td>
                <td>{fmt(b.cumul_avantages || 0)}</td>
                <td>{fmt(b.cumul_net_imposable || netImposable)}</td>
                <td>{b.cumul_jours || (nbJoursOuvres ? `${nbJoursOuvres},00` : '0,00')}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ width: 200 }}>
            <div className="bulletin-net-label">NET A PAYER</div>
            <div className="bulletin-net-a-payer">{fmt(netAPayer)}</div>
          </div>
        </div>

        {/* PIED DE PAGE */}
        <div className="bulletin-footer">
          Dans votre intérêt et pour vous aider à faire valoir vos droits, conservez ce bulletin de paie sans limitation de durée.
        </div>

        <div className="bulletin-signatures">
          <div className="bulletin-signature-block">
            <h5>SIGNATURE DE L'EMPLOYEUR :</h5>
            <div style={{ height: 50 }}></div>
          </div>

          <div className="bulletin-conges-pointage">
            <div className="bulletin-conges">
              <h5>Congés Payés (Jrs)</h5>
              <div className="bulletin-conges-row"><span>Droit Acquis M :</span><span>{droitConges.toFixed(2).replace('.', ',')}</span></div>
              <div className="bulletin-conges-row"><span>Congés pris M :</span><span>{congesPris.toFixed(2).replace('.', ',')}</span></div>
              <div className="bulletin-conges-row"><span>Solde M :</span><span>{Number(soldeConges).toFixed(2).replace('.', ',')}</span></div>
            </div>
            <div className="bulletin-pointage">
              <h5>Pointage / Semaine(Jrs)</h5>
              {([1,2,3,4,5,6] as const).map(s => (
                <div className="bulletin-pointage-row" key={s}>
                  <span>Semaine{s} :</span>
                  <span>{b[`pointage_s${s}`] != null ? (b[`pointage_s${s}`] as number).toFixed(2).replace('.', ',') : '0,00'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bulletin-signature-block" style={{ textAlign: 'right' }}>
            <h5>SIGNATURE DE L'EMPLOYE :</h5>
            <div style={{ fontSize: 10, marginTop: 8 }}>Pour acquit, le :</div>
            <div style={{ height: 40 }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BulletinPaie;
