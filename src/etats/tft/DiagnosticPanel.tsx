// Panneau de diagnostic automatique du TFT : liste des erreurs / alertes
// sur N et N-1 avec le detail des comptes impactes.

import React from 'react';
import { formatMontant } from '../TFT_helpers';
import type { DiagnosticItem } from '../TFT_helpers';

interface Props {
  diagN: DiagnosticItem[];
  diagN1: DiagnosticItem[];
  annee: number;
}

export function DiagnosticPanel({ diagN, diagN1, annee }: Props): React.JSX.Element {
  const groups = [
    { label: 'Exercice N (' + annee + ')', items: diagN },
    { label: 'Exercice N-1 (' + (annee - 1) + ')', items: diagN1 },
  ];

  return (
    <div style={{ margin: '16px 0' }}>
      {groups.map(({ label, items }) => {
        if (items.length === 0) {
          return (
            <div key={label} style={{ padding: '8px 12px', marginBottom: 8, background: '#f3f4f6', borderRadius: 6, fontSize: 12, color: '#6b7280' }}>
              {label} : Pas de donnees pour le diagnostic.
            </div>
          );
        }
        const hasErrors = items.some(d => d.type === 'erreur');
        const hasAlerts = items.some(d => d.type === 'alerte');
        const resume = items.find(d => d.poste === 'Resume');
        const details = items.filter(d => d.poste !== 'Resume' && d.type !== 'info');

        if (!hasErrors && !hasAlerts) {
          return (
            <div key={label} style={{ padding: '8px 12px', marginBottom: 8, background: '#dcfce7', borderRadius: 6, fontSize: 12, color: '#166534' }}>
              {label} : {resume?.message || 'TFT equilibre.'}
            </div>
          );
        }

        return (
          <div key={label} style={{ marginBottom: 12, background: hasErrors ? '#fef2f2' : '#fffbeb', border: '1px solid ' + (hasErrors ? '#fecaca' : '#fde68a'), borderRadius: 6, padding: 12, fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: hasErrors ? '#991b1b' : '#92400e' }}>
              {hasErrors ? '\u26D4' : '\u26A0\uFE0F'} {label}
              {resume && <span style={{ fontWeight: 400, marginLeft: 8 }}>— {resume.message}</span>}
            </div>
            {details.map((d, i) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: i < details.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ color: d.type === 'erreur' ? '#991b1b' : '#92400e', fontWeight: 600 }}>
                  [{d.poste}] {d.message}
                </div>
                {d.comptes && d.comptes.length > 0 && (
                  <div style={{ marginTop: 4, paddingLeft: 12, fontSize: 12, color: '#4b5563' }}>
                    {d.comptes.map((c, j) => (
                      <div key={j}>{c.num} {c.lib} : {formatMontant(c.montant)}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
