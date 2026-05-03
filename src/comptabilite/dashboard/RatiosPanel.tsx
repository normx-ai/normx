import React from 'react';
import PanelHeader from './PanelHeader';
import RatioCard, { type RatioStatus } from './RatioCard';
import type { DashboardRatios } from './types';

export interface RatiosPanelProps {
  ratios: DashboardRatios | null;
}

const fmt2 = (v: number): string => v.toFixed(2).replace('.', ',');
const fmt1 = (v: number): string => v.toFixed(1).replace('.', ',');

interface RatioDef {
  label: string;
  value: string;
  status: RatioStatus;
  statusText: string;
  fillPct: number;
}

function buildRatios(r: DashboardRatios): RatioDef[] {
  return [
    {
      label: 'Liquidité générale',
      value: fmt2(r.liquidite),
      status: r.liquidite >= 1.5 ? 'good' : r.liquidite >= 1 ? 'warn' : 'bad',
      statusText: r.liquidite >= 1.5 ? 'Saine · cible > 1,5' : r.liquidite >= 1 ? 'À surveiller' : 'Insuffisante',
      fillPct: Math.min(100, (r.liquidite / 3) * 100),
    },
    {
      label: 'Autonomie financière',
      value: fmt1(r.autonomie) + ' %',
      status: r.autonomie >= 30 ? 'good' : r.autonomie >= 20 ? 'warn' : 'bad',
      statusText: r.autonomie >= 30 ? 'Bon · cible > 30 %' : 'Faible',
      fillPct: Math.min(100, r.autonomie * 1.5),
    },
    {
      label: 'Délai client (DSO)',
      value: r.dso + ' j',
      status: r.dso < 60 ? 'good' : r.dso < 90 ? 'warn' : 'bad',
      statusText: r.dso < 60 ? 'Bon · cible < 60 j' : 'À surveiller',
      fillPct: Math.min(100, (r.dso / 120) * 100),
    },
    {
      label: 'Marge nette',
      value: fmt1(r.marge) + ' %',
      status: r.marge >= 5 ? 'good' : r.marge >= 0 ? 'warn' : 'bad',
      statusText: r.marge >= 5 ? 'Solide' : r.marge >= 0 ? 'Faible' : 'Déficit',
      fillPct: Math.min(100, Math.max(0, r.marge * 5)),
    },
  ];
}

function RatiosPanel({ ratios }: RatiosPanelProps): React.ReactElement {
  return (
    <div className="cd-panel">
      <PanelHeader title="Ratios financiers" sub="Calculés depuis la balance" />
      {ratios && (
        <div className="cd-ratios">
          {buildRatios(ratios).map(r => <RatioCard key={r.label} {...r} />)}
        </div>
      )}
    </div>
  );
}

export default RatiosPanel;
