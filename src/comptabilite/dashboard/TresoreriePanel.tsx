import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import PanelHeader from './PanelHeader';
import { fmtMontant } from '../../utils/formatters';
import type { EvolutionPoint, TableauBordData } from './types';

export interface TresoreriePanelProps {
  tableauBord: TableauBordData | undefined;
  tresoNet: number;
  evolution: EvolutionPoint[];
}

const TOOLTIP_STYLE = { background: '#0F2A42', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11 };
const fmtTick = (v: number): string => fmtMontant(v, { abbreviate: true });
const fmtTooltip = (v: ValueType | undefined): [string, string] => [fmtMontant(Number(v ?? 0)) + ' FCFA', ''];

function TresoreriePanel({ tableauBord, tresoNet, evolution }: TresoreriePanelProps): React.ReactElement {
  const soldeClass = tresoNet >= 0 ? 'cd-treso-value cd-treso-pos' : 'cd-treso-value cd-treso-neg';
  return (
    <div className="cd-panel">
      <PanelHeader title="Trésorerie" sub="Position consolidée 5xx" />
      <div className="cd-treso-summary">
        <div>
          <div className="cd-treso-label">Encaissements</div>
          <div className="cd-treso-value">{fmtMontant(tableauBord?.tresorerie.debit || 0, { abbreviate: true })}</div>
          <div className="cd-treso-sub">Cumul exercice</div>
        </div>
        <div>
          <div className="cd-treso-label">Décaissements</div>
          <div className="cd-treso-value">{fmtMontant(tableauBord?.tresorerie.credit || 0, { abbreviate: true })}</div>
          <div className="cd-treso-sub">Cumul exercice</div>
        </div>
        <div>
          <div className="cd-treso-label">Solde net</div>
          <div className={soldeClass}>
            {tresoNet >= 0 ? '+' : ''}{fmtMontant(tresoNet, { abbreviate: true })}
          </div>
          <div className="cd-treso-sub">FCFA</div>
        </div>
      </div>
      <div className="cd-chart-sm">
        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={120}>
          <BarChart data={evolution}>
            <CartesianGrid stroke="#f1f3f6" vertical={false} />
            <XAxis dataKey="mois" tick={{ fontSize: 10, fill: '#6b7785' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#6b7785' }} axisLine={false} tickLine={false} tickFormatter={fmtTick} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtTooltip} />
            <Bar dataKey="ca" fill="#D4A843" radius={[3, 3, 0, 0]} name="Produits" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TresoreriePanel;
