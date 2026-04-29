// Page de comparaison TFT : Version A (Guide officiel) vs Version B (Praticien).
// Affiche les deux calculs cote a cote pour chaque poste, l'ecart entre les
// deux, et l'ecart de bouclage de chaque version.

import React, { useMemo, useState } from 'react';
import { LuArrowLeft, LuTriangleAlert } from 'react-icons/lu';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { useBalanceLignes } from '../hooks/useBalanceLignes';
import './BilanSYCEBNL.css';
import type { EtatBaseProps } from '../types';
import { computeAllFluxA, computeAllFluxB } from './tft/calculs';
import { formatMontant } from './TFT_helpers';

interface PosteRow {
  ref: string;
  libelle: string;
  isSubtotal?: boolean;
  isTotal?: boolean;
  isHeader?: boolean;
}

const ROWS: PosteRow[] = [
  { ref: 'ZA', libelle: 'Trésorerie nette au 1er janvier', isSubtotal: true },
  { ref: '__op__', libelle: 'Activités opérationnelles', isHeader: true },
  { ref: 'FA', libelle: 'CAFG' },
  { ref: 'FB', libelle: 'Variation actif circulant HAO' },
  { ref: 'FC', libelle: 'Variation des stocks' },
  { ref: 'FD', libelle: 'Variation des créances' },
  { ref: 'FE', libelle: 'Variation passif circulant' },
  { ref: 'ZB', libelle: 'ZB Flux opérationnels', isSubtotal: true },
  { ref: '__inv__', libelle: 'Activités d\'investissement', isHeader: true },
  { ref: 'FF', libelle: 'Acquisitions immo incorporelles' },
  { ref: 'FG', libelle: 'Acquisitions immo corporelles' },
  { ref: 'FH', libelle: 'Acquisitions immo financières' },
  { ref: 'FI', libelle: 'Cessions immo incorp/corp' },
  { ref: 'FJ', libelle: 'Cessions immo financières' },
  { ref: 'ZC', libelle: 'ZC Flux d\'investissement', isSubtotal: true },
  { ref: '__cp__', libelle: 'Capitaux propres', isHeader: true },
  { ref: 'FK', libelle: 'Augmentation de capital' },
  { ref: 'FL', libelle: 'Subventions d\'investissement' },
  { ref: 'FM', libelle: 'Prélèvement sur le capital' },
  { ref: 'FN', libelle: 'Dividendes versés' },
  { ref: 'ZD', libelle: 'ZD Total capitaux propres', isSubtotal: true },
  { ref: '__ce__', libelle: 'Capitaux étrangers', isHeader: true },
  { ref: 'FO', libelle: 'Emprunts' },
  { ref: 'FP', libelle: 'Autres dettes financières' },
  { ref: 'FQ', libelle: 'Remboursements' },
  { ref: 'ZE', libelle: 'ZE Total capitaux étrangers', isSubtotal: true },
  { ref: 'ZF', libelle: 'ZF Total financement (ZD + ZE)', isSubtotal: true },
  { ref: 'ZG', libelle: 'ZG Variation trésorerie (ZB + ZC + ZF)', isTotal: true },
  { ref: 'ZH', libelle: 'ZH Trésorerie au 31/12 (ZG + ZA)', isTotal: true },
  { ref: 'ZI', libelle: 'ZI Trésorerie bilan (contrôle)', isSubtotal: true },
];

function TFT_Comparaison({ entiteName, entiteId, offre = 'comptabilite', onBack }: EtatBaseProps): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const { lignesN, lignesN1, isLoading } = useBalanceLignes({ entiteId, selectedExercice, exercices, offre });

  const [showOnlyDiff, setShowOnlyDiff] = useState(false);

  const fluxA = useMemo(() => {
    if (lignesN.length === 0) return {} as Record<string, number>;
    return computeAllFluxA(lignesN, lignesN1);
  }, [lignesN, lignesN1]);

  const fluxB = useMemo(() => {
    if (lignesN.length === 0) return {} as Record<string, number>;
    return computeAllFluxB(lignesN, lignesN1);
  }, [lignesN, lignesN1]);

  const ecartA = (fluxA.ZH ?? 0) - (fluxA.ZI ?? 0);
  const ecartB = (fluxB.ZH ?? 0) - (fluxB.ZI ?? 0);
  const meilleur = Math.abs(ecartA) <= Math.abs(ecartB) ? 'A' : 'B';

  const filtered = showOnlyDiff
    ? ROWS.filter(r => {
        if (r.isHeader) return true;
        const a = fluxA[r.ref] ?? 0;
        const b = fluxB[r.ref] ?? 0;
        return Math.abs(a - b) > 0.5;
      })
    : ROWS;

  const renderCell = (val: number | undefined, bold: boolean): React.ReactNode => {
    const s = val === undefined ? '' : formatMontant(val);
    return <span style={{ fontWeight: bold ? 700 : 400, fontFamily: 'monospace' }}>{s}</span>;
  };

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>TFT — Comparaison Guide officiel vs Praticien</h2>
        </div>
      </div>

      <div className="bilan-exercice-select">
        <label>Exercice :</label>
        <select
          value={selectedExercice ? selectedExercice.id : ''}
          onChange={e => {
            const ex = exercices.find(x => x.id === parseInt(e.target.value));
            setSelectedExercice(ex || null);
          }}
        >
          {exercices.length === 0 && <option value="">Aucun exercice</option>}
          {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.annee}</option>)}
        </select>
        <span style={{ marginLeft: 16 }}>Entité : {entiteName}</span>
        <label style={{ marginLeft: 16 }}>
          <input type="checkbox" checked={showOnlyDiff} onChange={e => setShowOnlyDiff(e.target.checked)} />
          {' '}Afficher uniquement les écarts
        </label>
      </div>

      {isLoading && <div style={{ padding: 20, color: '#888' }}>Chargement…</div>}

      {!isLoading && lignesN.length === 0 && (
        <div className="bilan-alert">
          <LuTriangleAlert /> Pas de balance pour cet exercice.
        </div>
      )}

      {!isLoading && lignesN.length > 0 && (
        <>
          {/* Resume des ecarts */}
          <div style={{ display: 'flex', gap: 12, margin: '16px 0', flexWrap: 'wrap' }}>
            <div style={{
              flex: 1, minWidth: 220, padding: 12, borderRadius: 6,
              background: meilleur === 'A' ? '#dcfce7' : '#fef3c7',
              border: `2px solid ${meilleur === 'A' ? '#16a34a' : '#f59e0b'}`,
            }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                Version A — Guide officiel {meilleur === 'A' && '✓ meilleur bouclage'}
              </div>
              <div style={{ marginTop: 6, fontSize: 12 }}>
                Écart de bouclage : <strong style={{ fontFamily: 'monospace' }}>{formatMontant(ecartA)}</strong> FCFA
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#6b7280' }}>
                ZH = {formatMontant(fluxA.ZH ?? 0)} / ZI = {formatMontant(fluxA.ZI ?? 0)}
              </div>
            </div>
            <div style={{
              flex: 1, minWidth: 220, padding: 12, borderRadius: 6,
              background: meilleur === 'B' ? '#dcfce7' : '#fef3c7',
              border: `2px solid ${meilleur === 'B' ? '#16a34a' : '#f59e0b'}`,
            }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                Version B — Praticien {meilleur === 'B' && '✓ meilleur bouclage'}
              </div>
              <div style={{ marginTop: 6, fontSize: 12 }}>
                Écart de bouclage : <strong style={{ fontFamily: 'monospace' }}>{formatMontant(ecartB)}</strong> FCFA
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#6b7280' }}>
                ZH = {formatMontant(fluxB.ZH ?? 0)} / ZI = {formatMontant(fluxB.ZI ?? 0)}
              </div>
            </div>
          </div>

          {/* Tableau de comparaison */}
          <table className="bilan-table" style={{ fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ width: '8%', textAlign: 'left' }}>Ref</th>
                <th style={{ width: '36%', textAlign: 'left' }}>Libellé</th>
                <th style={{ width: '18%', textAlign: 'right' }}>Version A (Guide)</th>
                <th style={{ width: '18%', textAlign: 'right' }}>Version B (Praticien)</th>
                <th style={{ width: '20%', textAlign: 'right' }}>Écart B − A</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                if (row.isHeader) {
                  return (
                    <tr key={i}>
                      <td colSpan={5} style={{ background: '#1e3a5f', color: '#fff', fontWeight: 700, padding: '6px 8px' }}>
                        {row.libelle}
                      </td>
                    </tr>
                  );
                }
                const a = fluxA[row.ref] ?? 0;
                const b = fluxB[row.ref] ?? 0;
                const diff = b - a;
                const bg = row.isTotal ? '#fef3c7' : row.isSubtotal ? '#f0f4f8' : undefined;
                return (
                  <tr key={i} style={bg ? { background: bg } : undefined}>
                    <td style={{ padding: '4px 8px', fontWeight: row.isTotal || row.isSubtotal ? 700 : 400 }}>{row.ref}</td>
                    <td style={{ padding: '4px 8px', fontWeight: row.isTotal || row.isSubtotal ? 700 : 400 }}>{row.libelle}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>{renderCell(a, !!(row.isTotal || row.isSubtotal))}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>{renderCell(b, !!(row.isTotal || row.isSubtotal))}</td>
                    <td style={{
                      padding: '4px 8px', textAlign: 'right',
                      color: Math.abs(diff) < 0.5 ? '#9ca3af' : diff > 0 ? '#16a34a' : '#dc2626',
                      fontFamily: 'monospace',
                      fontWeight: row.isTotal || row.isSubtotal ? 700 : 400,
                    }}>
                      {Math.abs(diff) < 0.5 ? '—' : formatMontant(diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: 16, padding: 12, background: '#f3f4f6', borderRadius: 6, fontSize: 12, lineHeight: 1.5 }}>
            <strong>Légende</strong>
            <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
              <li><strong>Version A (Guide officiel)</strong> : suit la lettre du guide d'application SYSCOHADA. Capte la totalité des variations classe 10/14/16/18 (avec extension classe 11/12/13 sur FM pour bouclage).</li>
              <li><strong>Version B (Praticien)</strong> : isole strictement le cash en neutralisant les opérations non monétaires (incorporation réserves, conversion comptes courants, affectation résultat).</li>
              <li>Postes identiques entre A et B : FA, FB, FC, FD, FE, FF, FG, FH, FI, FJ, FN, FO, FP, FQ, ZA, ZB, ZC, ZE, ZI.</li>
              <li>Postes différents : FK, FL, FM, et donc ZD, ZF, ZG, ZH.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default TFT_Comparaison;
