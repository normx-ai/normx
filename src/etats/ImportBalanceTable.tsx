import React, { useMemo } from 'react';
import { BalanceLigne } from '../types';
import { formatMontant } from './ImportBalance.parsers';
import { detectAnomalies, buildPlanComptableSensMap } from './anomaliesComptes';
import type { AnomalieCompte, PlanCompteEntry, PlanComptableSensMap } from './anomaliesComptes';
import { useReferentiel } from '../contexts/ReferentielContext';
import { usePlanComptable } from '../lib/queries';

interface BalanceLigneWithMeta extends BalanceLigne {
  id: number;
  note_revision?: string;
}

interface ImportBalanceTableProps {
  lignes: BalanceLigneWithMeta[];
  editingBalance: boolean;
  getEditedValue: (ligne: BalanceLigneWithMeta, field: keyof BalanceLigneWithMeta) => string;
  updateEditedLigne: (ligneId: number, field: keyof BalanceLigneWithMeta, value: string) => void;
  /** Map sens attendu depuis le plan comptable. Si omis, charge le plan SYSCOHADA via l'API. */
  planSensMap?: PlanComptableSensMap;
}

function ImportBalanceTable({
  lignes,
  editingBalance,
  getEditedValue,
  updateEditedLigne,
  planSensMap: planSensMapProp,
}: ImportBalanceTableProps): React.JSX.Element {
  // Fallback : si le parent ne passe pas la map, charger le plan via React Query
  // pour que l'affichage des anomalies reste fonctionnel.
  const { referentiel } = useReferentiel();
  const { data: planComptableData = [] } = usePlanComptable(referentiel);
  const planComptable = planSensMapProp ? [] : (planComptableData as PlanCompteEntry[]);
  const planSensMap = useMemo(
    () => planSensMapProp || buildPlanComptableSensMap(planComptable),
    [planSensMapProp, planComptable]
  );
  const totalSID = lignes.reduce((s, l) => s + (parseFloat(String(l.si_debit)) || 0), 0);
  const totalSIC = lignes.reduce((s, l) => s + (parseFloat(String(l.si_credit)) || 0), 0);
  const totalDebit = lignes.reduce((s, l) => s + (parseFloat(String(l.debit)) || 0), 0);
  const totalCredit = lignes.reduce((s, l) => s + (parseFloat(String(l.credit)) || 0), 0);
  const totalSD = lignes.reduce((s, l) => s + (parseFloat(String(l.solde_debiteur)) || 0), 0);
  const totalSC = lignes.reduce((s, l) => s + (parseFloat(String(l.solde_crediteur)) || 0), 0);

  if (lignes.length === 0) return <></>;

  return (
    <div className="ib-table-wrapper">
      <table className="ib-table">
        <thead>
          <tr>
            <th style={{ width: 36, textAlign: 'center' }}>St.</th>
            <th>Compte</th>
            <th>Libellé</th>
            <th className="num">SI Débit</th>
            <th className="num">SI Crédit</th>
            <th className="num">Débit</th>
            <th className="num">Crédit</th>
            <th className="num">SF Débit</th>
            <th className="num">SF Crédit</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l: BalanceLigneWithMeta) => {
            const compteAnomalies: AnomalieCompte[] = (l.numero_compte || '').length > 2 ? detectAnomalies(l, planSensMap) : [];
            const hasError = compteAnomalies.some(a => a.severity === 'error');
            const hasWarning = compteAnomalies.some(a => a.severity === 'warning');
            const tooltipText = compteAnomalies.map(a => a.message).join('\n');
            return (
              <tr key={l.id} style={hasError ? { background: '#fef2f2' } : hasWarning ? { background: '#fffbeb' } : {}}>
                <td style={{ textAlign: 'center' }} title={tooltipText || 'OK'}>
                  {(l.numero_compte || '').length <= 2 ? '' : compteAnomalies.length === 0 ? (
                    <span style={{ color: '#059669', fontSize: 15, fontWeight: 700 }}>&#10003;</span>
                  ) : hasError ? (
                    <span style={{ color: '#dc2626', fontSize: 15, fontWeight: 700, cursor: 'help' }}>&#10007;</span>
                  ) : (
                    <span style={{ color: '#f59e0b', fontSize: 14, fontWeight: 700, cursor: 'help' }}>&#9888;</span>
                  )}
                </td>
                <td className="compte">
                  {editingBalance ? (
                    <input value={getEditedValue(l, 'numero_compte')} onChange={e => updateEditedLigne(l.id, 'numero_compte', e.target.value)} style={{ width: 70, padding: '2px 4px', fontSize: 12, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0' }} />
                  ) : l.numero_compte}
                </td>
                <td>
                  {editingBalance ? (
                    <input value={getEditedValue(l, 'libelle_compte')} onChange={e => updateEditedLigne(l.id, 'libelle_compte', e.target.value)} style={{ width: '100%', padding: '2px 4px', fontSize: 12, border: '1px solid #D4A843', borderRadius: 2, background: '#fffbf0' }} />
                  ) : l.libelle_compte}
                </td>
                <td className="num">{formatMontant(parseFloat(String(l.si_debit)))}</td>
                <td className="num">{formatMontant(parseFloat(String(l.si_credit)))}</td>
                <td className="num">{formatMontant(parseFloat(String(l.debit)))}</td>
                <td className="num">{formatMontant(parseFloat(String(l.credit)))}</td>
                <td className="num">{formatMontant(parseFloat(String(l.solde_debiteur)))}</td>
                <td className="num">{formatMontant(parseFloat(String(l.solde_crediteur)))}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td></td>
            <td colSpan={2}><strong>TOTAUX</strong></td>
            <td className="num"><strong>{formatMontant(totalSID)}</strong></td>
            <td className="num"><strong>{formatMontant(totalSIC)}</strong></td>
            <td className="num"><strong>{formatMontant(totalDebit)}</strong></td>
            <td className="num"><strong>{formatMontant(totalCredit)}</strong></td>
            <td className="num"><strong>{formatMontant(totalSD)}</strong></td>
            <td className="num"><strong>{formatMontant(totalSC)}</strong></td>
          </tr>
          <tr className="equilibre-row">
            <td colSpan={3}>Équilibre</td>
            <td colSpan={2} className={`num ${Math.abs(totalSID - totalSIC) < 0.01 ? 'ok' : 'ko'}`}>
              {Math.abs(totalSID - totalSIC) < 0.01 ? 'OK' : `Écart: ${formatMontant(totalSID - totalSIC)}`}
            </td>
            <td colSpan={2} className={`num ${Math.abs(totalDebit - totalCredit) < 0.01 ? 'ok' : 'ko'}`}>
              {Math.abs(totalDebit - totalCredit) < 0.01 ? 'OK' : `Écart: ${formatMontant(totalDebit - totalCredit)}`}
            </td>
            <td colSpan={2} className={`num ${Math.abs(totalSD - totalSC) < 0.01 ? 'ok' : 'ko'}`}>
              {Math.abs(totalSD - totalSC) < 0.01 ? 'OK' : `Écart: ${formatMontant(totalSD - totalSC)}`}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default ImportBalanceTable;
