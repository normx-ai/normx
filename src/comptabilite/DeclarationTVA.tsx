import React, { useState, useCallback, useEffect } from 'react';
import { LuFileText } from 'react-icons/lu';
import {
  DeclarationTVAProps,
  DeclarationItem,
  TVALigne,
  LineForm,
  LiveEntite,
  MOIS,
} from './DeclarationTVA.types';
import TVAMonthList from './TVAMonthList';
import TVADetailPanel from './TVADetailPanel';
import TVALineModal from './TVALineModal';
import TVAMissingModal from './TVAMissingModal';

// ===================== MAIN COMPONENT =====================

function DeclarationTVA({ entiteId, exerciceId, exerciceAnnee, entiteName, entiteSigle, entiteNif, entiteAdresse, onBack, onGoToParametres }: DeclarationTVAProps): React.ReactElement {
  const [declarations, setDeclarations] = useState<DeclarationItem[]>([]);
  const [loadingDecl, setLoadingDecl] = useState<boolean>(false);
  const [selectedMois, setSelectedMois] = useState<number | null>(null);

  const [selectedImpot, setSelectedImpot] = useState<string>('tva');
  const [revueStatus, setRevueStatus] = useState<Record<string, boolean>>({});
  const [sectionComptes, setSectionComptes] = useState<Record<string, string[]>>({});

  const [activeTab, setActiveTab] = useState<string>('collectee');
  const [lignes, setLignes] = useState<TVALigne[]>([]);
  const [loadingLignes, setLoadingLignes] = useState<boolean>(false);

  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [showFilePanel, setShowFilePanel] = useState<boolean>(false);
  const [showMissingModal, setShowMissingModal] = useState<boolean>(false);

  // Live entity data
  const [liveEntite, setLiveEntite] = useState<LiveEntite | null>(null);
  useEffect(() => {
    if (!entiteId) return;
    fetch(`/api/entites/${entiteId}`).then((r: Response) => r.ok ? r.json() : null).then((data: LiveEntite | null) => {
      if (data) setLiveEntite(data);
    }).catch(() => {});
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
        setDeclarations(MOIS.map((_: string, i: number) => ({ id: null, mois: i + 1, statut: 'nouvelle', montant_tva_payer: 0 })));
      }
    } catch (_e) {
      setDeclarations(MOIS.map((_: string, i: number) => ({ id: null, mois: i + 1, statut: 'nouvelle', montant_tva_payer: 0 })));
    }
    setLoadingDecl(false);
  }, [entiteId, exerciceId]);

  useEffect(() => { loadDeclarations(); }, [loadDeclarations]);

  const handleSelectMois = (idx: number): void => {
    setSelectedMois(idx);
    setActiveTab('collectee');
    setShowFilePanel(false);
  };

  const selectedDecl: DeclarationItem | null = selectedMois !== null && declarations.length > 0
    ? declarations.find((d: DeclarationItem) => d.mois === selectedMois + 1) || { id: null, mois: selectedMois + 1, statut: 'nouvelle', montant_tva_payer: 0 }
    : null;

  // Load lines
  const loadLignes = useCallback(async (): Promise<void> => {
    if (!selectedDecl || !selectedDecl.id) { setLignes([]); return; }
    setLoadingLignes(true);
    try {
      const res: Response = await fetch(`/api/tva/lignes/${selectedDecl.id}/${activeTab}`);
      if (res.ok) { const j = await res.json(); setLignes(Array.isArray(j) ? j : j.data || j.lignes || []); }
      else setLignes([]);
    } catch (_e) { setLignes([]); }
    setLoadingLignes(false);
  }, [selectedDecl?.id, activeTab]);

  useEffect(() => { loadLignes(); }, [loadLignes]);

  // Line handlers
  const handleAddLine = (): void => {
    setEditingLine(null);
    setLineForm({ groupe: '', reference: '', libelle: '', montant_net: '', taux_taxe: '', montant_taxe: '', date_document: '', avoir: false });
    setShowLineModal(true);
  };

  const handleEditLine = (ligne: TVALigne): void => {
    setEditingLine(ligne);
    setLineForm({
      groupe: ligne.groupe || '', reference: ligne.reference || '', libelle: ligne.libelle || '',
      montant_net: String(ligne.montant_net || ''), taux_taxe: String(ligne.taux_taxe || ''),
      montant_taxe: String(ligne.montant_taxe || ''),
      date_document: ligne.date_document ? ligne.date_document.substring(0, 10) : '',
      avoir: !!ligne.avoir,
    });
    setShowLineModal(true);
  };

  const handleSaveLine = async (): Promise<void> => {
    try {
      const payload = { ...lineForm, declaration_id: selectedDecl ? selectedDecl.id : null, onglet: activeTab };
      let res: Response;
      if (editingLine) {
        res = await fetch(`/api/tva/ligne/${editingLine.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        res = await fetch('/api/tva/ligne', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      if (res.ok) { setShowLineModal(false); loadLignes(); loadDeclarations(); }
      else { const data: { error?: string } = await res.json(); alert(data.error || 'Erreur lors de l\'enregistrement.'); }
    } catch (_e) { alert('Erreur réseau.'); }
  };

  const handleDeleteLine = async (id: number): Promise<void> => {
    if (!window.confirm('Supprimer cette ligne ?')) return;
    try {
      const res: Response = await fetch(`/api/tva/ligne/${id}`, { method: 'DELETE' });
      if (res.ok) { loadLignes(); loadDeclarations(); }
    } catch (_e) { /* silently ignore */ }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', gap: 0, background: '#f5f6fa' }}>
      {/* LEFT PANEL */}
      <TVAMonthList
        declarations={declarations}
        loadingDecl={loadingDecl}
        selectedMois={selectedMois}
        exerciceAnnee={exerciceAnnee}
        onSelectMois={handleSelectMois}
      />

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
          <TVADetailPanel
            selectedMois={selectedMois}
            selectedDecl={selectedDecl}
            declarations={declarations}
            exerciceAnnee={exerciceAnnee}
            entiteId={entiteId}
            exerciceId={exerciceId}
            eName={eName}
            eSigle={eSigle}
            eNif={eNif}
            eAdresse={eAdresse}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            lignes={lignes}
            loadingLignes={loadingLignes}
            loadLignes={loadLignes}
            loadDeclarations={loadDeclarations}
            selectedImpot={selectedImpot}
            setSelectedImpot={setSelectedImpot}
            revueStatus={revueStatus}
            setRevueStatus={setRevueStatus}
            sectionComptes={sectionComptes}
            setSectionComptes={setSectionComptes}
            showExportMenu={showExportMenu}
            setShowExportMenu={setShowExportMenu}
            showFilePanel={showFilePanel}
            setShowFilePanel={setShowFilePanel}
            entiteName={entiteName}
            entiteSigle={entiteSigle}
            entiteNif={entiteNif}
            entiteAdresse={entiteAdresse}
            onAddLine={handleAddLine}
            onEditLine={handleEditLine}
            onDeleteLine={handleDeleteLine}
            onClose={() => { setSelectedMois(null); setShowFilePanel(false); }}
          />
        )}
      </div>

      {/* Modals */}
      {showMissingModal && (
        <TVAMissingModal
          eNif={eNif}
          eAdresse={eAdresse}
          onClose={() => setShowMissingModal(false)}
          onGoToParametres={onGoToParametres}
        />
      )}

      {showLineModal && (
        <TVALineModal
          editingLine={editingLine}
          lineForm={lineForm}
          setLineForm={setLineForm}
          onSave={handleSaveLine}
          onClose={() => setShowLineModal(false)}
        />
      )}

      {/* Close export dropdown on outside click */}
      {showExportMenu && <div onClick={() => setShowExportMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />}
    </div>
  );
}

export default DeclarationTVA;
