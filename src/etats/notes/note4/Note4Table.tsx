// Tableau principal Note 4 : libelles brut/depreciation + variations + echeances creances.

import React from 'react';
import { RowVals, RubriqueImmoFin, TotalVals, fmtM } from './note4Data';
import { inputSt, tdBold, tdBoldRight, tdRight, tdStyle, thStyle } from './note4Styles';

interface Props {
  brutRows: (RubriqueImmoFin & { vals: RowVals })[];
  depreciationRows: (RubriqueImmoFin & { vals: RowVals })[];
  totalBrut: TotalVals;
  totalBrutVariation: number;
  totalNet: TotalVals;
  totalNetVariation: number;
  hideEmpty: boolean;
  editing: boolean;
  getAdj: (label: string, field: string) => number;
  setAdj: (label: string, field: string, value: number) => void;
}

function parseAdjValue(v: string): number {
  if (v === '') return 0;
  return parseFloat(v.replace(/\s/g, '').replace(',', '.')) || 0;
}

export function Note4Table(p: Props): React.JSX.Element {
  const renderAdjInput = (label: string, field: string, baseValue: number): React.ReactNode => {
    if (!p.editing) return fmtM(baseValue);
    const adj = p.getAdj(label, field);
    return (
      <input
        value={adj || ''}
        onChange={e => p.setAdj(label, field, parseAdjValue(e.target.value))}
        style={inputSt}
        placeholder={fmtM(baseValue - adj)}
        title={`Base: ${fmtM(baseValue - adj)} | Ajustement: ${adj}`}
      />
    );
  };

  const renderCreanceInput = (label: string, field: string): React.ReactNode => {
    if (!p.editing) return fmtM(p.getAdj(label, field));
    return (
      <input
        value={p.getAdj(label, field) || ''}
        onChange={e => p.setAdj(label, field, parseAdjValue(e.target.value))}
        style={inputSt}
      />
    );
  };

  const renderImmoRow = (r: RubriqueImmoFin & { vals: RowVals }): React.JSX.Element | null => {
    if (p.hideEmpty && r.vals.anneeN === 0 && r.vals.anneeN1 === 0) return null;
    return (
      <tr key={r.label}>
        <td style={tdStyle}>{r.label}</td>
        <td style={tdRight}>{renderAdjInput(r.label, 'anneeN', r.vals.anneeN)}</td>
        <td style={tdRight}>{renderAdjInput(r.label, 'anneeN1', r.vals.anneeN1)}</td>
        <td style={{ ...tdRight, background: '#fafafa' }}>{r.vals.variation !== 0 ? r.vals.variation.toFixed(1) + ' %' : ''}</td>
        <td style={tdRight}>{renderCreanceInput(r.label, 'creances1an')}</td>
        <td style={tdRight}>{renderCreanceInput(r.label, 'creances1a2ans')}</td>
        <td style={tdRight}>{renderCreanceInput(r.label, 'creancesPlus2ans')}</td>
      </tr>
    );
  };

  const renderTotalRow = (label: string, totals: TotalVals, variation: number): React.JSX.Element => (
    <tr>
      <td style={tdBold}>{label}</td>
      <td style={tdBoldRight}>{fmtM(totals.anneeN)}</td>
      <td style={tdBoldRight}>{fmtM(totals.anneeN1)}</td>
      <td style={{ ...tdBoldRight, background: '#fafafa' }}>{variation !== 0 ? variation.toFixed(1) + ' %' : ''}</td>
      <td style={tdBoldRight}>{fmtM(totals.creances1an)}</td>
      <td style={tdBoldRight}>{fmtM(totals.creances1a2ans)}</td>
      <td style={tdBoldRight}>{fmtM(totals.creancesPlus2ans)}</td>
    </tr>
  );

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
      <thead>
        <tr>
          <th style={{ ...thStyle, width: '22%' }} rowSpan={2}>Libellés</th>
          <th style={{ ...thStyle, width: '12%' }} rowSpan={2}>Année N</th>
          <th style={{ ...thStyle, width: '12%' }} rowSpan={2}>Année N-1</th>
          <th style={{ ...thStyle, width: '8%' }} rowSpan={2}>Variation %</th>
          <th style={thStyle} colSpan={3}>Échéances des créances</th>
        </tr>
        <tr>
          <th style={{ ...thStyle, width: '15%', fontSize: 9 }}>À un an au plus</th>
          <th style={{ ...thStyle, width: '15%', fontSize: 9 }}>Plus d'un an à deux ans</th>
          <th style={{ ...thStyle, width: '16%', fontSize: 9 }}>Plus de deux ans</th>
        </tr>
      </thead>
      <tbody>
        {p.brutRows.map(r => renderImmoRow(r))}
        {renderTotalRow('TOTAL BRUT', p.totalBrut, p.totalBrutVariation)}
        {p.depreciationRows.map(r => renderImmoRow(r))}
        <tr>
          <td style={tdStyle}>&nbsp;</td>
          <td style={tdRight}></td>
          <td style={tdRight}></td>
          <td style={tdRight}></td>
          <td style={tdRight}></td>
          <td style={tdRight}></td>
          <td style={tdRight}></td>
        </tr>
        {renderTotalRow('TOTAL NET DE DEPRECIATION', p.totalNet, p.totalNetVariation)}
      </tbody>
    </table>
  );
}
