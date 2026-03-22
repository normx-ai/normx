import React from 'react';
import { LuChevronLeft, LuDownload } from 'react-icons/lu';
import { ReportWrapperProps, KpiCardProps, EmptyProps } from './types';

export function ReportWrapper({ title, subtitle, onBack, onExport, children }: ReportWrapperProps): React.ReactElement {
  return (
    <div style={{ padding: '24px 30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D4A843', fontSize: 15, padding: 4 }}>
            <LuChevronLeft size={20} />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{title}</h2>
            {subtitle && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>{subtitle}</p>}
          </div>
        </div>
        {onExport && (
          <button onClick={onExport} style={{
            padding: '8px 18px', background: '#D4A843', color: '#fff', border: 'none', borderRadius: 6,
            fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <LuDownload size={16} /> Exporter CSV
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function KpiCard({ label, value, color }: KpiCardProps): React.ReactElement {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e5ea', borderRadius: 8, padding: '18px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value || '0'}</div>
    </div>
  );
}

interface TypeBadgeProps { type: string; }
export function TypeBadge({ type }: TypeBadgeProps): React.ReactElement {
  const colors: Record<string, string> = { membre: '#D4A843', fournisseur: '#059669', bailleur: '#d97706', personnel: '#7c3aed' };
  const labels: Record<string, string> = { membre: 'Membre', fournisseur: 'Fournisseur', bailleur: 'Bailleur', personnel: 'Personnel' };
  return (
    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 3, fontWeight: 500, background: (colors[type] || '#888') + '18', color: colors[type] || '#888' }}>
      {labels[type] || type}
    </span>
  );
}

export function Loading(): React.ReactElement {
  return <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 15 }}>Chargement...</div>;
}

export function Empty({ msg }: EmptyProps): React.ReactElement {
  return <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 15 }}>{msg || 'Aucune donnée disponible.'}</div>;
}
