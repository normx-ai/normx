import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { LuTrendingUp, LuTrendingDown } from 'react-icons/lu';
import { fmtMontant } from '../../utils/formatters';

export interface KpiCardProps {
  featured?: boolean;
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  spark?: { x: string; y: number }[];
  color: string;
}

function KpiCard({ featured, label, value, icon, trend, trendUp, spark, color }: KpiCardProps): React.ReactElement {
  const positive = value >= 0;
  const trendDisplayed = trend ?? (positive ? 'Positif' : 'Négatif');
  const trendDirUp = trend ? (trendUp ?? false) : positive;
  const showSpark = !!(spark && spark.length > 0 && spark.some(s => s.y !== 0));

  return (
    <div className={`cd-kpi${featured ? ' featured' : ''}`}>
      <div className="cd-kpi-head">
        <div className="cd-kpi-label">{label}</div>
        <div className="cd-kpi-icon">{icon}</div>
      </div>
      <div className="cd-kpi-value">
        {fmtMontant(value, { abbreviate: true })}
        <span className="cd-kpi-unit">FCFA</span>
      </div>
      <div className={`cd-kpi-trend ${trendDirUp ? 'cd-up' : 'cd-down'}`}>
        {trendDirUp ? <LuTrendingUp size={12} /> : <LuTrendingDown size={12} />}
        {trendDisplayed}
      </div>
      {showSpark && (
        <div className="cd-spark">
          <ResponsiveContainer width="100%" height="100%" minWidth={60} minHeight={30}>
            <LineChart data={spark}>
              <Line type="monotone" dataKey="y" stroke={color} strokeWidth={1.8} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default KpiCard;
