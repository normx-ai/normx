// Contrôle 5 : ecarts de conversion (478 actif / 479 passif).
// Provision obligatoire sur ECA (478) : D 6591 / C 4991.

import React from 'react';
import { LuPlus, LuTrash2, LuCheck, LuInfo, LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, EcartConversionLigne } from '../revisionTypes';

interface Controle5Props {
  ecartLignes: EcartConversionLigne[];
  ecaLignes478: EcartConversionLigne[];
  isOpen: boolean;
  toggle: () => void;
  addEcart: () => void;
  updateEcart: (id: number, field: keyof EcartConversionLigne, value: string | number) => void;
  removeEcart: (id: number) => void;
}

export function Controle5Ecarts({
  ecartLignes, ecaLignes478, isOpen, toggle,
  addEcart, updateEcart, removeEcart,
}: Controle5Props): React.ReactElement {
  const hasLignes = ecartLignes.length > 0;
  const ecaPositifs = ecaLignes478.filter(l => l.soldeN > 0.5);
  const provisionMissing = ecaPositifs.length > 0;

  return (
    <div className="revision-control">
      <div className="revision-control-title" onClick={toggle} style={{ cursor: 'pointer' }}>
        <span>Controle 5 — Ecarts de conversion (478 / 479)</span>
        {hasLignes && !provisionMissing
          ? <span className="revision-badge ok"><LuCheck size={12} /> Conforme</span>
          : provisionMissing
            ? <span className="revision-badge ko"><LuInfo size={12} /> Provision requise</span>
            : null
        }
        {isOpen ? <LuChevronRight size={14} /> : <LuChevronDown size={14} />}
      </div>
      {isOpen && (
        <>
          <div className="revision-ref">ECA (478) = perte latente de change (actif) — ECP (479) = gain latent de change (passif). Provision obligatoire sur ECA : D 6591 / C 4991</div>

          {provisionMissing && (
            <div className="revision-alert rouge" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: 6, marginTop: 8, fontSize: '12.5px' }}>
              <LuInfo size={14} /> <strong>ALERTE :</strong> Ecart de conversion — Actif (478) detecte pour un montant de <strong>{fmt(ecaLignes478.reduce((s, l) => s + l.soldeN, 0))}</strong>. Une provision pour risque de change (D 6591 / C 4991) est obligatoire.
            </div>
          )}

          <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
            <table className="revision-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Compte</th>
                  <th>Designation</th>
                  <th className="num" style={{ width: 130 }}>Solde N</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {ecartLignes.map(l => (
                  <tr key={l.id} className={l.compte.startsWith('478') && l.soldeN > 0.5 ? 'ecart-row' : ''}>
                    <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updateEcart(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                    <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateEcart(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeN)} onChange={e => updateEcart(l.id, 'soldeN', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td><button className="revision-od-delete" onClick={() => removeEcart(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                  </tr>
                ))}
                {!hasLignes && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun ecart de conversion (478/479) en balance.</td></tr>
                )}
              </tbody>
              {hasLignes && (
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Total</strong></td>
                    <td className="num"><strong>{fmt(ecartLignes.reduce((s, l) => s + l.soldeN, 0))}</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="revision-od-actions">
            <button className="revision-od-add" onClick={addEcart}><LuPlus size={13} /> Ajouter un ecart de conversion</button>
          </div>
        </>
      )}
    </div>
  );
}
