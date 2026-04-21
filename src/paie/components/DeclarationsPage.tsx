import React, { useState, useMemo } from 'react';
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
import {
  EtablissementItem,
  MOIS_NOMS,
  SalarieItem,
  TABS,
  TabId,
  buildBulletinsResume,
} from './declarations/declarationsShared';
import { CNSSTab } from './declarations/CNSSTab';
import { DASTab } from './declarations/DASTab';
import { NominativeTab } from './declarations/NominativeTab';

interface DeclarationsPageProps {
  salaries: SalarieItem[];
  etablissements: EtablissementItem[];
  mois: number;
  annee: number;
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

  return (
    <div className="declarations-page">
      <div className="declarations-header">
        <div>
          <h3>Declarations sociales et fiscales</h3>
          <p>Bordereau CNSS, DAS annuelle, declarations nominatives — CGI 2026</p>
        </div>
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
        {activeTab === 'cnss' && (
          <CNSSTab bordereau={bordereauCNSS} validation={validationCNSS} mois={selectedMois} annee={selectedAnnee} />
        )}
        {activeTab === 'das' && (
          <DASTab das={das} validation={validationDAS} annee={selectedAnnee} />
        )}
        {activeTab === 'nominative' && (
          <NominativeTab
            salaries={salaries}
            selectedSalarieId={selectedSalarieId}
            setSelectedSalarieId={setSelectedSalarieId}
            nominative={nominative}
            mois={selectedMois}
            annee={selectedAnnee}
          />
        )}
      </div>
    </div>
  );
}

export default DeclarationsPage;
