import { clientFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { SubReportProps, MOIS_LABELS, tableStyle, thStyleR, tdStyleR, fmt } from './types';
import { ReportWrapper, Loading, Empty } from './SharedComponents';

interface JournalCentralisateurRow {
  journal: string;
  mois: number;
  total_debit: string;
  total_credit: string;
  nb_ecritures: string;
}

interface GridCell {
  debit: number;
  credit: number;
  nb: number;
}

function JournalCentralisateur({ entiteId, exerciceId, exerciceAnnee, onBack }: SubReportProps): React.ReactElement {
  const [data, setData] = useState<JournalCentralisateurRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async (): Promise<void> => {
      setLoading(true);
      try {
        const res: Response = await clientFetch(`/api/ecritures/rapports/journal-centralisateur/${entiteId}/${exerciceId}`);
        if (res.ok) setData(await res.json());
      } catch (_e) { /* network error */ }
      setLoading(false);
    })();
  }, [entiteId, exerciceId]);

  const journaux: string[] = [...new Set(data.map((d: JournalCentralisateurRow) => d.journal))].sort();
  const grid: Record<string, Record<number, GridCell>> = {};
  journaux.forEach((j: string) => { grid[j] = {}; });
  data.forEach((d: JournalCentralisateurRow) => {
    if (!grid[d.journal]) grid[d.journal] = {};
    grid[d.journal][d.mois] = { debit: parseFloat(d.total_debit), credit: parseFloat(d.total_credit), nb: parseInt(d.nb_ecritures) };
  });

  const exportCSV = (): void => {
    let csv: string = 'Journal;' + MOIS_LABELS.map((m: string) => `${m} Débit;${m} Crédit`).join(';') + ';Total Débit;Total Crédit\n';
    journaux.forEach((j: string) => {
      let totalD = 0, totalC = 0;
      csv += j;
      for (let m = 1; m <= 12; m++) {
        const c: GridCell = grid[j][m] || { debit: 0, credit: 0, nb: 0 };
        totalD += c.debit; totalC += c.credit;
        csv += `;${c.debit};${c.credit}`;
      }
      csv += `;${totalD};${totalC}\n`;
    });
    const blob: Blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a: HTMLAnchorElement = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `journal_centralisateur_${exerciceAnnee}.csv`; a.click();
  };

  return (
    <ReportWrapper title="Journal centralisateur" subtitle={`Exercice ${exerciceAnnee}`} onBack={onBack} onExport={exportCSV}>
      {loading ? <Loading /> : journaux.length === 0 ? <Empty /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyleR}>Journal</th>
                {MOIS_LABELS.map((m: string, i: number) => <th key={i} style={thStyleR} colSpan={2}>{m}</th>)}
                <th style={thStyleR} colSpan={2}>TOTAL</th>
              </tr>
              <tr>
                <th style={thStyleR}></th>
                {MOIS_LABELS.map((_m: string, i: number) => (
                  <React.Fragment key={i}>
                    <th style={{ ...thStyleR, fontSize: 11 }}>Débit</th>
                    <th style={{ ...thStyleR, fontSize: 11 }}>Crédit</th>
                  </React.Fragment>
                ))}
                <th style={{ ...thStyleR, fontSize: 11 }}>Débit</th>
                <th style={{ ...thStyleR, fontSize: 11 }}>Crédit</th>
              </tr>
            </thead>
            <tbody>
              {journaux.map((j: string) => {
                let totalD = 0, totalC = 0;
                return (
                  <tr key={j}>
                    <td style={{ ...tdStyleR, fontWeight: 600 }}>{j}</td>
                    {Array.from({ length: 12 }, (_: undefined, i: number) => {
                      const c: GridCell = grid[j][i + 1] || { debit: 0, credit: 0, nb: 0 };
                      totalD += c.debit; totalC += c.credit;
                      return (
                        <React.Fragment key={i}>
                          <td style={{ ...tdStyleR, textAlign: 'right' }}>{fmt(c.debit)}</td>
                          <td style={{ ...tdStyleR, textAlign: 'right' }}>{fmt(c.credit)}</td>
                        </React.Fragment>
                      );
                    })}
                    <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, background: '#f8f9fb' }}>{fmt(totalD)}</td>
                    <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, background: '#f8f9fb' }}>{fmt(totalC)}</td>
                  </tr>
                );
              })}
              <tr style={{ background: '#1A3A5C' }}>
                <td style={{ ...tdStyleR, fontWeight: 700, color: '#fff' }}>TOTAL</td>
                {Array.from({ length: 12 }, (_: undefined, i: number) => {
                  const moisD: number = journaux.reduce((s: number, j: string) => s + (grid[j][i + 1]?.debit || 0), 0);
                  const moisC: number = journaux.reduce((s: number, j: string) => s + (grid[j][i + 1]?.credit || 0), 0);
                  return (
                    <React.Fragment key={i}>
                      <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(moisD)}</td>
                      <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(moisC)}</td>
                    </React.Fragment>
                  );
                })}
                <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, color: '#fff' }}>
                  {fmt(journaux.reduce((s: number, j: string) => s + Object.values(grid[j]).reduce((s2: number, c: GridCell) => s2 + c.debit, 0), 0))}
                </td>
                <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, color: '#fff' }}>
                  {fmt(journaux.reduce((s: number, j: string) => s + Object.values(grid[j]).reduce((s2: number, c: GridCell) => s2 + c.credit, 0), 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </ReportWrapper>
  );
}

export default JournalCentralisateur;
