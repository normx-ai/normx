// Table du Grand Livre + total general.

import React from 'react';
import { fmt } from '../../utils/formatters';
import { TableRow, tableStyle, tdStyle, thStyle } from './grandLivreData';

interface Props {
  tableRows: TableRow[];
  loading: boolean;
  generated: boolean;
  totalGeneralDebit: number;
  totalGeneralCredit: number;
}

const COLS = ['Compte', 'Date', 'Numéro', 'Journal', 'Tiers', 'Libellé', 'Date du document', 'Référence', 'Lettrage', 'Solde antérieur', 'Débit', 'Crédit', 'Solde'];
const RIGHT_ALIGNED = new Set(['Solde antérieur', 'Débit', 'Crédit', 'Solde']);

export function GrandLivreTable({ tableRows, loading, generated, totalGeneralDebit, totalGeneralCredit }: Props): React.JSX.Element {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {COLS.map(h => (
              <th key={h} style={{ ...thStyle, textAlign: RIGHT_ALIGNED.has(h) ? 'right' : 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={13} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Chargement...</td></tr>}
          {!loading && generated && tableRows.length === 0 && (
            <tr><td colSpan={13} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Aucun élément à afficher.</td></tr>
          )}
          {!loading && !generated && (
            <tr><td colSpan={13} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Cliquez sur "Générer" pour afficher le grand-livre.</td></tr>
          )}
          {!loading && tableRows.map((r, i) => (
            <tr key={i}>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{r.compte}</td>
              <td style={tdStyle}>{r.date ? new Date(r.date).toLocaleDateString('fr-FR') : ''}</td>
              <td style={tdStyle}>{r.numero}</td>
              <td style={tdStyle}>{r.journal}</td>
              <td style={tdStyle}>{r.tiers}</td>
              <td style={{ ...tdStyle, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.libelle}</td>
              <td style={tdStyle}>{r.dateDocument ? new Date(r.dateDocument).toLocaleDateString('fr-FR') : ''}</td>
              <td style={tdStyle}>{r.reference}</td>
              <td style={tdStyle}>{r.lettrage}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.soldeAnterieur)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.debit)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.credit)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(Math.abs(r.solde))} {r.solde >= 0 ? 'D' : 'C'}
              </td>
            </tr>
          ))}
          {generated && tableRows.length > 0 && (
            <tr style={{ background: '#1A3A5C' }}>
              <td colSpan={10} style={{ ...tdStyle, fontWeight: 700, color: '#fff' }}>TOTAL GÉNÉRAL</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(totalGeneralDebit)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(totalGeneralCredit)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#fff' }}>
                {fmt(Math.abs(totalGeneralDebit - totalGeneralCredit))} {totalGeneralDebit - totalGeneralCredit >= 0 ? 'D' : 'C'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
