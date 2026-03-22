import React from 'react';
import { LuCheck, LuX, LuInfo } from 'react-icons/lu';
import { KPLigne, fmt, fmtInput, parseInputValue } from './revisionTypes';

interface ControleAffectationProps {
  lignes: KPLigne[];
  exerciceAnnee: number;
  onUpdateLigne: (idx: number, field: 'affectation' | 'dividendes' | 'variationCapital', value: number) => void;
  odImpact: (compte: string) => number;
}

function ControleAffectation({ lignes, exerciceAnnee, onUpdateLigne, odImpact }: ControleAffectationProps): React.ReactElement {
  const totalN1 = lignes.reduce((s, l) => s + l.soldeN1, 0);
  const totalAffectation = lignes.reduce((s, l) => s + l.affectation, 0);
  const totalDividendes = lignes.reduce((s, l) => s + l.dividendes, 0);
  const totalVariation = lignes.reduce((s, l) => s + l.variationCapital, 0);
  const totalCalcule = lignes.reduce((s, l) => s + l.soldeNCalcule, 0);
  const totalBalance = lignes.reduce((s, l) => s + l.soldeNBalance, 0);
  const totalEcart = totalBalance - totalCalcule;
  const allEcartsZero = lignes.every(l => Math.abs(l.ecart) < 0.5);

  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 1 : Affectation du résultat</span>
        <span className={`revision-badge ${allEcartsZero ? 'ok' : 'ko'}`}>
          {allEcartsZero ? <><LuCheck size={12} /> OK</> : <><LuX size={12} /> Écarts</>}
        </span>
      </div>

      <div className="revision-table-wrapper">
        <table className="revision-table">
          <thead>
            <tr>
              <th>Compte</th>
              <th>Désignation</th>
              <th className="num">Solde {exerciceAnnee - 1}</th>
              <th className="num editable-col">Affectation résultat</th>
              <th className="num editable-col">Dividendes</th>
              <th className="num editable-col">Variation capital</th>
              <th className="num">Solde {exerciceAnnee} calculé (A)</th>
              <th className="num">Balance (B)</th>
              <th className="num">Écart B-A</th>
              <th className="num">Impact OD</th>
              <th className="num">Solde révisé</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, idx) => {
              const od = odImpact(l.compte);
              const soldeRevise = l.soldeNBalance + od;
              return (
              <tr key={l.compte} className={Math.abs(l.ecart) > 0.5 ? 'ecart-row' : ''}>
                <td className="compte">{l.compte}</td>
                <td>{l.designation}</td>
                <td className="num">{fmt(l.soldeN1)}</td>
                <td className="num editable-cell">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fmtInput(l.affectation)}
                    onChange={e => onUpdateLigne(idx, 'affectation', parseInputValue(e.target.value))}
                    placeholder="0"
                  />
                </td>
                <td className="num editable-cell">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fmtInput(l.dividendes)}
                    onChange={e => onUpdateLigne(idx, 'dividendes', parseInputValue(e.target.value))}
                    placeholder="0"
                  />
                </td>
                <td className="num editable-cell">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fmtInput(l.variationCapital)}
                    onChange={e => onUpdateLigne(idx, 'variationCapital', parseInputValue(e.target.value))}
                    placeholder="0"
                  />
                </td>
                <td className="num computed">{fmt(l.soldeNCalcule)}</td>
                <td className="num">{fmt(l.soldeNBalance)}</td>
                <td className={`num ${Math.abs(l.ecart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>{fmt(l.ecart)}</td>
                <td className={`num ${Math.abs(od) > 0.5 ? 'od-val' : ''}`}>{fmt(od)}</td>
                <td className="num revised-val">{fmt(soldeRevise)}</td>
              </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}><strong>TOTAL</strong></td>
              <td className="num"><strong>{fmt(totalN1)}</strong></td>
              <td className="num"><strong>{fmt(totalAffectation)}</strong></td>
              <td className="num"><strong>{fmt(totalDividendes)}</strong></td>
              <td className="num"><strong>{fmt(totalVariation)}</strong></td>
              <td className="num computed"><strong>{fmt(totalCalcule)}</strong></td>
              <td className="num"><strong>{fmt(totalBalance)}</strong></td>
              <td className={`num ${Math.abs(totalEcart) > 0.5 ? 'ecart-val' : 'ok-val'}`}>
                <strong>{fmt(totalEcart)}</strong>
              </td>
              <td className="num"><strong>{fmt(lignes.reduce((s, l) => s + odImpact(l.compte), 0))}</strong></td>
              <td className="num revised-val"><strong>{fmt(lignes.reduce((s, l) => s + l.soldeNBalance + odImpact(l.compte), 0))}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="revision-control-footer">
        <span>Contrôle :</span>
        <span className={`revision-badge ${Math.abs(totalEcart) < 0.5 ? 'ok' : 'ko'}`}>
          {Math.abs(totalEcart) < 0.5 ? 'OK — Affectation équilibrée' : `Écart total : ${fmt(totalEcart)}`}
        </span>
        {Math.abs(totalAffectation) > 0.5 && (
          <span className="revision-badge info">
            <LuInfo size={12} /> Affectation nette : {fmt(totalAffectation)} (doit être = 0 si résultat entièrement affecté)
          </span>
        )}
      </div>
    </div>
  );
}

export default ControleAffectation;
