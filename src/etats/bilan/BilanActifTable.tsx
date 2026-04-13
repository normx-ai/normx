import React from 'react';
import { ACTIF_ROWS, type ActifResult } from './bilanSyscohadaData';
import { formatMontant } from './bilanSyscohadaCompute';

interface BilanActifTableProps {
  actifN: Record<string, ActifResult>;
  actifN1: Record<string, ActifResult>;
  getActifValue: (ref: string, field: 'brut' | 'amort' | 'net') => number;
  getActifValueN1: (ref: string, field: 'brut' | 'amort' | 'net') => number;
  showN1Detail: boolean;
  onToggleN1Detail: () => void;
  isExporting: boolean;
  annee: number;
}

function BilanActifTable({
  actifN,
  actifN1,
  getActifValue,
  getActifValueN1,
  showN1Detail,
  onToggleN1Detail,
  isExporting,
  annee,
}: BilanActifTableProps): React.JSX.Element {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }} className="no-print">
        <button
          onClick={onToggleN1Detail}
          style={{
            background: 'none',
            border: '1px solid #ccc',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 11,
            cursor: 'pointer',
            color: '#555',
          }}
        >
          {showN1Detail ? '− Masquer détail N-1' : '+ Détail N-1'}
        </button>
      </div>
      <table className="bilan-table">
        <thead>
          <tr>
            <th className="col-ref" rowSpan={2}>REF</th>
            <th className="col-libelle" rowSpan={2}>ACTIF</th>
            <th className="col-note" rowSpan={2}>Note</th>
            <th className="col-montant-group" colSpan={3}>EXERCICE AU 31/12/{annee}</th>
            {showN1Detail && <th className="col-montant-group n1-detail" colSpan={3}>EXERCICE AU 31/12/{annee - 1}</th>}
            {!showN1Detail && <th className="col-montant" rowSpan={2}>EXERCICE AU 31/12/{annee - 1}<br />NET</th>}
          </tr>
          <tr>
            <th className="col-montant">BRUT</th>
            <th className="col-montant">AMORT et DÉPREC.</th>
            <th className="col-montant">NET</th>
            {showN1Detail && <th className="col-montant n1-detail">BRUT</th>}
            {showN1Detail && <th className="col-montant n1-detail">AMORT et DÉPREC.</th>}
            {showN1Detail && <th className="col-montant n1-detail">NET</th>}
          </tr>
        </thead>
        <tbody>
          {ACTIF_ROWS.map((row, i) => {
            const rowClass = row.type === 'subsection' ? 'row-subsection'
              : row.type === 'total' ? 'row-total'
              : row.type === 'subtotal' ? 'row-subtotal'
              : 'row-indent';

            const ref = row.ref || '';
            const isComputed = row.type === 'subtotal' || row.type === 'total' || !!row.sumRefs;

            let brut: number, amort: number, netN: number;
            let brutN1: number, amortN1: number, netN1: number;
            if (isComputed) {
              brut = getActifValue(ref, 'brut');
              amort = getActifValue(ref, 'amort');
              netN = getActifValue(ref, 'net');
              brutN1 = getActifValueN1(ref, 'brut');
              amortN1 = getActifValueN1(ref, 'amort');
              netN1 = getActifValueN1(ref, 'net');
            } else {
              brut = actifN[ref] ? actifN[ref].brut : 0;
              amort = actifN[ref] ? actifN[ref].amort : 0;
              netN = actifN[ref] ? actifN[ref].net : 0;
              brutN1 = actifN1[ref] ? actifN1[ref].brut : 0;
              amortN1 = actifN1[ref] ? actifN1[ref].amort : 0;
              netN1 = actifN1[ref] ? actifN1[ref].net : 0;
            }

            // Anomalie : amort > brut ⇒ net negatif (impossible en compta)
            // Masquee a l'export PDF pour ne pas polluer le document client
            const anomalieN = !isExporting && amort > brut + 0.5 && (brut > 0.5 || amort > 0.5);
            const anomalieN1 = !isExporting && amortN1 > brutN1 + 0.5 && (brutN1 > 0.5 || amortN1 > 0.5);
            const anomalieTitle = "Anomalie : l'amortissement depasse la valeur brute. Verifiez la balance (compte 28xx vs 2xx).";

            return (
              <tr key={i} className={rowClass}>
                <td className="col-ref">{ref}</td>
                <td className="col-libelle">{row.libelle}</td>
                <td className="col-note">{row.note || ''}</td>
                <td className="col-montant">{formatMontant(brut)}</td>
                <td className="col-montant">{formatMontant(amort)}</td>
                <td className={`col-montant${anomalieN ? ' col-anomalie' : ''}`} title={anomalieN ? anomalieTitle : undefined}>
                  {anomalieN && <span className="anomalie-icon">⚠ </span>}{formatMontant(netN)}
                </td>
                {showN1Detail && <td className="col-montant n1-detail">{formatMontant(brutN1)}</td>}
                {showN1Detail && <td className="col-montant n1-detail">{formatMontant(amortN1)}</td>}
                <td className={`col-montant${anomalieN1 ? ' col-anomalie' : ''}`} title={anomalieN1 ? anomalieTitle : undefined}>
                  {anomalieN1 && <span className="anomalie-icon">⚠ </span>}{formatMontant(netN1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export default BilanActifTable;
