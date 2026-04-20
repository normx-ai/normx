// Contrôle 5 : dettes fournisseurs en monnaie etrangere (perte/gain latent).

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, DetteDeviseLigne } from '../revisionTypes';

interface Controle5Props {
  deviseLignes: DetteDeviseLigne[];
  deviseCalcs: Array<DetteDeviseLigne & { valeurInventaire: number; perteLatente: number; gainLatent: number }>;
  totalPertesLatentes: number;
  totalGainsLatents: number;
  addDevise: () => void;
  updateDevise: (id: number, field: keyof DetteDeviseLigne, value: string | number) => void;
  removeDevise: (id: number) => void;
}

export function Controle5Devises({ deviseLignes, deviseCalcs, totalPertesLatentes, totalGainsLatents, addDevise, updateDevise, removeDevise }: Controle5Props): React.ReactElement {
  const hasLignes = deviseLignes.length > 0;
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 5 — Dettes en monnaie étrangère</span>
      </div>
      <div className="revision-ref">Pertes latentes : D 478 (Écarts de conversion — Actif) / C 401. Gains latents : D 401 / C 479 (Écarts de conversion — Passif)</div>

      <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
        <table className="revision-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Code fourn.</th>
              <th>Nom fournisseur</th>
              <th style={{ width: 70 }}>Monnaie</th>
              <th className="num editable-col" style={{ width: 110 }}>Valeur devises</th>
              <th className="num editable-col" style={{ width: 130 }}>Val. initiale FCFA</th>
              <th className="num editable-col" style={{ width: 100 }}>Parité 31/12</th>
              <th className="num" style={{ width: 130 }}>Val. inventaire</th>
              <th className="num" style={{ width: 110 }}>Perte latente</th>
              <th className="num" style={{ width: 110 }}>Gain latent</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {deviseCalcs.map(d => (
              <tr key={d.id} className={d.perteLatente > 0.5 ? 'ecart-row' : ''}>
                <td className="editable-cell"><input type="text" value={d.codeFourn} onChange={e => updateDevise(d.id, 'codeFourn', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                <td className="editable-cell"><input type="text" value={d.nomFourn} onChange={e => updateDevise(d.id, 'nomFourn', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell">
                  <select value={d.monnaie} onChange={e => updateDevise(d.id, 'monnaie', e.target.value)} style={{ padding: '3px 4px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CNY">CNY</option>
                    <option value="Autre">Autre</option>
                  </select>
                </td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.valeurDevise)} onChange={e => updateDevise(d.id, 'valeurDevise', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.valeurInitialeFCFA)} onChange={e => updateDevise(d.id, 'valeurInitialeFCFA', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.parite3112)} onChange={e => updateDevise(d.id, 'parite3112', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                <td className="num computed">{fmt(d.valeurInventaire)}</td>
                <td className={`num ${d.perteLatente > 0.5 ? 'ecart-val' : ''}`}>{fmt(d.perteLatente)}</td>
                <td className={`num ${d.gainLatent > 0.5 ? 'ok-val' : ''}`}>{fmt(d.gainLatent)}</td>
                <td><button className="revision-od-delete" onClick={() => removeDevise(d.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
              </tr>
            ))}
            {!hasLignes && (
              <tr><td colSpan={10} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune dette en devise saisie.</td></tr>
            )}
          </tbody>
          {hasLignes && (
            <tfoot>
              <tr>
                <td colSpan={4}><strong>Total</strong></td>
                <td className="num"><strong>{fmt(deviseLignes.reduce((s, d) => s + d.valeurInitialeFCFA, 0))}</strong></td>
                <td></td>
                <td className="num"><strong>{fmt(deviseCalcs.reduce((s, d) => s + d.valeurInventaire, 0))}</strong></td>
                <td className="num ecart-val"><strong>{fmt(totalPertesLatentes)}</strong></td>
                <td className="num ok-val"><strong>{fmt(totalGainsLatents)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="revision-od-actions">
        <button className="revision-od-add" onClick={addDevise}><LuPlus size={13} /> Ajouter une dette en devise</button>
      </div>
    </div>
  );
}
