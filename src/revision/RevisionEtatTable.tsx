import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import {
  ISVerifLigne, TVACollecteeLigne, TVADeductibleLigne,
  AutresImpotsLigne, DettesFiscalesLigne, RedressementLigne,
  fmt, fmtInput, parseInputValue,
} from './revisionTypes';

interface RevisionEtatTableProps {
  isLignes: ISVerifLigne[];
  tauxIS: number;
  onAddIsLigne: () => void;
  onUpdateIsLigne: (id: number, field: keyof ISVerifLigne, value: string | number) => void;
  onRemoveIsLigne: (id: number) => void;
  onSetTauxIS: (v: number) => void;
  resultatFiscal: number;
  isTheorique: number;
  isComptabilise: number;
  ecartIS: number;
  total891Balance: number;
  total441Balance: number;
  comptes89: BalanceLigne[];
  soldeDebit: (lignes: BalanceLigne[]) => number;
  tvaCollecteeLignes: TVACollecteeLigne[];
  onAddTvaCollectee: () => void;
  onUpdateTvaCollectee: (id: number, field: keyof TVACollecteeLigne, value: string | number) => void;
  onRemoveTvaCollectee: (id: number) => void;
  totalTvaCalculee: number;
  totalTvaDeclareeCollectee: number;
  ecartTvaCollectee: number;
  total4431Balance: number;
  tvaDeductibleLignes: TVADeductibleLigne[];
  onAddTvaDeductible: () => void;
  onUpdateTvaDeductible: (id: number, field: keyof TVADeductibleLigne, value: string | number) => void;
  onRemoveTvaDeductible: (id: number) => void;
  totalTvaDeclareeDeductible: number;
  totalTvaBalanceDeductible: number;
  ecartTvaDeductible: number;
  tvaDueTheorique: number;
  tvaDueBalance: number;
  creditTvaBalance: number;
  soldeTvaTheorique: number;
  creditTvaTheorique: number;
  ecartTvaDue: number;
  ecartCreditTva: number;
  total445Balance: number;
  autresImpotsLignes: AutresImpotsLigne[];
  onAddAutresImpots: () => void;
  onUpdateAutresImpots: (id: number, field: keyof AutresImpotsLigne, value: string | number) => void;
  onRemoveAutresImpots: (id: number) => void;
  dettesFiscalesLignes: DettesFiscalesLigne[];
  onAddDettesFiscales: () => void;
  onUpdateDettesFiscales: (id: number, field: keyof DettesFiscalesLigne, value: string | number) => void;
  onRemoveDettesFiscales: (id: number) => void;
  totalDettesDeclare: number;
  totalDettesBalance: number;
  totalDettesEcart: number;
  redressementLignes: RedressementLigne[];
  onAddRedressement: () => void;
  onUpdateRedressement: (id: number, field: keyof RedressementLigne, value: string | number) => void;
  onRemoveRedressement: (id: number) => void;
  onMarkUnsaved: () => void;
}

function RevisionEtatTable(props: RevisionEtatTableProps): React.ReactElement {
  const {
    isLignes, tauxIS, onAddIsLigne, onUpdateIsLigne, onRemoveIsLigne, onSetTauxIS,
    resultatFiscal, isTheorique, isComptabilise, ecartIS, total891Balance, total441Balance,
    comptes89, soldeDebit,
    tvaCollecteeLignes, onAddTvaCollectee, onUpdateTvaCollectee, onRemoveTvaCollectee,
    totalTvaCalculee, totalTvaDeclareeCollectee, ecartTvaCollectee, total4431Balance,
    tvaDeductibleLignes, onAddTvaDeductible, onUpdateTvaDeductible, onRemoveTvaDeductible,
    totalTvaDeclareeDeductible, totalTvaBalanceDeductible, ecartTvaDeductible,
    tvaDueTheorique, tvaDueBalance, creditTvaBalance, soldeTvaTheorique, creditTvaTheorique,
    ecartTvaDue, ecartCreditTva, total445Balance,
    autresImpotsLignes, onAddAutresImpots, onUpdateAutresImpots, onRemoveAutresImpots,
    dettesFiscalesLignes, onAddDettesFiscales, onUpdateDettesFiscales, onRemoveDettesFiscales,
    totalDettesDeclare, totalDettesBalance, totalDettesEcart,
    redressementLignes, onAddRedressement, onUpdateRedressement, onRemoveRedressement,
    onMarkUnsaved,
  } = props;

  return (
    <>
      {/* ========== Contrôle 1 : Vérification IS ========== */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 1 — Vérification de l'Impôt sur les Sociétés (IS)</span>
          {isLignes.length > 0 && (Math.abs(ecartIS) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Comptes 891 (IS exercice), 892 (rappels IS), 895 (IMF) / 441 (État, IS à payer)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th>Désignation</th>
                <th className="num editable-col" style={{ width: 160 }}>Montant</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLignes.map(l => (
                <tr key={l.id}>
                  <td className="editable-cell"><input type="text" value={l.designation} onChange={e => onUpdateIsLigne(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.montant)} onChange={e => onUpdateIsLigne(l.id, 'montant', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td>{l.id > 3 && <button className="revision-od-delete" onClick={() => onRemoveIsLigne(l.id)} title="Supprimer"><LuTrash2 size={13} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={onAddIsLigne}><LuPlus size={13} /> Ajouter une ligne</button>
        </div>

        <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Taux IS applicable :</strong>{' '}
            <input type="text" inputMode="numeric" value={tauxIS} onChange={e => { onSetTauxIS(parseFloat(e.target.value) || 0); onMarkUnsaved(); }} style={{ width: 50, textAlign: 'center', border: '1px solid #ddd', borderRadius: 4, padding: '2px 4px' }} /> %
          </div>
          <table className="revision-table revision-table-small" style={{ maxWidth: 500 }}>
            <tbody>
              <tr><td>Résultat fiscal calculé</td><td className="num"><strong>{fmt(resultatFiscal)}</strong></td></tr>
              <tr><td>IS théorique ({tauxIS}%)</td><td className="num"><strong>{fmt(isTheorique)}</strong></td></tr>
              <tr><td>IS comptabilisé (891x balance)</td><td className="num"><strong>{fmt(isComptabilise)}</strong></td></tr>
              <tr><td>Écart</td><td className={`num ${Math.abs(ecartIS) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartIS)}</strong></td></tr>
            </tbody>
          </table>
        </div>

        {/* Rapprochement IS */}
        <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0f4f8', borderRadius: 6, fontSize: '12.5px' }}>
          <strong>Rapprochement :</strong>
          <table className="revision-table revision-table-small" style={{ maxWidth: 500, marginTop: 6 }}>
            <tbody>
              <tr><td>IS théorique</td><td className="num">{fmt(isTheorique)}</td></tr>
              <tr><td>Solde 891 (IS en balance)</td><td className="num">{fmt(total891Balance)}</td></tr>
              <tr><td>Solde 441 (IS à payer en balance)</td><td className="num">{fmt(total441Balance)}</td></tr>
              {comptes89.filter(c => !c.numero_compte.startsWith('891')).map(c => (
                <tr key={c.numero_compte}>
                  <td>{c.numero_compte} — {c.libelle_compte}</td>
                  <td className="num">{fmt(soldeDebit([c]))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== Contrôle 2 : TVA collectée ========== */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 2 — TVA collectée</span>
          {tvaCollecteeLignes.length > 0 && (Math.abs(ecartTvaCollectee) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Comptes 4431 (TVA facturée sur ventes), 4432 — TVA calculée = Base HT x Taux TVA</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th>Nature</th>
                <th className="num editable-col" style={{ width: 130 }}>Base HT</th>
                <th className="num editable-col" style={{ width: 80 }}>Taux TVA %</th>
                <th className="num" style={{ width: 130 }}>TVA calculée</th>
                <th className="num editable-col" style={{ width: 130 }}>TVA déclarée</th>
                <th className="num" style={{ width: 110 }}>Écart</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {tvaCollecteeLignes.map(l => (
                <tr key={l.id} className={Math.abs(l.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={l.nature} onChange={e => onUpdateTvaCollectee(l.id, 'nature', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.baseHT)} onChange={e => onUpdateTvaCollectee(l.id, 'baseHT', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={l.tauxTVA || ''} onChange={e => onUpdateTvaCollectee(l.id, 'tauxTVA', parseFloat(e.target.value) || 0)} style={{ maxWidth: 'none', textAlign: 'center' }} /></td>
                  <td className="num computed">{fmt(l.tvaCalculee)}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.tvaDeclaree)} onChange={e => onUpdateTvaCollectee(l.id, 'tvaDeclaree', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(l.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(l.ecart)}</td>
                  <td><button className="revision-od-delete" onClick={() => onRemoveTvaCollectee(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {tvaCollecteeLignes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune ligne de TVA collectée saisie. Ajoutez les bases HT par nature d'opération.</td></tr>
              )}
            </tbody>
            {tvaCollecteeLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td></td>
                  <td className="num"><strong>{fmt(totalTvaCalculee)}</strong></td>
                  <td className="num"><strong>{fmt(totalTvaDeclareeCollectee)}</strong></td>
                  <td className={`num ${Math.abs(ecartTvaCollectee) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartTvaCollectee)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {(tvaCollecteeLignes.length > 0 || total4431Balance !== 0) && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
            <table className="revision-table revision-table-small" style={{ maxWidth: 400 }}>
              <tbody>
                <tr><td>Total TVA déclarée (Contrôle 2)</td><td className="num"><strong>{fmt(totalTvaDeclareeCollectee)}</strong></td></tr>
                <tr><td>Balance 4431/4432</td><td className="num"><strong>{fmt(total4431Balance)}</strong></td></tr>
                <tr><td>Écart</td><td className={`num ${Math.abs(totalTvaDeclareeCollectee - total4431Balance) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalTvaDeclareeCollectee - total4431Balance)}</strong></td></tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={onAddTvaCollectee}><LuPlus size={13} /> Ajouter une ligne TVA collectée</button>
        </div>
      </div>

      {/* ========== Contrôle 3 : TVA déductible ========== */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 3 — TVA déductible</span>
          {tvaDeductibleLignes.length > 0 && (Math.abs(ecartTvaDeductible) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Comptes 4451 (sur immobilisations), 4452 (sur achats), 4453 (sur transports), 4454 (sur services)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th>Nature</th>
                <th style={{ width: 80 }}>Compte</th>
                <th className="num editable-col" style={{ width: 140 }}>TVA déclarée</th>
                <th className="num" style={{ width: 140 }}>TVA balance</th>
                <th className="num" style={{ width: 110 }}>Écart</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {tvaDeductibleLignes.map(l => (
                <tr key={l.id} className={Math.abs(l.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={l.nature} onChange={e => onUpdateTvaDeductible(l.id, 'nature', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.compte} onChange={e => onUpdateTvaDeductible(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.tvaDeclaree)} onChange={e => onUpdateTvaDeductible(l.id, 'tvaDeclaree', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(l.tvaBalance)}</td>
                  <td className={`num ${Math.abs(l.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(l.ecart)}</td>
                  <td><button className="revision-od-delete" onClick={() => onRemoveTvaDeductible(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {tvaDeductibleLignes.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte de TVA déductible en balance.</td></tr>
              )}
            </tbody>
            {tvaDeductibleLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalTvaDeclareeDeductible)}</strong></td>
                  <td className="num"><strong>{fmt(totalTvaBalanceDeductible)}</strong></td>
                  <td className={`num ${Math.abs(ecartTvaDeductible) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartTvaDeductible)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={onAddTvaDeductible}><LuPlus size={13} /> Ajouter une ligne TVA déductible</button>
        </div>
      </div>

      {/* ========== Contrôle 4 : Solde TVA ========== */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 4 — Solde de TVA (TVA collectée - TVA déductible)</span>
          {(tvaCollecteeLignes.length > 0 || tvaDeductibleLignes.length > 0) && (
            Math.abs(ecartTvaDue) < 0.5 && Math.abs(ecartCreditTva) < 0.5
              ? <span className="revision-badge ok">Conforme</span>
              : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">TVA due (4441) = TVA collectée - TVA déductible ; Crédit de TVA (4449) si solde négatif</div>

        <div style={{ marginTop: 8, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
          <table className="revision-table revision-table-small" style={{ maxWidth: 550 }}>
            <thead>
              <tr>
                <th></th>
                <th className="num" style={{ width: 130 }}>Théorique</th>
                <th className="num" style={{ width: 130 }}>Balance</th>
                <th className="num" style={{ width: 110 }}>Écart</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>TVA collectée (déclarée)</td>
                <td className="num">{fmt(totalTvaDeclareeCollectee)}</td>
                <td className="num">{fmt(total4431Balance)}</td>
                <td className={`num ${Math.abs(totalTvaDeclareeCollectee - total4431Balance) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(totalTvaDeclareeCollectee - total4431Balance)}</td>
              </tr>
              <tr>
                <td>TVA déductible (déclarée)</td>
                <td className="num">({fmt(totalTvaDeclareeDeductible)})</td>
                <td className="num">({fmt(total445Balance)})</td>
                <td className={`num ${Math.abs(totalTvaDeclareeDeductible - total445Balance) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(totalTvaDeclareeDeductible - total445Balance)}</td>
              </tr>
              <tr style={{ borderTop: '2px solid #ccc' }}>
                <td><strong>= TVA due / (Crédit TVA)</strong></td>
                <td className="num"><strong>{fmt(tvaDueTheorique)}</strong></td>
                <td className="num"><strong>{tvaDueBalance > 0 ? fmt(tvaDueBalance) : creditTvaBalance > 0 ? `(${fmt(creditTvaBalance)})` : ''}</strong></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Rapprochement détaillé */}
        <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0f4f8', borderRadius: 6, fontSize: '12.5px' }}>
          <strong>Rapprochement :</strong>
          <table className="revision-table revision-table-small" style={{ maxWidth: 500, marginTop: 6 }}>
            <tbody>
              {tvaDueTheorique >= 0 ? (
                <>
                  <tr><td>TVA due théorique</td><td className="num">{fmt(soldeTvaTheorique)}</td></tr>
                  <tr><td>TVA due balance (4441)</td><td className="num">{fmt(tvaDueBalance)}</td></tr>
                  <tr><td>Écart</td><td className={`num ${Math.abs(ecartTvaDue) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartTvaDue)}</strong></td></tr>
                </>
              ) : (
                <>
                  <tr><td>Crédit TVA théorique</td><td className="num">{fmt(creditTvaTheorique)}</td></tr>
                  <tr><td>Crédit TVA balance (4449)</td><td className="num">{fmt(creditTvaBalance)}</td></tr>
                  <tr><td>Écart</td><td className={`num ${Math.abs(ecartCreditTva) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(ecartCreditTva)}</strong></td></tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== Contrôle 5 : Autres impôts et taxes ========== */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 5 — Autres impôts et taxes</span>
        </div>
        <div className="revision-ref">Comptes 44x résiduels + 64x (641 directs, 645 indirects, 646 droits d'enregistrement, 647 pénalités fiscales)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Compte</th>
                <th>Désignation</th>
                <th className="num" style={{ width: 130 }}>Balance</th>
                <th style={{ width: 180 }}>Justification</th>
                <th style={{ width: 160 }}>Observation</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {autresImpotsLignes.map(l => (
                <tr key={l.id}>
                  <td className="editable-cell"><input type="text" value={l.compte} onChange={e => onUpdateAutresImpots(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.designation} onChange={e => onUpdateAutresImpots(l.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.balance)} onChange={e => onUpdateAutresImpots(l.id, 'balance', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.justification} onChange={e => onUpdateAutresImpots(l.id, 'justification', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="Avis d'imposition, déclaration..." /></td>
                  <td className="editable-cell"><input type="text" value={l.observation} onChange={e => onUpdateAutresImpots(l.id, 'observation', e.target.value)} style={{ maxWidth: 'none', fontSize: '11px' }} placeholder="RAS / À régulariser..." /></td>
                  <td><button className="revision-od-delete" onClick={() => onRemoveAutresImpots(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {autresImpotsLignes.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun autre impôt ou taxe à analyser.</td></tr>
              )}
            </tbody>
            {autresImpotsLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(autresImpotsLignes.reduce((s, l) => s + l.balance, 0))}</strong></td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={onAddAutresImpots}><LuPlus size={13} /> Ajouter un impôt / taxe</button>
        </div>
      </div>

      {/* ========== Contrôle 6 : Bouclage dettes fiscales périodiques ========== */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 6 — Bouclage dettes fiscales périodiques</span>
          {dettesFiscalesLignes.length > 0 && (Math.abs(totalDettesEcart) < 0.5
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
              {dettesFiscalesLignes.map(l => (
                <tr key={l.id} className={Math.abs(l.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={l.compte} onChange={e => onUpdateDettesFiscales(l.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.description} onChange={e => onUpdateDettesFiscales(l.id, 'description', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.baseImposition)} onChange={e => onUpdateDettesFiscales(l.id, 'baseImposition', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.impotDeclare)} onChange={e => onUpdateDettesFiscales(l.id, 'impotDeclare', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(l.balanceGenerale)}</td>
                  <td className={`num ${Math.abs(l.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(l.ecart)}</td>
                  <td><button className="revision-od-delete" onClick={() => onRemoveDettesFiscales(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {dettesFiscalesLignes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune dette fiscale périodique à analyser.</td></tr>
              )}
            </tbody>
            {dettesFiscalesLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(dettesFiscalesLignes.reduce((s, l) => s + l.baseImposition, 0))}</strong></td>
                  <td className="num"><strong>{fmt(totalDettesDeclare)}</strong></td>
                  <td className="num"><strong>{fmt(totalDettesBalance)}</strong></td>
                  <td className={`num ${Math.abs(totalDettesEcart) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalDettesEcart)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {Math.abs(totalDettesEcart) > 0.5 && (
          <div style={{ marginTop: 8, padding: '10px 14px', background: '#fff3cd', borderRadius: 6, fontSize: '12.5px', color: '#856404' }}>
            <strong>Alerte :</strong> Un écart de <strong>{fmt(totalDettesEcart)}</strong> existe entre les impôts déclarés et la balance générale. Vérifiez les déclarations fiscales et rapprochez avec les comptes concernés.
          </div>
        )}

        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={onAddDettesFiscales}><LuPlus size={13} /> Ajouter une dette fiscale</button>
        </div>
      </div>

      {/* ========== Contrôle 7 : Redressements fiscaux ========== */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 7 — Redressements fiscaux</span>
        </div>
        <div className="revision-ref">Suivi des redressements fiscaux — Si accepté : D 6xx / C 4486 (charges à payer) ; Si contesté : D 6591 / C 19xx (provision pour risques)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 140 }}>Type contrôle</th>
                <th style={{ width: 110 }}>Date contrôle</th>
                <th style={{ width: 130 }}>Référence AMR</th>
                <th style={{ width: 80 }}>Payé ?</th>
                <th className="num editable-col" style={{ width: 140 }}>Charge à payer (4486x)</th>
                <th className="num editable-col" style={{ width: 140 }}>Provision contestation (19xx)</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {redressementLignes.map(l => (
                <tr key={l.id}>
                  <td className="editable-cell"><input type="text" value={l.typeControle} onChange={e => onUpdateRedressement(l.id, 'typeControle', e.target.value)} style={{ maxWidth: 'none' }} placeholder="IS, TVA, Patente..." /></td>
                  <td className="editable-cell"><input type="date" value={l.dateControle} onChange={e => onUpdateRedressement(l.id, 'dateControle', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={l.referenceAMR} onChange={e => onUpdateRedressement(l.id, 'referenceAMR', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} placeholder="N° AMR" /></td>
                  <td className="editable-cell">
                    <select value={l.paye} onChange={e => onUpdateRedressement(l.id, 'paye', e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 4, padding: '2px 4px', fontSize: '12px' }}>
                      <option value="">—</option>
                      <option value="Oui">Oui</option>
                      <option value="Non">Non</option>
                    </select>
                  </td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.chargeAPayer4486)} onChange={e => onUpdateRedressement(l.id, 'chargeAPayer4486', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.provisionContestation19)} onChange={e => onUpdateRedressement(l.id, 'provisionContestation19', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td><button className="revision-od-delete" onClick={() => onRemoveRedressement(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {redressementLignes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun redressement fiscal à signaler.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {redressementLignes.length > 0 && (
          <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0f4f8', borderRadius: 6, fontSize: '12.5px' }}>
            <strong>Écritures suggérées :</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
              <li>Si redressement <strong>accepté</strong> (payé = Oui) : <code>D 6xx (charge fiscale) / C 4486 (État, charges à payer)</code></li>
              <li>Si redressement <strong>contesté</strong> (payé = Non) : <code>D 6591 (dotation provisions litiges) / C 19xx (provisions pour risques)</code></li>
            </ul>
          </div>
        )}

        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={onAddRedressement}><LuPlus size={13} /> Ajouter un redressement</button>
        </div>
      </div>
    </>
  );
}

export default RevisionEtatTable;
