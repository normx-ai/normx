import { useState } from 'react';
import type { CompteComptable } from '../../types';
import type { EcritureRow, EcritureAPI } from '../SaisieJournal.types';

const EMPTY_ROW: EcritureRow = { numero_compte: '', libelle_compte: '', debit: '', credit: '', tiers_id: '' };
const initialLignes = (): EcritureRow[] => [{ ...EMPTY_ROW }, { ...EMPTY_ROW }];

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

const parseMontant = (val: string | number): string | number => {
  const raw = String(val).replace(/[^\d]/g, '');
  return raw ? parseInt(raw, 10) : '';
};

export interface UseEcritureFormParams {
  exerciceAnnee: number;
  exerciceDateDebut?: string;
  exerciceDateFin?: string;
  planComptable: CompteComptable[];
}

export interface ImportedEcritureData {
  journal: string;
  dateEcriture: string;
  numeroPiece: string;
  libelle: string;
  lignes: EcritureRow[];
}

export interface UseEcritureFormResult {
  // State
  showOverlay: boolean;
  editingId: number | null;
  saving: boolean;
  setSaving: (v: boolean) => void;
  showJournalDropdown: boolean;
  setShowJournalDropdown: (v: boolean) => void;
  journal: string;
  setJournal: (v: string) => void;
  dateEcriture: string;
  setDateEcriture: (v: string) => void;
  numeroPiece: string;
  setNumeroPiece: (v: string) => void;
  libelle: string;
  setLibelle: (v: string) => void;
  lignes: EcritureRow[];
  setLignes: (l: EcritureRow[]) => void;
  // Open / close
  openCreate: () => void;
  openShortcut: (journalCode: string) => void;
  openFromImport: (data: ImportedEcritureData) => void;
  openEdit: (ecr: EcritureAPI) => void;
  closeOverlay: () => void;
  resetForm: () => void;
  // Manipulation lignes
  updateLigne: (idx: number, field: string, value: string | number) => void;
  selectCompte: (idx: number, compte: CompteComptable) => void;
  handleCompteBlur: (idx: number) => void;
  addLigne: () => void;
  removeLigne: (idx: number) => void;
  equilibrer: () => void;
}

export function useEcritureForm({
  exerciceAnnee, exerciceDateDebut, exerciceDateFin, planComptable,
}: UseEcritureFormParams): UseEcritureFormResult {
  const [showOverlay, setShowOverlay] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [showJournalDropdown, setShowJournalDropdown] = useState<boolean>(false);

  const getDefaultDate = (): string => {
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    if (exerciceDateDebut && exerciceDateFin
        && todayIso >= exerciceDateDebut && todayIso <= exerciceDateFin) {
      return todayIso;
    }
    if (exerciceDateFin) return exerciceDateFin;
    if (exerciceDateDebut) return exerciceDateDebut;
    const annee = exerciceAnnee || now.getFullYear();
    if (now.getFullYear() === annee) return todayIso;
    return annee + '-12-31';
  };

  const [journal, setJournal] = useState<string>('OD');
  const [dateEcriture, setDateEcriture] = useState<string>(getDefaultDate());
  const [numeroPiece, setNumeroPiece] = useState<string>('');
  const [libelle, setLibelle] = useState<string>('');
  const [lignes, setLignes] = useState<EcritureRow[]>(initialLignes());

  const resetForm = (): void => {
    setJournal('OD');
    setDateEcriture(getDefaultDate());
    setNumeroPiece('');
    setLibelle('');
    setLignes(initialLignes());
    setEditingId(null);
  };

  const openCreate = (): void => { resetForm(); setShowOverlay(true); };

  const openShortcut = (journalCode: string): void => {
    resetForm();
    setJournal(journalCode);
    setShowOverlay(true);
  };

  const openFromImport = (data: ImportedEcritureData): void => {
    resetForm();
    setJournal(data.journal);
    setDateEcriture(data.dateEcriture);
    setNumeroPiece(data.numeroPiece);
    setLibelle(data.libelle);
    setLignes(data.lignes);
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

  const closeOverlay = (): void => { setShowOverlay(false); resetForm(); };

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

  const selectCompte = (idx: number, compte: CompteComptable): void => {
    const updated = [...lignes];
    updated[idx] = {
      ...updated[idx],
      numero_compte: padCompte(compte.numero),
      libelle_compte: compte.libelle,
    };
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
    setLignes([...lignes, { ...EMPTY_ROW }]);
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

  return {
    showOverlay, editingId, saving, setSaving,
    showJournalDropdown, setShowJournalDropdown,
    journal, setJournal, dateEcriture, setDateEcriture,
    numeroPiece, setNumeroPiece, libelle, setLibelle,
    lignes, setLignes,
    openCreate, openShortcut, openFromImport, openEdit, closeOverlay, resetForm,
    updateLigne, selectCompte, handleCompteBlur, addLigne, removeLigne, equilibrer,
  };
}
