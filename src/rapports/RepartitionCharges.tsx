import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import React, { useState, useEffect } from 'react';
import { LuChartBarIncreasing, LuChartPie, LuPrinter, LuDownload, LuX, LuEye } from 'react-icons/lu';
import { SubReportProps, POSTE_LABELS, tableStyle, thStyleR, tdStyleR, fmt } from './types';
import { buildRepartitionChargesPdf } from './repartitionChargesPdf';
import { ReportWrapper, Loading, Empty } from './SharedComponents';

interface RepartitionRow { poste: string; numero_compte: string; libelle_compte: string; total_debit: string; total_credit: string; }
interface BalanceRow { numero_compte: string; solde_debiteur: string; solde_crediteur: string; }
interface PosteCompte { compte: string; libelle: string; montant: number; }
interface PosteData { total: number; comptes: PosteCompte[]; }

const COLORS = ['#D4A843', '#1A3A5C', '#059669', '#dc2626', '#7c3aed', '#d97706', '#0891b2', '#be185d', '#4f46e5', '#65a30d'];

function buildFromBalance(rows: BalanceRow[]): RepartitionRow[] {
  return rows
    .filter(r => (r.numero_compte || '').trim().startsWith('6'))
    .map(r => ({
      poste: (r.numero_compte || '').trim().substring(0, 2),
      numero_compte: (r.numero_compte || '').trim(),
      libelle_compte: '',
      total_debit: r.solde_debiteur,
      total_credit: r.solde_crediteur,
    }));
}

// ─── Graphique cercle SVG ───
function PieChart({ data, total }: { data: [string, PosteData][]; total: number }): React.ReactElement {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const r = 110;
  const [hover, setHover] = useState<string | null>(null);

  let cumAngle = -Math.PI / 2;

  const slices = data.map(([poste, p], i) => {
    const pct = total > 0 ? p.total / total : 0;
    const angle = pct * 2 * Math.PI;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;

    const largeArc = angle > Math.PI ? 1 : 0;
    const isHovered = hover === poste;
    const rr = isHovered ? r + 6 : r;
    const xx1 = cx + rr * Math.cos(startAngle);
    const yy1 = cy + rr * Math.sin(startAngle);
    const xx2 = cx + rr * Math.cos(endAngle);
    const yy2 = cy + rr * Math.sin(endAngle);

    const path = pct >= 0.999
      ? `M ${cx - rr} ${cy} A ${rr} ${rr} 0 1 1 ${cx + rr} ${cy} A ${rr} ${rr} 0 1 1 ${cx - rr} ${cy}`
      : `M ${cx} ${cy} L ${xx1} ${yy1} A ${rr} ${rr} 0 ${largeArc} 1 ${xx2} ${yy2} Z`;

    const midAngle = startAngle + angle / 2;
    const labelR = r + 30;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);

    return { poste, path, color: COLORS[i % COLORS.length], pct, lx, ly, midAngle };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg width={size + 80} height={size + 40} viewBox={`-40 -20 ${size + 80} ${size + 40}`}>
        {slices.map(s => (
          <path
            key={s.poste}
            d={s.path}
            fill={s.color}
            stroke="#fff"
            strokeWidth={2}
            style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
            opacity={hover && hover !== s.poste ? 0.5 : 1}
            onMouseEnter={() => setHover(s.poste)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {slices.filter(s => s.pct >= 0.04).map(s => (
          <text
            key={s.poste + '-label'}
            x={s.lx}
            y={s.ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fontWeight={600}
            fill="#333"
          >
            {(s.pct * 100).toFixed(0)}%
          </text>
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {slices.map(s => (
          <div
            key={s.poste}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
              opacity: hover && hover !== s.poste ? 0.4 : 1,
              fontWeight: hover === s.poste ? 700 : 400,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={() => setHover(s.poste)}
            onMouseLeave={() => setHover(null)}
          >
            <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flexShrink: 0 }}></span>
            <span>{POSTE_LABELS[s.poste] || 'Poste ' + s.poste}</span>
            <span style={{ color: '#888', marginLeft: 'auto', paddingLeft: 12 }}>{(s.pct * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Composant principal ───
function RepartitionCharges({ entiteId, exerciceId, exerciceAnnee, offre, entiteName, entiteSigle, entiteAdresse, entiteNif, onBack }: SubReportProps): React.ReactElement {
  const [data, setData] = useState<RepartitionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [vue, setVue] = useState<'barres' | 'cercle'>('barres');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  useEffect(() => {
    (async (): Promise<void> => {
      setLoading(true);
      if (offre === 'comptabilite') {
        try {
          const res: Response = await clientFetch(api.ecritures.rapports.repartitionCharges(entiteId, exerciceId));
          if (res.ok) setData(await res.json());
        } catch (_e) { /* network error */ }
      } else {
        try {
          const res = await clientFetch(api.balance.byExercice(entiteId, exerciceId, 'N'));
          if (res.ok) {
            const result: BalanceRow[] | { lignes?: BalanceRow[] } = await res.json();
            const rows = Array.isArray(result) ? result : (result.lignes || []);
            setData(buildFromBalance(rows));
          }
        } catch (_e) { /* network error */ }
      }
      setLoading(false);
    })();
  }, [entiteId, exerciceId, offre]);

  const postes: Record<string, PosteData> = {};
  data.forEach((d: RepartitionRow) => {
    const poste: string = d.poste;
    if (!postes[poste]) postes[poste] = { total: 0, comptes: [] };
    const net: number = parseFloat(d.total_debit) - parseFloat(d.total_credit);
    postes[poste].total += net;
    postes[poste].comptes.push({ compte: d.numero_compte, libelle: d.libelle_compte || d.numero_compte, montant: net });
  });
  const posteList: [string, PosteData][] = Object.entries(postes).sort((a, b) => a[0].localeCompare(b[0]));
  const grandTotal: number = posteList.reduce((s: number, [, p]) => s + p.total, 0);
  const maxPoste: number = Math.max(...posteList.map(([, p]) => Math.abs(p.total)), 1);

  const generatePDF = () => {
    const pdf = buildRepartitionChargesPdf(posteList, grandTotal, {
      entiteName, entiteSigle, entiteAdresse, entiteNif, exerciceAnnee,
    });
    const blob = pdf.output('blob');
    setPdfBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPdfBlob(null);
  };

  const printPDF = () => {
    if (!previewUrl) return;
    const win = window.open(previewUrl, '_blank');
    if (win) win.print();
  };

  const downloadPDF = () => {
    if (!pdfBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(pdfBlob);
    a.download = `repartition_charges_${exerciceAnnee}.pdf`;
    a.click();
  };

  return (
    <ReportWrapper title="Répartition des charges" subtitle={`Classe 6 — ${exerciceAnnee}`} onBack={onBack}>
      {loading ? <Loading /> : posteList.length === 0 ? <Empty msg="Aucune charge enregistrée." /> : (
        <div>
          {/* Barre d'actions : sélecteur vue + imprimer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setVue('barres')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                  border: vue === 'barres' ? '2px solid #1A3A5C' : '1px solid #d1d5db',
                  background: vue === 'barres' ? '#eef2f7' : '#fff',
                  color: vue === 'barres' ? '#1A3A5C' : '#666',
                  fontWeight: vue === 'barres' ? 600 : 400,
                }}
              >
                <LuChartBarIncreasing size={15} /> Histogramme
              </button>
              <button
                onClick={() => setVue('cercle')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                  border: vue === 'cercle' ? '2px solid #1A3A5C' : '1px solid #d1d5db',
                  background: vue === 'cercle' ? '#eef2f7' : '#fff',
                  color: vue === 'cercle' ? '#1A3A5C' : '#666',
                  fontWeight: vue === 'cercle' ? 600 : 400,
                }}
              >
                <LuChartPie size={15} /> Cercle
              </button>
            </div>
            <button
              onClick={generatePDF}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 500,
              }}
            >
              <LuEye size={15} /> Aperçu / Imprimer
            </button>
          </div>

          {/* Graphique */}
          {vue === 'barres' ? (
            <div style={{ marginBottom: 24 }}>
              {posteList.map(([poste, p], i) => (
                <div key={poste} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 200, fontSize: 13, fontWeight: 500, textAlign: 'right', flexShrink: 0 }}>{POSTE_LABELS[poste] || 'Poste ' + poste}</div>
                  <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 4, height: 24, position: 'relative' }}>
                    <div style={{ width: `${(Math.abs(p.total) / maxPoste) * 100}%`, background: COLORS[i % COLORS.length], borderRadius: 4, height: '100%', minWidth: 2 }}></div>
                  </div>
                  <div style={{ width: 110, fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{fmt(p.total)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
              <PieChart data={posteList} total={grandTotal} />
            </div>
          )}

          {/* Tableau détaillé */}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyleR}>Compte</th>
                <th style={{ ...thStyleR, textAlign: 'left' }}>Libellé</th>
                <th style={{ ...thStyleR, textAlign: 'right' }}>Montant</th>
                <th style={{ ...thStyleR, textAlign: 'right' }}>% Total</th>
              </tr>
            </thead>
            <tbody>
              {posteList.map(([poste, p], i) => (
                <React.Fragment key={poste}>
                  <tr style={{ background: '#e8edf5' }}>
                    <td style={{ ...tdStyleR, fontWeight: 700 }}>
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], marginRight: 8, verticalAlign: 'middle' }}></span>
                      {poste}
                    </td>
                    <td style={{ ...tdStyleR, fontWeight: 700, textAlign: 'left' }}>{POSTE_LABELS[poste] || 'Poste ' + poste}</td>
                    <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700 }}>{fmt(p.total)}</td>
                    <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700 }}>{grandTotal ? (p.total / grandTotal * 100).toFixed(1) + '%' : '-'}</td>
                  </tr>
                  {p.comptes.map((c: PosteCompte, ci: number) => (
                    <tr key={ci}>
                      <td style={{ ...tdStyleR, paddingLeft: 24 }}>{c.compte}</td>
                      <td style={{ ...tdStyleR, textAlign: 'left' }}>{c.libelle}</td>
                      <td style={{ ...tdStyleR, textAlign: 'right' }}>{fmt(c.montant)}</td>
                      <td style={{ ...tdStyleR, textAlign: 'right', color: '#888' }}>{grandTotal ? (c.montant / grandTotal * 100).toFixed(1) + '%' : '-'}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              <tr style={{ background: '#1A3A5C' }}>
                <td colSpan={2} style={{ ...tdStyleR, fontWeight: 700, color: '#fff' }}>TOTAL CHARGES</td>
                <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(grandTotal)}</td>
                <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, color: '#fff' }}>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {/* Modale aperçu PDF */}
      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Aperçu — Répartition des charges {exerciceAnnee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF}>
                  <LuPrinter /> Imprimer
                </button>
                <button className="pdf-action-btn primary" onClick={downloadPDF}>
                  <LuDownload /> Télécharger
                </button>
                <button className="pdf-close-btn" onClick={closePreview}>
                  <LuX />
                </button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe
                src={previewUrl}
                title="Aperçu Répartition des charges"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </ReportWrapper>
  );
}

export default RepartitionCharges;
