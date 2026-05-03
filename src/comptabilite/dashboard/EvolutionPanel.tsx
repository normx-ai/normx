import React from 'react';
import {
  AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import PanelHeader from './PanelHeader';
import { fmtMontant } from '../../utils/formatters';
import type { EvolutionPoint } from './types';

export interface EvolutionPanelProps {
  evolution: EvolutionPoint[];
}

const TOOLTIP_STYLE = { background: '#0F2A42', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12 };
const fmtTick = (v: number): string => fmtMontant(v, { abbreviate: true });
const fmtTooltip = (v: ValueType | undefined): [string, string] => [fmtMontant(Number(v ?? 0)) + ' FCFA', ''];

function EvolutionPanel({ evolution }: EvolutionPanelProps): React.ReactElement {
  return (
    <div className="cd-panel">
      <PanelHeader title="Évolution mensuelle" sub="Produits vs charges (cumul mensuel)" />
      <div className="cd-chart">
        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={120}>
          <AreaChart data={evolution}>
            <defs>
              <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0F2A42" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#0F2A42" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f1f3f6" vertical={false} />
            <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#6b7785' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7785' }} axisLine={false} tickLine={false} tickFormatter={fmtTick} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#fff' }} formatter={fmtTooltip} />
            <Area type="monotone" dataKey="ca" stroke="#0F2A42" strokeWidth={2.5} fill="url(#caGrad)" name="Produits" />
            <Line type="monotone" dataKey="charges" stroke="#dc2626" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Charges" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default EvolutionPanel;
