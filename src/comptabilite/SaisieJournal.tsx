import React, { useState, useEffect, useCallback } from 'react';
import { LuPlus, LuTrash2, LuSave, LuSearch, LuPenLine, LuX, LuChevronDown, LuCheck, LuUndo } from 'react-icons/lu';
import type { CompteComptable } from '../types';
import type { SaisieJournalProps, EcritureRow, EcritureAPI, StatsData, TiersItem } from './SaisieJournal.types';
import { JOURNAUX, MOIS } from './SaisieJournal.types';
import { fmt, parseInputNumber } from '../utils/formatters';
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

  // Recherche plan comptable dans le formulaire
  const [pcSearch, setPcSearch] = useState<string>('');
  const [pcDropdownIdx, setPcDropdownIdx] = useState<number | null>(null);

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
      if (res.ok) setEcritures(await res.json());
    } catch (_err) {
      // silently ignore
    }
  }, [entiteId, exerciceId, filterJournal, filterStatut, filterDateDu, filterDateAu, searchTerm]);

  const loadPlanComptable = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/plan-comptable');
      if (res.ok) setPlanComptable(await res.json());
    } catch (_err) {
      // silently ignore
    }
  }, []);

  const loadTiers = useCallback(async (): Promise<void> => {
    if (!entiteId) return;
    try {
      const res = await fetch('/api/tiers/' + entiteId);
      if (res.ok) setTiersList(await res.json());
    } catch (_err) {
      // silently ignore
    }
  }, [entiteId]);

  const loadStats = useCallback(async (): Promise<void> => {
    if (!entiteId || !exerciceId) return;
    try {
      const res = await fetch('/api/ecritures/stats/' + entiteId + '/' + exerciceId);
      if (res.ok) setStats(await res.json());
    } catch (_err) {
      // silently ignore
    }
  }, [entiteId, exerciceId]);

  useEffect(() => {
    loadEcritures();
    loadPlanComptable();
    loadStats();
    loadTiers();
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
    } else {
      setFilterDateDu('');
      setFilterDateAu('');
    }
  }, [filterMois, exerciceAnnee]);

  const getPcSuggestions = (query: string): CompteComptable[] => {
    if (query.length < 1) return [];
    return planComptable.filter(c =>
      c.numero.startsWith(query) || c.libelle.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);
  };

  const resetForm = (): void => {
    setJournal('OD');
    setDateEcriture(getDefaultDate());
    setNumeroPiece('');
    setLibelle('');
    setLignes([
      { numero_compte: '', libelle_compte: '', debit: '', credit: '', tiers_id: '' },
      { numero_compte: '', libelle_compte: '', debit: '', credit: '', tiers_id: '' },
    ]);
    setEditingId(null);
    setPcSearch('');
    setPcDropdownIdx(null);
  };

  const openCreate = (): void => {
    resetForm();
    setShowOverlay(true);
  };

  const openEdit = (ecr: EcritureAPI): void => {
    setEditingId(ecr.id);
    setJournal(ecr.journal || 'OD');
    setDateEcriture(ecr.date_ecriture);
    setNumeroPiece(ecr.numero_piece || '');
    setLibelle(ecr.libelle);
    setLignes(ecr.lignes.map(l => ({
      numero_compte: l.numero_compte,
      libelle_compte: l.libelle_compte,
      debit: parseFloat(String(l.debit)) || '',
      credit: parseFloat(String(l.credit)) || '',
      tiers_id: l.tiers_id || '',
    })));
    setShowOverlay(true);
  };

  const closeOverlay = (): void => {
    setShowOverlay(false);
    resetForm();
  };

  // Formater montant avec separateurs de milliers
  const formatMontantInput = (val: string | number): string => {
    const raw = String(val).replace(/[^\d]/g, '');
    if (!raw) return '';
    return parseInt(raw, 10).toLocaleString('fr-FR');
  };

  const parseMontant = (val: string | number): string | number => {
    const raw = String(val).replace(/[^\d]/g, '');
    return raw ? parseInt(raw, 10) : '';
  };

  // Mapping compte -> type de tiers pour le selecteur intelligent
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

  const getTiersForCompte = (numero: string): TiersItem[] => {
    const type = getTypeTiersFromCompte(numero);
    if (!type) return [];
    return tiersList.filter(t => t.type === type);
  };

  // Padding du numero de compte : 6 chiffres
  const padCompte = (numero: string): string => {
    if (!numero) return numero;
    const raw = numero.replace(/\s/g, '');
    if (!/^\d+$/.test(raw)) return raw;
    if (raw.length >= 6) return raw;
    return raw + '0'.repeat(6 - raw.length);
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
    if (field === 'debit' && parseMontant(value)) {
      updated[idx].credit = '';
    }
    if (field === 'credit' && parseMontant(value)) {
      updated[idx].debit = '';
    }
    setLignes(updated);
  };

  const selectCompte = (ligneIdx: number, compte: CompteComptable): void => {
    const updated = [...lignes];
    const paddedNumero = padCompte(compte.numero);
    updated[ligneIdx] = { ...updated[ligneIdx], numero_compte: paddedNumero, libelle_compte: compte.libelle };
    setLignes(updated);
    setPcDropdownIdx(null);
    setPcSearch('');
  };

  const handleCompteBlur = (idx: number): void => {
    const updated = [...lignes];
    const raw = updated[idx].numero_compte;
    if (raw) {
      const padded = padCompte(raw);
      updated[idx].numero_compte = padded;
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

  const totalDebit = lignes.reduce((s, l) => s + parseInputNumber(String(l.debit)), 0);
  const totalCredit = lignes.reduce((s, l) => s + parseInputNumber(String(l.credit)), 0);
  const solde = totalDebit - totalCredit;

  // Validation
  const pcNums = new Set(planComptable.map(c => c.numero));
  const isCompteValide = (numero: string): boolean => {
    if (pcNums.has(numero)) return true;
    let trimmed = numero.replace(/0+$/, '');
    while (trimmed.length >= 2) {
      if (pcNums.has(trimmed)) return true;
      trimmed = trimmed.slice(0, -1);
    }
    return false;
  };
  const lignesActives = lignes.filter(l => l.numero_compte && (parseInputNumber(String(l.debit)) || parseInputNumber(String(l.credit))));
  const comptesInvalides = lignesActives.filter(l => !isCompteValide(l.numero_compte));
  const allComptesValides = comptesInvalides.length === 0 && lignesActives.length >= 2;
  const dateAnnee = dateEcriture ? parseInt(dateEcriture.split('-')[0], 10) : null;
  const dateHorsExercice = exerciceAnnee && dateAnnee && dateAnnee !== exerciceAnnee;
  const isEquilibre = Math.abs(solde) < 0.01 && totalDebit > 0 && allComptesValides && !dateHorsExercice;

  const equilibrer = (): void => {
    if (lignes.length < 2) return;
    const lastIdx = lignes.length - 1;
    const updated = [...lignes];
    const otherDebit = updated.slice(0, lastIdx).reduce((s, l) => s + (parseFloat(String(l.debit)) || 0), 0);
    const otherCredit = updated.slice(0, lastIdx).reduce((s, l) => s + (parseFloat(String(l.credit)) || 0), 0);
    const diff = otherDebit - otherCredit;
    if (diff > 0) {
      updated[lastIdx] = { ...updated[lastIdx], debit: '', credit: String(diff) };
    } else if (diff < 0) {
      updated[lastIdx] = { ...updated[lastIdx], debit: String(Math.abs(diff)), credit: '' };
    }
    setLignes(updated);
  };

  const saveEcriture = async (): Promise<void> => {
    if (!dateEcriture || !libelle || !isEquilibre) return;
    setSaving(true);
    try {
      const body = {
        entite_id: entiteId,
        exercice_id: exerciceId,
        date_ecriture: dateEcriture,
        journal,
        numero_piece: numeroPiece,
        libelle,
        lignes: lignes.filter(l => l.numero_compte && (parseFloat(String(l.debit)) || parseFloat(String(l.credit)))),
      };

      const url = editingId ? '/api/ecritures/' + editingId : '/api/ecritures';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        loadEcritures();
        loadStats();
        resetForm();
        setLibelle('');
        setNumeroPiece('');
        setLignes([
          { numero_compte: '', libelle_compte: '', debit: '', credit: '', tiers_id: '' },
          { numero_compte: '', libelle_compte: '', debit: '', credit: '', tiers_id: '' },
        ]);
        if (editingId) closeOverlay();
      } else {
        const err: { error?: string } = await res.json();
        alert(err.error || 'Erreur');
      }
    } catch (_err) {
      alert('Erreur reseau');
    } finally {
      setSaving(false);
    }
  };

  const deleteEcriture = async (id: number): Promise<void> => {
    if (!window.confirm('Supprimer cette ecriture ?')) return;
    try {
      await fetch('/api/ecritures/' + id, { method: 'DELETE' });
      loadEcritures();
      loadStats();
    } catch (_err) {
      // silently ignore
    }
  };

  const toggleSelect = (id: number): void => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (): void => {
    if (selectedIds.size === ecritures.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ecritures.map(e => e.id)));
    }
  };

  const validerSelection = async (): Promise<void> => {
    const brouillards = [...selectedIds].filter(id => {
      const ecr = ecritures.find(e => e.id === id);
      return ecr && ecr.statut !== 'validee';
    });
    if (brouillards.length === 0) return;
    try {
      const res = await fetch('/api/ecritures/valider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: brouillards }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        loadEcritures();
        loadStats();
      } else {
        const err: { error?: string } = await res.json();
        alert(err.error || 'Erreur');
      }
    } catch (_err) {
      alert('Erreur reseau');
    }
  };

  const devaliderSelection = async (): Promise<void> => {
    const validees = [...selectedIds].filter(id => {
      const ecr = ecritures.find(e => e.id === id);
      return ecr && ecr.statut === 'validee';
    });
    if (validees.length === 0) return;
    if (!window.confirm('Repasser ' + validees.length + ' ecriture(s) en brouillard ?')) return;
    try {
      const res = await fetch('/api/ecritures/devalider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: validees }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        loadEcritures();
        loadStats();
      } else {
        const err: { error?: string } = await res.json();
        alert(err.error || 'Erreur');
      }
    } catch (_err) {
      alert('Erreur reseau');
    }
  };

  const nbSelectedBrouillard = [...selectedIds].filter(id => {
    const ecr = ecritures.find(e => e.id === id);
    return ecr && ecr.statut !== 'validee';
  }).length;

  const nbSelectedValidee = [...selectedIds].filter(id => {
    const ecr = ecritures.find(e => e.id === id);
    return ecr && ecr.statut === 'validee';
  }).length;

  /* fmt importe depuis utils/formatters */

  const listTotalDebit = ecritures.reduce((s, e) =>
    s + e.lignes.reduce((s2, l) => s2 + (parseFloat(String(l.debit)) || 0), 0), 0);
  const listTotalCredit = ecritures.reduce((s, e) =>
    s + e.lignes.reduce((s2, l) => s2 + (parseFloat(String(l.credit)) || 0), 0), 0);

  return (
    <div className="compta-wrapper">
      {/* Header */}
      <div className="compta-page-header">
        <div>
          <h1 className="compta-page-title">Saisie des ecritures</h1>
          <p className="compta-page-subtitle">Saisissez les ecritures comptables selon le plan SYCEBNL</p>
        </div>
        <div className="compta-header-actions">
          {nbSelectedBrouillard > 0 && (
            <button className="compta-action-btn success" onClick={validerSelection}>
              <LuCheck /> Valider ({nbSelectedBrouillard})
            </button>
          )}
          {nbSelectedValidee > 0 && (
            <button className="compta-action-btn warning" onClick={devaliderSelection}>
              <LuUndo /> Devalider ({nbSelectedValidee})
            </button>
          )}
          <button className="compta-action-btn" onClick={onBack}>&larr; Retour</button>
          <button className="compta-action-btn primary" onClick={openCreate}>
            <LuPlus /> Creer
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="saisie-filters">
        <div className="saisie-filter-group">
          <label>Journal</label>
          <select value={filterJournal} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterJournal(e.target.value)}>
            <option value="">Tous</option>
            {JOURNAUX.map(j => <option key={j.code} value={j.code}>{j.code} - {j.intitule}</option>)}
          </select>
        </div>
        <div className="saisie-filter-group">
          <label>Statut</label>
          <select value={filterStatut} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatut(e.target.value)}>
            <option value="">Tous</option>
            <option value="brouillard">Brouillard</option>
            <option value="validee">Validee</option>
          </select>
        </div>
        <div className="saisie-filter-group">
          <label>Mois</label>
          <select value={filterMois} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterMois(e.target.value)}>
            <option value="">Tous</option>
            {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="saisie-filter-group">
          <label>Du</label>
          <input type="date" value={filterDateDu} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFilterDateDu(e.target.value); setFilterMois(''); }} />
        </div>
        <div className="saisie-filter-group">
          <label>Au</label>
          <input type="date" value={filterDateAu} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFilterDateAu(e.target.value); setFilterMois(''); }} />
        </div>
        <div className="saisie-filter-search">
          <LuSearch />
          <input type="text" value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} placeholder="Rechercher..." />
        </div>
      </div>

      {/* Table des ecritures */}
      <div className="ecritures-table-wrapper">
        <table className="ecritures-main-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" checked={ecritures.length > 0 && selectedIds.size === ecritures.length} onChange={toggleSelectAll} />
              </th>
              <th>N°</th>
              <th>Journal</th>
              <th>Date</th>
              <th>N° piece</th>
              <th>Compte</th>
              <th style={{ width: 130 }}>Tiers</th>
              <th>Libelle</th>
              <th style={{ textAlign: 'right' }}>Debit</th>
              <th style={{ textAlign: 'right' }}>Credit</th>
              <th style={{ width: 90 }}>Statut</th>
              <th style={{ width: 70 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ecritures.length === 0 ? (
              <tr>
                <td colSpan={12} className="empty-cell">
                  <div className="empty-state-inline">
                    <LuPenLine size={32} />
                    <p>Aucune ecriture</p>
                    <span>Cliquez sur "Creer" pour saisir votre premiere ecriture</span>
                  </div>
                </td>
              </tr>
            ) : (
              ecritures.map(ecr => (
                ecr.lignes.map((l, i) => (
                  <tr key={ecr.id + '-' + i} className={i > 0 ? 'sub-line' : 'main-line'}>
                    {i === 0 && (
                      <td rowSpan={ecr.lignes.length} className="cell-center">
                        <input type="checkbox" checked={selectedIds.has(ecr.id)} onChange={() => toggleSelect(ecr.id)} />
                      </td>
                    )}
                    {i === 0 && <td rowSpan={ecr.lignes.length} className="cell-center">{ecr.id}</td>}
                    {i === 0 && <td rowSpan={ecr.lignes.length} className="cell-journal">{ecr.journal}</td>}
                    {i === 0 && <td rowSpan={ecr.lignes.length}>{new Date(ecr.date_ecriture).toLocaleDateString('fr-FR')}</td>}
                    {i === 0 && <td rowSpan={ecr.lignes.length}>{ecr.numero_piece || ''}</td>}
                    <td className={parseFloat(String(l.credit)) > 0 ? 'cell-credit' : ''}>{l.numero_compte}</td>
                    <td style={{ fontSize: 12, color: '#666' }}>{l.tiers_nom || ''}</td>
                    <td className={parseFloat(String(l.credit)) > 0 ? 'cell-credit indent' : ''}>
                      {i === 0 ? ecr.libelle : l.libelle_compte}
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmt(l.debit)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(l.credit)}</td>
                    {i === 0 && (
                      <td rowSpan={ecr.lignes.length} className="cell-center">
                        <span className={'statut-badge ' + (ecr.statut === 'validee' ? 'validee' : 'brouillard')}>
                          {ecr.statut === 'validee' ? 'Validee' : 'Brouillard'}
                        </span>
                      </td>
                    )}
                    {i === 0 && (
                      <td rowSpan={ecr.lignes.length} className="cell-actions">
                        {ecr.statut !== 'validee' && (
                          <>
                            <button className="action-icon-btn edit" onClick={() => openEdit(ecr)} title="Modifier"><LuPenLine /></button>
                            <button className="action-icon-btn delete" onClick={() => deleteEcriture(ecr.id)} title="Supprimer"><LuTrash2 /></button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer totaux */}
      <div className="saisie-footer">
        <div className="saisie-footer-count">
          {ecritures.length} ecriture{ecritures.length > 1 ? 's' : ''}
          {stats && <span> | {stats.nb_comptes} comptes mouvementes</span>}
        </div>
        <div className="saisie-footer-totaux">
          <div className="footer-total-card">
            <span className="footer-total-amount">{fmt(listTotalDebit)}</span>
            <span className="footer-total-label">Total debit</span>
          </div>
          <div className="footer-total-card">
            <span className="footer-total-amount">{fmt(listTotalCredit)}</span>
            <span className="footer-total-label">Total credit</span>
          </div>
          <div className="footer-total-card">
            <span className={'footer-total-amount ' + (Math.abs(listTotalDebit - listTotalCredit) < 0.01 ? 'ok' : 'ko')}>
              {fmt(Math.abs(listTotalDebit - listTotalCredit))}
            </span>
            <span className="footer-total-label">Solde</span>
          </div>
        </div>
      </div>

      {/* Overlay formulaire */}
      {showOverlay && (
        <div className="ecriture-overlay-backdrop" onClick={closeOverlay}>
          <div className="ecriture-overlay" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div className="ecriture-overlay-header">
              <div>
                <h2>{editingId ? 'Modifier l\'ecriture' : 'Nouvelle ecriture'}</h2>
                <p>Saisissez les comptes au debit et au credit selon le plan SYCEBNL</p>
              </div>
              <button className="overlay-close-btn" onClick={closeOverlay}><LuX /></button>
            </div>

            <div className="ecriture-overlay-body">
              {/* Champs en-tete */}
              <div className="ecriture-fields-card">
                <div className="ecriture-fields-row">
                  <div className="ecriture-field">
                    <label>Journal <span className="required">*</span></label>
                    <div className="journal-select-wrapper">
                      <button type="button" className="journal-select-btn" onClick={() => setShowJournalDropdown(!showJournalDropdown)}>
                        {journal} <LuChevronDown />
                      </button>
                      {showJournalDropdown && (
                        <div className="journal-dropdown">
                          <table>
                            <thead><tr><th>Code</th><th>Intitule</th></tr></thead>
                            <tbody>
                              {JOURNAUX.map(j => (
                                <tr key={j.code} className={journal === j.code ? 'active' : ''}
                                  onClick={() => { setJournal(j.code); setShowJournalDropdown(false); }}>
                                  <td>{j.code}</td><td>{j.intitule}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ecriture-field">
                    <label>Date <span className="required">*</span></label>
                    <input type="date" value={dateEcriture} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateEcriture(e.target.value)} />
                  </div>
                  <div className="ecriture-field" style={{ flex: 2 }}>
                    <label>Libelle <span className="required">*</span></label>
                    <input type="text" value={libelle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLibelle(e.target.value)} placeholder="Libelle de l'ecriture" />
                  </div>
                  <div className="ecriture-field">
                    <label>N° piece</label>
                    <input type="text" value={numeroPiece} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumeroPiece(e.target.value)} placeholder="Facultatif" />
                  </div>
                </div>
              </div>

              {/* Bouton ajouter */}
              <button className="compta-action-btn add-line-btn" onClick={addLigne}><LuPlus /> Ajouter ligne</button>

              {/* Table lignes */}
              <div className="overlay-table-wrapper">
                <table className="overlay-ecriture-table">
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>Compte</th>
                      <th style={{ width: 160 }}>Tiers</th>
                      <th>Libelle</th>
                      <th style={{ width: 140 }}>Debit</th>
                      <th style={{ width: 140 }}>Credit</th>
                      <th style={{ width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((l, i) => (
                      <tr key={i}>
                        <td className="cell-compte">
                          <input
                            type="text"
                            value={l.numero_compte}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              updateLigne(i, 'numero_compte', e.target.value);
                              setPcDropdownIdx(i);
                              setPcSearch(e.target.value);
                            }}
                            onFocus={() => { setPcDropdownIdx(i); setPcSearch(l.numero_compte); }}
                            onBlur={() => { setTimeout(() => setPcDropdownIdx(null), 200); handleCompteBlur(i); }}
                            placeholder="N° compte"
                            className={l.numero_compte && !isCompteValide(l.numero_compte) ? 'input-invalid' : ''}
                          />
                          {pcDropdownIdx === i && getPcSuggestions(l.numero_compte || pcSearch).length > 0 && (
                            <div className="compte-dropdown">
                              {getPcSuggestions(l.numero_compte || pcSearch).map(c => (
                                <div key={c.numero} className="compte-dropdown-item"
                                  onMouseDown={() => selectCompte(i, c)}>
                                  <span className="pc-num">{c.numero}</span> {c.libelle}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          {(() => {
                            const tiersFiltered = getTiersForCompte(l.numero_compte);
                            const isTiersCompte = tiersFiltered.length > 0;
                            return (
                              <select
                                value={l.tiers_id || ''}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateLigne(i, 'tiers_id', e.target.value ? parseInt(e.target.value) : '')}
                                disabled={!isTiersCompte}
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12, fontFamily: 'inherit', background: isTiersCompte ? '#fff' : '#f5f5f5', color: isTiersCompte ? '#333' : '#bbb', cursor: isTiersCompte ? 'pointer' : 'default' }}
                              >
                                <option value="">{isTiersCompte ? '— Selectionner —' : '—'}</option>
                                {tiersFiltered.map(t => (
                                  <option key={t.id} value={t.id}>{t.code_tiers} — {t.nom}</option>
                                ))}
                              </select>
                            );
                          })()}
                        </td>
                        <td>
                          <input type="text" value={l.libelle_compte}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLigne(i, 'libelle_compte', e.target.value)}
                            placeholder="Libelle du compte" />
                        </td>
                        <td>
                          <input type="text" value={formatMontantInput(l.debit)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLigne(i, 'debit', parseMontant(e.target.value))}
                            placeholder="" className="input-montant" />
                        </td>
                        <td>
                          <input type="text" value={formatMontantInput(l.credit)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLigne(i, 'credit', parseMontant(e.target.value))}
                            placeholder="" className="input-montant" />
                        </td>
                        <td>
                          <button className="ligne-delete-btn" onClick={() => removeLigne(i)} disabled={lignes.length <= 2}>
                            <LuTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="overlay-validation-row">
                <button className="compta-action-btn equilibre-btn" onClick={equilibrer}>Equilibrer</button>
                {dateHorsExercice && (
                  <div className="validation-error">
                    La date {dateEcriture} ne correspond pas a l'exercice {exerciceAnnee}
                  </div>
                )}
                {comptesInvalides.length > 0 && (
                  <div className="validation-error">
                    Compte{comptesInvalides.length > 1 ? 's' : ''} invalide{comptesInvalides.length > 1 ? 's' : ''} :{' '}
                    {comptesInvalides.map(l => l.numero_compte).join(', ')}
                    {' '}— doit exister dans le plan comptable SYCEBNL
                  </div>
                )}
              </div>
            </div>

            {/* Footer overlay */}
            <div className="ecriture-overlay-footer">
              <div className="overlay-totaux">
                <div className="overlay-total-card">
                  <span className="overlay-total-amount">{fmt(solde)}</span>
                  <span className="overlay-total-label">Solde</span>
                </div>
                <div className="overlay-total-card">
                  <span className="overlay-total-amount">{fmt(totalDebit)}</span>
                  <span className="overlay-total-label">Total debit</span>
                </div>
                <div className="overlay-total-card">
                  <span className="overlay-total-amount">{fmt(totalCredit)}</span>
                  <span className="overlay-total-label">Total credit</span>
                </div>
              </div>
              <div className="overlay-footer-actions">
                <button className="compta-action-btn" onClick={closeOverlay}>Annuler</button>
                <button className="compta-action-btn primary" onClick={saveEcriture} disabled={!isEquilibre || saving || !libelle || !dateEcriture}>
                  <LuSave /> {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Enregistrer et Nouveau'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SaisieJournal;
