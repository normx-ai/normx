// Contrôle 2 : produits constates d'avance (compte 477).

import React from 'react';
import { LuPlus, LuTrash2, LuCheck, LuInfo, LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, PCALigne } from '../revisionTypes';

interface Controle2Props {
  pcaLignes: PCALigne[];
  pcaDebiteurAlerts: PCALigne[];
  isOpen: boolean;
  toggle: () => void;
  addPca: () => void;
  updatePca: (id: number, field: keyof PCALigne, value: string | number) => void;
  removePca: (id: number) => void;
}

export function Controle2PCA({
  pcaLignes, pcaDebiteurAlerts, isOpen, toggle,
  addPca, updatePca, removePca,
}: Controle2Props): React.ReactElement {
  const hasLignes = pcaLignes.length > 0;
  const allJustifie = hasLignes && pcaDebiteurAlerts.length === 0 && pcaLignes.every(l => l.justifie === 'Oui');

  return (
    <div className="revision-control">
      <div className="revision-control-title" onClick={toggle} style={{ cursor: 'pointer' }}>
        <span>Controle 2 — Produits constates d'avance (477)</span>
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
          <div className="revision-ref">Constatation : D 7xx / C 477 — Contrepassation 01/01/N+1 : D 477 / C 7xx</div>

          {pcaDebiteurAlerts.length > 0 && (
            <div className="revision-alert rouge">
              <LuInfo size={14} /> <strong>Anomalie :</strong> Les PCA suivants ont un solde debiteur (anormal, doit etre crediteur) : {pcaDebiteurAlerts.map(l => l.compte).join(', ')}
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
                  <th className="editable-col" style={{ width: 140 }}>Nature produit</th>
                  <th className="editable-col" style={{ width: 130 }}>Periode couverte</th>
                  <th style={{ width: 70 }}>Justifie</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {pcaLignes.map(l => (
                  <tr key={l.id} className={l.soldeN < 0 ? 'ecart-row' : ''}>
                    <td className="editable-cell"><input type="text" value={l.compte} onChange={e => updatePca(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                    <td className="editable-cell"><input type="text" value={l.designation} onChange={e => updatePca(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeN)} onChange={e => updatePca(l.id, 'soldeN', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.soldeN1)} onChange={e => updatePca(l.id, 'soldeN1', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" value={l.natureProduit} onChange={e => updatePca(l.id, 'natureProduit', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Abonnement, loyer percu..." /></td>
                    <td className="editable-cell"><input type="text" value={l.periodeCouverte} onChange={e => updatePca(l.id, 'periodeCouverte', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="01/01-31/03/N+1" /></td>
                    <td>
                      <select value={l.justifie} onChange={e => updatePca(l.id, 'justifie', e.target.value)} style={{ padding: '3px 4px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                        <option value="Oui">Oui</option>
                        <option value="Non">Non</option>
                      </select>
                    </td>
                    <td><button className="revision-od-delete" onClick={() => removePca(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                  </tr>
                ))}
                {!hasLignes && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun PCA (477) en balance. Ajoutez une ligne si necessaire.</td></tr>
                )}
              </tbody>
              {hasLignes && (
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Total</strong></td>
                    <td className="num"><strong>{fmt(pcaLignes.reduce((s, l) => s + l.soldeN, 0))}</strong></td>
                    <td className="num"><strong>{fmt(pcaLignes.reduce((s, l) => s + l.soldeN1, 0))}</strong></td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="revision-od-actions">
            <button className="revision-od-add" onClick={addPca}><LuPlus size={13} /> Ajouter un PCA</button>
          </div>
        </>
      )}
    </div>
  );
}
