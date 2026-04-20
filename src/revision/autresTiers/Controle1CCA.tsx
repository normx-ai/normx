// Contrôle 1 : charges constatees d'avance (compte 476).

import React from 'react';
import { LuPlus, LuTrash2, LuCheck, LuInfo, LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, CCALigne } from '../revisionTypes';

interface Controle1Props {
  ccaLignes: CCALigne[];
  ccaCrediteurAlerts: CCALigne[];
  ccaHausseAlerts: CCALigne[];
  isOpen: boolean;
  toggle: () => void;
  addCca: () => void;
  updateCca: (id: number, field: keyof CCALigne, value: string | number) => void;
  removeCca: (id: number) => void;
}

export function Controle1CCA({
  ccaLignes, ccaCrediteurAlerts, ccaHausseAlerts, isOpen, toggle,
  addCca, updateCca, removeCca,
}: Controle1Props): React.ReactElement {
  const hasLignes = ccaLignes.length > 0;
  const allJustifie = hasLignes && ccaCrediteurAlerts.length === 0 && ccaLignes.every(l => l.justifie === 'Oui');

  return (
    <div className="revision-control">
      <div className="revision-control-title" onClick={toggle} style={{ cursor: 'pointer' }}>
        <span>Controle 1 — Charges constatees d'avance (476)</span>
        {allJustifie
          ? <span className="revision-badge ok"><LuCheck size={12} /> Conforme</span>
          : hasLignes
            ? <span className="revision-badge ko"><LuInfo size={12} /> A verifier</span>
            : null
        }
        {isOpen ? <LuChevronRight size={14} /> : <LuChevronDown size={14} />}
      </div>
      {isOpen && (
        <>
          <div className="revision-ref">Constatation : D 476 / C 6xx — Contrepassation 01/01/N+1 : D 6xx / C 476</div>

          {ccaCrediteurAlerts.length > 0 && (
            <div className="revision-alert rouge">
              <LuInfo size={14} /> <strong>Anomalie :</strong> Les CCA suivants ont un solde crediteur (anormal, doit etre debiteur) : {ccaCrediteurAlerts.map(l => l.compte).join(', ')}
            </div>
          )}
          {ccaHausseAlerts.length > 0 && (
            <div className="revision-alert orange">
              <LuInfo size={14} /> <strong>Attention :</strong> Hausse significative des CCA par rapport a N-1 : {ccaHausseAlerts.map(l => `${l.compte} (N: ${fmt(l.soldeN)}, N-1: ${fmt(l.soldeN1)})`).join(', ')}
            </div>
          )}

          <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
            <table className="revision-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Compte</th>
                  <th>Designation</th>
                  <th className="num" style={{ width: 110 }}>Solde N</th>
                  <th className="num" style={{ width: 110 }}>Solde N-1</th>
                  <th className="editable-col" style={{ width: 140 }}>Nature charge</th>
                  <th className="editable-col" style={{ width: 130 }}>Periode couverte</th>
                  <th style={{ width: 70 }}>Justifie</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {ccaLignes.map(l => (
                  <tr key={l.id} className={l.soldeN < 0 ? 'ecart-row' : ''}>
                    <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updateCca(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                    <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updateCca(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeN)} onChange={e => updateCca(l.id, 'soldeN', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeN1)} onChange={e => updateCca(l.id, 'soldeN1', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" value={l.natureCharge} onChange={e => updateCca(l.id, 'natureCharge', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Loyer, assurance, maintenance..." /></td>
                    <td className="editable-cell"><input type="text" value={l.periodeCouverte} onChange={e => updateCca(l.id, 'periodeCouverte', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="01/01-31/03/N+1" /></td>
                    <td>
                      <select value={l.justifie} onChange={e => updateCca(l.id, 'justifie', e.target.value)} style={{ padding: '3px 4px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                        <option value="Oui">Oui</option>
                        <option value="Non">Non</option>
                      </select>
                    </td>
                    <td><button className="revision-od-delete" onClick={() => removeCca(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                  </tr>
                ))}
                {!hasLignes && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun CCA (476) en balance. Ajoutez une ligne si necessaire.</td></tr>
                )}
              </tbody>
              {hasLignes && (
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Total</strong></td>
                    <td className="num"><strong>{fmt(ccaLignes.reduce((s, l) => s + l.soldeN, 0))}</strong></td>
                    <td className="num"><strong>{fmt(ccaLignes.reduce((s, l) => s + l.soldeN1, 0))}</strong></td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="revision-od-actions">
            <button className="revision-od-add" onClick={addCca}><LuPlus size={13} /> Ajouter un CCA</button>
          </div>
        </>
      )}
    </div>
  );
}
