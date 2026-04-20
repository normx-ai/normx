// Controle 6 : Bouclage dettes fiscales periodiques (4411, 4421, 4441, 4471).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { DettesFiscalesLigne, fmt, fmtInput, parseInputValue } from '../revisionTypes';

interface Props {
  dettesFiscalesLignes: DettesFiscalesLigne[];
  onAddDettesFiscales: () => void;
  onUpdateDettesFiscales: (id: number, field: keyof DettesFiscalesLigne, value: string | number) => void;
  onRemoveDettesFiscales: (id: number) => void;
  totalDettesDeclare: number;
  totalDettesBalance: number;
  totalDettesEcart: number;
}

export function Controle6Dettes(p: Props): React.JSX.Element {
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 6 — Bouclage dettes fiscales périodiques</span>
        {p.dettesFiscalesLignes.length > 0 && (Math.abs(p.totalDettesEcart) < 0.5
          ? <span className="revision-badge ok">Conforme</span>
          : <span className="revision-badge ko">Écart détecté</span>
        )}
      </div>
      <div className="revision-ref">Comptes 4411 (acomptes IS), 4421 (cotisations patronales), 4441 (TVA due), 4471 (impôts retenus à la source) — Rapprochement déclarations fiscales / balance générale</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Compte</th>
              <th>Description</th>
              <th className="num editable-col" style={{ width: 140 }}>Base d'imposition</th>
              <th className="num editable-col" style={{ width: 140 }}>Impôt déclaré</th>
              <th className="num" style={{ width: 140 }}>Balance générale</th>
              <th className="num" style={{ width: 110 }}>Écart</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {p.dettesFiscalesLignes.map(l => (
              <tr key={l.id} className={Math.abs(l.ecart) > 0.5 ? 'ecart-row' : ''}>
                <td className="editable-cell"><input type="text" value={l.compte} onChange={e => p.onUpdateDettesFiscales(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                <td className="editable-cell"><input type="text" value={l.description} onChange={e => p.onUpdateDettesFiscales(l.id, 'description', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.baseImposition)} onChange={e => p.onUpdateDettesFiscales(l.id, 'baseImposition', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.impotDeclare)} onChange={e => p.onUpdateDettesFiscales(l.id, 'impotDeclare', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="num computed">{fmt(l.balanceGenerale)}</td>
                <td className={`num ${Math.abs(l.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(l.ecart)}</td>
                <td><button className="revision-od-delete" onClick={() => p.onRemoveDettesFiscales(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {p.dettesFiscalesLignes.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune dette fiscale périodique à analyser.</td></tr>
            )}
          </tbody>
          {p.dettesFiscalesLignes.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(p.dettesFiscalesLignes.reduce((s, l) => s + l.baseImposition, 0))}</strong></td>
                <td className="num"><strong>{fmt(p.totalDettesDeclare)}</strong></td>
                <td className="num"><strong>{fmt(p.totalDettesBalance)}</strong></td>
                <td className={`num ${Math.abs(p.totalDettesEcart) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.totalDettesEcart)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {Math.abs(p.totalDettesEcart) > 0.5 && (
        <div style={{ marginTop: 8, padding: '10px 14px', background: '#fff3cd', borderRadius: 6, fontSize: '12.5px', color: '#856404' }}>
          <strong>Alerte :</strong> Un écart de <strong>{fmt(p.totalDettesEcart)}</strong> existe entre les impôts déclarés et la balance générale. Vérifiez les déclarations fiscales et rapprochez avec les comptes concernés.
        </div>
      )}

      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={p.onAddDettesFiscales}><LuPlus size={13} /> Ajouter une dette fiscale</button>
      </div>
    </div>
  );
}
