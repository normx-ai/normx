import React from 'react';

export type RatioStatus = 'good' | 'warn' | 'bad';

export interface RatioCardProps {
  label: string;
  value: string;
  status: RatioStatus;
  statusText: string;
  fillPct: number;
}

const STATUS_COLORS: Record<RatioStatus, string> = {
  good: '#16a34a',
  warn: '#ea580c',
  bad: '#dc2626',
};

function RatioCard({ label, value, status, statusText, fillPct }: RatioCardProps): React.ReactElement {
  return (
    <div className="cd-ratio">
      <div className="cd-ratio-label">{label}</div>
      <div className="cd-ratio-value">{value}</div>
      <div className="cd-ratio-status" style={{ color: STATUS_COLORS[status] }}>{statusText}</div>
      <div className="cd-ratio-bar">
        <div className={`cd-ratio-bar-fill ${status}`} style={{ width: `${fillPct}%` }} />
      </div>
    </div>
  );
}

export default RatioCard;
