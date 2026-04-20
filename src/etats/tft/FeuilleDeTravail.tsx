// Feuille de travail TFT : detail section par section avec totaux N / N-1,
// et contrôle ZH = ZI (tresorerie finale vs tresorerie bilan).

import React from 'react';

interface Section {
  ref: string;
  title: string;
  total: number;
  totalN1: number;
}

interface Props {
  fdt: Section[];
  showDebug: boolean;
  setShowDebug: (v: boolean) => void;
  getValue: (ref: string) => number;
  getValueN1: (ref: string) => number;
  fmt: (v: number) => string;
}

export function FeuilleDeTravail({ fdt, showDebug, setShowDebug, getValue, getValueN1, fmt }: Props): React.JSX.Element {
  const ecartOk = Math.abs(getValue('ZH') - getValue('ZI')) < 1;
  const bgControle = ecartOk ? '#dcfce7' : '#fee2e2';

  return (
    <div style={{ margin: '16px 0' }}>
      <button
        onClick={() => setShowDebug(!showDebug)}
        style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: '#6b7280' }}
      >
        {showDebug ? 'Masquer' : 'Afficher'} la feuille de travail
      </button>

      {showDebug && (
        <div style={{ marginTop: 12, fontSize: 11, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: 16 }}>
          <h4 style={{ fontSize: 13, marginBottom: 12, color: '#1A3A5C' }}>Feuille de travail — Formules détaillées du TFT</h4>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1A3A5C', background: '#eef2f7' }}>
                <th style={{ textAlign: 'left', padding: '4px 8px', width: '6%' }}>REF</th>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>LIBELLES</th>
                <th style={{ textAlign: 'center', padding: '4px 8px', width: '4%' }}>Note</th>
                <th style={{ textAlign: 'right', padding: '4px 8px', width: '16%' }}>EXERCICE N</th>
                <th style={{ textAlign: 'right', padding: '4px 8px', width: '16%' }}>EXERCICE N-1</th>
              </tr>
            </thead>
            <tbody>
              {fdt.map((section, si) => {
                const isTotal = section.ref.startsWith('Z');
                const isSubtotal = ['ZB','ZC','ZD','ZE','ZF'].includes(section.ref);
                const isGrand = ['ZG','ZH'].includes(section.ref);
                const bg = isGrand ? '#1A3A5C' : isSubtotal ? '#d1e7ff' : isTotal ? '#eef2f7' : '#fff';
                const color = isGrand ? '#fff' : '#1f2937';
                const fw = isTotal ? 700 : 400;
                const note = section.ref === 'ZB' ? 'B'
                  : section.ref === 'ZC' ? 'C'
                  : section.ref === 'ZD' ? 'D'
                  : section.ref === 'ZE' ? 'E'
                  : section.ref === 'ZF' ? 'F'
                  : section.ref === 'ZG' ? 'G'
                  : section.ref === 'ZH' ? 'H'
                  : section.ref === 'ZA' ? 'A' : '';
                return (
                  <tr key={si} style={{ borderBottom: '1px solid #d1d5db', background: bg, color, fontWeight: fw }}>
                    <td style={{ padding: '4px 8px' }}>{section.ref}</td>
                    <td style={{ padding: '4px 8px' }}>{section.title}</td>
                    <td style={{ textAlign: 'center', padding: '4px 8px' }}>{note}</td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(section.total)}</td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(section.totalN1)}</td>
                  </tr>
                );
              })}
              <tr style={{ fontWeight: 700, background: bgControle }}>
                <td style={{ padding: '4px 8px' }}></td>
                <td style={{ padding: '4px 8px' }}>Controle : Tresorerie actif N - Tresorerie passif N</td>
                <td style={{ textAlign: 'center', padding: '4px 8px' }}></td>
                <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(getValue('ZI'))}</td>
                <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(getValueN1('ZI'))}</td>
              </tr>
              <tr style={{ fontWeight: 700, background: bgControle }}>
                <td style={{ padding: '4px 8px' }}></td>
                <td style={{ padding: '4px 8px' }}>Ecart (ZH - ZI)</td>
                <td style={{ textAlign: 'center', padding: '4px 8px' }}></td>
                <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(getValue('ZH') - getValue('ZI'))}</td>
                <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(getValueN1('ZH') - getValueN1('ZI'))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
