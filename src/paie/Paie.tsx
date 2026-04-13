import React, { useState, useEffect, useCallback } from 'react';
import './Paie.css';
import Icon from '../dashboard/Icon';
import StepDemarrage from './components/StepDemarrage';
import StepInitialisation from './components/StepInitialisation';
import PaieDashboard from './components/PaieDashboard';
import SalarieWizard from './components/SalarieWizard';
import AssistantDeclarations from './components/AssistantDeclarations';
import PaieApp from './components/PaieApp';
import API_BASE from '../utils/api';
import type { Salarie, Etablissement, SalarieIdentite, SalarieEmploi, SalarieSalaireHoraires, SalarieAvantagesNature } from './components/wizardTypes';
import type { EtablissementFormData } from './components/EtablissementWizard';

const MOIS: string[] = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
];

interface StepItem {
  id: number;
  label: string;
}

const STEPS: StepItem[] = [
  { id: 1, label: 'Démarrage' },
  { id: 2, label: 'Initialisation' },
  { id: 3, label: 'Établissements' },
  { id: 4, label: 'Salariés' },
  { id: 5, label: 'Finalisation' },
];

interface CreatedSalarie {
  code: string;
  nom: string;
  prenom: string;
}

interface PaieConfig {
  mois?: number;
  annee?: number;
  step?: number;
  mode?: string;
}

interface PaieProps {
  entiteId: string | number | null;
}

function Paie({ entiteId }: PaieProps): React.ReactElement {
  const now = new Date();
  const [mois, setMois] = useState<number>(0);
  const [annee, setAnnee] = useState<number>(now.getFullYear());
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [showSalarieWizard, setShowSalarieWizard] = useState<boolean>(false);
  const [showAssistantDeclarations, setShowAssistantDeclarations] = useState<boolean>(false);
  const [lastCreatedSalarie, setLastCreatedSalarie] = useState<CreatedSalarie | null>(null);
  const [paieMode, setPaieMode] = useState<string>('wizard');
  const [searchNom, setSearchNom] = useState<string>('');
  const [searchPrenom, setSearchPrenom] = useState<string>('');
  const [configLoaded, setConfigLoaded] = useState<boolean>(false);

  // Chargement donnees API
  const loadData = useCallback(async () => {
    if (!entiteId) return;
    try {
      const [configRes, etabRes, salRes] = await Promise.all([
        fetch(`${API_BASE}/api/paie/config`),
        fetch(`${API_BASE}/api/paie/etablissements`),
        fetch(`${API_BASE}/api/paie/salaries`),
      ]);
      const configData = await configRes.json();
      const etabData = await etabRes.json();
      const salData = await salRes.json();

      if (configData.config) {
        const c = configData.config as PaieConfig;
        setMois(c.mois ?? 0);
        setAnnee(c.annee || now.getFullYear());
        setCurrentStep(c.step || 1);
        setPaieMode(c.mode || 'wizard');
        if (c.step && c.step > 1) {
          const steps = new Set<number>();
          for (let i = 1; i < c.step; i++) steps.add(i);
          if (c.mode === 'app') steps.add(5);
          setCompletedSteps(steps);
        }
      }

      if (etabData.etablissements) {
        setEtablissements(etabData.etablissements.map((e: { id: number | string; raison_sociale?: string; nui?: string; data?: string | EtablissementFormData }) => {
          const parsedData = typeof e.data === 'string' ? JSON.parse(e.data) as EtablissementFormData : e.data;
          return {
            id: e.id,
            raison_sociale: e.raison_sociale,
            nui: e.nui,
            data: parsedData,
          };
        }));
      }

      if (salData.salaries) {
        setSalaries(salData.salaries.map((s: { id: number | string; etablissement_id?: number | string; data?: string | Record<string, SalarieIdentite | SalarieEmploi | SalarieSalaireHoraires | SalarieAvantagesNature | undefined> }) => {
          const d = typeof s.data === 'string' ? JSON.parse(s.data) as Record<string, SalarieIdentite | SalarieEmploi | SalarieSalaireHoraires | SalarieAvantagesNature | undefined> : s.data || {};
          return {
            id: s.id,
            etablissement_id: s.etablissement_id,
            identite: d.identite as SalarieIdentite | undefined,
            emploi: d.emploi as SalarieEmploi | undefined,
            salaire_horaires: d.salaire_horaires as SalarieSalaireHoraires | undefined,
            avantages_nature: d.avantages_nature as SalarieAvantagesNature | undefined,
          };
        }));
      }

      setConfigLoaded(true);
    } catch {
      setConfigLoaded(true);
    }
  }, [entiteId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Sauvegarde config auto
  const saveConfig = useCallback(async () => {
    if (!entiteId || !configLoaded) return;
    try {
      await fetch(`${API_BASE}/api/paie/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devise: 'XAF', mois, annee,
          step: currentStep, mode: paieMode,
        }),
      });
    } catch {
      // Silently handle config save errors
    }
  }, [entiteId, configLoaded, mois, annee, currentStep, paieMode]);

  useEffect(() => { saveConfig(); }, [saveConfig]);

  // Handlers
  const periodeDefinie = mois >= 0 && mois < 12 && (completedSteps.has(1) || currentStep > 1);
  const periodeLabel = periodeDefinie ? `${MOIS[mois]} ${annee}` : 'Période non définie';
  const periodeOuverte = completedSteps.has(1);

  const handleSuivant = (): void => {
    if (currentStep < 5) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(s => s + 1);
    }
  };

  const toEtablissement = (etab: EtablissementFormData, id: number | string): Etablissement => ({
    id,
    raison_sociale: etab.raison_sociale,
    nui: etab.nui || undefined,
    data: etab,
  });

  const handleAddEtablissement = async (etab: EtablissementFormData): Promise<void> => {
    if (!entiteId) {
      setEtablissements(prev => [...prev, toEtablissement(etab, Date.now())]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/paie/etablissements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raison_sociale: etab.raison_sociale,
          nui: etab.nui || null,
          data: etab,
        }),
      });
      const result = await res.json();
      if (result.etablissement) {
        const saved = result.etablissement as { id: number; raison_sociale?: string; nui?: string };
        setEtablissements(prev => [...prev, { id: saved.id, raison_sociale: saved.raison_sociale, nui: saved.nui, data: etab }]);
      }
    } catch {
      setEtablissements(prev => [...prev, toEtablissement(etab, Date.now())]);
    }
  };

  const handleUpdateEtablissement = async (id: number | string, etab: EtablissementFormData): Promise<void> => {
    if (!entiteId) {
      setEtablissements(prev => prev.map(e => e.id === id ? { ...e, raison_sociale: etab.raison_sociale, nui: etab.nui || undefined, data: etab } : e));
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/paie/etablissements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raison_sociale: etab.raison_sociale,
          nui: etab.nui || null,
          data: etab,
        }),
      });
      const result = await res.json();
      if (result.etablissement) {
        const saved = result.etablissement as { id: number; raison_sociale?: string; nui?: string };
        setEtablissements(prev => prev.map(e => e.id === saved.id ? { ...e, raison_sociale: saved.raison_sociale, nui: saved.nui, data: etab } : e));
      }
    } catch {
      setEtablissements(prev => prev.map(e => e.id === id ? { ...e, raison_sociale: etab.raison_sociale, nui: etab.nui || undefined, data: etab } : e));
    }
  };

  const dataToSalarie = (data: Record<string, Record<string, string | number | boolean | null | undefined>>, id: number | string): Salarie => ({
    id,
    identite: data.identite as SalarieIdentite | undefined,
    emploi: data.emploi as SalarieEmploi | undefined,
    salaire_horaires: data.salaire_horaires as SalarieSalaireHoraires | undefined,
    avantages_nature: data.avantages_nature as SalarieAvantagesNature | undefined,
    etablissement_id: data.emploi?.etablissement as string | undefined,
  });

  const handleAddSalarie = async (data: Record<string, Record<string, string | number | boolean | null | undefined>>): Promise<void> => {
    const etabId = data.emploi?.etablissement || null;

    if (!entiteId) {
      const newSalarie = dataToSalarie(data, Date.now());
      setSalaries(prev => [...prev, newSalarie]);
      setShowSalarieWizard(false);
      setLastCreatedSalarie({
        code: newSalarie.identite?.code || '0001',
        nom: newSalarie.identite?.nom || '',
        prenom: newSalarie.identite?.prenom || '',
      });
      setShowAssistantDeclarations(true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/paie/salaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etablissement_id: etabId ? Number(etabId) : null,
          data: data,
        }),
      });
      const result = await res.json();
      if (result.salarie) {
        const saved = result.salarie as { id: number | string; etablissement_id?: number | string; data?: string | Record<string, Record<string, string | number | boolean | null | undefined>> };
        const d = typeof saved.data === 'string' ? JSON.parse(saved.data) as Record<string, Record<string, string | number | boolean | null | undefined>> : saved.data || {};
        const newSalarie = dataToSalarie(d, saved.id);
        setSalaries(prev => [...prev, newSalarie]);
        setShowSalarieWizard(false);
        setLastCreatedSalarie({
          code: newSalarie.identite?.code || '0001',
          nom: newSalarie.identite?.nom || '',
          prenom: newSalarie.identite?.prenom || '',
        });
        setShowAssistantDeclarations(true);
      }
    } catch {
      const newSalarie = dataToSalarie(data, Date.now());
      setSalaries(prev => [...prev, newSalarie]);
      setShowSalarieWizard(false);
    }
  };

  // Filtrage des salaries
  const filteredSalaries = salaries.filter(s =>
    (s.identite?.nom || '').toLowerCase().includes(searchNom.toLowerCase()) &&
    (s.identite?.prenom || '').toLowerCase().includes(searchPrenom.toLowerCase())
  );

  // App mode
  if (paieMode === 'app') {
    return (
      <div className="paie-module">
        <div className="paie-periode-bar">
          <span className="periode-icon"><Icon name="lock-open" color="green" /></span>
          <span className="periode-label">{periodeLabel}</span>
        </div>
        <PaieApp
          salaries={salaries}
          etablissements={etablissements}
          periodeLabel={periodeLabel}
          entiteId={entiteId}
          onSalarieAdded={handleAddSalarie}
        />
      </div>
    );
  }

  // Wizard mode
  return (
    <div className="paie-module">
      <div className="paie-periode-bar">
        <span className="periode-icon"><Icon name={periodeOuverte ? 'lock-open' : 'lock'} color={periodeOuverte ? 'green' : 'gray'} /></span>
        <span className="periode-label">{periodeLabel}</span>
      </div>

      <div className="paie-header-bar">
        <div>
          <h2 className="paie-title">Création de votre dossier</h2>
          <p className="paie-subtitle">Cet assistant vous accompagne dans le paramétrage de votre dossier.</p>
        </div>
      </div>

      <div className="paie-body">
        <aside className="paie-stepper">
          {STEPS.map((step, index) => {
            const isActive = step.id === currentStep;
            const isDone = completedSteps.has(step.id);
            const isLast = index === STEPS.length - 1;
            return (
              <div key={step.id} className="stepper-wrapper">
                <button
                  className={`stepper-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                  onClick={() => setCurrentStep(step.id)}
                >
                  <span className="stepper-indicator">
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : step.id}
                  </span>
                  <span className="stepper-label">{step.label}</span>
                </button>
                {!isLast && <div className={`stepper-line ${isDone ? 'done' : ''}`}></div>}
              </div>
            );
          })}
        </aside>

        <div className="paie-content">
          {currentStep === 1 && (
            <StepDemarrage mois={mois} annee={annee} onMoisChange={setMois} onAnneeChange={setAnnee} />
          )}
          {currentStep === 2 && (
            <StepInitialisation mois={mois} annee={annee} />
          )}
          {currentStep === 3 && (
            <PaieDashboard
              etablissements={etablissements}
              onAddEtablissement={handleAddEtablissement}
              onUpdateEtablissement={handleUpdateEtablissement}
              entiteId={entiteId}
            />
          )}
          {currentStep === 4 && (
            <div className="paie-dashboard">
              <div className="paie-dashboard-header">
                <h3>Salariés</h3>
                <p>Ajoutez les salariés rattachés à vos établissements.</p>
                <p>Vous devez créer au moins un salarié pour passer à l'étape suivante.</p>
              </div>

              <div className="paie-dashboard-actions">
                <button className="btn-add-etab" onClick={() => setShowSalarieWizard(true)}>
                  + Ajouter un salarié
                </button>
              </div>

              <div className="etab-table-wrapper">
                <table className="etab-table">
                  <thead>
                    <tr>
                      <th>Nom <Icon name="chevron-up" size="sm" /></th>
                      <th>Prénom</th>
                      <th>Emploi</th>
                      <th>Établissement</th>
                    </tr>
                    <tr className="etab-search-row">
                      <th>
                        <div className="etab-search-cell">
                          <input type="text" value={searchNom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchNom(e.target.value)} placeholder="" />
                          <span className="etab-search-icon"><Icon name="search" size="sm" /></span>
                        </div>
                      </th>
                      <th>
                        <div className="etab-search-cell">
                          <input type="text" value={searchPrenom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchPrenom(e.target.value)} placeholder="" />
                          <span className="etab-search-icon"><Icon name="search" size="sm" /></span>
                        </div>
                      </th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSalaries.length === 0 ? (
                      <tr><td colSpan={4} className="etab-table-empty">Aucune donnée</td></tr>
                    ) : (
                      filteredSalaries.map((sal) => {
                        const etab = etablissements.find(e => String(e.id) === String(sal.emploi?.etablissement));
                        return (
                          <tr key={sal.id}>
                            <td>{sal.identite?.nom || '-'}</td>
                            <td>{sal.identite?.prenom || '-'}</td>
                            <td>{sal.emploi?.emploi || '-'}</td>
                            <td>{etab ? etab.raison_sociale : '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="paie-pagination">
                <span>Voir <select className="pagination-select"><option>25</option></select> éléments</span>
                <span>Page <input className="pagination-input" type="text" value={filteredSalaries.length > 0 ? '1' : '0'} readOnly /> sur {filteredSalaries.length > 0 ? 1 : 0}</span>
                <span>{filteredSalaries.length} élément{filteredSalaries.length !== 1 ? 's' : ''}</span>
              </div>

              {showSalarieWizard && (
                <SalarieWizard
                  onClose={() => setShowSalarieWizard(false)}
                  onSave={handleAddSalarie}
                  etablissements={etablissements}
                  salaries={salaries}
                />
              )}

              {showAssistantDeclarations && lastCreatedSalarie && (
                <AssistantDeclarations
                  salarie={lastCreatedSalarie}
                  onClose={() => { setShowAssistantDeclarations(false); setLastCreatedSalarie(null); }}
                />
              )}
            </div>
          )}
          {currentStep === 5 && (
            <div className="paie-placeholder">
              <h3>Finalisation</h3>
              <p>Vérifiez et finalisez la configuration de votre dossier.</p>
              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button className="btn-paie-suivant" onClick={() => { setCompletedSteps(prev => new Set([...prev, 5])); setPaieMode('app'); }}>
                  Fermer
                </button>
              </div>
            </div>
          )}

          <div className="paie-footer-bar">
            <div></div>
            <button className="btn-paie-suivant" onClick={handleSuivant}>Suivant</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Paie;
