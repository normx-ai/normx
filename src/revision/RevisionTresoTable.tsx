import React from 'react';
import { LuPlus, LuTrash2, LuClipboardList } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import {
  RapprochBancaireLigne, CaisseLigne, TitrePlacementLigne,
  VirementInterneLigne, DispoDeviseLigne, CircularisationBancaireLigne,
  fmt, fmtInput, parseInputValue,
} from './revisionTypes';

interface RevisionTresoTableProps {
  // Rapprochement bancaire
  rapprochCalcs: (RapprochBancaireLigne & { soldeReconcilie: number; ecart: number })[];
  rapprochLignesLength: number;
  onAddRapproch: () => void;
  onUpdateRapproch: (id: number, field: keyof RapprochBancaireLigne, value: string | number) => void;
  onRemoveRapproch: (id: number) => void;
  onAutoPopulateRapproch: () => void;
  totalSoldeCompta: number;
  totalSoldeReleve: number;
  totalChequesNE: number;
  totalVirND: number;
  totalSoldeRecon: number;
  totalEcartRappr: number;
  comptes52Length: number;
  // Caisse
  caisseCalcs: (CaisseLigne & { ecart: number })[];
  caisseLignesLength: number;
  onAddCaisse: () => void;
  onUpdateCaisse: (id: number, field: keyof CaisseLigne, value: string | number) => void;
  onRemoveCaisse: (id: number) => void;
  onAutoPopulateCaisse: () => void;
  totalSoldeCaisse: number;
  totalPvCaisse: number;
  totalEcartCaisse: number;
  comptes57Length: number;
  // Titres
  titreCalcs: (TitrePlacementLigne & { depreciationNecessaire: number; ecartDeprec: number })[];
  titreLignesLength: number;
  onAddTitre: () => void;
  onUpdateTitre: (id: number, field: keyof TitrePlacementLigne, value: string | number) => void;
  onRemoveTitre: (id: number) => void;
  onAutoPopulateTitres: () => void;
  totalValAcq: number;
  totalValInv: number;
  totalDeprecNec: number;
  totalDeprecBal: number;
  totalEcartDeprec: number;
  comptes50Length: number;
  // Virements internes
  virInternes: VirementInterneLigne[];
  virNonSoldes: VirementInterneLigne[];
  // Devises
  deviseCalcs: (DispoDeviseLigne & { valeurHistorique: number; valeurCloture: number; ecartChange: number })[];
  deviseLignesLength: number;
  onAddDevise: () => void;
  onUpdateDevise: (id: number, field: keyof DispoDeviseLigne, value: string | number) => void;
  onRemoveDevise: (id: number) => void;
  totalValHist: number;
  totalValClot: number;
  totalEcartChange: number;
  // Circularisation bancaire
  circularCalcs: (CircularisationBancaireLigne & { ecart: number })[];
  circularLignesLength: number;
  onAddCircular: () => void;
  onUpdateCircular: (id: number, field: keyof CircularisationBancaireLigne, value: string | number) => void;
  onRemoveCircular: (id: number) => void;
  onAutoPopulateCircular: () => void;
  totalSoldeCompteCirc: number;
  totalSoldeConfirme: number;
  totalEcartCirc: number;
}

function RevisionTresoTable(props: RevisionTresoTableProps): React.ReactElement {
  const {
    rapprochCalcs, rapprochLignesLength, onAddRapproch, onUpdateRapproch, onRemoveRapproch, onAutoPopulateRapproch,
    totalSoldeCompta, totalSoldeReleve, totalChequesNE, totalVirND, totalSoldeRecon, totalEcartRappr, comptes52Length,
    caisseCalcs, caisseLignesLength, onAddCaisse, onUpdateCaisse, onRemoveCaisse, onAutoPopulateCaisse,
    totalSoldeCaisse, totalPvCaisse, totalEcartCaisse, comptes57Length,
    titreCalcs, titreLignesLength, onAddTitre, onUpdateTitre, onRemoveTitre, onAutoPopulateTitres,
    totalValAcq, totalValInv, totalDeprecNec, totalDeprecBal, totalEcartDeprec, comptes50Length,
    virInternes, virNonSoldes,
    deviseCalcs, deviseLignesLength, onAddDevise, onUpdateDevise, onRemoveDevise,
    totalValHist, totalValClot, totalEcartChange,
    circularCalcs, circularLignesLength, onAddCircular, onUpdateCircular, onRemoveCircular, onAutoPopulateCircular,
    totalSoldeCompteCirc, totalSoldeConfirme, totalEcartCirc,
  } = props;

  return (
    <>
      {/* Contrôle 1 : Rapprochement bancaire */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 1 — Rapprochement bancaire</span>
          {rapprochCalcs.length > 0 && (Math.abs(totalEcartRappr) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Solde réconcilié = Solde relevé - Chèques non encaissés + Virements émis non débités</div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th>Banque</th>
                <th style={{ width: 80 }}>Compte</th>
                <th className="num" style={{ width: 120 }}>Solde compta.</th>
                <th className="num editable-col" style={{ width: 120 }}>Solde relevé</th>
                <th className="num editable-col" style={{ width: 120 }}>Chèques NE</th>
                <th className="num editable-col" style={{ width: 120 }}>Vir. émis ND</th>
                <th className="num" style={{ width: 120 }}>Solde réconcilié</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {rapprochCalcs.map(r => (
                <tr key={r.id} className={Math.abs(r.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={r.banque} onChange={e => onUpdateRapproch(r.id, 'banque', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={r.compteBanque} onChange={e => onUpdateRapproch(r.id, 'compteBanque', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(r.soldeCompta)} onChange={e => onUpdateRapproch(r.id, 'soldeCompta', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(r.soldeReleve)} onChange={e => onUpdateRapproch(r.id, 'soldeReleve', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(r.chequesNonEncaisses)} onChange={e => onUpdateRapproch(r.id, 'chequesNonEncaisses', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(r.virEmisNonDebites)} onChange={e => onUpdateRapproch(r.id, 'virEmisNonDebites', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(r.soldeReconcilie)}</td>
                  <td className={`num ${Math.abs(r.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(r.ecart)}</td>
                  <td><button className="revision-od-delete" onClick={() => onRemoveRapproch(r.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {rapprochLignesLength === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun rapprochement bancaire saisi. Utilisez le bouton ci-dessous pour pré-remplir depuis la balance.</td></tr>
              )}
            </tbody>
            {rapprochCalcs.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalSoldeCompta)}</strong></td>
                  <td className="num"><strong>{fmt(totalSoldeReleve)}</strong></td>
                  <td className="num"><strong>{fmt(totalChequesNE)}</strong></td>
                  <td className="num"><strong>{fmt(totalVirND)}</strong></td>
                  <td className="num"><strong>{fmt(totalSoldeRecon)}</strong></td>
                  <td className={`num ${Math.abs(totalEcartRappr) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalEcartRappr)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={onAddRapproch}><LuPlus size={13} /> Ajouter une banque</button>
          {comptes52Length > 0 && rapprochLignesLength === 0 && (
            <button className="revision-od-add" onClick={onAutoPopulateRapproch} style={{ marginLeft: 8 }}><LuClipboardList size={13} /> Pré-remplir depuis la balance (52x)</button>
          )}
        </div>
      </div>

      {/* Contrôle 2 : Contrôle de caisse */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 2 — Contrôle de caisse</span>
          {caisseCalcs.length > 0 && (Math.abs(totalEcartCaisse) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Écart = Solde comptable - PV de caisse au 31/12</div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Compte</th>
                <th>Désignation</th>
                <th className="num" style={{ width: 130 }}>Solde comptable</th>
                <th className="num editable-col" style={{ width: 130 }}>PV de caisse</th>
                <th className="num" style={{ width: 110 }}>Écart</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {caisseCalcs.map(c => (
                <tr key={c.id} className={Math.abs(c.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={c.compte} onChange={e => onUpdateCaisse(c.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={c.designation} onChange={e => onUpdateCaisse(c.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(c.soldeCompta)} onChange={e => onUpdateCaisse(c.id, 'soldeCompta', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(c.pvCaisse)} onChange={e => onUpdateCaisse(c.id, 'pvCaisse', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(c.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(c.ecart)}</td>
                  <td><button className="revision-od-delete" onClick={() => onRemoveCaisse(c.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {caisseLignesLength === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune caisse saisie. Utilisez le bouton ci-dessous pour pré-remplir depuis la balance.</td></tr>
              )}
            </tbody>
            {caisseCalcs.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalSoldeCaisse)}</strong></td>
                  <td className="num"><strong>{fmt(totalPvCaisse)}</strong></td>
                  <td className={`num ${Math.abs(totalEcartCaisse) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalEcartCaisse)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={onAddCaisse}><LuPlus size={13} /> Ajouter une caisse</button>
          {comptes57Length > 0 && caisseLignesLength === 0 && (
            <button className="revision-od-add" onClick={onAutoPopulateCaisse} style={{ marginLeft: 8 }}><LuClipboardList size={13} /> Pré-remplir depuis la balance (57x)</button>
          )}
        </div>
      </div>

      {/* Contrôle 3 : Titres de placement et dépréciations */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 3 — Titres de placement et dépréciations</span>
          {titreCalcs.length > 0 && (Math.abs(totalEcartDeprec) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Dotation : D 679 / C 59x — Reprise : D 59x / C 779</div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Compte</th>
                <th>Désignation</th>
                <th className="num editable-col" style={{ width: 120 }}>Val. acquisition</th>
                <th className="num editable-col" style={{ width: 120 }}>Val. inventaire</th>
                <th className="num" style={{ width: 120 }}>Dépr. nécessaire</th>
                <th className="num editable-col" style={{ width: 120 }}>Dépr. balance</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {titreCalcs.map(t => (
                <tr key={t.id} className={Math.abs(t.ecartDeprec) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={t.compte} onChange={e => onUpdateTitre(t.id, 'compte', e.target.value)} style={{ maxWidth: 'none', fontFamily: 'monospace' }} /></td>
                  <td className="editable-cell"><input type="text" value={t.designation} onChange={e => onUpdateTitre(t.id, 'designation', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(t.valeurAcquisition)} onChange={e => onUpdateTitre(t.id, 'valeurAcquisition', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(t.valeurInventaire)} onChange={e => onUpdateTitre(t.id, 'valeurInventaire', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(t.depreciationNecessaire)}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(t.depreciationBalance)} onChange={e => onUpdateTitre(t.id, 'depreciationBalance', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(t.ecartDeprec) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(t.ecartDeprec)}</td>
                  <td><button className="revision-od-delete" onClick={() => onRemoveTitre(t.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {titreLignesLength === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun titre de placement saisi.</td></tr>
              )}
            </tbody>
            {titreCalcs.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalValAcq)}</strong></td>
                  <td className="num"><strong>{fmt(totalValInv)}</strong></td>
                  <td className="num"><strong>{fmt(totalDeprecNec)}</strong></td>
                  <td className="num"><strong>{fmt(totalDeprecBal)}</strong></td>
                  <td className={`num ${Math.abs(totalEcartDeprec) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalEcartDeprec)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={onAddTitre}><LuPlus size={13} /> Ajouter un titre</button>
          {comptes50Length > 0 && titreLignesLength === 0 && (
            <button className="revision-od-add" onClick={onAutoPopulateTitres} style={{ marginLeft: 8 }}><LuClipboardList size={13} /> Pré-remplir depuis la balance (50x)</button>
          )}
        </div>
      </div>

      {/* Contrôle 4 : Virements internes */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 4 — Virements internes (58x)</span>
          {virInternes.length > 0 && (virNonSoldes.length === 0
            ? <span className="revision-badge ok">Tous soldés</span>
            : <span className="revision-badge ko">{virNonSoldes.length} non soldé{virNonSoldes.length > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="revision-ref">Les comptes de virements internes (58x) doivent impérativement être soldés en fin d'exercice</div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Compte</th>
                <th>Libellé</th>
                <th className="num" style={{ width: 130 }}>Solde N</th>
                <th style={{ width: 200 }}>Observation</th>
              </tr>
            </thead>
            <tbody>
              {virInternes.map(v => (
                <tr key={v.compte} className={Math.abs(v.soldeN) > 0.5 ? 'ecart-row' : ''}>
                  <td className="compte">{v.compte}</td>
                  <td>{v.libelle}</td>
                  <td className={`num ${Math.abs(v.soldeN) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(v.soldeN)}</td>
                  <td>{v.observation}</td>
                </tr>
              ))}
              {virInternes.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte 58x dans la balance.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contrôle 5 : Disponibilités en devises */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 5 — Disponibilités en devises</span>
        </div>
        <div className="revision-ref">Gain de change : D 52x / C 776 — Perte de change : D 676 / C 52x</div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th>Banque</th>
                <th style={{ width: 70 }}>Devise</th>
                <th className="num editable-col" style={{ width: 110 }}>Solde devise</th>
                <th className="num editable-col" style={{ width: 110 }}>Cours hist.</th>
                <th className="num" style={{ width: 120 }}>Val. historique</th>
                <th className="num editable-col" style={{ width: 110 }}>Cours clôture</th>
                <th className="num" style={{ width: 120 }}>Val. clôture</th>
                <th className="num" style={{ width: 110 }}>Écart change</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {deviseCalcs.map(d => (
                <tr key={d.id} className={Math.abs(d.ecartChange) > 0.5 ? (d.ecartChange < 0 ? 'ecart-row' : '') : ''}>
                  <td className="editable-cell"><input type="text" value={d.banque} onChange={e => onUpdateDevise(d.id, 'banque', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell">
                    <select value={d.devise} onChange={e => onUpdateDevise(d.id, 'devise', e.target.value)} style={{ padding: '3px 4px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11.5px' }}>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CNY">CNY</option>
                      <option value="JPY">JPY</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.soldeDevise)} onChange={e => onUpdateDevise(d.id, 'soldeDevise', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.coursHistorique)} onChange={e => onUpdateDevise(d.id, 'coursHistorique', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(d.valeurHistorique)}</td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(d.coursCloture)} onChange={e => onUpdateDevise(d.id, 'coursCloture', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="num computed">{fmt(d.valeurCloture)}</td>
                  <td className={`num ${d.ecartChange < -0.5 ? 'ecart-val' : d.ecartChange > 0.5 ? 'ok-val' : ''}`}>{fmt(d.ecartChange)}</td>
                  <td><button className="revision-od-delete" onClick={() => onRemoveDevise(d.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {deviseLignesLength === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune disponibilité en devise saisie.</td></tr>
              )}
            </tbody>
            {deviseCalcs.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4}><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalValHist)}</strong></td>
                  <td></td>
                  <td className="num"><strong>{fmt(totalValClot)}</strong></td>
                  <td className={`num ${Math.abs(totalEcartChange) > 0.5 ? (totalEcartChange < 0 ? 'ecart-val' : 'ok-val') : ''}`}><strong>{fmt(totalEcartChange)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={onAddDevise}><LuPlus size={13} /> Ajouter une disponibilité en devise</button>
        </div>
      </div>

      {/* Contrôle 6 : Circularisation bancaire */}
      <div className="revision-control">
        <div className="revision-control-title">
          <span>Contrôle 6 — Circularisation des banques</span>
          {circularCalcs.length > 0 && (Math.abs(totalEcartCirc) < 0.5
            ? <span className="revision-badge ok">Conforme</span>
            : <span className="revision-badge ko">Écart détecté</span>
          )}
        </div>
        <div className="revision-ref">Confirmation directe des soldes, emprunts, cautions et signataires auprès des établissements bancaires</div>

        {circularCalcs.some(c => Math.abs(c.ecart) > 0.5) && (
          <div className="revision-objectif" style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444' }}>
            <strong style={{ color: '#dc2626' }}>Alerte — Écart de confirmation bancaire :</strong>{' '}
            {circularCalcs.filter(c => Math.abs(c.ecart) > 0.5).map(c => (
              <span key={c.id}> <strong>{c.banque || '(banque non renseignée)'}</strong> : écart de <strong>{fmt(c.ecart)}</strong>. </span>
            ))}
            <br /><em style={{ color: '#dc2626' }}>Investiguer les écarts entre le solde comptable et le solde confirmé par la banque.</em>
          </div>
        )}

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th>Banque</th>
                <th className="num" style={{ width: 120 }}>Solde compte</th>
                <th className="num editable-col" style={{ width: 120 }}>Solde confirmé</th>
                <th className="num" style={{ width: 100 }}>Écart</th>
                <th className="editable-col" style={{ width: 130 }}>Emprunts confirmés</th>
                <th className="editable-col" style={{ width: 120 }}>Cautions</th>
                <th className="editable-col" style={{ width: 130 }}>Signataires autorisés</th>
                <th className="editable-col" style={{ width: 140 }}>Commentaire</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {circularCalcs.map(c => (
                <tr key={c.id} className={Math.abs(c.ecart) > 0.5 ? 'ecart-row' : ''}>
                  <td className="editable-cell"><input type="text" value={c.banque} onChange={e => onUpdateCircular(c.id, 'banque', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(c.soldeCompte)} onChange={e => onUpdateCircular(c.id, 'soldeCompte', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" inputMode="numeric" value={fmtInput(c.soldeConfirme)} onChange={e => onUpdateCircular(c.id, 'soldeConfirme', parseInputValue(e.target.value))} style={{ maxWidth: 'none' }} /></td>
                  <td className={`num ${Math.abs(c.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(c.ecart)}</td>
                  <td className="editable-cell"><input type="text" value={c.empruntsConfirmes} onChange={e => onUpdateCircular(c.id, 'empruntsConfirmes', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={c.cautions} onChange={e => onUpdateCircular(c.id, 'cautions', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={c.signatairesAutorises} onChange={e => onUpdateCircular(c.id, 'signatairesAutorises', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td className="editable-cell"><input type="text" value={c.commentaire} onChange={e => onUpdateCircular(c.id, 'commentaire', e.target.value)} style={{ maxWidth: 'none' }} /></td>
                  <td><button className="revision-od-delete" onClick={() => onRemoveCircular(c.id)} title="Supprimer"><LuTrash2 size={13} /></button></td>
                </tr>
              ))}
              {circularLignesLength === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucune circularisation saisie. Utilisez le bouton ci-dessous pour pré-remplir depuis la balance.</td></tr>
              )}
            </tbody>
            {circularCalcs.length > 0 && (
              <tfoot>
                <tr>
                  <td><strong>Total</strong></td>
                  <td className="num"><strong>{fmt(totalSoldeCompteCirc)}</strong></td>
                  <td className="num"><strong>{fmt(totalSoldeConfirme)}</strong></td>
                  <td className={`num ${Math.abs(totalEcartCirc) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(totalEcartCirc)}</strong></td>
                  <td colSpan={4}></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={onAddCircular}><LuPlus size={13} /> Ajouter une banque</button>
          {comptes52Length > 0 && circularLignesLength === 0 && (
            <button className="revision-od-add" onClick={onAutoPopulateCircular} style={{ marginLeft: 8 }}><LuClipboardList size={13} /> Pré-remplir depuis la balance (52x)</button>
          )}
        </div>
      </div>
    </>
  );
}

export default RevisionTresoTable;
