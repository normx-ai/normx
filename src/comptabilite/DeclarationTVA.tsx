import React, { useState, useCallback, useEffect } from 'react';
import { LuChevronDown, LuChevronLeft, LuPenLine, LuTrash2, LuPlus, LuX, LuFileText, LuDownload, LuUpload, LuEye, LuRefreshCw } from 'react-icons/lu';
import { jsPDF } from 'jspdf';
import {
  DeclarationTVAProps,
  StatusBadgeProps,
  StatusStyleItem,
  ImpotSectionItem,
  TabItem,
  DeclarationItem,
  TVALigne,
  LineForm,
  LiveEntite,
  MOIS,
  STATUS_STYLES,
  IMPOTS_SECTIONS,
  TABS,
  thStyle,
  tdStyle,
  inputStyle,
  fmtMontant,
} from './DeclarationTVA.types';
import { buildDeclarationPDF } from './DeclarationTVA.pdf';
import ImpotSectionPanel from './ImpotSectionPanel';

// ===================== StatusBadge =====================

function StatusBadge({ statut }: StatusBadgeProps): React.ReactElement {
  const s: StatusStyleItem = STATUS_STYLES[statut] || STATUS_STYLES.nouvelle;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontSize: 13, fontWeight: 600,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

// ===================== MAIN COMPONENT =====================

function DeclarationTVA({ entiteId, exerciceId, exerciceAnnee, entiteName, entiteSigle, entiteNif, entiteAdresse, onBack, onGoToParametres }: DeclarationTVAProps): React.ReactElement {
  // Declarations (12 months)
  const [declarations, setDeclarations] = useState<DeclarationItem[]>([]);
  const [loadingDecl, setLoadingDecl] = useState<boolean>(false);
  const [selectedMois, setSelectedMois] = useState<number | null>(null);

  // Section d'impôt sélectionnée
  const [selectedImpot, setSelectedImpot] = useState<string>('tva');
  // Suivi de revue par impôt par mois
  const [revueStatus, setRevueStatus] = useState<Record<string, boolean>>({});
  // Comptes associés par section
  const [sectionComptes, setSectionComptes] = useState<Record<string, string[]>>({});

  // Right panel
  const [activeTab, setActiveTab] = useState<string>('collectee');
  const [lignes, setLignes] = useState<TVALigne[]>([]);
  const [loadingLignes, setLoadingLignes] = useState<boolean>(false);

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // File panel
  const [showFilePanel, setShowFilePanel] = useState<boolean>(false);

  // Missing info modal
  const [showMissingModal, setShowMissingModal] = useState<boolean>(false);

  // Live entity data (refresh from API to get latest NIF/address)
  const [liveEntite, setLiveEntite] = useState<LiveEntite | null>(null);
  useEffect(() => {
    if (!entiteId) return;
    fetch(`/api/entites/${entiteId}`).then((r: Response) => r.ok ? r.json() : null).then((data: LiveEntite | null) => {
      if (data) setLiveEntite(data);
    }).catch(() => { /* silently ignore */ });
  }, [entiteId]);
  const eName: string = liveEntite?.nom || entiteName || '';
  const eSigle: string = liveEntite?.sigle || entiteSigle || '';
  const eNif: string = liveEntite?.nif || entiteNif || '';
  const eAdresse: string = liveEntite?.adresse || entiteAdresse || '';

  // Add/Edit line modal
  const [showLineModal, setShowLineModal] = useState<boolean>(false);
  const [editingLine, setEditingLine] = useState<TVALigne | null>(null);
  const [lineForm, setLineForm] = useState<LineForm>({ groupe: '', reference: '', libelle: '', montant_net: '', taux_taxe: '', montant_taxe: '', date_document: '', avoir: false });

  // Load declarations
  const loadDeclarations = useCallback(async (): Promise<void> => {
    if (!entiteId || !exerciceId) return;
    setLoadingDecl(true);
    try {
      const res: Response = await fetch(`/api/tva/declarations/${entiteId}/${exerciceId}`);
      if (res.ok) {
        const data: DeclarationItem[] = await res.json();
        setDeclarations(data);
      } else {
        setDeclarations(MOIS.map((_: string, i: number) => ({
          id: null, mois: i + 1, statut: 'nouvelle', montant_tva_payer: 0,
        })));
      }
    } catch (_e) {
      // silently ignore
      setDeclarations(MOIS.map((_: string, i: number) => ({
        id: null, mois: i + 1, statut: 'nouvelle', montant_tva_payer: 0,
      })));
    }
    setLoadingDecl(false);
  }, [entiteId, exerciceId]);

  useEffect(() => { loadDeclarations(); }, [loadDeclarations]);

  // Check missing info on first select
  const handleSelectMois = (idx: number): void => {
    setSelectedMois(idx);
    setActiveTab('collectee');
    setShowFilePanel(false);
  };

  // Get selected declaration
  const selectedDecl: DeclarationItem | null = selectedMois !== null && declarations.length > 0
    ? declarations.find((d: DeclarationItem) => d.mois === selectedMois + 1) || { id: null, mois: selectedMois + 1, statut: 'nouvelle', montant_tva_payer: 0 }
    : null;

  // Load lines for selected declaration + tab
  const loadLignes = useCallback(async (): Promise<void> => {
    if (!selectedDecl || !selectedDecl.id) {
      setLignes([]);
      return;
    }
    setLoadingLignes(true);
    try {
      const res: Response = await fetch(`/api/tva/lignes/${selectedDecl.id}/${activeTab}`);
      if (res.ok) setLignes(await res.json());
      else setLignes([]);
    } catch (_e) {
      // silently ignore
      setLignes([]);
    }
    setLoadingLignes(false);
  }, [selectedDecl?.id, activeTab]);

  useEffect(() => { loadLignes(); }, [loadLignes]);

  // KPI computations
  const tvaCollectee: number = selectedDecl ? parseFloat(String(selectedDecl.montant_tva_collectee || 0)) : 0;
  const tvaDeductible: number = selectedDecl ? parseFloat(String(selectedDecl.montant_tva_deductible || 0)) : 0;
  const tvaPayer: number = tvaCollectee - tvaDeductible;

  // Add line
  const handleAddLine = (): void => {
    setEditingLine(null);
    setLineForm({ groupe: '', reference: '', libelle: '', montant_net: '', taux_taxe: '', montant_taxe: '', date_document: '', avoir: false });
    setShowLineModal(true);
  };

  // Edit line
  const handleEditLine = (ligne: TVALigne): void => {
    setEditingLine(ligne);
    setLineForm({
      groupe: ligne.groupe || '',
      reference: ligne.reference || '',
      libelle: ligne.libelle || '',
      montant_net: String(ligne.montant_net || ''),
      taux_taxe: String(ligne.taux_taxe || ''),
      montant_taxe: String(ligne.montant_taxe || ''),
      date_document: ligne.date_document ? ligne.date_document.substring(0, 10) : '',
      avoir: !!ligne.avoir,
    });
    setShowLineModal(true);
  };

  // Save line
  const handleSaveLine = async (): Promise<void> => {
    try {
      const payload: LineForm & { declaration_id: number | null; onglet: string } = {
        ...lineForm,
        declaration_id: selectedDecl ? selectedDecl.id : null,
        onglet: activeTab,
      };
      let res: Response;
      if (editingLine) {
        res = await fetch(`/api/tva/ligne/${editingLine.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/tva/ligne', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (res.ok) {
        setShowLineModal(false);
        loadLignes();
        loadDeclarations();
      } else {
        const data: { error?: string } = await res.json();
        alert(data.error || 'Erreur lors de l\'enregistrement.');
      }
    } catch (_e) {
      // silently ignore
      alert('Erreur réseau.');
    }
  };

  // Delete line
  const handleDeleteLine = async (id: number): Promise<void> => {
    if (!window.confirm('Supprimer cette ligne ?')) return;
    try {
      const res: Response = await fetch(`/api/tva/ligne/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadLignes();
        loadDeclarations();
      }
    } catch (_e) { /* silently ignore */ }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', gap: 0, background: '#f5f6fa' }}>

      {/* LEFT PANEL */}
      <div style={{ width: 320, minWidth: 280, borderRight: '1px solid #e2e5ea', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        {/* Title */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #e2e5ea' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Déclaration</span>
            <LuChevronDown size={16} color="#666" />
          </div>
          {/* Exercice dropdown */}
          <div style={{ marginBottom: 8 }}>
            <select
              value={exerciceAnnee || ''}
              disabled
              style={{ ...inputStyle, background: '#f5f6fa', color: '#555', cursor: 'default' }}
            >
              <option value={exerciceAnnee}>Exercice {exerciceAnnee}</option>
            </select>
          </div>
          {/* Type dropdown */}
          <div>
            <select
              value="mensuelle"
              disabled
              style={{ ...inputStyle, background: '#f5f6fa', color: '#555', cursor: 'default' }}
            >
              <option value="mensuelle">Déclaration mensuelle</option>
            </select>
          </div>
        </div>

        {/* Month list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingDecl && <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 14 }}>Chargement...</div>}
          {!loadingDecl && MOIS.map((moisName: string, idx: number) => {
            const decl: DeclarationItem = declarations.find((d: DeclarationItem) => d.mois === idx + 1) || { id: null, statut: 'nouvelle', montant_tva_payer: 0, mois: idx + 1 };
            const isSelected: boolean = selectedMois === idx;
            return (
              <div
                key={idx}
                onClick={() => handleSelectMois(idx)}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  background: isSelected ? '#fefce8' : '#fff',
                  borderLeft: isSelected ? '3px solid #d4a017' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{moisName}</span>
                  <StatusBadge statut={decl.statut || 'nouvelle'} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#666' }}>TVA mensuelle</span>
                  <span style={{ fontSize: 13, color: '#666' }}>{fmtMontant(decl.montant_tva_payer)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid #e2e5ea', fontSize: 13, color: '#888', textAlign: 'center' }}>
          {declarations.length} éléments
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', position: 'relative' }}>
        {selectedMois === null ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
            <LuFileText size={48} color="#ddd" style={{ marginBottom: 16 }} />
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Sélectionner un élément dans la liste
            </span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #e2e5ea' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>
                      Déclaration - {MOIS[selectedMois]} {exerciceAnnee}
                    </span>
                    <StatusBadge statut={selectedDecl?.statut || 'nouvelle'} />
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
                    Vérifiez chaque section d&apos;impôt avant de transmettre la déclaration unique à l&apos;administration fiscale.
                  </div>
                  {/* Sélecteur d'impôts */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <select
                      value={selectedImpot}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedImpot(e.target.value); if (e.target.value === 'tva') setActiveTab('collectee'); }}
                      style={{ ...inputStyle, maxWidth: 360, fontSize: 14, fontWeight: 600 }}
                    >
                      {IMPOTS_SECTIONS.map((s: ImpotSectionItem) => {
                        const rKey: string = `${selectedMois}_${s.key}`;
                        const isRevue: boolean = !!revueStatus[rKey];
                        return (
                          <option key={s.key} value={s.key}>
                            {isRevue ? '\u2713 ' : '\u25CB '}{s.label} — {s.description}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      onClick={() => {
                        const rKey: string = `${selectedMois}_${selectedImpot}`;
                        setRevueStatus((prev: Record<string, boolean>) => ({ ...prev, [rKey]: !prev[rKey] }));
                      }}
                      style={{
                        padding: '7px 14px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        border: revueStatus[`${selectedMois}_${selectedImpot}`] ? '1px solid #16a34a' : '1px solid #D4A843',
                        background: revueStatus[`${selectedMois}_${selectedImpot}`] ? '#dcfce7' : '#eff6ff',
                        color: revueStatus[`${selectedMois}_${selectedImpot}`] ? '#16a34a' : '#D4A843',
                        display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                      }}
                    >
                      {revueStatus[`${selectedMois}_${selectedImpot}`] ? '\u2713 Revue terminée' : 'Marquer comme revue'}
                    </button>
                  </div>
                  {/* Progression de revue */}
                  {(() => {
                    const total: number = IMPOTS_SECTIONS.length;
                    const revues: number = IMPOTS_SECTIONS.filter((s: ImpotSectionItem) => revueStatus[`${selectedMois}_${s.key}`]).length;
                    const pct: number = Math.round((revues / total) * 100);
                    return (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, maxWidth: 300, background: '#e5e7eb', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <div style={{ background: pct === 100 ? '#16a34a' : '#D4A843', height: '100%', width: `${pct}%`, borderRadius: 4, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 13, color: pct === 100 ? '#16a34a' : '#666', fontWeight: 500 }}>
                          {revues}/{total} sections revues
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={() => {
                      const decl: DeclarationItem | undefined = declarations.find((d: DeclarationItem) => d.mois === (selectedMois as number) + 1);
                      const pdfDoc: jsPDF = buildDeclarationPDF({
                        entiteName: eName, entiteSigle: eSigle, entiteNif: eNif, entiteAdresse: eAdresse,
                        moisName: MOIS[selectedMois as number], exerciceAnnee, declaration: decl || null
                      });
                      const blob: Blob = pdfDoc.output('blob');
                      const url: string = URL.createObjectURL(blob);
                      window.open(url, '_blank');
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#D4A843', fontSize: 13, fontWeight: 500 }}
                  >
                    <LuEye size={16} color="#D4A843" />
                    Voir la déclaration
                  </button>
                  <button
                    onClick={() => setShowFilePanel(!showFilePanel)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#D4A843', fontSize: 13, fontWeight: 500 }}
                  >
                    <LuPenLine size={14} color="#D4A843" />
                    Fichiers
                  </button>
                  <button
                    onClick={() => { setSelectedMois(null); setShowFilePanel(false); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    <LuX size={18} color="#888" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content area with optional file panel */}
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
                          } catch (_e) { /* silently ignore */ alert('Erreur réseau.'); }
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
                        onClick={handleAddLine}
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
                      {loadingLignes ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Chargement...</div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={thStyle}>Groupe</th>
                              <th style={thStyle}>Référence</th>
                              <th style={{ ...thStyle, minWidth: 160 }}>Libellé</th>
                              <th style={{ ...thStyle, textAlign: 'right' }}>Montant net</th>
                              <th style={{ ...thStyle, textAlign: 'right' }}>Taux de taxe</th>
                              <th style={{ ...thStyle, textAlign: 'right' }}>Montant de la taxe</th>
                              <th style={thStyle}>Date du document</th>
                              <th style={{ ...thStyle, textAlign: 'center' }}>Avoir</th>
                              <th style={{ ...thStyle, textAlign: 'center', width: 70 }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lignes.length === 0 ? (
                              <tr>
                                <td colSpan={9} style={{ padding: '40px 10px', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
                                  Aucun élément à afficher.
                                </td>
                              </tr>
                            ) : (
                              lignes.map((l: TVALigne) => (
                                <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                                  <td style={tdStyle}>{l.groupe || ''}</td>
                                  <td style={tdStyle}>{l.reference || ''}</td>
                                  <td style={tdStyle}>{l.libelle || ''}</td>
                                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMontant(l.montant_net)}</td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>{l.taux_taxe != null ? `${l.taux_taxe} %` : ''}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMontant(l.montant_taxe)}</td>
                              <td style={tdStyle}>{l.date_document ? new Date(l.date_document).toLocaleDateString('fr-FR') : ''}</td>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>{l.avoir ? 'Oui' : 'Non'}</td>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>
                                <button onClick={() => handleEditLine(l)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: '#D4A843' }} title="Modifier">
                                  <LuPenLine size={15} />
                                </button>
                                <button onClick={() => handleDeleteLine(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: '#dc2626' }} title="Supprimer">
                                  <LuTrash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
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
                  /* Autres sections d'impôts avec sélecteur de comptes */
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
                <div style={{ width: 320, borderLeft: '1px solid #e2e5ea', background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e5ea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Fichiers</span>
                    <button onClick={() => setShowFilePanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <LuX size={16} color="#888" />
                    </button>
                  </div>

                  {/* Drop zone */}
                  <div style={{ padding: 16 }}>
                    <div style={{
                      border: '2px dashed #ccc', borderRadius: 8, padding: '30px 16px', textAlign: 'center',
                      color: '#888', fontSize: 13, cursor: 'pointer', background: '#fafafa',
                    }}>
                      <LuUpload size={24} color="#bbb" style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                      Glisser, déposer un fichier ici ou <span style={{ color: '#D4A843', textDecoration: 'underline' }}>explorer</span>
                    </div>
                  </div>

                  {/* Storage */}
                  <div style={{ padding: '0 16px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Espace de stockage</div>
                    <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                      <div style={{ background: '#D4A843', height: '100%', width: '5%', borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>0 Mo / 100 Mo utilisés</div>
                  </div>

                  {/* Infos société */}
                  <div style={{ padding: '0 16px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>Infos société</div>
                    <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                      <div><strong>Nom :</strong> {entiteName || '\u2014'}</div>
                      <div><strong>Sigle :</strong> {entiteSigle || '\u2014'}</div>
                      <div><strong>NIF :</strong> {entiteNif || '\u2014'}</div>
                      <div><strong>Adresse :</strong> {entiteAdresse || '\u2014'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL: Missing info */}
      {showMissingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '24px 28px', maxWidth: 460, width: '90%', boxShadow: '0 8px 30px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>Impossible de gérer la déclaration de TVA</span>
              <button onClick={() => setShowMissingModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <LuX size={18} color="#888" />
              </button>
            </div>
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 14 }}>
              Ajoutez les informations suivantes dans les paramètres de votre entité pour gérer votre déclaration de TVA :
            </p>
            <ul style={{ fontSize: 14, color: '#333', marginBottom: 20, paddingLeft: 20 }}>
              {!eNif && <li style={{ marginBottom: 4 }}>NIF (Numéro d&apos;Identification Fiscale)</li>}
              {!eAdresse && <li style={{ marginBottom: 4 }}>Adresse complète</li>}
            </ul>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowMissingModal(false); if (onGoToParametres) onGoToParametres(); }}
                style={{
                  padding: '10px 20px', border: 'none', borderRadius: 4, background: '#D4A843',
                  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Ajouter des informations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add/Edit line */}
      {showLineModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '24px 28px', maxWidth: 540, width: '90%', boxShadow: '0 8px 30px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>{editingLine ? 'Modifier la ligne' : 'Ajouter une ligne'}</span>
              <button onClick={() => setShowLineModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <LuX size={18} color="#888" />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Groupe</label>
                <input style={inputStyle} value={lineForm.groupe} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, groupe: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Référence</label>
                <input style={inputStyle} value={lineForm.reference} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, reference: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Libellé</label>
                <input style={inputStyle} value={lineForm.libelle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, libelle: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Montant net</label>
                <input type="number" step="0.01" style={inputStyle} value={lineForm.montant_net} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, montant_net: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Taux de taxe (%)</label>
                <input type="number" step="0.01" style={inputStyle} value={lineForm.taux_taxe} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, taux_taxe: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Montant de la taxe</label>
                <input type="number" step="0.01" style={inputStyle} value={lineForm.montant_taxe} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, montant_taxe: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Date du document</label>
                <input type="date" style={inputStyle} value={lineForm.date_document} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, date_document: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                <input type="checkbox" id="avoir-check" checked={lineForm.avoir} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, avoir: e.target.checked }))} />
                <label htmlFor="avoir-check" style={{ fontSize: 14, color: '#333', cursor: 'pointer' }}>Avoir</label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setShowLineModal(false)}
                style={{ padding: '9px 18px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', fontSize: 14, cursor: 'pointer', color: '#333' }}
              >
                Annuler
              </button>
              <button
                onClick={handleSaveLine}
                style={{ padding: '9px 18px', border: 'none', borderRadius: 4, background: '#D4A843', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff' }}
              >
                {editingLine ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close export dropdown on outside click */}
      {showExportMenu && <div onClick={() => setShowExportMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />}
    </div>
  );
}

export default DeclarationTVA;
