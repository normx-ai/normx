// Tableau principal Note 3D : lignes detail + sous-totaux + total general.

import React from 'react';
import type { BalanceLigne } from '../../../types';
import {
  ALL_RUBRIQUES,
  Note3DComputedData,
  RowVals,
  computeRowVals,
  fmtM,
  getBaseRow,
  sumRowVals,
} from './note3dData';

const thStyle: React.CSSProperties = {
  border: '0.5px solid #000', padding: '5px 8px', fontSize: 12,
  fontWeight: 600, textAlign: 'center', verticalAlign: 'middle', background: '#f5f5f5',
};
const tdStyle: React.CSSProperties = {
  border: '0.5px solid #000', padding: '5px 8px', fontSize: 12, verticalAlign: 'middle',
};
const tdRight: React.CSSProperties = {
  ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
};
const inputSt: React.CSSProperties = {
  width: '100%', padding: '1px 3px', fontSize: 12, border: '1px solid #D4A843',
  borderRadius: 2, background: '#fffbf0', textAlign: 'right', boxSizing: 'border-box',
};

interface Props {
  lignes: BalanceLigne[];
  data: Note3DComputedData;
  editing: boolean;
  hideEmpty: boolean;
  getAdj: (label: string, field: string) => number;
  setAdj: (label: string, field: string, value: number) => void;
}

export function Note3DTable({ lignes, data, editing, hideEmpty, getAdj, setAdj }: Props): React.JSX.Element {
  const renderValsRow = (vals: RowVals, bold: boolean): React.JSX.Element => (
    <>
      <td style={{ ...tdRight, fontWeight: bold ? 700 : 400 }}>{fmtM(vals.a)}</td>
      <td style={{ ...tdRight, fontWeight: bold ? 700 : 400 }}>{fmtM(vals.b)}</td>
      <td style={{ ...tdRight, fontWeight: bold ? 700 : 400 }}>{fmtM(vals.c)}</td>
      <td style={{ ...tdRight, fontWeight: bold ? 700 : 400 }}>{fmtM(vals.d)}</td>
      <td style={{ ...tdRight, fontWeight: bold ? 700 : 400 }}>{fmtM(vals.e)}</td>
    </>
  );

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
      <thead>
        <tr>
          <th rowSpan={2} style={{ ...thStyle, width: '28%', textAlign: 'left' }}>
            <div style={{ fontWeight: 700 }}>LIBELLES</div>
          </th>
          <th style={{ ...thStyle, width: '13%' }}>MONTANT<br />BRUT</th>
          <th style={{ ...thStyle, width: '13%' }}>AMORTISSEMENTS<br />PRATIQUES</th>
          <th style={{ ...thStyle, width: '13%' }}>VALEUR<br />COMPTABLE<br />NETTE</th>
          <th style={{ ...thStyle, width: '13%' }}>PRIX<br />DE<br />CESSION</th>
          <th style={{ ...thStyle, width: '15%' }}>PLUS-VALUE<br />OU MOINS-VALUE</th>
        </tr>
        <tr>
          <th style={thStyle}>A</th>
          <th style={thStyle}>B</th>
          <th style={thStyle}>C = A - B</th>
          <th style={thStyle}>D</th>
          <th style={thStyle}>E = D - C</th>
        </tr>
      </thead>
      <tbody>
        {ALL_RUBRIQUES.map((r, i) => {
          if (r.isSeparator) {
            return <tr key={i}><td colSpan={6} style={{ ...tdStyle, height: 4, padding: 0 }}></td></tr>;
          }

          if (r.isSousTotal) {
            const isIncorp = r.label.includes('INCORPORELLES');
            const isCorp = r.label.includes('CORPORELLES') && !r.label.includes('INCORPORELLES');
            const isFin = r.label.includes('FINANCIERES');
            const sourceRows = isIncorp ? data.incorpRows : isCorp ? data.corpRows : isFin ? data.finRows : [];
            const vals = sumRowVals(sourceRows, lignes, data, getAdj);
            return (
              <tr key={i}>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{r.label}</td>
                {renderValsRow(vals, true)}
              </tr>
            );
          }

          if (r.isTotal) {
            const vals = sumRowVals(data.detailRows, lignes, data, getAdj);
            return (
              <tr key={i} style={{ borderTop: '2px solid #000' }}>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{r.label}</td>
                {renderValsRow(vals, true)}
              </tr>
            );
          }

          const vals = computeRowVals(r, lignes, data, getAdj);
          const base = getBaseRow(r, lignes, data);
          if (hideEmpty && vals.a === 0 && vals.b === 0 && vals.c === 0 && vals.d === 0 && vals.e === 0) return null;

          const editCell = (adjField: string, displayVal: number, baseBal: number): React.ReactNode => {
            if (!editing) return fmtM(displayVal);
            return (
              <input
                value={displayVal || ''}
                onChange={e => {
                  const newVal = parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0;
                  setAdj(r.label, adjField, newVal - baseBal);
                }}
                placeholder={fmtM(baseBal)}
                style={inputSt}
              />
            );
          };

          return (
            <tr key={i}>
              <td style={tdStyle}>{r.label}</td>
              <td style={tdRight}>{editCell('brut_adj', vals.a, base.brutBal)}</td>
              <td style={tdRight}>{editCell('amort_adj', vals.b, base.amortBal)}</td>
              <td style={tdRight}>{fmtM(vals.c)}</td>
              <td style={tdRight}>{editCell('prix_adj', vals.d, base.prixBal)}</td>
              <td style={tdRight}>{fmtM(vals.e)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
