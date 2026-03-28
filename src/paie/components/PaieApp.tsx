// @ts-nocheck
import React, { useState } from 'react';
import Icon from '../../dashboard/Icon';
import PaieMainDashboard from './PaieMainDashboard';
import SalariesListPage from './SalariesListPage';
import SalarieWizard from './SalarieWizard';
import OrganismesPage from './OrganismesPage';
import AbsencesPage from './AbsencesPage';
import AvantagesNaturePage from './AvantagesNaturePage';
import DeclarationsPage from './DeclarationsPage';
import LivrePaiePage from './LivrePaiePage';
import RubriquesPage from './RubriquesPage';

interface NavChild {
  id: string;
  label: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  children?: NavChild[];
}

interface Etablissement {
  id: number | string;
  raison_sociale?: string;
  [key: string]: string | number | Record<string, string | number | undefined> | undefined;
}

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

interface Salarie {
  id: number | string;
  identite?: SalarieIdentite;
  emploi?: SalarieEmploi;
  salaire_horaires?: SalarieSalaireHoraires;
  avantages_nature?: SalarieAvantagesNature;
  [key: string]: string | number | SalarieIdentite | SalarieEmploi | SalarieSalaireHoraires | SalarieAvantagesNature | null | undefined;
}

const PAIE_NAV_ITEMS: NavItem[] = [
  { id: 'tableau-de-bord', label: 'Tableau de bord', icon: 'dashboard' },
  { id: 'actualites', label: 'Actualités', icon: 'info' },
  { id: 'salaries', label: 'Salariés', icon: 'people', children: [
    { id: 'salaries-liste', label: 'Liste des salariés' },
    { id: 'salaries-a-traiter', label: 'Salariés à traiter' },
    { id: 'consultation-bulletins', label: 'Consultation bulletins' },
    { id: 'documents-salarie', label: 'Documents' },
    { id: 'decompte-effectifs', label: 'Décompte des effectifs' },
    { id: 'avantages-nature', label: 'Avantages en nature' },
  ]},
  { id: 'absences', label: 'Absences', icon: 'calendar', children: [
    { id: 'conges-absences', label: 'Congés et absences' },
    { id: 'arrets-travail', label: 'Arrêts de travail' },
  ]},
  { id: 'bulletins', label: 'Bulletins', icon: 'document' },
  { id: 'declarations', label: 'Déclarations', icon: 'send' },
  { id: 'livre-paie', label: 'Livre de paie', icon: 'book' },
  { id: 'etats-controle', label: 'États de contrôle', icon: 'check' },
  { id: 'comptabilite', label: 'Comptabilité', icon: 'euro' },
  { id: 'rubriques', label: 'Rubriques', icon: 'list' },
  { id: 'organismes', label: 'Organismes', icon: 'business' },
  { id: 'dossier', label: 'Dossier', icon: 'folder' },
];

interface PaieAppProps {
  salaries: Salarie[];
  etablissements: Etablissement[];
  periodeLabel: string;
  entiteId?: string | number | null;
  onSalarieAdded: (data: Record<string, Record<string, string | number | boolean | null | undefined>>) => void;
}

function PaieApp({ salaries, etablissements, periodeLabel, entiteId, onSalarieAdded }: PaieAppProps): React.ReactElement {
  const [activePaiePage, setActivePaiePage] = useState<string>('tableau-de-bord');
  const [expandedNavGroups, setExpandedNavGroups] = useState<string[]>(['salaries']);
  const [showSalarieWizard, setShowSalarieWizard] = useState<boolean>(false);

  const renderAppPage = (): React.ReactElement => {
    switch (activePaiePage) {
      case 'tableau-de-bord':
        return <PaieMainDashboard salaries={salaries} etablissements={etablissements} />;
      case 'salaries-liste':
        return <SalariesListPage
          salaries={salaries.map(s => ({
            ...s,
            nom: s.identite?.nom || '',
            prenom: s.identite?.prenom || '',
            etablissement_nom: etablissements.find(e => String(e.id) === String(s.emploi?.etablissement))?.raison_sociale || ''
          }))}
          onAddSalarie={() => setShowSalarieWizard(true)}
        />;
      case 'avantages-nature':
        return <AvantagesNaturePage
          salaries={salaries}
          onUpdateSalarie={(salarieId: number | string, avantages: SalarieAvantagesNature) => {
            const idx = salaries.findIndex(s => s.id === salarieId);
            if (idx >= 0) {
              const updated = { ...salaries[idx], avantages_nature: avantages };
              const newList = [...salaries];
              newList[idx] = updated;
              onSalarieAdded({ avantages_nature: { salarie_id: salarieId, ...avantages } as Record<string, string | number | boolean | null | undefined> });
            }
          }}
        />;
      case 'conges-absences':
      case 'arrets-travail':
        return <AbsencesPage salaries={salaries} />;
      case 'organismes':
        return <OrganismesPage />;
      case 'declarations': {
        const now = new Date();
        return (
          <DeclarationsPage
            salaries={salaries}
            etablissements={etablissements}
            mois={now.getMonth() + 1}
            annee={now.getFullYear()}
          />
        );
      }
      case 'livre-paie': {
        const nowLp = new Date();
        return (
          <LivrePaiePage
            salaries={salaries}
            etablissements={etablissements}
            mois={nowLp.getMonth() + 1}
            annee={nowLp.getFullYear()}
          />
        );
      }
      case 'rubriques':
        return <RubriquesPage entiteId={entiteId ? Number(entiteId) : 0} />;
      default:
        return (
          <div style={{ padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>
              {PAIE_NAV_ITEMS.find(n => n.id === activePaiePage)?.label ||
               PAIE_NAV_ITEMS.flatMap(n => n.children || []).find(c => c.id === activePaiePage)?.label ||
               activePaiePage}
            </h2>
            <p style={{ color: '#999', fontSize: 13, marginTop: 12 }}>Cette page sera disponible prochainement.</p>
          </div>
        );
    }
  };

  return (
    <>
      <div className="paie-app-layout">
        <aside className="paie-app-sidebar">
          <nav className="paie-app-nav">
            {PAIE_NAV_ITEMS.map(item => {
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedNavGroups.includes(item.id);
              const isActive = activePaiePage === item.id;
              const isChildActive = hasChildren && item.children!.some(c => c.id === activePaiePage);

              return (
                <div key={item.id} className="paie-nav-group">
                  <button
                    className={`paie-nav-item ${isActive || isChildActive ? 'active' : ''}`}
                    onClick={() => {
                      if (hasChildren) {
                        setExpandedNavGroups(prev =>
                          prev.includes(item.id) ? prev.filter(g => g !== item.id) : [...prev, item.id]
                        );
                      } else {
                        setActivePaiePage(item.id);
                      }
                    }}
                  >
                    <Icon name={item.icon} size="sm" />
                    <span>{item.label}</span>
                    {hasChildren && (
                      <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size="sm" style={{ marginLeft: 'auto' }} />
                    )}
                  </button>
                  {hasChildren && isExpanded && (
                    <div className="paie-nav-children">
                      {item.children!.map(child => (
                        <button
                          key={child.id}
                          className={`paie-nav-child ${activePaiePage === child.id ? 'active' : ''}`}
                          onClick={() => setActivePaiePage(child.id)}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        <div className="paie-app-content">
          {renderAppPage()}
        </div>
      </div>

      {showSalarieWizard && (
        <SalarieWizard
          onClose={() => setShowSalarieWizard(false)}
          onSave={(data: Record<string, Record<string, string | number | boolean | null | undefined>>) => { onSalarieAdded(data); setShowSalarieWizard(false); }}
          etablissements={etablissements}
          salaries={salaries}
        />
      )}
    </>
  );
}

export default PaieApp;
