import React, { useState, useEffect } from 'react';
import { LuChartBarIncreasing, LuChartPie, LuPrinter, LuDownload, LuX, LuEye } from 'react-icons/lu';
import jsPDF from 'jspdf';
import { SubReportProps, POSTE_LABELS, tableStyle, thStyleR, tdStyleR, fmt } from './types';
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
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

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
          const res: Response = await fetch(`/api/ecritures/rapports/repartition-charges/${entiteId}/${exerciceId}`);
          if (res.ok) setData(await res.json());
        } catch (_e) { /* network error */ }
      } else {
        try {
          const res = await fetch(`/api/balance/${entiteId}/${exerciceId}/N`);
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
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = pdf.internal.pageSize.getWidth();
    let y = 15;

    // En-tête entité
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(entiteName || '', w / 2, y, { align: 'center' });
    y += 5;
    if (entiteSigle) { pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.text(entiteSigle, w / 2, y, { align: 'center' }); y += 4; }
    if (entiteAdresse) { pdf.setFontSize(9); pdf.text(entiteAdresse, w / 2, y, { align: 'center' }); y += 4; }
    if (entiteNif) { pdf.setFontSize(9); pdf.text(`NIF : ${entiteNif}`, w / 2, y, { align: 'center' }); y += 6; }

    // Titre
    pdf.setDrawColor(26, 58, 92);
    pdf.setLineWidth(0.5);
    pdf.line(15, y, w - 15, y);
    y += 7;
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RÉPARTITION DES CHARGES', w / 2, y, { align: 'center' });
    y += 5;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Classe 6 — Exercice ${exerciceAnnee}`, w / 2, y, { align: 'center' });
    y += 10;

    // Graphique cercle
    const pieR = 28;
    const pieCx = w / 2 - 40;
    const pieCy = y + pieR + 2;
    let cumAngle = -Math.PI / 2;
    const pieColors: [number, number, number][] = [
      [212, 168, 67], [26, 58, 92], [5, 150, 105], [220, 38, 38],
      [124, 58, 237], [217, 119, 6], [8, 145, 178], [190, 24, 93],
      [79, 70, 229], [101, 163, 13],
    ];

    posteList.forEach(([, p], i) => {
      const pct = grandTotal > 0 ? p.total / grandTotal : 0;
      if (pct <= 0) return;
      const angle = pct * 2 * Math.PI;
      const startAngle = cumAngle;
      cumAngle += angle;
      const endAngle = cumAngle;

      const steps = Math.max(Math.ceil(angle / 0.05), 2);
      const color = pieColors[i % pieColors.length];
      pdf.setFillColor(color[0], color[1], color[2]);

      // Dessiner le secteur comme un polygone rempli
      const points: number[][] = [[pieCx, pieCy]];
      for (let s = 0; s <= steps; s++) {
        const a = startAngle + (angle * s) / steps;
        points.push([pieCx + pieR * Math.cos(a), pieCy + pieR * Math.sin(a)]);
      }
      points.push([pieCx, pieCy]);

      // jsPDF triangle fan
      for (let s = 1; s < points.length - 1; s++) {
        pdf.triangle(
          points[0][0], points[0][1],
          points[s][0], points[s][1],
          points[s + 1][0], points[s + 1][1],
          'F'
        );
      }
    });

    // Légende à droite du cercle
    let ly = y + 4;
    const lx = w / 2 + 5;
    pdf.setFontSize(7);
    posteList.forEach(([poste, p], i) => {
      const pct = grandTotal > 0 ? p.total / grandTotal : 0;
      if (pct <= 0) return;
      const color = pieColors[i % pieColors.length];
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.rect(lx, ly - 2, 3, 3, 'F');
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${POSTE_LABELS[poste] || poste} — ${(pct * 100).toFixed(1)}%`, lx + 5, ly);
      ly += 5;
    });

    y = Math.max(pieCy + pieR + 8, ly + 4);

    // En-tête tableau
    const cols = [15, 30, 110, 155, 180];
    const colW = [15, 80, 45, 25, 15];
    pdf.setFillColor(26, 58, 92);
    pdf.rect(15, y, w - 30, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Compte', 17, y + 5);
    pdf.text('Libellé', 35, y + 5);
    pdf.text('Montant', w - 42, y + 5, { align: 'right' });
    pdf.text('%', w - 17, y + 5, { align: 'right' });
    y += 9;

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(8);

    posteList.forEach(([poste, p]) => {
      if (y > 270) { pdf.addPage(); y = 15; }
      // Ligne poste (fond gris)
      pdf.setFillColor(232, 237, 245);
      pdf.rect(15, y - 3, w - 30, 6, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.text(poste, 17, y);
      pdf.text(POSTE_LABELS[poste] || 'Poste ' + poste, 35, y);
      pdf.text(fmt(p.total), w - 42, y, { align: 'right' });
      pdf.text(grandTotal ? (p.total / grandTotal * 100).toFixed(1) + '%' : '-', w - 17, y, { align: 'right' });
      y += 6;

      pdf.setFont('helvetica', 'normal');
      p.comptes.forEach(c => {
        if (y > 275) { pdf.addPage(); y = 15; }
        pdf.text(c.compte, 22, y);
        pdf.text((c.libelle || c.compte).substring(0, 50), 35, y);
        pdf.text(fmt(c.montant), w - 42, y, { align: 'right' });
        pdf.text(grandTotal ? (c.montant / grandTotal * 100).toFixed(1) + '%' : '-', w - 17, y, { align: 'right' });
        y += 5;
      });
      y += 1;
    });

    // Total
    if (y > 270) { pdf.addPage(); y = 15; }
    pdf.setFillColor(26, 58, 92);
    pdf.rect(15, y - 3, w - 30, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL CHARGES', 17, y + 1);
    pdf.text(fmt(grandTotal), w - 42, y + 1, { align: 'right' });
    pdf.text('100%', w - 17, y + 1, { align: 'right' });

    // Pied de page
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Normx — Imprimé le ${new Date().toLocaleDateString('fr-FR')}`, w / 2, 290, { align: 'center' });

    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    setPdfBlob(blob);
    setPreviewUrl(url);
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
