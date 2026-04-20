// Bloc de saisie reutilisable pour Reintegrations (+) ou Deductions (-).

import React from 'react';
import { LuTrash2 } from 'react-icons/lu';
import { formatMontant, LigneReintegration } from './resultatFiscalData';

interface Props {
  title: string;
  color: string;
  types: { libelle: string; article: string }[];
  lignes: LigneReintegration[];
  total: number;
  addLigne: (type: { libelle: string; article: string }) => void;
  updateLigne: (id: number, field: 'libelle' | 'montant' | 'article', value: string | number) => void;
  removeLigne: (id: number) => void;
  emptyMsg: string;
  addPlaceholder: string;
}

const inputStyle: React.CSSProperties = {
  width: 120, textAlign: 'right' as const, border: '1px solid #ccc',
  borderRadius: 3, padding: '2px 4px', fontSize: '9px',
};

export function LignesEditor(p: Props): React.JSX.Element {
  return (
    <div style={{ flex: 1, minWidth: 400, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 13, color: p.color }}>{p.title}</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          <select
            style={{ fontSize: 11, padding: '2px 4px' }}
            onChange={(e) => {
              const idx = parseInt(e.target.value);
              if (!isNaN(idx)) { p.addLigne(p.types[idx]); e.currentTarget.value = ''; }
            }}
          >
            <option value="">{p.addPlaceholder}</option>
            {p.types.map((t, i) => (<option key={i} value={i}>{t.libelle}</option>))}
          </select>
        </div>
      </div>
      {p.lignes.length === 0 && (
        <div style={{ fontSize: 11, color: '#999', padding: 8 }}>{p.emptyMsg}</div>
      )}
      {p.lignes.map(l => (
        <div key={l.id} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
          <input
            style={{ flex: 1, fontSize: 11, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 3 }}
            value={l.libelle}
            onChange={(e) => p.updateLigne(l.id, 'libelle', e.target.value)}
            placeholder="Libelle"
          />
          <input
            style={{ ...inputStyle, width: 100 }}
            type="number"
            value={l.montant || ''}
            onChange={(e) => p.updateLigne(l.id, 'montant', parseFloat(e.target.value) || 0)}
            placeholder="Montant"
          />
          <span style={{ fontSize: 9, color: '#888', width: 60 }}>{l.article}</span>
          <button
            onClick={() => p.removeLigne(l.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 2 }}
          >
            <LuTrash2 size={14} />
          </button>
        </div>
      ))}
      {p.lignes.length > 0 && (
        <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, marginTop: 4, color: p.color }}>
          Total : {formatMontant(p.total)} FCFA
        </div>
      )}
    </div>
  );
}
