/**
 * BalanceSourcePanel — Indicateur visuel des soldes finaux de la balance
 * Affiche hors PDF les comptes de la balance qui alimentent la note,
 * avec leurs soldes debiteur/crediteur et le total.
 */
import React, { useState } from 'react';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';
import type { BalanceLigne } from '../../types';

interface PrefixGroup {
  label: string;
  prefixes: string[];
}

interface BalanceSourcePanelProps {
  lignes: BalanceLigne[];
  groups: PrefixGroup[];
  title?: string;
}

function fmtM(val: number): string {
  if (val === 0) return '—';
  return Math.round(val).toLocaleString('fr-FR');
}

function matchesAny(num: string, prefixes: string[]): boolean {
  return prefixes.some(p => num.startsWith(p));
}

interface GroupResult {
  label: string;
  comptes: { num: string; libelle: string; sd: number; sc: number }[];
  totalSD: number;
  totalSC: number;
}

function computeGroup(lignes: BalanceLigne[], group: PrefixGroup): GroupResult {
  const comptes: GroupResult['comptes'] = [];
  let totalSD = 0;
  let totalSC = 0;

  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (!matchesAny(num, group.prefixes)) continue;
    const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
    const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
    if (sd === 0 && sc === 0) continue;
    comptes.push({ num, libelle: l.libelle_compte || '', sd, sc });
    totalSD += sd;
    totalSC += sc;
  }

  return { label: group.label, comptes, totalSD, totalSC };
}

export default function BalanceSourcePanel({ lignes, groups, title }: BalanceSourcePanelProps): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  if (!lignes || lignes.length === 0) return null;

  const results = groups.map(g => computeGroup(lignes, g)).filter(r => r.comptes.length > 0);
  if (results.length === 0) return null;

  const totalSD = results.reduce((s, r) => s + r.totalSD, 0);
  const totalSC = results.reduce((s, r) => s + r.totalSC, 0);

  return (
    <div style={{
      margin: '0 20px 12px',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      overflow: 'hidden',
      fontSize: 12,
    }}>
      {/* Header cliquable */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: '#f8f9fa',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 12,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#3b82f6',
            display: 'inline-block',
          }} />
          <span style={{ fontWeight: 600, color: '#1f2937' }}>
            {title || 'Soldes balance'}
          </span>
          <span style={{ color: '#6b7280', fontWeight: 400 }}>
            — {results.reduce((s, r) => s + r.comptes.length, 0)} comptes
          </span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {totalSD > 0 && (
            <span style={{ color: '#d97706', fontWeight: 600 }}>
              SD {fmtM(totalSD)}
            </span>
          )}
          {totalSC > 0 && (
            <span style={{ color: '#059669', fontWeight: 600 }}>
              SC {fmtM(totalSC)}
            </span>
          )}
          {open ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />}
        </span>
      </button>

      {/* Contenu depliable */}
      {open && (
        <div style={{ padding: '0 0 4px' }}>
          {results.map((r, gi) => (
            <div key={gi}>
              {/* Groupe header */}
              <button
                onClick={() => setExpandedGroup(expandedGroup === r.label ? null : r.label)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 16px',
                  background: 'none',
                  border: 'none',
                  borderTop: gi > 0 ? '1px solid #f3f4f6' : 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 11,
                }}
              >
                <span style={{ fontWeight: 600, color: '#374151' }}>{r.label}</span>
                <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ color: '#9ca3af' }}>{r.comptes.length} cpte{r.comptes.length > 1 ? 's' : ''}</span>
                  {r.totalSD > 0 && <span style={{ color: '#d97706' }}>SD {fmtM(r.totalSD)}</span>}
                  {r.totalSC > 0 && <span style={{ color: '#059669' }}>SC {fmtM(r.totalSC)}</span>}
                  {expandedGroup === r.label ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
                </span>
              </button>

              {/* Detail comptes */}
              {expandedGroup === r.label && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '4px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Compte</th>
                      <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Libelle</th>
                      <th style={{ padding: '4px 16px', textAlign: 'right', fontWeight: 600, color: '#d97706' }}>Solde D</th>
                      <th style={{ padding: '4px 16px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>Solde C</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.comptes.map((c, ci) => (
                      <tr key={ci} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '3px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#1f2937' }}>{c.num}</td>
                        <td style={{ padding: '3px 8px', color: '#374151' }}>{c.libelle}</td>
                        <td style={{ padding: '3px 16px', textAlign: 'right', fontFamily: 'monospace', color: c.sd > 0 ? '#d97706' : '#d1d5db' }}>
                          {c.sd > 0 ? fmtM(c.sd) : '—'}
                        </td>
                        <td style={{ padding: '3px 16px', textAlign: 'right', fontFamily: 'monospace', color: c.sc > 0 ? '#059669' : '#d1d5db' }}>
                          {c.sc > 0 ? fmtM(c.sc) : '—'}
                        </td>
                      </tr>
                    ))}
                    {/* Sous-total du groupe */}
                    <tr style={{ borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
                      <td colSpan={2} style={{ padding: '4px 16px', fontWeight: 700, color: '#374151' }}>Sous-total</td>
                      <td style={{ padding: '4px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#d97706' }}>
                        {r.totalSD > 0 ? fmtM(r.totalSD) : '—'}
                      </td>
                      <td style={{ padding: '4px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>
                        {r.totalSC > 0 ? fmtM(r.totalSC) : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
