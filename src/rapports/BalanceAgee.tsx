import { clientFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { SubReportProps, tableStyle, thStyleR, tdStyleR, fmt } from './types';
import { ReportWrapper, Loading, Empty, TypeBadge } from './SharedComponents';

interface BalanceAgeeRow {
  tiers_id: number;
  tiers_nom: string;
  code_tiers: string;
  tiers_type: string;
  date_ecriture: string;
  debit: string;
  credit: string;
}

interface TiersAgee {
  nom: string;
  code: string;
  type: string;
  tranches: [number, number, number, number];
}

function BalanceAgee({ entiteId, exerciceId, exerciceAnnee, onBack }: SubReportProps): React.ReactElement {
  const [data, setData] = useState<BalanceAgeeRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async (): Promise<void> => {
      setLoading(true);
      try {
        const res: Response = await clientFetch(`/api/ecritures/rapports/balance-agee/${entiteId}/${exerciceId}`);
        if (res.ok) setData(await res.json());
      } catch (_e) { /* network error */ }
      setLoading(false);
    })();
  }, [entiteId, exerciceId]);

  const now: Date = new Date();
  const tiers: Record<number, TiersAgee> = {};
  data.forEach((d: BalanceAgeeRow) => {
    if (!tiers[d.tiers_id]) tiers[d.tiers_id] = { nom: d.tiers_nom, code: d.code_tiers, type: d.tiers_type, tranches: [0, 0, 0, 0] };
    const daysDiff: number = Math.floor((now.getTime() - new Date(d.date_ecriture).getTime()) / 86400000);
    const montant: number = parseFloat(d.debit) - parseFloat(d.credit);
    if (daysDiff <= 30) tiers[d.tiers_id].tranches[0] += montant;
    else if (daysDiff <= 60) tiers[d.tiers_id].tranches[1] += montant;
    else if (daysDiff <= 90) tiers[d.tiers_id].tranches[2] += montant;
    else tiers[d.tiers_id].tranches[3] += montant;
  });
  const tiersList: TiersAgee[] = Object.values(tiers).sort((a: TiersAgee, b: TiersAgee) => a.nom.localeCompare(b.nom));
  const totaux: [number, number, number, number] = [0, 0, 0, 0];
  tiersList.forEach((t: TiersAgee) => t.tranches.forEach((v: number, i: number) => totaux[i] += v));

  return (
    <ReportWrapper title="Balance âgée des tiers" subtitle={`Écritures non lettrées — ${exerciceAnnee}`} onBack={onBack}>
      {loading ? <Loading /> : tiersList.length === 0 ? <Empty msg="Aucune créance/dette non lettrée." /> : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyleR}>Tiers</th>
              <th style={thStyleR}>Code</th>
              <th style={thStyleR}>Type</th>
              <th style={{ ...thStyleR, textAlign: 'right' }}>0-30 j</th>
              <th style={{ ...thStyleR, textAlign: 'right' }}>31-60 j</th>
              <th style={{ ...thStyleR, textAlign: 'right' }}>61-90 j</th>
              <th style={{ ...thStyleR, textAlign: 'right' }}>+90 j</th>
              <th style={{ ...thStyleR, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {tiersList.map((t: TiersAgee, i: number) => {
              const total: number = t.tranches.reduce((s: number, v: number) => s + v, 0);
              return (
                <tr key={i}>
                  <td style={{ ...tdStyleR, fontWeight: 600 }}>{t.nom}</td>
                  <td style={tdStyleR}>{t.code}</td>
                  <td style={tdStyleR}><TypeBadge type={t.type} /></td>
                  {t.tranches.map((v: number, j: number) => (
                    <td key={j} style={{ ...tdStyleR, textAlign: 'right', color: v < 0 ? '#dc2626' : '#1a1a1a' }}>{fmt(v)}</td>
                  ))}
                  <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700 }}>{fmt(total)}</td>
                </tr>
              );
            })}
            <tr style={{ background: '#1A3A5C' }}>
              <td colSpan={3} style={{ ...tdStyleR, fontWeight: 700, color: '#fff' }}>TOTAL</td>
              {totaux.map((v: number, i: number) => (
                <td key={i} style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(v)}</td>
              ))}
              <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(totaux.reduce((s: number, v: number) => s + v, 0))}</td>
            </tr>
          </tbody>
        </table>
      )}
    </ReportWrapper>
  );
}

export default BalanceAgee;
