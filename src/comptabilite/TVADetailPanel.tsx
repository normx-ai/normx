import React from 'react';
import { LuChevronDown, LuPlus, LuDownload, LuRefreshCw } from 'react-icons/lu';
import {
  TabItem,
  DeclarationItem,
  TVALigne,
  TABS,
  fmtMontant,
} from './DeclarationTVA.types';
import ImpotSectionPanel from './ImpotSectionPanel';
import TVAFilePanel from './TVAFilePanel';
import TVATable from './TVATable';
import TVAHeader from './TVAHeader';

interface TVADetailPanelProps {
  selectedMois: number;
  selectedDecl: DeclarationItem | null;
  declarations: DeclarationItem[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
  eName: string;
  eSigle: string;
  eNif: string;
  eAdresse: string;
  // TVA tabs & lines
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lignes: TVALigne[];
  loadingLignes: boolean;
  loadLignes: () => void;
  loadDeclarations: () => void;
  // Impot selector
  selectedImpot: string;
  setSelectedImpot: (key: string) => void;
  revueStatus: Record<string, boolean>;
  setRevueStatus: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  sectionComptes: Record<string, string[]>;
  setSectionComptes: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  // Export
  showExportMenu: boolean;
  setShowExportMenu: (v: boolean) => void;
  // File panel
  showFilePanel: boolean;
  setShowFilePanel: (v: boolean) => void;
  entiteName: string;
  entiteSigle: string;
  entiteNif: string;
  entiteAdresse: string;
  // Line actions
  onAddLine: () => void;
  onEditLine: (ligne: TVALigne) => void;
  onDeleteLine: (id: number) => void;
  // Close
  onClose: () => void;
}

function TVADetailPanel(props: TVADetailPanelProps): React.ReactElement {
  const {
    selectedMois, selectedDecl, declarations, exerciceAnnee,
    entiteId, exerciceId,
    eName, eSigle, eNif, eAdresse,
    activeTab, setActiveTab, lignes, loadingLignes, loadLignes, loadDeclarations,
    selectedImpot, setSelectedImpot, revueStatus, setRevueStatus,
    sectionComptes, setSectionComptes,
    showExportMenu, setShowExportMenu,
    showFilePanel, setShowFilePanel,
    entiteName, entiteSigle, entiteNif, entiteAdresse,
    onAddLine, onEditLine, onDeleteLine, onClose,
  } = props;

  const tvaCollectee: number = selectedDecl ? parseFloat(String(selectedDecl.montant_tva_collectee || 0)) : 0;
  const tvaDeductible: number = selectedDecl ? parseFloat(String(selectedDecl.montant_tva_deductible || 0)) : 0;
  const tvaPayer: number = tvaCollectee - tvaDeductible;

  return (
    <>
      <TVAHeader
        selectedMois={selectedMois}
        selectedDecl={selectedDecl}
        declarations={declarations}
        exerciceAnnee={exerciceAnnee}
        eName={eName}
        eSigle={eSigle}
        eNif={eNif}
        eAdresse={eAdresse}
        selectedImpot={selectedImpot}
        setSelectedImpot={setSelectedImpot}
        setActiveTab={setActiveTab}
        revueStatus={revueStatus}
        setRevueStatus={setRevueStatus}
        showFilePanel={showFilePanel}
        setShowFilePanel={setShowFilePanel}
        onClose={onClose}
      />

      {/* Content area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedImpot === 'tva' ? (
            <>
              {/* TVA Tabs */}
              <div style={{ display: 'flex', borderBottom: '2px solid #e2e5ea', padding: '0 20px', background: '#fff' }}>
                {TABS.map((tab: TabItem) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
                      color: activeTab === tab.key ? '#1a1a1a' : '#888',
                      background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #D4A843' : '2px solid transparent',
                      cursor: 'pointer', marginBottom: -2, whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Export + Import + Add buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 20px 0' }}>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    style={{
                      padding: '7px 14px', border: '1px solid #ddd', borderRadius: 4, background: '#fff',
                      fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#333',
                    }}
                  >
                    <LuDownload size={14} />
                    Exporter
                    <LuChevronDown size={14} />
                  </button>
                  {showExportMenu && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff',
                      border: '1px solid #ddd', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      zIndex: 100, minWidth: 140, padding: '4px 0',
                    }}>
                      <div onClick={() => setShowExportMenu(false)} style={{ padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#333' }} onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.background = '#f5f6fa')} onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.background = '#fff')}>
                        Exporter en CSV
                      </div>
                      <div onClick={() => setShowExportMenu(false)} style={{ padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#333' }} onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.background = '#f5f6fa')} onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.background = '#fff')}>
                        Exporter en PDF
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => {
                    if (!selectedDecl?.id) return;
                    if (!window.confirm('Importer les lignes TVA depuis les écritures comptables du mois ? Les lignes existantes seront remplacées.')) return;
                    try {
                      const res: Response = await fetch(`/api/tva/importer-ecritures/${selectedDecl.id}`, { method: 'POST' });
                      const data: { message?: string; error?: string } = await res.json();
                      if (res.ok) {
                        alert(data.message);
                        loadLignes();
                        loadDeclarations();
                      } else {
                        alert(data.error || 'Erreur lors de l\'import.');
                      }
                    } catch (_e) { alert('Erreur réseau.'); }
                  }}
                  style={{
                    padding: '7px 14px', border: '1px solid #D4A843', borderRadius: 4, background: '#fff',
                    fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#D4A843', fontWeight: 600,
                  }}
                >
                  <LuRefreshCw size={14} />
                  Importer depuis les écritures
                </button>
                <button
                  onClick={onAddLine}
                  style={{
                    padding: '7px 14px', border: 'none', borderRadius: 4, background: '#D4A843',
                    fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontWeight: 600,
                  }}
                >
                  <LuPlus size={14} />
                  Ajouter
                </button>
              </div>

              {/* TVA Table */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 0' }}>
                <TVATable lignes={lignes} loadingLignes={loadingLignes} onEditLine={onEditLine} onDeleteLine={onDeleteLine} />
              </div>

              {/* Bottom KPI cards */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e5ea', display: 'flex', justifyContent: 'flex-end', gap: 16, background: '#f8f9fb' }}>
                <div style={{ border: '1px solid #e2e5ea', borderRadius: 6, padding: '12px 18px', background: '#fff', minWidth: 180, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 }}>{fmtMontant(tvaCollectee)}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Montant de la TVA collectée</div>
                </div>
                <div style={{ border: '1px solid #e2e5ea', borderRadius: 6, padding: '12px 18px', background: '#fff', minWidth: 180, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 }}>{fmtMontant(tvaDeductible)}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Montant de la TVA déductible</div>
                </div>
                <div style={{ border: '1px solid #e2e5ea', borderRadius: 6, padding: '12px 18px', background: '#fff', minWidth: 180, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: tvaPayer >= 0 ? '#1a1a1a' : '#dc2626', marginBottom: 2 }}>{fmtMontant(tvaPayer)}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>TVA à payer</div>
                </div>
              </div>
            </>
          ) : (
            <ImpotSectionPanel
              selectedImpot={selectedImpot}
              selectedMois={selectedMois}
              entiteId={entiteId}
              exerciceId={exerciceId}
              sectionComptes={sectionComptes}
              setSectionComptes={setSectionComptes}
            />
          )}
        </div>

        {/* File panel (right side) */}
        {showFilePanel && (
          <TVAFilePanel
            entiteName={entiteName}
            entiteSigle={entiteSigle}
            entiteNif={entiteNif}
            entiteAdresse={entiteAdresse}
            onClose={() => setShowFilePanel(false)}
          />
        )}
      </div>
    </>
  );
}

export default TVADetailPanel;
