import React from 'react';
import { LuCheck, LuInfo, LuPlus, LuTrash2, LuFilePen } from 'react-icons/lu';
import { ODEcriture, Suggestion, fmt, fmtInput, parseInputValue } from './revisionTypes';

interface JournalODProps {
  suggestions: Suggestion[];
  odEcritures: ODEcriture[];
  onAddOd: (source?: string, compteDebit?: string, compteCredit?: string, montant?: number, libelle?: string) => void;
  onUpdateOd: (id: number, field: keyof ODEcriture, value: string | number) => void;
  onRemoveOd: (id: number) => void;
}

function JournalOD({ suggestions, odEcritures, onAddOd, onUpdateOd, onRemoveOd }: JournalODProps): React.ReactElement {
  const totalOd = odEcritures.reduce((s, e) => s + e.montant, 0);

  return (
    <>
      {/* Suggestions d'écritures */}
      {suggestions.length > 0 && (
        <div className="revision-control revision-suggestions">
          <div className="revision-control-title">
            <span><LuInfo size={14} /> Suggestions d'écritures de régularisation</span>
            <span className="revision-badge ko">{suggestions.length} écart{suggestions.length > 1 ? 's' : ''} détecté{suggestions.length > 1 ? 's' : ''}</span>
          </div>

          <div className="revision-table-wrapper">
            <table className="revision-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Compte débit</th>
                  <th>Libellé débit</th>
                  <th>Compte crédit</th>
                  <th>Libellé crédit</th>
                  <th className="num">Montant</th>
                  <th>Libellé écriture</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s, i) => (
                  <tr key={i} className="suggestion-row">
                    <td style={{ fontSize: '11px', color: '#7c3aed' }}>{s.source}</td>
                    <td className="compte">{s.compteDebit}</td>
                    <td>{s.libelleDebit}</td>
                    <td className="compte">{s.compteCredit}</td>
                    <td>{s.libelleCredit}</td>
                    <td className="num">{fmt(s.montant)}</td>
                    <td>{s.libelle}</td>
                    <td>
                      <button
                        className="revision-od-accept"
                        onClick={() => onAddOd(s.source, s.compteDebit, s.compteCredit, s.montant, s.libelle)}
                        title="Accepter cette suggestion"
                      >
                        <LuCheck size={12} /> Accepter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Journal OD */}
      <div className="revision-control revision-od">
        <div className="revision-control-title">
          <span><LuFilePen size={14} /> Journal OD — Écritures de régularisation</span>
          <span className="revision-badge info">{odEcritures.length} écriture{odEcritures.length > 1 ? 's' : ''}</span>
        </div>

        <div className="revision-table-wrapper">
          <table className="revision-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th style={{ width: 100 }}>Date</th>
                <th style={{ width: 90 }}>Compte débit</th>
                <th>Libellé débit</th>
                <th style={{ width: 90 }}>Compte crédit</th>
                <th>Libellé crédit</th>
                <th className="num" style={{ width: 120 }}>Montant</th>
                <th>Libellé écriture</th>
                <th style={{ width: 140 }}>Source</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {odEcritures.map((od, i) => (
                <tr key={od.id}>
                  <td style={{ color: '#999', fontSize: '11px' }}>{i + 1}</td>
                  <td className="editable-cell">
                    <input type="date" value={od.date} onChange={e => onUpdateOd(od.id, 'date', e.target.value)} />
                  </td>
                  <td className="editable-cell">
                    <input type="text" value={od.compteDebit} onChange={e => onUpdateOd(od.id, 'compteDebit', e.target.value)} placeholder="N° compte" style={{ fontFamily: 'monospace' }} />
                  </td>
                  <td className="editable-cell">
                    <input type="text" value={od.libelleDebit} onChange={e => onUpdateOd(od.id, 'libelleDebit', e.target.value)} placeholder="Libellé" style={{ maxWidth: 'none' }} />
                  </td>
                  <td className="editable-cell">
                    <input type="text" value={od.compteCredit} onChange={e => onUpdateOd(od.id, 'compteCredit', e.target.value)} placeholder="N° compte" style={{ fontFamily: 'monospace' }} />
                  </td>
                  <td className="editable-cell">
                    <input type="text" value={od.libelleCredit} onChange={e => onUpdateOd(od.id, 'libelleCredit', e.target.value)} placeholder="Libellé" style={{ maxWidth: 'none' }} />
                  </td>
                  <td className="editable-cell">
                    <input type="text" inputMode="numeric" value={fmtInput(od.montant)} onChange={e => onUpdateOd(od.id, 'montant', parseInputValue(e.target.value))} placeholder="0" />
                  </td>
                  <td className="editable-cell">
                    <input type="text" value={od.libelle} onChange={e => onUpdateOd(od.id, 'libelle', e.target.value)} placeholder="Libellé OD" style={{ maxWidth: 'none' }} />
                  </td>
                  <td style={{ fontSize: '11px', color: '#666' }}>{od.source}</td>
                  <td>
                    <button className="revision-od-delete" onClick={() => onRemoveOd(od.id)} title="Supprimer">
                      <LuTrash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {odEcritures.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: '#999', padding: '16px', fontStyle: 'italic' }}>
                    Aucune écriture OD. Acceptez une suggestion ci-dessus ou ajoutez manuellement.
                  </td>
                </tr>
              )}
            </tbody>
            {odEcritures.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={6}><strong>TOTAL</strong></td>
                  <td className="num"><strong>{fmt(totalOd)}</strong></td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="revision-od-actions">
          <button className="revision-od-add" onClick={() => onAddOd()}>
            <LuPlus size={13} /> Ajouter une écriture
          </button>
        </div>
      </div>
    </>
  );
}

export default JournalOD;
