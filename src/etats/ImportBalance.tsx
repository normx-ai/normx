import React, { useState, useEffect } from 'react';
import { LuFileSpreadsheet } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import { parseCSV, parseExcel } from './ImportBalance.parsers';
import ImportBalanceUpload from './ImportBalanceUpload';
import ImportBalanceAnalyse from './ImportBalanceAnalyse';
import ImportBalanceTable from './ImportBalanceTable';
import './ImportBalance.css';

interface ImportBalanceProps {
  entiteId: number;
  userId: number;
  exerciceId?: number;
  exerciceAnnee?: number;
}

interface BalanceRecord {
  id: number;
  nom_fichier: string;
  statut: string;
}

interface BalanceLigneWithMeta extends BalanceLigne {
  id: number;
  note_revision?: string;
}

interface ExerciceRecord {
  id: number;
  annee: number;
}

function ImportBalance({ entiteId, userId, exerciceId: parentExerciceId, exerciceAnnee }: ImportBalanceProps): React.JSX.Element {
  const [annee, setAnnee] = useState<number>(exerciceAnnee ?? new Date().getFullYear());
  const [exercice, setExercice] = useState<ExerciceRecord | null>(null);
  const [tab, setTab] = useState<'N' | 'N-1'>('N');
  const [balanceN, setBalanceN] = useState<BalanceRecord | null>(null);
  const [lignesN, setLignesN] = useState<BalanceLigneWithMeta[]>([]);
  const [balanceN1, setBalanceN1] = useState<BalanceRecord | null>(null);
  const [lignesN1, setLignesN1] = useState<BalanceLigneWithMeta[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [editingBalance, setEditingBalance] = useState(false);
  const [savingBalance, setSavingBalance] = useState(false);
  const [editedLignes, setEditedLignes] = useState<Record<number, Partial<BalanceLigneWithMeta>>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; balanceId: number | null }>({ open: false, balanceId: null });

  useEffect(() => {
    if (exerciceAnnee && exerciceAnnee !== annee) setAnnee(exerciceAnnee);
  }, [exerciceAnnee]);

  useEffect(() => {
    if (!entiteId) return;
    if (parentExerciceId) {
      fetch('/api/balance/exercices/' + entiteId).then(r => r.json())
        .then((data: ExerciceRecord[]) => {
          const match = data.find((e: ExerciceRecord) => e.id === parentExerciceId);
          if (match) { setExercice(match); setAnnee(match.annee); loadBalances(match.id); }
        }).catch(() => {});
      return;
    }
    fetch('/api/balance/exercices/' + entiteId).then(r => r.json())
      .then((data: ExerciceRecord[]) => {
        const match = data.find((e: ExerciceRecord) => e.annee === annee) || data[0];
        if (match) { setExercice(match); setAnnee(match.annee); loadBalances(match.id); }
      }).catch(() => {});
  }, [entiteId, annee, parentExerciceId]);

  const loadBalances = (exId: number): void => {
    fetch(`/api/balance/${entiteId}/${exId}/N`).then(r => r.json()).then((d: { balance: BalanceRecord | null; lignes: BalanceLigneWithMeta[] }) => { setBalanceN(d.balance); setLignesN(d.lignes); });
    fetch(`/api/balance/${entiteId}/${exId}/N-1`).then(r => r.json()).then((d: { balance: BalanceRecord | null; lignes: BalanceLigneWithMeta[] }) => { setBalanceN1(d.balance); setLignesN1(d.lignes); });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, typeBalance: 'N' | 'N-1'): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError(''); setMessage('');
    const isExcel = /\.(xlsx?|xls)$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = async (evt: ProgressEvent<FileReader>): Promise<void> => {
      try {
        const lignes = isExcel ? parseExcel(evt.target?.result as ArrayBuffer) : parseCSV(evt.target?.result as string);
        if (lignes.length === 0) { setError('Aucune ligne valide trouvee dans le fichier.'); setLoading(false); return; }
        const res = await fetch('/api/balance/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entite_id: entiteId, exercice_id: exercice!.id, type_balance: typeBalance, nom_fichier: file.name, lignes }),
        });
        const data: { error?: string; message?: string } = await res.json();
        if (!res.ok) setError(data.error || 'Erreur inconnue');
        else { setMessage(data.message || ''); loadBalances(exercice!.id); }
      } catch { setError('Erreur lors de l\'import.'); }
      finally { setLoading(false); }
    };
    if (isExcel) reader.readAsArrayBuffer(file); else reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleDeleteBalance = async (balanceId: number): Promise<void> => {
    try {
      const res = await fetch(`/api/balance/${balanceId}`, { method: 'DELETE' });
      if (res.ok) { setMessage('Balance supprimée.'); loadBalances(exercice!.id); }
      else setError('Erreur lors de la suppression.');
    } catch { setError('Erreur lors de la suppression.'); }
  };

  const currentBalance: BalanceRecord | null = tab === 'N' ? balanceN : balanceN1;
  const currentLignes: BalanceLigneWithMeta[] = tab === 'N' ? lignesN : lignesN1;

  const updateEditedLigne = (ligneId: number, field: keyof BalanceLigneWithMeta, value: string) => {
    setEditedLignes(prev => ({ ...prev, [ligneId]: { ...(prev[ligneId] || {}), [field]: value } }));
  };

  const getEditedValue = (ligne: BalanceLigneWithMeta, field: keyof BalanceLigneWithMeta): string => {
    const edited = editedLignes[ligne.id];
    if (edited && field in edited) return String(edited[field] ?? '');
    return String(ligne[field] ?? '');
  };

  const handleSaveBalance = async () => {
    setSavingBalance(true);
    try {
      const entries = Object.entries(editedLignes);
      for (const [ligneId, fields] of entries) {
        await fetch(`/api/balance/ligne/${ligneId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
      }
      if (exercice) loadBalances(exercice.id);
      setEditedLignes({}); setEditingBalance(false);
      setMessage(`${entries.length} ligne(s) modifiée(s)`);
      setTimeout(() => setMessage(''), 3000);
    } catch { setError('Erreur lors de la sauvegarde.'); }
    setSavingBalance(false);
  };

  return (
    <div className="import-balance">
      <div className="ib-header">
        <h2><LuFileSpreadsheet /> Import des balances</h2>
        {exercice && <div className="ib-annee"><label>Exercice : {exercice.annee}</label></div>}
      </div>

      {message && <div className="ib-message success">{message}</div>}
      {error && <div className="ib-message error">{error}</div>}

      {exercice && (
        <div className="ib-tabs">
          <button className={`ib-tab ${tab === 'N' ? 'active' : ''}`} onClick={() => setTab('N')}>
            Balance N ({annee}) {balanceN && <span className={`ib-statut-badge ${balanceN.statut}`}>{balanceN.statut}</span>}
          </button>
          <button className={`ib-tab ${tab === 'N-1' ? 'active' : ''}`} onClick={() => setTab('N-1')}>
            Balance N-1 ({annee - 1}) {balanceN1 && <span className={`ib-statut-badge ${balanceN1.statut}`}>{balanceN1.statut}</span>}
          </button>
        </div>
      )}

      {exercice && (
        <ImportBalanceUpload
          tab={tab} annee={annee} currentBalance={currentBalance} currentLignesCount={currentLignes.length}
          editingBalance={editingBalance} savingBalance={savingBalance} editedLignesCount={Object.keys(editedLignes).length}
          onFileUpload={handleFileUpload} onDeleteRequest={(id) => setDeleteConfirm({ open: true, balanceId: id })}
          onStartEditing={() => setEditingBalance(true)} onSaveBalance={handleSaveBalance}
        />
      )}

      {!currentBalance && (
        <div className="ib-format-info">
          <h4>Formats acceptés : Excel (.xlsx) ou CSV (séparateur point-virgule)</h4>
          <code>Compte ; Libellé ; SI Débit ; SI Crédit ; Débit ; Crédit ; SF Débit ; SF Crédit</code>
        </div>
      )}

      <ImportBalanceAnalyse
        currentLignes={currentLignes} exerciceId={exercice?.id}
        loadBalances={loadBalances} setMessage={setMessage} setError={setError}
      />

      <ImportBalanceTable lignes={currentLignes} editingBalance={editingBalance} getEditedValue={getEditedValue} updateEditedLigne={updateEditedLigne} />

      <ConfirmModal
        open={deleteConfirm.open} title="Supprimer la balance"
        message="Supprimer cette balance importée et toutes ses lignes ? Cette action est irréversible."
        variant="danger" confirmLabel="Supprimer"
        onConfirm={() => { if (deleteConfirm.balanceId) handleDeleteBalance(deleteConfirm.balanceId); setDeleteConfirm({ open: false, balanceId: null }); }}
        onCancel={() => setDeleteConfirm({ open: false, balanceId: null })}
      />
    </div>
  );
}

export default ImportBalance;
