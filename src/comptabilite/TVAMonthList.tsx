import React from 'react';
import {
  StatusStyleItem,
  DeclarationItem,
  MOIS,
  STATUS_STYLES,
  inputStyle,
  fmtMontant,
} from './DeclarationTVA.types';

interface StatusBadgeProps {
  statut: string;
}

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

interface TVAMonthListProps {
  declarations: DeclarationItem[];
  loadingDecl: boolean;
  selectedMois: number | null;
  exerciceAnnee: number;
  onSelectMois: (idx: number) => void;
}

function TVAMonthList({
  declarations,
  loadingDecl,
  selectedMois,
  exerciceAnnee,
  onSelectMois,
}: TVAMonthListProps): React.ReactElement {
  return (
    <div style={{ width: 320, minWidth: 280, borderRight: '1px solid #e2e5ea', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Title */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #e2e5ea' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Déclaration</span>
        </div>
        <div style={{ marginBottom: 8 }}>
          <select
            value={exerciceAnnee || ''}
            disabled
            style={{ ...inputStyle, background: '#f5f6fa', color: '#555', cursor: 'default' }}
          >
            <option value={exerciceAnnee}>Exercice {exerciceAnnee}</option>
          </select>
        </div>
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
              onClick={() => onSelectMois(idx)}
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
  );
}

export { StatusBadge };
export default TVAMonthList;
