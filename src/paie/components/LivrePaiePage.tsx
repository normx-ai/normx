import React, { useState, useMemo } from 'react';
import { formaterMontant } from '../utils/calculPaie';
import {
  genererLivrePaieMensuel,
  genererLivrePaieAnnuel,
  genererLivrePaieEmploye,
  genererEtatChargesFiscales,
  genererEtatChargesSociales,
} from '../data/livrePaie';
import type {
  LivrePaieMensuel,
  LivrePaieAnnuel,
  LivrePaieEmploye,
  EtatChargesFiscales,
  EtatChargesSociales,
} from '../data/livrePaie';
import type { BulletinResume } from '../data/declarations';

const MOIS_NOMS: string[] = [
  '', 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

type TabId = 'mensuel' | 'annuel' | 'employe' | 'fiscal' | 'social';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'mensuel', label: 'Livre mensuel' },
  { id: 'annuel', label: 'Livre annuel' },
  { id: 'employe', label: 'Par employe' },
  { id: 'fiscal', label: 'Charges fiscales' },
  { id: 'social', label: 'Charges sociales' },
];

interface SalarieIdentite {
  nom?: string;
  prenom?: string;
}

interface SalarieEmploi {
  etablissement?: string;
}

interface SalarieSalaireHoraires {
  salaire_base?: string;
}

interface SalarieAvantagesNature {
  logement?: number;
  domesticite?: number;
  electricite?: number;
  voiture?: number;
  telephone?: number;
  nourriture?: number;
}

interface SalarieItem {
  id: number | string;
  identite?: SalarieIdentite;
  emploi?: SalarieEmploi;
  salaire_horaires?: SalarieSalaireHoraires;
  avantages_nature?: SalarieAvantagesNature;
  [key: string]: string | number | SalarieIdentite | SalarieEmploi | SalarieSalaireHoraires | SalarieAvantagesNature | null | undefined;
}

interface EtablissementItem {
  id: number | string;
  raison_sociale?: string;
  numero_cnss?: string;
  nui?: string;
  [key: string]: string | number | Record<string, string | number | undefined> | undefined;
}

interface LivrePaiePageProps {
  salaries: SalarieItem[];
  etablissements: EtablissementItem[];
  mois: number;
  annee: number;
}

/**
 * Construit des BulletinResume simules a partir des salaries enregistres.
 */
function buildBulletinsResume(
  salaries: SalarieItem[],
  mois: number,
  annee: number,
): BulletinResume[] {
  return salaries.map((s) => {
    const base = Number(s.salaire_horaires?.salaire_base) || 0;
    const brut = base;
    const cnssBase1 = Math.min(brut, 1200000);
    const cnssBase2 = Math.min(brut, 600000);
    const cnssSalariale = Math.round(cnssBase1 * 0.04);
    const patronaleVieillesse = Math.round(cnssBase1 * 0.08);
    const patronaleAf = Math.round(cnssBase2 * 0.1003);
    const patronaleAt = Math.round(cnssBase2 * 0.0225);
    const its = Math.round(brut * 0.05);
    const tusImpot = Math.round(brut * 0.015);
    const tusCnss = Math.round(brut * 0.06);
    const camuBase = Math.max(0, (brut - cnssSalariale) - 500000);
    const camu = Math.round(camuBase * 0.005);
    const tol = 5000;
    const totalRetenues = cnssSalariale + its + tol + camu;
    const net = brut - totalRetenues;

    return {
      id: String(s.id),
      nom: s.identite?.nom || '',
      prenom: s.identite?.prenom || '',
      mois,
      annee,
      salaire_base: base,
      brut,
      cnss_salariale: cnssSalariale,
      cnss_patronale_vieillesse: patronaleVieillesse,
      cnss_patronale_af: patronaleAf,
      cnss_patronale_at: patronaleAt,
      its,
      tus_impot: tusImpot,
      tus_cnss: tusCnss,
      camu_salariale: camu,
      taxe_locaux: tol,
      net_a_payer: net,
    };
  });
}

function LivrePaiePage({
  salaries,
  etablissements,
  mois,
  annee,
}: LivrePaiePageProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabId>('mensuel');
  const [selectedMois, setSelectedMois] = useState<number>(mois);
  const [selectedAnnee, setSelectedAnnee] = useState<number>(annee);
  const [selectedSalarieId, setSelectedSalarieId] = useState<string>(
    salaries.length > 0 ? String(salaries[0].id) : '',
  );

  const employeur = etablissements.length > 0
    ? (etablissements[0].raison_sociale || 'Employeur')
    : 'Employeur';

  const bulletinsMois: BulletinResume[] = useMemo(
    () => buildBulletinsResume(salaries, selectedMois, selectedAnnee),
    [salaries, selectedMois, selectedAnnee],
  );

  const bulletinsParMois: BulletinResume[][] = useMemo(
    () => Array.from({ length: 12 }, (_, i) =>
      buildBulletinsResume(salaries, i + 1, selectedAnnee),
    ),
    [salaries, selectedAnnee],
  );

  const livreMensuel: LivrePaieMensuel = useMemo(
    () => genererLivrePaieMensuel(bulletinsMois, employeur, selectedMois, selectedAnnee),
    [bulletinsMois, employeur, selectedMois, selectedAnnee],
  );

  const livreAnnuel: LivrePaieAnnuel = useMemo(
    () => genererLivrePaieAnnuel(bulletinsParMois, employeur, selectedAnnee),
    [bulletinsParMois, employeur, selectedAnnee],
  );

  const livreEmploye: LivrePaieEmploye | null = useMemo(() => {
    if (!selectedSalarieId) return null;
    const sal = salaries.find((s) => String(s.id) === selectedSalarieId);
    if (!sal) return null;
    const bulletinsEmploye = bulletinsParMois.flatMap((bm) =>
      bm.filter((b) => b.id === selectedSalarieId),
    );
    if (bulletinsEmploye.length === 0) return null;
    return genererLivrePaieEmploye(
      bulletinsEmploye,
      selectedSalarieId,
      sal.identite?.nom || '',
      sal.identite?.prenom || '',
      selectedAnnee,
    );
  }, [bulletinsParMois, selectedSalarieId, salaries, selectedAnnee]);

  const chargesFiscales: EtatChargesFiscales = useMemo(
    () => genererEtatChargesFiscales(bulletinsMois, employeur, selectedMois, selectedAnnee),
    [bulletinsMois, employeur, selectedMois, selectedAnnee],
  );

  const chargesSociales: EtatChargesSociales = useMemo(
    () => genererEtatChargesSociales(bulletinsMois, employeur, selectedMois, selectedAnnee),
    [bulletinsMois, employeur, selectedMois, selectedAnnee],
  );

  const renderPeriodSelector = (): React.ReactElement => (
    <div className="declarations-period-selector">
      <div className="wizard-form-group">
        <label>Mois</label>
        <select
          value={selectedMois}
          onChange={(e) => setSelectedMois(Number(e.target.value))}
        >
          {MOIS_NOMS.slice(1).map((nom, i) => (
            <option key={i + 1} value={i + 1}>{nom}</option>
          ))}
        </select>
      </div>
      <div className="wizard-form-group">
        <label>Annee</label>
        <select
          value={selectedAnnee}
          onChange={(e) => setSelectedAnnee(Number(e.target.value))}
        >
          {[selectedAnnee - 1, selectedAnnee, selectedAnnee + 1].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
    </div>
  );

  // ---- TAB 1: Livre mensuel ----
  const renderMensuel = (): React.ReactElement => (
    <div>
      <div className="declarations-section-header">
        <h4>Livre de paie — {MOIS_NOMS[selectedMois]} {selectedAnnee}</h4>
      </div>
      <div className="declarations-info-bar">
        <div className="declarations-info-item">
          <span className="declarations-info-label">Employeur</span>
          <span className="declarations-info-value">{employeur}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">Effectif</span>
          <span className="declarations-info-value">{livreMensuel.lignes.length}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">Periode</span>
          <span className="declarations-info-value">{MOIS_NOMS[selectedMois]} {selectedAnnee}</span>
        </div>
      </div>
      <table className="etab-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prenom</th>
            <th>Salaire base</th>
            <th>Brut</th>
            <th>CNSS Sal.</th>
            <th>ITS</th>
            <th>CAMU</th>
            <th>TOL</th>
            <th>Total ret.</th>
            <th>Net a payer</th>
          </tr>
        </thead>
        <tbody>
          {livreMensuel.lignes.length === 0 ? (
            <tr>
              <td colSpan={10} className="etab-table-empty">
                Aucune donnee
              </td>
            </tr>
          ) : (
            livreMensuel.lignes.map((l) => (
              <tr key={l.salarie_id}>
                <td>{l.nom}</td>
                <td>{l.prenom}</td>
                <td>{formaterMontant(l.salaire_base)}</td>
                <td>{formaterMontant(l.brut)}</td>
                <td>{formaterMontant(l.cnss_salariale)}</td>
                <td>{formaterMontant(l.its)}</td>
                <td>{formaterMontant(l.camu)}</td>
                <td>{formaterMontant(l.tol)}</td>
                <td>{formaterMontant(l.total_retenues)}</td>
                <td>{formaterMontant(l.net_a_payer)}</td>
              </tr>
            ))
          )}
        </tbody>
        {livreMensuel.lignes.length > 0 && (
          <tfoot>
            <tr className="livre-paie-totaux">
              <td colSpan={2}>TOTAUX</td>
              <td>{formaterMontant(livreMensuel.totaux.salaire_base)}</td>
              <td>{formaterMontant(livreMensuel.totaux.brut)}</td>
              <td>{formaterMontant(livreMensuel.totaux.cnss_salariale)}</td>
              <td>{formaterMontant(livreMensuel.totaux.its)}</td>
              <td>{formaterMontant(livreMensuel.totaux.camu)}</td>
              <td>{formaterMontant(livreMensuel.totaux.tol)}</td>
              <td>{formaterMontant(livreMensuel.totaux.total_retenues)}</td>
              <td>{formaterMontant(livreMensuel.totaux.net_a_payer)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {livreMensuel.lignes.length > 0 && (
        <div className="declarations-footer-total">
          <span>Masse salariale nette</span>
          <span className="declarations-footer-amount">
            {formaterMontant(livreMensuel.totaux.net_a_payer)}
          </span>
        </div>
      )}
    </div>
  );

  // ---- TAB 2: Livre annuel ----
  const renderAnnuel = (): React.ReactElement => (
    <div>
      <div className="declarations-section-header">
        <h4>Livre de paie annuel — {selectedAnnee}</h4>
      </div>
      <div className="declarations-info-bar">
        <div className="declarations-info-item">
          <span className="declarations-info-label">Employeur</span>
          <span className="declarations-info-value">{employeur}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">Annee</span>
          <span className="declarations-info-value">{selectedAnnee}</span>
        </div>
      </div>
      <table className="etab-table">
        <thead>
          <tr>
            <th>Mois</th>
            <th>Effectif</th>
            <th>Brut</th>
            <th>CNSS Sal.</th>
            <th>ITS</th>
            <th>CAMU</th>
            <th>TOL</th>
            <th>Total ret.</th>
            <th>Net a payer</th>
          </tr>
        </thead>
        <tbody>
          {livreAnnuel.mois.length === 0 ? (
            <tr>
              <td colSpan={9} className="etab-table-empty">
                Aucune donnee
              </td>
            </tr>
          ) : (
            livreAnnuel.mois.map((m) => (
              <tr key={m.mois}>
                <td>{MOIS_NOMS[m.mois]}</td>
                <td>{m.lignes.length}</td>
                <td>{formaterMontant(m.totaux.brut)}</td>
                <td>{formaterMontant(m.totaux.cnss_salariale)}</td>
                <td>{formaterMontant(m.totaux.its)}</td>
                <td>{formaterMontant(m.totaux.camu)}</td>
                <td>{formaterMontant(m.totaux.tol)}</td>
                <td>{formaterMontant(m.totaux.total_retenues)}</td>
                <td>{formaterMontant(m.totaux.net_a_payer)}</td>
              </tr>
            ))
          )}
        </tbody>
        {livreAnnuel.mois.length > 0 && (
          <tfoot>
            <tr className="livre-paie-totaux">
              <td colSpan={2}>TOTAUX</td>
              <td>{formaterMontant(livreAnnuel.totaux.brut)}</td>
              <td>{formaterMontant(livreAnnuel.totaux.cnss_salariale)}</td>
              <td>{formaterMontant(livreAnnuel.totaux.its)}</td>
              <td>{formaterMontant(livreAnnuel.totaux.camu)}</td>
              <td>{formaterMontant(livreAnnuel.totaux.tol)}</td>
              <td>{formaterMontant(livreAnnuel.totaux.total_retenues)}</td>
              <td>{formaterMontant(livreAnnuel.totaux.net_a_payer)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {livreAnnuel.mois.length > 0 && (
        <div className="declarations-footer-total">
          <span>Masse salariale nette annuelle</span>
          <span className="declarations-footer-amount">
            {formaterMontant(livreAnnuel.totaux.net_a_payer)}
          </span>
        </div>
      )}
    </div>
  );

  // ---- TAB 3: Par employe ----
  const renderParEmploye = (): React.ReactElement => {
    if (salaries.length === 0) {
      return (
        <div className="wizard-alert info">
          Aucune donnee — ajoutez des salaries pour consulter le livre par employe.
        </div>
      );
    }

    return (
      <div>
        <div className="declarations-section-header">
          <h4>Livre de paie par employe — {selectedAnnee}</h4>
        </div>
        <div className="livre-paie-selector">
          <div className="wizard-form-group">
            <label>Salarie</label>
            <select
              value={selectedSalarieId}
              onChange={(e) => setSelectedSalarieId(e.target.value)}
            >
              {salaries.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {s.identite?.nom || ''} {s.identite?.prenom || ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        {livreEmploye ? (
          <>
            <div className="declarations-info-bar">
              <div className="declarations-info-item">
                <span className="declarations-info-label">Salarie</span>
                <span className="declarations-info-value">{livreEmploye.nom} {livreEmploye.prenom}</span>
              </div>
              <div className="declarations-info-item">
                <span className="declarations-info-label">Annee</span>
                <span className="declarations-info-value">{livreEmploye.annee}</span>
              </div>
            </div>
            <table className="etab-table">
              <thead>
                <tr>
                  <th>Mois</th>
                  <th>Salaire base</th>
                  <th>Brut</th>
                  <th>CNSS Sal.</th>
                  <th>ITS</th>
                  <th>CAMU</th>
                  <th>TOL</th>
                  <th>Total ret.</th>
                  <th>Net a payer</th>
                </tr>
              </thead>
              <tbody>
                {livreEmploye.mois.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="etab-table-empty">
                      Aucune donnee
                    </td>
                  </tr>
                ) : (
                  livreEmploye.mois.map((m) => (
                    <tr key={m.mois}>
                      <td>{MOIS_NOMS[m.mois]}</td>
                      <td>{formaterMontant(m.salaire_base)}</td>
                      <td>{formaterMontant(m.brut)}</td>
                      <td>{formaterMontant(m.cnss_salariale)}</td>
                      <td>{formaterMontant(m.its)}</td>
                      <td>{formaterMontant(m.camu)}</td>
                      <td>{formaterMontant(m.tol)}</td>
                      <td>{formaterMontant(m.total_retenues)}</td>
                      <td>{formaterMontant(m.net_a_payer)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {livreEmploye.mois.length > 0 && (
                <tfoot>
                  <tr className="livre-paie-totaux">
                    <td>TOTAUX</td>
                    <td>{formaterMontant(livreEmploye.totaux.salaire_base)}</td>
                    <td>{formaterMontant(livreEmploye.totaux.brut)}</td>
                    <td>{formaterMontant(livreEmploye.totaux.cnss_salariale)}</td>
                    <td>{formaterMontant(livreEmploye.totaux.its)}</td>
                    <td>{formaterMontant(livreEmploye.totaux.camu)}</td>
                    <td>{formaterMontant(livreEmploye.totaux.tol)}</td>
                    <td>{formaterMontant(livreEmploye.totaux.total_retenues)}</td>
                    <td>{formaterMontant(livreEmploye.totaux.net_a_payer)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
            {livreEmploye.mois.length > 0 && (
              <div className="declarations-footer-total">
                <span>Net annuel {livreEmploye.nom} {livreEmploye.prenom}</span>
                <span className="declarations-footer-amount">
                  {formaterMontant(livreEmploye.totaux.net_a_payer)}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="wizard-alert info">
            Selectionnez un salarie pour afficher son livre de paie.
          </div>
        )}
      </div>
    );
  };

  // ---- TAB 4: Charges fiscales ----
  const renderFiscal = (): React.ReactElement => (
    <div>
      <div className="declarations-section-header">
        <h4>Etat des charges fiscales — {MOIS_NOMS[selectedMois]} {selectedAnnee}</h4>
      </div>
      <div className="declarations-info-bar">
        <div className="declarations-info-item">
          <span className="declarations-info-label">Employeur</span>
          <span className="declarations-info-value">{employeur}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">Periode</span>
          <span className="declarations-info-value">{MOIS_NOMS[selectedMois]} {selectedAnnee}</span>
        </div>
      </div>
      <table className="etab-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prenom</th>
            <th>Brut</th>
            <th>ITS</th>
            <th>TUS Impot</th>
            <th>TUS CNSS</th>
            <th>TOL</th>
            <th>Taxe reg.</th>
            <th>Total fiscal</th>
          </tr>
        </thead>
        <tbody>
          {chargesFiscales.lignes.length === 0 ? (
            <tr>
              <td colSpan={9} className="etab-table-empty">
                Aucune donnee
              </td>
            </tr>
          ) : (
            chargesFiscales.lignes.map((l, idx) => (
              <tr key={idx}>
                <td>{l.nom}</td>
                <td>{l.prenom}</td>
                <td>{formaterMontant(l.brut)}</td>
                <td>{formaterMontant(l.its)}</td>
                <td>{formaterMontant(l.tus_impot)}</td>
                <td>{formaterMontant(l.tus_cnss)}</td>
                <td>{formaterMontant(l.tol)}</td>
                <td>{formaterMontant(l.taxe_regionale)}</td>
                <td>{formaterMontant(l.total_fiscal)}</td>
              </tr>
            ))
          )}
        </tbody>
        {chargesFiscales.lignes.length > 0 && (
          <tfoot>
            <tr className="livre-paie-totaux">
              <td colSpan={2}>TOTAUX</td>
              <td>{formaterMontant(chargesFiscales.totaux.brut)}</td>
              <td>{formaterMontant(chargesFiscales.totaux.its)}</td>
              <td>{formaterMontant(chargesFiscales.totaux.tus_impot)}</td>
              <td>{formaterMontant(chargesFiscales.totaux.tus_cnss)}</td>
              <td>{formaterMontant(chargesFiscales.totaux.tol)}</td>
              <td>{formaterMontant(chargesFiscales.totaux.taxe_regionale)}</td>
              <td>{formaterMontant(chargesFiscales.totaux.total_fiscal)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {chargesFiscales.lignes.length > 0 && (
        <div className="declarations-footer-total">
          <span>Total charges fiscales</span>
          <span className="declarations-footer-amount">
            {formaterMontant(chargesFiscales.totaux.total_fiscal)}
          </span>
        </div>
      )}
    </div>
  );

  // ---- TAB 5: Charges sociales ----
  const renderSocial = (): React.ReactElement => (
    <div>
      <div className="declarations-section-header">
        <h4>Etat des charges sociales — {MOIS_NOMS[selectedMois]} {selectedAnnee}</h4>
      </div>
      <div className="declarations-info-bar">
        <div className="declarations-info-item">
          <span className="declarations-info-label">Employeur</span>
          <span className="declarations-info-value">{employeur}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">Periode</span>
          <span className="declarations-info-value">{MOIS_NOMS[selectedMois]} {selectedAnnee}</span>
        </div>
      </div>
      <table className="etab-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prenom</th>
            <th>Brut</th>
            <th>CNSS Sal.</th>
            <th>PVID Pat.</th>
            <th>AF Pat.</th>
            <th>AT Pat.</th>
            <th>CAMU</th>
            <th>Total social</th>
          </tr>
        </thead>
        <tbody>
          {chargesSociales.lignes.length === 0 ? (
            <tr>
              <td colSpan={9} className="etab-table-empty">
                Aucune donnee
              </td>
            </tr>
          ) : (
            chargesSociales.lignes.map((l, idx) => (
              <tr key={idx}>
                <td>{l.nom}</td>
                <td>{l.prenom}</td>
                <td>{formaterMontant(l.brut)}</td>
                <td>{formaterMontant(l.cnss_salariale)}</td>
                <td>{formaterMontant(l.cnss_patronale_pvid)}</td>
                <td>{formaterMontant(l.cnss_patronale_af)}</td>
                <td>{formaterMontant(l.cnss_patronale_at)}</td>
                <td>{formaterMontant(l.camu)}</td>
                <td>{formaterMontant(l.total_social)}</td>
              </tr>
            ))
          )}
        </tbody>
        {chargesSociales.lignes.length > 0 && (
          <tfoot>
            <tr className="livre-paie-totaux">
              <td colSpan={2}>TOTAUX</td>
              <td>{formaterMontant(chargesSociales.totaux.brut)}</td>
              <td>{formaterMontant(chargesSociales.totaux.cnss_salariale)}</td>
              <td>{formaterMontant(chargesSociales.totaux.cnss_patronale_pvid)}</td>
              <td>{formaterMontant(chargesSociales.totaux.cnss_patronale_af)}</td>
              <td>{formaterMontant(chargesSociales.totaux.cnss_patronale_at)}</td>
              <td>{formaterMontant(chargesSociales.totaux.camu)}</td>
              <td>{formaterMontant(chargesSociales.totaux.total_social)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {chargesSociales.lignes.length > 0 && (
        <div className="declarations-footer-total">
          <span>Total charges sociales</span>
          <span className="declarations-footer-amount">
            {formaterMontant(chargesSociales.totaux.total_social)}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="livre-paie-page">
      <div className="livre-paie-header">
        <div>
          <h3>Livre de paie</h3>
          <p>Registre obligatoire, etats des charges fiscales et sociales — CGI 2026</p>
        </div>
        {renderPeriodSelector()}
      </div>

      <div className="livre-paie-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`livre-paie-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="livre-paie-content">
        {activeTab === 'mensuel' && renderMensuel()}
        {activeTab === 'annuel' && renderAnnuel()}
        {activeTab === 'employe' && renderParEmploye()}
        {activeTab === 'fiscal' && renderFiscal()}
        {activeTab === 'social' && renderSocial()}
      </div>
    </div>
  );
}

export default LivrePaiePage;
