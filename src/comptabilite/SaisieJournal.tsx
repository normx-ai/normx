import React, { useState, useEffect, useCallback } from 'react';
import type { CompteComptable } from '../types';
import type { SaisieJournalProps, EcritureRow, EcritureAPI, StatsData, TiersItem } from './SaisieJournal.types';
import { MOIS } from './SaisieJournal.types';
import { parseInputNumber } from '../utils/formatters';
import EcrituresStats from './EcrituresStats';
import EcrituresFilters from './EcrituresFilters';
import EcrituresList from './EcrituresList';
import SaisieOverlay from './SaisieOverlay';
import ImportDocumentModal from './ImportDocumentModal';
import './Comptabilite.css';

function SaisieJournal({ entiteId, exerciceId, exerciceAnnee, onBack }: SaisieJournalProps): React.JSX.Element {
  const [ecritures, setEcritures] = useState<EcritureAPI[]>([]);
  const [planComptable, setPlanComptable] = useState<CompteComptable[]>([]);
  const [tiersList, setTiersList] = useState<TiersItem[]>([]);
  const [showOverlay, setShowOverlay] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Filtres
  const [filterJournal, setFilterJournal] = useState<string>('');
  const [filterStatut, setFilterStatut] = useState<string>('');
  const [filterMois, setFilterMois] = useState<string>('');
  const [filterDateDu, setFilterDateDu] = useState<string>('');
  const [filterDateAu, setFilterDateAu] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Formulaire overlay
  const [journal, setJournal] = useState<string>('OD');
  const [showJournalDropdown, setShowJournalDropdown] = useState<boolean>(false);
  const getDefaultDate = (): string => {
    const now = new Date();
    const annee = exerciceAnnee || now.getFullYear();
    if (now.getFullYear() === annee) {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return annee + '-01-01';
  };
  const [dateEcriture, setDateEcriture] = useState<string>(getDefaultDate());
  const [numeroPiece, setNumeroPiece] = useState<string>('');
  const [libelle, setLibelle] = useState<string>('');
  const [lignes, setLignes] = useState<EcritureRow[]>([
    { numero_compte: '', libelle_compte: '', debit: '', credit: '', tiers_id: '' },
    { numero_compte: '', libelle_compte: '', debit: '', credit: '', tiers_id: '' },
  ]);

  // --- API calls ---

  const loadEcritures = useCallback(async (): Promise<void> => {
    if (!entiteId || !exerciceId) return;
    const params = new URLSearchParams();
    if (filterJournal) params.set('journal', filterJournal);
    if (filterStatut) params.set('statut', filterStatut);
    if (filterDateDu) params.set('date_du', filterDateDu);
    if (filterDateAu) params.set('date_au', filterDateAu);
    if (searchTerm) params.set('search', searchTerm);
    try {
      const qs = params.toString() ? '?' + params.toString() : '';
      const res = await fetch('/api/ecritures/' + entiteId + '/' + exerciceId + qs);
      if (res.ok) {
        const data = await res.json();
        setEcritures(Array.isArray(data) ? data : data.ecritures || []);
      }
    } catch (_err) { /* silently ignore */ }
  }, [entiteId, exerciceId, filterJournal, filterStatut, filterDateDu, filterDateAu, searchTerm]);

  const loadPlanComptable = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/plan-comptable');
      if (res.ok) { const j = await res.json(); setPlanComptable(Array.isArray(j) ? j : j.data || j.comptes || []); }
    } catch (_err) { /* silently ignore */ }
  }, []);

  const loadTiers = useCallback(async (): Promise<void> => {
    if (!entiteId) return;
    try {
      const res = await fetch('/api/tiers/' + entiteId);
      if (res.ok) { const j = await res.json(); setTiersList(Array.isArray(j) ? j : j.data || j.tiers || []); }
    } catch (_err) { /* silently ignore */ }
  }, [entiteId]);

  const loadStats = useCallback(async (): Promise<void> => {
    if (!entiteId || !exerciceId) return;
    try {
      const res = await fetch('/api/ecritures/stats/' + entiteId + '/' + exerciceId);
      if (res.ok) setStats(await res.json());
    } catch (_err) { /* silently ignore */ }
  }, [entiteId, exerciceId]);

  useEffect(() => {
    loadEcritures(); loadPlanComptable(); loadStats(); loadTiers();
  }, [loadEcritures, loadPlanComptable, loadStats, loadTiers]);

  // Filtrage par mois
  useEffect(() => {
    if (filterMois) {
      const moisIdx = MOIS.indexOf(filterMois);
      if (moisIdx >= 0) {
        const year = exerciceAnnee || new Date().getFullYear();
        const m = String(moisIdx + 1).padStart(2, '0');
        setFilterDateDu(year + '-' + m + '-01');
        const lastDay = new Date(year, moisIdx + 1, 0).getDate();
        setFilterDateAu(year + '-' + m + '-' + lastDay);
      }
    } else { setFilterDateDu(''); setFilterDateAu(''); }
  }, [filterMois, exerciceAnnee]);

  // --- Form helpers ---

  const padCompte = (numero: string): string => {
    if (!numero) return numero;
    const raw = numero.replace(/\s/g, '');
    if (!/^\d+$/.test(raw)) return raw;
    if (raw.length >= 6) return raw;
    return raw + '0'.repeat(6 - raw.length);
  };

  const getTypeTiersFromCompte = (numero: string): string | null => {
    if (!numero) return null;
    const raw = numero.replace(/\s/g, '');
    if (raw.startsWith('401') || raw.startsWith('402') || raw.startsWith('408') || raw.startsWith('409')) return 'fournisseur';
    if (raw.startsWith('411') || raw.startsWith('418')) return 'membre';
    if (raw.startsWith('421') || raw.startsWith('422') || raw.startsWith('425') || raw.startsWith('428')) return 'personnel';
    if (raw.startsWith('462') || raw.startsWith('463') || raw.startsWith('464') || raw.startsWith('469')) return 'bailleur';
    if (raw.startsWith('451') || raw.startsWith('452') || raw.startsWith('453')) return 'membre';
    return null;
  };

  const resetForm = (): void => {
    setJournal('OD'); setDateEcriture(getDefaultDate()); setNumeroPiece(''); setLibelle('');
    setLignes([
      { numero_compte: '', libelle_compte: '', debit: '', credit: '', tiers_id: '' },
      { numero_compte: '', libelle_compte: '', debit: '', credit: '', tiers_id: '' },
    ]);
    setEditingId(null);
  };

  const [showImportModal, setShowImportModal] = useState(false);

  const openCreate = (): void => { resetForm(); setShowOverlay(true); };

  const openFromImport = (data: { journal: string; dateEcriture: string; numeroPiece: string; libelle: string; lignes: EcritureRow[] }): void => {
    resetForm();
    setJournal(data.journal);
    setDateEcriture(data.dateEcriture);
    setNumeroPiece(data.numeroPiece);
    setLibelle(data.libelle);
    setLignes(data.lignes);
    setShowOverlay(true);
  };

  const openEdit = (ecr: EcritureAPI): void => {
    setEditingId(ecr.id); setJournal(ecr.journal || 'OD'); setDateEcriture(ecr.date_ecriture);
    setNumeroPiece(ecr.numero_piece || ''); setLibelle(ecr.libelle);
    setLignes(ecr.lignes.map(l => ({
      numero_compte: l.numero_compte, libelle_compte: l.libelle_compte,
      debit: parseFloat(String(l.debit)) || '', credit: parseFloat(String(l.credit)) || '', tiers_id: l.tiers_id || '',
    })));
    setShowOverlay(true);
  };

  const closeOverlay = (): void => { setShowOverlay(false); resetForm(); };

  const parseMontant = (val: string | number): string | number => {
    const raw = String(val).replace(/[^\d]/g, '');
    return raw ? parseInt(raw, 10) : '';
  };

  const updateLigne = (idx: number, field: string, value: string | number): void => {
    const updated = [...lignes];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'numero_compte') {
      const found = planComptable.find(c => c.numero === value);
      if (found) updated[idx].libelle_compte = found.libelle;
      const oldType = getTypeTiersFromCompte(updated[idx].numero_compte);
      const newType = getTypeTiersFromCompte(String(value));
      if (oldType !== newType) updated[idx].tiers_id = '';
    }
    if (field === 'debit' && parseMontant(value)) updated[idx].credit = '';
    if (field === 'credit' && parseMontant(value)) updated[idx].debit = '';
    setLignes(updated);
  };

  const selectCompte = (ligneIdx: number, compte: CompteComptable): void => {
    const updated = [...lignes];
    updated[ligneIdx] = { ...updated[ligneIdx], numero_compte: padCompte(compte.numero), libelle_compte: compte.libelle };
    setLignes(updated);
  };

  const handleCompteBlur = (idx: number): void => {
    const updated = [...lignes];
    const raw = updated[idx].numero_compte;
    if (raw) {
      updated[idx].numero_compte = padCompte(raw);
      if (!updated[idx].libelle_compte) {
        const found = planComptable.find(c => c.numero === raw);
        if (found) updated[idx].libelle_compte = found.libelle;
      }
      setLignes(updated);
    }
  };

  const addLigne = (): void => {
    setLignes([...lignes, { numero_compte: '', libelle_compte: '', debit: '', credit: '', tiers_id: '' }]);
  };

  const removeLigne = (idx: number): void => {
    if (lignes.length <= 2) return;
    setLignes(lignes.filter((_, i) => i !== idx));
  };

  const equilibrer = (): void => {
    if (lignes.length < 2) return;
    const lastIdx = lignes.length - 1;
    const updated = [...lignes];
    const otherDebit = updated.slice(0, lastIdx).reduce((s, l) => s + (parseFloat(String(l.debit)) || 0), 0);
    const otherCredit = updated.slice(0, lastIdx).reduce((s, l) => s + (parseFloat(String(l.credit)) || 0), 0);
    const diff = otherDebit - otherCredit;
    if (diff > 0) updated[lastIdx] = { ...updated[lastIdx], debit: '', credit: String(diff) };
    else if (diff < 0) updated[lastIdx] = { ...updated[lastIdx], debit: String(Math.abs(diff)), credit: '' };
    setLignes(updated);
  };

  // --- CRUD ---

  const saveEcriture = async (): Promise<void> => {
    const totalDebit = lignes.reduce((s, l) => s + parseInputNumber(String(l.debit)), 0);
    if (!dateEcriture || !libelle || totalDebit <= 0) return;
    setSaving(true);
    try {
      const body = {
        entite_id: entiteId, exercice_id: exerciceId, date_ecriture: dateEcriture, journal, numero_piece: numeroPiece, libelle,
        lignes: lignes.filter(l => l.numero_compte && (parseFloat(String(l.debit)) || parseFloat(String(l.credit)))),
      };
      const url = editingId ? '/api/ecritures/' + editingId : '/api/ecritures';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        loadEcritures(); loadStats(); resetForm(); setLibelle(''); setNumeroPiece('');
        setLignes([
          { numero_compte: '', libelle_compte: '', debit: '', credit: '', tiers_id: '' },
          { numero_compte: '', libelle_compte: '', debit: '', credit: '', tiers_id: '' },
        ]);
        if (editingId) closeOverlay();
      } else { const err: { error?: string } = await res.json(); alert(err.error || 'Erreur'); }
    } catch (_err) { alert('Erreur reseau'); } finally { setSaving(false); }
  };

  const deleteEcriture = async (id: number): Promise<void> => {
    if (!window.confirm('Supprimer cette ecriture ?')) return;
    try { await fetch('/api/ecritures/' + id, { method: 'DELETE' }); loadEcritures(); loadStats(); } catch (_err) { /* ignore */ }
  };

  // --- Selection ---

  const toggleSelect = (id: number): void => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = (): void => {
    setSelectedIds(selectedIds.size === ecritures.length ? new Set() : new Set(ecritures.map(e => e.id)));
  };

  const validerSelection = async (): Promise<void> => {
    const brouillards = [...selectedIds].filter(id => { const ecr = ecritures.find(e => e.id === id); return ecr && ecr.statut !== 'validee'; });
    if (brouillards.length === 0) return;
    try {
      const res = await fetch('/api/ecritures/valider', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: brouillards }) });
      if (res.ok) { setSelectedIds(new Set()); loadEcritures(); loadStats(); }
      else { const err: { error?: string } = await res.json(); alert(err.error || 'Erreur'); }
    } catch (_err) { alert('Erreur reseau'); }
  };

  const devaliderSelection = async (): Promise<void> => {
    const validees = [...selectedIds].filter(id => { const ecr = ecritures.find(e => e.id === id); return ecr && ecr.statut === 'validee'; });
    if (validees.length === 0) return;
    if (!window.confirm('Repasser ' + validees.length + ' ecriture(s) en brouillard ?')) return;
    try {
      const res = await fetch('/api/ecritures/devalider', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: validees }) });
      if (res.ok) { setSelectedIds(new Set()); loadEcritures(); loadStats(); }
      else { const err: { error?: string } = await res.json(); alert(err.error || 'Erreur'); }
    } catch (_err) { alert('Erreur reseau'); }
  };

  const nbSelectedBrouillard = [...selectedIds].filter(id => { const ecr = ecritures.find(e => e.id === id); return ecr && ecr.statut !== 'validee'; }).length;
  const nbSelectedValidee = [...selectedIds].filter(id => { const ecr = ecritures.find(e => e.id === id); return ecr && ecr.statut === 'validee'; }).length;

  return (
    <div className="compta-wrapper">
      <EcrituresStats ecritures={ecritures} stats={stats} nbSelectedBrouillard={nbSelectedBrouillard}
        nbSelectedValidee={nbSelectedValidee} onValider={validerSelection} onDevalider={devaliderSelection}
        onBack={onBack} onOpenCreate={openCreate} onOpenImport={() => setShowImportModal(true)} />

      <EcrituresFilters filterJournal={filterJournal} setFilterJournal={setFilterJournal}
        filterStatut={filterStatut} setFilterStatut={setFilterStatut} filterMois={filterMois} setFilterMois={setFilterMois}
        filterDateDu={filterDateDu} setFilterDateDu={setFilterDateDu} filterDateAu={filterDateAu} setFilterDateAu={setFilterDateAu}
        searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      <EcrituresList ecritures={ecritures} selectedIds={selectedIds} onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll} onEdit={openEdit} onDelete={deleteEcriture} />

      {showImportModal && (
        <ImportDocumentModal entiteId={entiteId} exerciceId={exerciceId}
          onClose={() => setShowImportModal(false)} onImport={openFromImport} />
      )}

      {showOverlay && (
        <SaisieOverlay editingId={editingId} journal={journal} setJournal={setJournal}
          showJournalDropdown={showJournalDropdown} setShowJournalDropdown={setShowJournalDropdown}
          dateEcriture={dateEcriture} setDateEcriture={setDateEcriture} numeroPiece={numeroPiece} setNumeroPiece={setNumeroPiece}
          libelle={libelle} setLibelle={setLibelle} lignes={lignes} planComptable={planComptable} tiersList={tiersList}
          exerciceAnnee={exerciceAnnee} saving={saving} onSave={saveEcriture} onClose={closeOverlay}
          onUpdateLigne={updateLigne} onSelectCompte={selectCompte} onCompteBlur={handleCompteBlur}
          onAddLigne={addLigne} onRemoveLigne={removeLigne} onEquilibrer={equilibrer} />
      )}
    </div>
  );
}

export default SaisieJournal;
