// Contrôle 3 : fournisseurs debiteurs (compte 409).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, FournDebiteurLigne } from '../revisionTypes';

interface Controle3Props {
  debiteurLignes: FournDebiteurLigne[];
  addDebiteur: () => void;
  updateDebiteur: (id: number, field: keyof FournDebiteurLigne, value: string | number) => void;
  removeDebiteur: (id: number) => void;
}

export function Controle3Debiteurs({ debiteurLignes, addDebiteur, updateDebiteur, removeDebiteur }: Controle3Props): React.ReactElement {
  const hasLignes = debiteurLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 3 — Analyse des fournisseurs débiteurs</span>
      </div>
      <div className="revision-ref">Comptes 409x — avances (4091), emballages à rendre (4094), RRR à obtenir (4098). À déprécier si recouvrement incertain.</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Code fourn.</th>
              <th>Désignation</th>
              <th className="num editable-col" style={{ width: 130 }}>Solde au 31/12/N</th>
              <th style={{ width: 110 }}>Date du débit</th>
              <th>Objet du débit</th>
              <th style={{ width: 160 }}>Commentaire</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {debiteurLignes.map(l => (
              <tr key={l.id}>
                <td className="editable-cell"><input type="text" value={l.codeFourn} onChange={e => updateDebiteur(l.id, 'codeFourn', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateDebiteur(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.solde3112)} onChange={e => updateDebiteur(l.id, 'solde3112', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="date" value={l.dateDebit} onChange={e => updateDebiteur(l.id, 'dateDebit', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={l.objetDebit} onChange={e => updateDebiteur(l.id, 'objetDebit', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" value={l.commentaire} onChange={e => updateDebiteur(l.id, 'commentaire', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="À récupérer, à déprécier..." /></td>
                <td><button className="revision-od-delete" onClick={() => removeDebiteur(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun fournisseur débiteur à analyser.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(debiteurLignes.reduce((s, l) => s + l.solde3112, 0))}</strong></td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={addDebiteur}><LuPlus size={13} /> Ajouter un fournisseur débiteur</button>
      </div>
    </div>
  );
}
