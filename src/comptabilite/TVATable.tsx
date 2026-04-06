import React from 'react';
import { LuPenLine, LuTrash2 } from 'react-icons/lu';
import { TVALigne, thStyle, tdStyle, fmtMontant } from './DeclarationTVA.types';

interface TVATableProps {
  lignes: TVALigne[];
  loadingLignes: boolean;
  onEditLine: (ligne: TVALigne) => void;
  onDeleteLine: (id: number) => void;
}

function TVATable({ lignes, loadingLignes, onEditLine, onDeleteLine }: TVATableProps): React.ReactElement {
  if (loadingLignes) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Chargement...</div>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={thStyle}>Groupe</th>
          <th style={thStyle}>Référence</th>
          <th style={{ ...thStyle, minWidth: 160 }}>Libellé</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Montant net</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Taux de taxe</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Montant de la taxe</th>
          <th style={thStyle}>Date du document</th>
          <th style={{ ...thStyle, textAlign: 'center' }}>Avoir</th>
          <th style={{ ...thStyle, textAlign: 'center', width: 70 }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {lignes.length === 0 ? (
          <tr>
            <td colSpan={9} style={{ padding: '40px 10px', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
              Aucun élément à afficher.
            </td>
          </tr>
        ) : (
          lignes.map((l: TVALigne) => (
            <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={tdStyle}>{l.groupe || ''}</td>
              <td style={tdStyle}>{l.reference || ''}</td>
              <td style={tdStyle}>{l.libelle || ''}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMontant(l.montant_net)}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{l.taux_taxe != null ? `${l.taux_taxe} %` : ''}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMontant(l.montant_taxe)}</td>
              <td style={tdStyle}>{l.date_document ? new Date(l.date_document).toLocaleDateString('fr-FR') : ''}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{l.avoir ? 'Oui' : 'Non'}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                <button onClick={() => onEditLine(l)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: '#D4A843' }} title="Modifier">
                  <LuPenLine size={15} />
                </button>
                <button onClick={() => onDeleteLine(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: '#dc2626' }} title="Supprimer">
                  <LuTrash2 size={15} />
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export default TVATable;
