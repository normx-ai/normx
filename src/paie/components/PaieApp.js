import React, { useState } from 'react';
import Icon from '../../dashboard/Icon';
import PaieMainDashboard from './PaieMainDashboard';
import SalariesListPage from './SalariesListPage';
import SalarieWizard from './SalarieWizard';
import OrganismesPage from './OrganismesPage';
import AbsencesPage from './AbsencesPage';

const PAIE_NAV_ITEMS = [
  { id: 'tableau-de-bord', label: 'Tableau de bord', icon: 'dashboard' },
  { id: 'actualites', label: 'Actualités', icon: 'info' },
  { id: 'salaries', label: 'Salariés', icon: 'people', children: [
    { id: 'salaries-liste', label: 'Liste des salariés' },
    { id: 'salaries-a-traiter', label: 'Salariés à traiter' },
    { id: 'consultation-bulletins', label: 'Consultation bulletins' },
    { id: 'documents-salarie', label: 'Documents' },
    { id: 'decompte-effectifs', label: 'Décompte des effectifs' },
  ]},
  { id: 'absences', label: 'Absences', icon: 'calendar', children: [
    { id: 'conges-absences', label: 'Congés et absences' },
    { id: 'arrets-travail', label: 'Arrêts de travail' },
  ]},
  { id: 'bulletins', label: 'Bulletins', icon: 'document' },
  { id: 'declarations', label: 'Déclarations', icon: 'send' },
  { id: 'etats-controle', label: 'États de contrôle', icon: 'check' },
  { id: 'comptabilite', label: 'Comptabilité', icon: 'euro' },
  { id: 'organismes', label: 'Organismes', icon: 'business' },
  { id: 'dossier', label: 'Dossier', icon: 'folder' },
];

function PaieApp({ salaries, etablissements, periodeLabel, onSalarieAdded }) {
  const [activePaiePage, setActivePaiePage] = useState('tableau-de-bord');
  const [expandedNavGroups, setExpandedNavGroups] = useState(['salaries']);
  const [showSalarieWizard, setShowSalarieWizard] = useState(false);

  const renderAppPage = () => {
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
      case 'conges-absences':
      case 'arrets-travail':
        return <AbsencesPage salaries={salaries} />;
      case 'organismes':
        return <OrganismesPage />;
      case 'declarations':
        return (
          <div style={{ padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1A3A5C' }}>Déclarations sociales et fiscales</h2>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>Déclarations obligatoires auprès des organismes congolais</p>
            <div style={{ display: 'grid', gap: 16 }}>
              {[
                { org: 'CNSS', icon: '🏛', items: ['DNS - Déclaration Nominative des Salaires (mensuelle)', 'DISA - Déclaration Individuelle des Salaires Annuels'], color: '#1a5276' },
                { org: 'CAMU', icon: '🏥', items: ['Déclaration CAMU mensuelle (0,5% > 500 000 FCFA)'], color: '#148f77' },
                { org: 'Direction des Impôts', icon: '📋', items: ['ITS - Impôt sur les Traitements et Salaires (mensuel)', 'TUS - Taxe Unique sur les Salaires (mensuel)', 'DAS - Déclaration Annuelle des Salaires'], color: '#D4A843' },
                // ACPE et FONEA : financés via TUS, pas de déclaration paie directe
              ].map(d => (
                <div key={d.org} style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 16, borderLeft: `4px solid ${d.color}` }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#1A3A5C' }}>{d.icon} {d.org}</div>
                  {d.items.map((item, i) => (
                    <div key={i} style={{ fontSize: 13, padding: '3px 0', color: '#444' }}>• {item}</div>
                  ))}
                </div>
              ))}
            </div>
            <p style={{ color: '#999', fontSize: 12, marginTop: 16 }}>Génération automatique des déclarations — disponible prochainement.</p>
          </div>
        );
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
              const isChildActive = hasChildren && item.children.some(c => c.id === activePaiePage);

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
                      {item.children.map(child => (
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
          onSave={(data) => { onSalarieAdded(data); setShowSalarieWizard(false); }}
          etablissements={etablissements}
          salaries={salaries}
        />
      )}
    </>
  );
}

export default PaieApp;
