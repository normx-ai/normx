// Contrôle 4 : valorisation des stocks en cours de route (comptes 38x).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, EncoursRouteLigne } from '../revisionTypes';

interface Controle4Props {
  encoursLignes: EncoursRouteLigne[];
  encoursCalcs: Array<EncoursRouteLigne & { totalRecalcule: number }>;
  totalEncoursRecalcule: number;
  totalEncours38Balance: number;
  ecartEncours: number;
  addEncours: () => void;
  updateEncours: (id: number, field: keyof EncoursRouteLigne, value: string | number) => void;
  removeEncours: (id: number) => void;
}

export function Controle4Encours({
  encoursLignes, encoursCalcs, totalEncoursRecalcule, totalEncours38Balance, ecartEncours,
  addEncours, updateEncours, removeEncours,
}: Controle4Props): React.ReactElement {
  const hasLignes = encoursLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 4 — Valorisation des stocks en cours de route</span>
        {hasLignes && (Math.abs(ecartEncours) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>
        )}
      </div>
      <div className="revision-ref">Comptes 38x — stocks en cours de route, en consignation ou en dépôt</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 100 }}>Dossier import</th>
              <th>Fournisseur</th>
              <th className="num editable-col" style={{ width: 120 }}>Facture princ.</th>
              <th className="num editable-col" style={{ width: 100 }}>Transport</th>
              <th className="num editable-col" style={{ width: 100 }}>Douane</th>
              <th className="num editable-col" style={{ width: 100 }}>Débours</th>
              <th className="num" style={{ width: 120 }}>Total recalculé</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {encoursCalcs.map(e => (
              <tr key={e.id}>
                <td className="editable-cell"><input type="text" value={e.dossierImport} onChange={ev => updateEncours(e.id, 'dossierImport', ev.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                <td className="editable-cell"><input type="text" value={e.fournisseur} onChange={ev => updateEncours(e.id, 'fournisseur', ev.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(e.facturePrincipale)} onChange={ev => updateEncours(e.id, 'facturePrincipale', parseInputValue(ev.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(e.transport)} onChange={ev => updateEncours(e.id, 'transport', parseInputValue(ev.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(e.douane)} onChange={ev => updateEncours(e.id, 'douane', parseInputValue(ev.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(e.debours)} onChange={ev => updateEncours(e.id, 'debours', parseInputValue(ev.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="num computed">{fmt(e.totalRecalcule)}</td>
                <td><button className="revision-od-delete" onClick={() => removeEncours(e.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun dossier d'import en transit saisi.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(encoursLignes.reduce((s, e) => s + e.facturePrincipale, 0))}</strong></td>
                <td className="num"><strong>{fmt(encoursLignes.reduce((s, e) => s + e.transport, 0))}</strong></td>
                <td className="num"><strong>{fmt(encoursLignes.reduce((s, e) => s + e.douane, 0))}</strong></td>
                <td className="num"><strong>{fmt(encoursLignes.reduce((s, e) => s + e.debours, 0))}</strong></td>
                <td className="num"><strong>{fmt(totalEncoursRecalcule)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {hasLignes && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
          <table className="revision-table revision-table-small" style={{ maxWidth: 400 }}>
            <tbody>
              <tr><td>Total recalculé</td><td className="num"><strong>{fmt(totalEncoursRecalcule)}</strong></td></tr>
              <tr><td>Balance 38x</td><td className="num"><strong>{fmt(totalEncours38Balance)}</strong></td></tr>
              <tr><td>Écart</td><td className={`num ${Math.abs(ecartEncours) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartEncours)}</strong></td></tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={addEncours}><LuPlus size={13} /> Ajouter un dossier</button>
      </div>
    </div>
  );
}
