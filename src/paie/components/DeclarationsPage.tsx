import React, { useState, useMemo } from 'react';
import { formaterMontant } from '../utils/calculPaie';
import {
  genererBordereauCNSS,
  genererDAS,
  genererDeclarationNominative,
  verifierDeclaration,
} from '../data/declarations';
import type {
  BulletinResume,
  DeclarationCNSS,
  DeclarationDAS,
  DeclarationNominative,
  VerificationResult,
} from '../data/declarations';

const MOIS_NOMS: string[] = [
  '', 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

type TabId = 'cnss' | 'das' | 'nominative';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'cnss', label: 'Bordereau CNSS' },
  { id: 'das', label: 'DAS (Annuelle)' },
  { id: 'nominative', label: 'Nominative' },
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

interface DeclarationsPageProps {
  salaries: SalarieItem[];
  etablissements: EtablissementItem[];
  mois: number;
  annee: number;
}

/**
 * Construit des BulletinResume simules a partir des salaries enregistres.
 * En production, ceux-ci proviendraient des bulletins calcules.
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

function DeclarationsPage({
  salaries,
  etablissements,
  mois,
  annee,
}: DeclarationsPageProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabId>('cnss');
  const [selectedMois, setSelectedMois] = useState<number>(mois);
  const [selectedAnnee, setSelectedAnnee] = useState<number>(annee);
  const [selectedSalarieId, setSelectedSalarieId] = useState<string>(
    salaries.length > 0 ? String(salaries[0].id) : '',
  );

  const employeur = etablissements.length > 0
    ? (etablissements[0].raison_sociale || 'Employeur')
    : 'Employeur';
  const numeroCnss = etablissements.length > 0
    ? (String(etablissements[0].numero_cnss || ''))
    : '';
  const nui = etablissements.length > 0
    ? (String(etablissements[0].nui || ''))
    : '';

  const bulletinsMois: BulletinResume[] = useMemo(
    () => buildBulletinsResume(salaries, selectedMois, selectedAnnee),
    [salaries, selectedMois, selectedAnnee],
  );

  const bordereauCNSS: DeclarationCNSS = useMemo(
    () => genererBordereauCNSS(bulletinsMois, employeur, numeroCnss, selectedMois, selectedAnnee),
    [bulletinsMois, employeur, numeroCnss, selectedMois, selectedAnnee],
  );

  const validationCNSS: VerificationResult = useMemo(
    () => verifierDeclaration(bordereauCNSS),
    [bordereauCNSS],
  );

  const das: DeclarationDAS = useMemo(() => {
    const moisArr: BulletinResume[][] = Array.from({ length: 12 }, () => bulletinsMois);
    return genererDAS(moisArr, employeur, nui, selectedAnnee);
  }, [bulletinsMois, employeur, nui, selectedAnnee]);

  const validationDAS: VerificationResult = useMemo(
    () => verifierDeclaration(das),
    [das],
  );

  const nominative: DeclarationNominative | null = useMemo(() => {
    const bulletin = bulletinsMois.find((b) => b.id === selectedSalarieId);
    if (!bulletin) return null;
    return genererDeclarationNominative(bulletin, selectedSalarieId);
  }, [bulletinsMois, selectedSalarieId]);

  const renderStatusBadge = (valide: boolean): React.ReactElement => (
    <span className={valide ? 'declarations-status-ok' : 'declarations-status-err'}>
      {valide ? 'Valide' : 'Erreurs'}
    </span>
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

  const renderCNSS = (): React.ReactElement => (
    <div>
      <div className="declarations-section-header">
        <h4>Bordereau CNSS — {MOIS_NOMS[selectedMois]} {selectedAnnee}</h4>
        {renderStatusBadge(validationCNSS.valide)}
      </div>
      {!validationCNSS.valide && (
        <div className="wizard-alert error">
          {validationCNSS.erreurs.map((err, i) => (
            <div key={i}>{err}</div>
          ))}
        </div>
      )}
      <div className="declarations-info-bar">
        <div className="declarations-info-item">
          <span className="declarations-info-label">Employeur</span>
          <span className="declarations-info-value">{bordereauCNSS.employeur}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">N CNSS</span>
          <span className="declarations-info-value">{bordereauCNSS.numero_cnss || '—'}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">Effectif</span>
          <span className="declarations-info-value">{bordereauCNSS.lignes.length}</span>
        </div>
      </div>
      <table className="etab-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prenom</th>
            <th>Brut</th>
            <th>Plafond PVID</th>
            <th>Plafond AF/AT</th>
            <th>CNSS Sal.</th>
            <th>PVID Pat.</th>
            <th>AF Pat.</th>
            <th>AT Pat.</th>
          </tr>
        </thead>
        <tbody>
          {bordereauCNSS.lignes.length === 0 ? (
            <tr>
              <td colSpan={9} className="etab-table-empty">
                Aucune donnee
              </td>
            </tr>
          ) : (
            bordereauCNSS.lignes.map((sal) => (
              <tr key={sal.numero_ss}>
                <td>{sal.nom}</td>
                <td>{sal.prenom}</td>
                <td>{formaterMontant(sal.brut)}</td>
                <td>{formaterMontant(sal.plafond1)}</td>
                <td>{formaterMontant(sal.plafond2)}</td>
                <td>{formaterMontant(sal.cnss_salariale)}</td>
                <td>{formaterMontant(sal.cnss_patronale_pvid)}</td>
                <td>{formaterMontant(sal.cnss_patronale_af)}</td>
                <td>{formaterMontant(sal.cnss_patronale_at)}</td>
              </tr>
            ))
          )}
        </tbody>
        {bordereauCNSS.lignes.length > 0 && (
          <tfoot>
            <tr className="declarations-totaux">
              <td colSpan={2}>TOTAUX</td>
              <td>{formaterMontant(bordereauCNSS.totaux.brut_total)}</td>
              <td></td>
              <td></td>
              <td>{formaterMontant(bordereauCNSS.totaux.cnss_salariale_total)}</td>
              <td colSpan={3}>{formaterMontant(bordereauCNSS.totaux.cnss_patronale_total)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {bordereauCNSS.lignes.length > 0 && (
        <div className="declarations-footer-total">
          <span>Total a verser a la CNSS</span>
          <span className="declarations-footer-amount">
            {formaterMontant(bordereauCNSS.totaux.total_a_verser)}
          </span>
        </div>
      )}
    </div>
  );

  const renderDAS = (): React.ReactElement => (
    <div>
      <div className="declarations-section-header">
        <h4>Declaration Annuelle des Salaires (DAS) — {selectedAnnee}</h4>
        {renderStatusBadge(validationDAS.valide)}
      </div>
      {!validationDAS.valide && (
        <div className="wizard-alert error">
          {validationDAS.erreurs.map((err, i) => (
            <div key={i}>{err}</div>
          ))}
        </div>
      )}
      <div className="declarations-info-bar">
        <div className="declarations-info-item">
          <span className="declarations-info-label">Employeur</span>
          <span className="declarations-info-value">{das.employeur}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">NUI</span>
          <span className="declarations-info-value">{das.nui || '—'}</span>
        </div>
        <div className="declarations-info-item">
          <span className="declarations-info-label">Annee</span>
          <span className="declarations-info-value">{das.annee}</span>
        </div>
      </div>
      <table className="etab-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prenom</th>
            <th>Brut annuel</th>
            <th>ITS annuel</th>
            <th>CNSS annuel</th>
            <th>Net annuel</th>
          </tr>
        </thead>
        <tbody>
          {das.lignes.length === 0 ? (
            <tr>
              <td colSpan={6} className="etab-table-empty">
                Aucune donnee
              </td>
            </tr>
          ) : (
            das.lignes.map((sal, idx) => (
              <tr key={idx}>
                <td>{sal.nom}</td>
                <td>{sal.prenom}</td>
                <td>{formaterMontant(sal.brut_annuel)}</td>
                <td>{formaterMontant(sal.its_annuel)}</td>
                <td>{formaterMontant(sal.cnss_salariale_annuel)}</td>
                <td>{formaterMontant(sal.net_annuel)}</td>
              </tr>
            ))
          )}
        </tbody>
        {das.lignes.length > 0 && (
          <tfoot>
            <tr className="declarations-totaux">
              <td colSpan={2}>TOTAUX</td>
              <td>{formaterMontant(das.totaux.brut_total)}</td>
              <td>{formaterMontant(das.totaux.its_total)}</td>
              <td>{formaterMontant(das.totaux.cnss_total)}</td>
              <td>{formaterMontant(das.totaux.net_total)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  const renderNominative = (): React.ReactElement => {
    if (salaries.length === 0) {
      return (
        <div className="wizard-alert info">
          Aucune donnee — ajoutez des salaries pour generer les declarations nominatives.
        </div>
      );
    }

    return (
      <div>
        <div className="declarations-section-header">
          <h4>Declaration Nominative — {MOIS_NOMS[selectedMois]} {selectedAnnee}</h4>
        </div>
        <div className="declarations-salarie-selector">
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
        {nominative ? (
          <div className="declarations-card">
            <h4>Fiche individuelle — {nominative.salarie_nom} {nominative.salarie_prenom}</h4>
            <div className="declarations-card-row">
              <span className="declarations-card-label">N Securite Sociale</span>
              <span className="declarations-card-value">{nominative.numero_ss}</span>
            </div>
            <div className="declarations-card-row">
              <span className="declarations-card-label">Periode</span>
              <span className="declarations-card-value">{MOIS_NOMS[nominative.mois]} {nominative.annee}</span>
            </div>
            <div className="declarations-card-row">
              <span className="declarations-card-label">Salaire de base</span>
              <span className="declarations-card-value">{formaterMontant(nominative.salaire_base)}</span>
            </div>
            <div className="declarations-card-row">
              <span className="declarations-card-label">Salaire brut</span>
              <span className="declarations-card-value">{formaterMontant(nominative.brut)}</span>
            </div>
            <div className="declarations-card-row">
              <span className="declarations-card-label">CNSS salariale (4%)</span>
              <span className="declarations-card-value">{formaterMontant(nominative.cnss_salariale)}</span>
            </div>
            <div className="declarations-card-row">
              <span className="declarations-card-label">CNSS patronale PVID (8%)</span>
              <span className="declarations-card-value">{formaterMontant(nominative.cnss_patronale_vieillesse)}</span>
            </div>
            <div className="declarations-card-row">
              <span className="declarations-card-label">CNSS patronale AF (10,03%)</span>
              <span className="declarations-card-value">{formaterMontant(nominative.cnss_patronale_af)}</span>
            </div>
            <div className="declarations-card-row">
              <span className="declarations-card-label">CNSS patronale AT (2,25%)</span>
              <span className="declarations-card-value">{formaterMontant(nominative.cnss_patronale_at)}</span>
            </div>
            <div className="declarations-card-row">
              <span className="declarations-card-label">ITS (Art. 116 CGI)</span>
              <span className="declarations-card-value">{formaterMontant(nominative.its)}</span>
            </div>
            <div className="declarations-card-row">
              <span className="declarations-card-label">TUS Impot (1,5%)</span>
              <span className="declarations-card-value">{formaterMontant(nominative.tus_impot)}</span>
            </div>
            <div className="declarations-card-row">
              <span className="declarations-card-label">TUS CNSS (6%)</span>
              <span className="declarations-card-value">{formaterMontant(nominative.tus_cnss)}</span>
            </div>
            <div className="declarations-card-row">
              <span className="declarations-card-label">CAMU</span>
              <span className="declarations-card-value">{formaterMontant(nominative.camu_salariale)}</span>
            </div>
            <div className="declarations-card-row">
              <span className="declarations-card-label">Taxe sur les locaux</span>
              <span className="declarations-card-value">{formaterMontant(nominative.taxe_locaux)}</span>
            </div>
            <div className="declarations-card-row" style={{ borderTop: '2px solid #D4A843', marginTop: 8, paddingTop: 10 }}>
              <span className="declarations-card-label" style={{ fontWeight: 700, color: '#1A3A5C' }}>Net a payer</span>
              <span className="declarations-card-value" style={{ fontSize: 15, color: '#D4A843' }}>{formaterMontant(nominative.net_a_payer)}</span>
            </div>
          </div>
        ) : (
          <div className="wizard-alert info">
            Selectionnez un salarie pour afficher sa declaration nominative.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="declarations-page">
      <div className="declarations-header">
        <div>
          <h3>Declarations sociales et fiscales</h3>
          <p>Bordereau CNSS, DAS annuelle, declarations nominatives — CGI 2026</p>
        </div>
        {renderPeriodSelector()}
      </div>

      <div className="declarations-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`declarations-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="declarations-content">
        {activeTab === 'cnss' && renderCNSS()}
        {activeTab === 'das' && renderDAS()}
        {activeTab === 'nominative' && renderNominative()}
      </div>
    </div>
  );
}

export default DeclarationsPage;
