// Tableau des filiales et participations (editable ligne a ligne).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { LigneFiliale } from './note4Data';
import { inputLeft, inputSt, tdRight, tdStyle, thStyle } from './note4Styles';

interface Props {
  filiales: LigneFiliale[];
  editing: boolean;
  updateFiliale: (idx: number, field: keyof LigneFiliale, value: string) => void;
  addFiliale: () => void;
  removeFiliale: (idx: number) => void;
}

export function Note4Filiales({ filiales, editing, updateFiliale, addFiliale, removeFiliale }: Props): React.JSX.Element {
  return (
    <>
      <p style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', margin: '20px 0 8px' }}>
        Liste des filiales et participations :
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '28%' }}>Dénomination sociale</th>
            <th style={thStyle}>Localisation (ville / pays)</th>
            <th style={thStyle}>Valeur d'acquisition</th>
            <th style={thStyle}>% Détenu</th>
            <th style={thStyle}>Montant des capitaux propres filiale</th>
            <th style={thStyle}>Résultat dernier exercice filiale</th>
          </tr>
        </thead>
        <tbody>
          {filiales.map((f, i) => (
            <tr key={i}>
              <td style={tdStyle}>
                {editing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input value={f.denomination} onChange={e => updateFiliale(i, 'denomination', e.target.value)} style={inputLeft} />
                    <button
                      onClick={() => removeFiliale(i)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                    ><LuTrash2 size={14} /></button>
                  </div>
                ) : f.denomination}
              </td>
              <td style={tdStyle}>
                {editing ? <input value={f.localisation} onChange={e => updateFiliale(i, 'localisation', e.target.value)} style={inputLeft} /> : f.localisation}
              </td>
              <td style={tdRight}>
                {editing ? <input value={f.valeurAcquisition} onChange={e => updateFiliale(i, 'valeurAcquisition', e.target.value)} style={inputSt} /> : f.valeurAcquisition}
              </td>
              <td style={{ ...tdRight, textAlign: 'center' }}>
                {editing ? <input value={f.pctDetenu} onChange={e => updateFiliale(i, 'pctDetenu', e.target.value)} style={{ ...inputSt, textAlign: 'center' }} /> : f.pctDetenu}
              </td>
              <td style={tdRight}>
                {editing ? <input value={f.capitauxPropres} onChange={e => updateFiliale(i, 'capitauxPropres', e.target.value)} style={inputSt} /> : f.capitauxPropres}
              </td>
              <td style={tdRight}>
                {editing ? <input value={f.resultatDernier} onChange={e => updateFiliale(i, 'resultatDernier', e.target.value)} style={inputSt} /> : f.resultatDernier}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div style={{ marginTop: 6, marginBottom: 10 }} className="no-print">
          <button
            onClick={addFiliale}
            style={{ background: '#D4A843', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          ><LuPlus size={14} /> Ajouter une filiale</button>
        </div>
      )}
    </>
  );
}
