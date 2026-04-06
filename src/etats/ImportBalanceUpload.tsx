import React from 'react';
import { LuUpload, LuTrash2, LuPenLine, LuSave } from 'react-icons/lu';

interface BalanceRecord {
  id: number;
  nom_fichier: string;
  statut: string;
}

interface ImportBalanceUploadProps {
  tab: 'N' | 'N-1';
  annee: number;
  currentBalance: BalanceRecord | null;
  currentLignesCount: number;
  editingBalance: boolean;
  savingBalance: boolean;
  editedLignesCount: number;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, typeBalance: 'N' | 'N-1') => void;
  onDeleteRequest: (balanceId: number) => void;
  onStartEditing: () => void;
  onSaveBalance: () => void;
}

function ImportBalanceUpload({
  tab,
  currentBalance,
  currentLignesCount,
  editingBalance,
  savingBalance,
  editedLignesCount,
  onFileUpload,
  onDeleteRequest,
  onStartEditing,
  onSaveBalance,
}: ImportBalanceUploadProps): React.JSX.Element {
  return (
    <div className="ib-actions">
      <label className="ib-upload-btn">
        <LuUpload /> Importer fichier ({tab})
        <input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFileUpload(e, tab)} hidden />
      </label>

      {currentBalance && (
        <span className="ib-file-info">
          {currentBalance.nom_fichier} - {currentLignesCount} lignes
          <button
            className="ib-delete-btn"
            onClick={() => onDeleteRequest(currentBalance.id)}
            title="Supprimer cette balance"
          >
            <LuTrash2 size={14} />
          </button>
        </span>
      )}
      {currentLignesCount > 0 && (
        !editingBalance ? (
          <button
            onClick={onStartEditing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#D4A843', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <LuPenLine size={15} /> Modifier
          </button>
        ) : (
          <button
            onClick={onSaveBalance}
            disabled={savingBalance || editedLignesCount === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: editedLignesCount === 0 ? 0.5 : 1 }}
          >
            <LuSave size={15} /> {savingBalance ? 'Sauvegarde...' : `Sauvegarder (${editedLignesCount})`}
          </button>
        )
      )}
    </div>
  );
}

export default ImportBalanceUpload;
