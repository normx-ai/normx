import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import {
  RecouvLigne, CreanceDouteuseLigne, DeprecVarLigne,
  CreanceDeviseLigne, CircularClientLigne, ProdRecevoirLigne,
  fmt, fmtInput, parseInputValue,
} from './revisionTypes';

interface RevisionClientsTableProps {
  // Controle 1 : Recouvrabilite
  recouvLignes: RecouvLigne[];
  onAddRecouv: () => void;
  onUpdateRecouv: (id: number, field: keyof RecouvLigne, value: string | number) => void;
  onRemoveRecouv: (id: number) => void;
  totalBalAux: number;
  totalReconnu: number;
  totalEcartRecouv: number;
  // Controle 2 : Creances douteuses
  douteuseCalcs: (CreanceDouteuseLigne & { soldeNCreance: number; soldeNDeprec: number })[];
  douteuseLignes: CreanceDouteuseLigne[];
  onAddDouteuse: () => void;
  onUpdateDouteuse: (id: number, field: keyof CreanceDouteuseLigne, value: string | number) => void;
  onRemoveDouteuse: (id: number) => void;
  // Controle 3 : Depreciations bilan/resultat
  deprecVarLignes: DeprecVarLigne[];
  totalDeprecN1: number;
  totalDeprecDot: number;
  totalDeprecRep: number;
  totalDeprecCalc: number;
  totalDeprecBal: number;
  totalDeprecEcart: number;
  onUpdateDeprecEdit: (compte: string, field: 'soldeN1' | 'dotations' | 'reprises', value: number, currentSoldeN1: number) => void;
  // Controle 4 : Creances en devises
  deviseCalcs: (CreanceDeviseLigne & { valeurInventaire: number; perteLatente: number; gainLatent: number })[];
  deviseLignes: CreanceDeviseLigne[];
  onAddDevise: () => void;
  onUpdateDevise: (id: number, field: keyof CreanceDeviseLigne, value: string | number) => void;
  onRemoveDevise: (id: number) => void;
  totalPertesLatentes: number;
  totalGainsLatents: number;
  // Controle 5 : Circularisation
  circularLignes: CircularClientLigne[];
  onAddCircular: () => void;
  onAutoPopulateCircular: () => void;
  onUpdateCircular: (id: number, field: keyof CircularClientLigne, value: string | number) => void;
  onRemoveCircular: (id: number) => void;
  totalCircBalAux: number;
  totalCircReconnu: number;
  totalCircEcart: number;
  circularHasEcart: boolean;
  comptes411Length: number;
  // Controle 6 : Produits a recevoir
  prodRecevoirLignes: ProdRecevoirLigne[];
  totalProdRecN: number;
  totalProdRecN1: number;
  totalProdRecVar: number;
  prodRecevoirSignificantAndIncreasing: boolean;
  onUpdateProdRecevoirComment: (compte: string, commentaire: string) => void;
  onMarkUnsaved: () => void;
}

function RevisionClientsTable(props: RevisionClientsTableProps): React.ReactElement {
  const {
    recouvLignes, onAddRecouv, onUpdateRecouv, onRemoveRecouv,
    totalBalAux, totalReconnu, totalEcartRecouv,
    douteuseCalcs, douteuseLignes, onAddDouteuse, onUpdateDouteuse, onRemoveDouteuse,
    deprecVarLignes, totalDeprecN1, totalDeprecDot, totalDeprecRep, totalDeprecCalc, totalDeprecBal, totalDeprecEcart,
    onUpdateDeprecEdit,
    deviseCalcs, deviseLignes, onAddDevise, onUpdateDevise, onRemoveDevise,
    totalPertesLatentes, totalGainsLatents,
    circularLignes, onAddCircular, onAutoPopulateCircular, onUpdateCircular, onRemoveCircular,
    totalCircBalAux, totalCircReconnu, totalCircEcart, circularHasEcart, comptes411Length,
    prodRecevoirLignes, totalProdRecN, totalProdRecN1, totalProdRecVar, prodRecevoirSignificantAndIncreasing,
    onUpdateProdRecevoirComment, onMarkUnsaved,
  } = props;

  return (
    <>
      {/* Contrôle 1 : Recouvrabilité des créances */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 1 — Vérifier le caractère recouvrable des créances</span>
          {recouvLignes.length > 0 && (Math.abs(totalEcartRecouv) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Code client</th>
                <th>Nom client</th>
                <th className="num editable-col" style={{ width: 130 }}>Balance aux.</th>
                <th className="num editable-col" style={{ width: 130 }}>Montant reconnu</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
                <th style={{ width: 90 }}>Reconn. signée</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {recouvLignes.map(l => {
                const ecart = l.montantReconnu - l.balanceAux;
                return (
                  <tr key={l.id} className={Math.abs(ecart) > 0.5 ? 'ecart-row' : ''}>
                    <td className="editable-cell"><input type="text" value={l.codeClient} onChange={e => onUpdateRecouv(l.id, 'codeClient', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                    <td className="editable-cell"><input type="text" value={l.nomClient} onChange={e => onUpdateRecouv(l.id, 'nomClient', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.balanceAux)} onChange={e => onUpdateRecouv(l.id, 'balanceAux', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.montantReconnu)} onChange={e => onUpdateRecouv(l.id, 'montantReconnu', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td className={`num ${Math.abs(ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecart)}</td>
                    <td>
                      <select value={l.reconnaissanceSignee} onChange={e => onUpdateRecouv(l.id, 'reconnaissanceSignee', e.target.value)} style={{ padding: '3px 4px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                        <option value="Oui">Oui</option>
                        <option value="Non">Non</option>
                      </select>
                    </td>
                    <td><button className="revision-od-delete" onClick={() => onRemoveRecouv(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                  </tr>
                );
              })}
              {recouvLignes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun client saisi. Ajoutez les principaux clients à vérifier.</td></tr>
              )}
            </tbody>
            {recouvLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalBalAux)}</strong></td>
                  <td className="num"><strong>{fmt(totalReconnu)}</strong></td>
                  <td className={`num ${Math.abs(totalEcartRecouv) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalEcartRecouv)}</strong></td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={onAddRecouv}><LuPlus size={13} /> Ajouter un client</button>
        </div>
      </div>

      {/* Contrôle 2 : Créances douteuses */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 2 — Suivi des créances douteuses</span>
        </div>
        <div className="revision-ref">Reclassement : D 416 / C 411 — Dépréciation : D 6594 / C 491 — Perte définitive : D 6511 + 443 / C 416</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Code</th>
                <th>Nom client</th>
                <th className="num editable-col" style={{ width: 95 }}>Créance N-1</th>
                <th className="num editable-col" style={{ width: 95 }}>Nouvelles</th>
                <th className="num editable-col" style={{ width: 95 }}>Paiements</th>
                <th className="num" style={{ width: 95 }}>Créance N</th>
                <th className="num editable-col" style={{ width: 95 }}>Dépr. N-1</th>
                <th className="num editable-col" style={{ width: 95 }}>Dotations</th>
                <th className="num editable-col" style={{ width: 95 }}>Reprises</th>
                <th className="num" style={{ width: 95 }}>Dépr. N</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {douteuseCalcs.map(d => (
                <tr key={d.id}>
                  <td className="editable-cell"><input type="text" value={d.codeClient} onChange={e => onUpdateDouteuse(d.id, 'codeClient', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={d.nomClient} onChange={e => onUpdateDouteuse(d.id, 'nomClient', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.soldeN1Creance)} onChange={e => onUpdateDouteuse(d.id, 'soldeN1Creance', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.nouvellesCreances)} onChange={e => onUpdateDouteuse(d.id, 'nouvellesCreances', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.paiements)} onChange={e => onUpdateDouteuse(d.id, 'paiements', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(d.soldeNCreance)}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.soldeN1Deprec)} onChange={e => onUpdateDouteuse(d.id, 'soldeN1Deprec', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.dotations)} onChange={e => onUpdateDouteuse(d.id, 'dotations', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.reprises)} onChange={e => onUpdateDouteuse(d.id, 'reprises', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(d.soldeNDeprec)}</td>
                  <td><button className="revision-od-delete" onClick={() => onRemoveDouteuse(d.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {douteuseLignes.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune créance douteuse saisie.</td></tr>
              )}
            </tbody>
            {douteuseLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(douteuseLignes.reduce((s, d) => s + d.soldeN1Creance, 0))}</strong></td>
                  <td className="num"><strong>{fmt(douteuseLignes.reduce((s, d) => s + d.nouvellesCreances, 0))}</strong></td>
                  <td className="num"><strong>{fmt(douteuseLignes.reduce((s, d) => s + d.paiements, 0))}</strong></td>
                  <td className="num"><strong>{fmt(douteuseCalcs.reduce((s, d) => s + d.soldeNCreance, 0))}</strong></td>
                  <td className="num"><strong>{fmt(douteuseLignes.reduce((s, d) => s + d.soldeN1Deprec, 0))}</strong></td>
                  <td className="num"><strong>{fmt(douteuseLignes.reduce((s, d) => s + d.dotations, 0))}</strong></td>
                  <td className="num"><strong>{fmt(douteuseLignes.reduce((s, d) => s + d.reprises, 0))}</strong></td>
                  <td className="num"><strong>{fmt(douteuseCalcs.reduce((s, d) => s + d.soldeNDeprec, 0))}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={onAddDouteuse}><LuPlus size={13} /> Ajouter une créance douteuse</button>
        </div>
      </div>

      {/* Contrôle 3 : Cohérence dépréciations bilan/résultat */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 3 — Cohérence dépréciations bilan / résultat</span>
          {deprecVarLignes.length > 0 && (Math.abs(totalDeprecEcart) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Dotation : D 6594 / C 491 — Reprise : D 491 / C 7594</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Compte</th>
                <th>Libellé</th>
                <th className="num editable-col" style={{ width: 110 }}>Solde N-1</th>
                <th className="num editable-col" style={{ width: 110 }}>Dotations 6594</th>
                <th className="num editable-col" style={{ width: 110 }}>Reprises 7594</th>
                <th className="num" style={{ width: 110 }}>Solde N calc.</th>
                <th className="num" style={{ width: 110 }}>Balance N</th>
                <th className="num" style={{ width: 90 }}>Écart</th>
              </tr>
            </thead>
            <tbody>
              {deprecVarLignes.map(l => {
                const ecart = l.soldeNBalance - l.soldeNCalc;
                return (
                  <tr key={l.compte} className={Math.abs(ecart) > 0.5 ? 'ecart-row' : ''}>
                    <td className="compte">{l.compte}</td>
                    <td>{l.libelle}</td>
                    <td className="editable-cell">
                      <input type="text" inputMode="numeric" value={fmtInput(l.soldeN1)} onChange={e => {
                        onUpdateDeprecEdit(l.compte, 'soldeN1', parseInputValue(e.target.value), l.soldeN1);
                      }} style={{ maxWidth: 'none' }} />
                    </td>
                    <td className="editable-cell">
                      <input type="text" inputMode="numeric" value={fmtInput(l.dotations6594)} onChange={e => {
                        onUpdateDeprecEdit(l.compte, 'dotations', parseInputValue(e.target.value), l.soldeN1);
                      }} style={{ maxWidth: 'none' }} />
                    </td>
                    <td className="editable-cell">
                      <input type="text" inputMode="numeric" value={fmtInput(l.reprises7594)} onChange={e => {
                        onUpdateDeprecEdit(l.compte, 'reprises', parseInputValue(e.target.value), l.soldeN1);
                      }} style={{ maxWidth: 'none' }} />
                    </td>
                    <td className="num computed">{fmt(l.soldeNCalc)}</td>
                    <td className="num">{fmt(l.soldeNBalance)}</td>
                    <td className={`num ${Math.abs(ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecart)}</td>
                  </tr>
                );
              })}
              {deprecVarLignes.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte 491 dans la balance.</td></tr>
              )}
            </tbody>
            {deprecVarLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalDeprecN1)}</strong></td>
                  <td className="num"><strong>{fmt(totalDeprecDot)}</strong></td>
                  <td className="num"><strong>{fmt(totalDeprecRep)}</strong></td>
                  <td className="num"><strong>{fmt(totalDeprecCalc)}</strong></td>
                  <td className="num"><strong>{fmt(totalDeprecBal)}</strong></td>
                  <td className={`num ${Math.abs(totalDeprecEcart) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalDeprecEcart)}</strong></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Contrôle 4 : Créances en devises */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 4 — Créances en monnaie étrangère</span>
        </div>
        <div className="revision-ref">Pertes latentes (baisse devise) : D 478 / C 411. Gains latents (hausse devise) : D 411 / C 479</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Code</th>
                <th>Nom client</th>
                <th style={{ width: 70 }}>Monnaie</th>
                <th className="num editable-col" style={{ width: 110 }}>Val. devises</th>
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
                  <td className="editable-cell"><input type="text" value={d.codeClient} onChange={e => onUpdateDevise(d.id, 'codeClient', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={d.nomClient} onChange={e => onUpdateDevise(d.id, 'nomClient', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell">
                    <select value={d.monnaie} onChange={e => onUpdateDevise(d.id, 'monnaie', e.target.value)} style={{ padding: '3px 4px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CNY">CNY</option>
                      <option value="JPY">JPY</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.valeurDevise)} onChange={e => onUpdateDevise(d.id, 'valeurDevise', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.valeurInitialeFCFA)} onChange={e => onUpdateDevise(d.id, 'valeurInitialeFCFA', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.parite3112)} onChange={e => onUpdateDevise(d.id, 'parite3112', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(d.valeurInventaire)}</td>
                  <td className={`num ${d.perteLatente > 0.5 ? 'ecart-val' : ''}`}>{fmt(d.perteLatente)}</td>
                  <td className={`num ${d.gainLatent > 0.5 ? 'ok-val' : ''}`}>{fmt(d.gainLatent)}</td>
                  <td><button className="revision-od-delete" onClick={() => onRemoveDevise(d.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {deviseLignes.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune créance en devise saisie.</td></tr>
              )}
            </tbody>
            {deviseLignes.length > 0 && (
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
          <button className="revision-od-add" onClick={onAddDevise}><LuPlus size={13} /> Ajouter une créance en devise</button>
        </div>
      </div>

      {/* Contrôle 5 : Circularisation des clients */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 5 — Circularisation clients</span>
          {circularLignes.length > 0 && (circularHasEcart
            ? <span className="revision-badge ko">Écart détecté</span>
            : <span className="revision-badge ok">Conforme</span>
          )}
        </div>
        <div className="revision-ref">Contrôle de confirmation : rapprochement des soldes confirmés par les clients avec la balance auxiliaire (411x)</div>

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Code client</th>
                <th>Nom client</th>
                <th className="num" style={{ width: 130 }}>Balance aux. (411x)</th>
                <th className="num editable-col" style={{ width: 130 }}>Montant reconnu</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
                <th style={{ width: 90 }}>Reconn. signée</th>
                <th>Commentaire</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {circularLignes.map(l => {
                const ecart = l.montantReconnu - l.balanceAux;
                return (
                  <tr key={l.id} className={Math.abs(ecart) > 0.5 ? 'ecart-row' : ''}>
                    <td className="editable-cell"><input type="text" value={l.codeClient} onChange={e => onUpdateCircular(l.id, 'codeClient', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                    <td className="editable-cell"><input type="text" value={l.nomClient} onChange={e => onUpdateCircular(l.id, 'nomClient', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                    <td className="num">{fmt(l.balanceAux)}</td>
                    <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(l.montantReconnu)} onChange={e => onUpdateCircular(l.id, 'montantReconnu', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                    <td className={`num ${Math.abs(ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(ecart)}</td>
                    <td>
                      <select value={l.reconnaissanceSignee} onChange={e => onUpdateCircular(l.id, 'reconnaissanceSignee', e.target.value)} style={{ padding: '3px 4px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                        <option value="Oui">Oui</option>
                        <option value="Non">Non</option>
                      </select>
                    </td>
                    <td className="editable-cell"><input type="text" value={l.commentaire} onChange={e => onUpdateCircular(l.id, 'commentaire', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                    <td><button className="revision-od-delete" onClick={() => onRemoveCircular(l.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                  </tr>
                );
              })}
              {circularLignes.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun client saisi. Utilisez le bouton ci-dessous pour pré-remplir depuis les comptes 411x.</td></tr>
              )}
            </tbody>
            {circularLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalCircBalAux)}</strong></td>
                  <td className="num"><strong>{fmt(totalCircReconnu)}</strong></td>
                  <td className={`num ${Math.abs(totalCircEcart) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalCircEcart)}</strong></td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          {comptes411Length > 0 && circularLignes.length === 0 && (
            <button className="revision-od-add" onClick={onAutoPopulateCircular} style={{ marginRight: 8 }}><LuPlus size={13} /> Pré-remplir depuis 411x ({comptes411Length} comptes)</button>
          )}
          <button className="revision-od-add" onClick={onAddCircular}><LuPlus size={13} /> Ajouter un client</button>
        </div>
      </div>

      {/* Contrôle 6 : Produits à recevoir (418) */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 6 — Produits à recevoir (418)</span>
          {prodRecevoirLignes.length > 0 && (prodRecevoirSignificantAndIncreasing
            ? <span className="revision-badge ko">Solde significatif et en hausse</span>
            : <span className="revision-badge ok">Conforme</span>
          )}
        </div>
        <div className="revision-ref">Produits à recevoir : D 4181 / C 70x — Vérifier la justification des factures à établir</div>

        {prodRecevoirSignificantAndIncreasing && (
          <div className="revision-objectif" style={{ marginTop: 6 }}>
            <strong>Alerte :</strong> Le solde des comptes 418 est significatif (<strong>{fmt(totalProdRecN)}</strong>) et en augmentation de <strong>{fmt(totalProdRecVar)}</strong> par rapport à N-1. Vérifier la justification et le dénouement des produits à recevoir.
          </div>
        )}

        <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Compte</th>
                <th>Désignation</th>
                <th className="num" style={{ width: 120 }}>Solde N</th>
                <th className="num" style={{ width: 120 }}>Solde N-1</th>
                <th className="num" style={{ width: 120 }}>Variation</th>
                <th>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {prodRecevoirLignes.map(l => {
                const variation = l.soldeN - l.soldeN1;
                return (
                  <tr key={l.compte} className={l.soldeN > 0.5 && variation > 0.5 ? 'ecart-row' : ''}>
                    <td className="compte">{l.compte}</td>
                    <td>{l.designation}</td>
                    <td className="num">{fmt(l.soldeN)}</td>
                    <td className="num">{fmt(l.soldeN1)}</td>
                    <td className={`num ${variation > 0.5 ? 'ecart-val' : variation < -0.5 ? 'ok-val' : ''}`}>{fmt(variation)}</td>
                    <td className="editable-cell">
                      <input type="text" value={l.commentaire} onChange={e => {
                        onUpdateProdRecevoirComment(l.compte, e.target.value);
                        onMarkUnsaved();
                      }} style={{ maxWidth: 'none' }} />
                    </td>
                  </tr>
                );
              })}
              {prodRecevoirLignes.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte 418 dans la balance.</td></tr>
              )}
            </tbody>
            {prodRecevoirLignes.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalProdRecN)}</strong></td>
                  <td className="num"><strong>{fmt(totalProdRecN1)}</strong></td>
                  <td className={`num ${totalProdRecVar > 0.5 ? 'ecart-val' : totalProdRecVar < -0.5 ? 'ok-val' : ''}`}><strong>{fmt(totalProdRecVar)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}

export default RevisionClientsTable;
