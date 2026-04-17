import { clientFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { LuEye, LuPrinter, LuDownload, LuX, LuChartBarIncreasing, LuTable } from 'react-icons/lu';
import { SubReportProps, MOIS_LABELS, MOIS_FULL, tableStyle, thStyleR, tdStyleR, fmt } from './types';
import { ReportWrapper, KpiCard, Loading, Empty } from './SharedComponents';
import { drawPdfHeader, drawPdfFooter, fmtPdf } from './pdfUtils';

interface TresorerieRow { numero_compte: string; mois: number; total_debit: string; total_credit: string; }
interface BalanceRow { numero_compte: string; solde_debiteur: string; solde_crediteur: string; }
interface TresorerieGridCell { debit: number; credit: number; }
interface MensuelRow { mois: number; encaissements: number; decaissements: number; net: number; }
interface CompteAnnuel { compte: string; debit: number; credit: number; solde: number; }

function SuiviTresorerie({ entiteId, exerciceId, exerciceAnnee, offre, entiteName, entiteSigle, entiteAdresse, entiteNif, onBack }: SubReportProps): React.ReactElement {
  const [data, setData] = useState<TresorerieRow[]>([]);
  const [balanceData, setBalanceData] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [vue, setVue] = useState<'graphique' | 'tableau'>('graphique');
  const isMensuel = offre === 'comptabilite';

  useEffect(() => {
    (async (): Promise<void> => {
      setLoading(true);
      if (isMensuel) {
        try {
          const res: Response = await clientFetch(`/api/ecritures/rapports/tresorerie/${entiteId}/${exerciceId}`);
          if (res.ok) setData(await res.json());
        } catch (_e) { /* network error */ }
      } else {
        try {
          const res = await clientFetch(`/api/balance/${entiteId}/${exerciceId}/N`);
          if (res.ok) {
            const result: BalanceRow[] | { lignes?: BalanceRow[] } = await res.json();
            const rows = Array.isArray(result) ? result : (result.lignes || []);
            setBalanceData(rows.filter(r => (r.numero_compte || '').trim().startsWith('5')));
          }
        } catch (_e) { /* network error */ }
      }
      setLoading(false);
    })();
  }, [entiteId, exerciceId, isMensuel, offre]);

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
    a.download = `suivi_tresorerie_${exerciceAnnee}.pdf`;
    a.click();
  };

  if (loading) return <ReportWrapper title="Suivi de trésorerie" onBack={onBack}><Loading /></ReportWrapper>;

  // === VUE MENSUELLE (écritures) ===
  if (isMensuel) {
    const comptes: string[] = [...new Set(data.map((d: TresorerieRow) => d.numero_compte))].sort();
    const grid: Record<string, Record<number, TresorerieGridCell>> = {};
    comptes.forEach((c: string) => { grid[c] = {}; });
    data.forEach((d: TresorerieRow) => {
      grid[d.numero_compte][d.mois] = { debit: parseFloat(d.total_debit), credit: parseFloat(d.total_credit) };
    });

    const mensuel: MensuelRow[] = Array.from({ length: 12 }, (_: undefined, i: number) => {
      const mois: number = i + 1;
      let enc = 0, dec = 0;
      comptes.forEach((c: string) => { const cell: TresorerieGridCell = grid[c][mois] || { debit: 0, credit: 0 }; enc += cell.debit; dec += cell.credit; });
      return { mois, encaissements: enc, decaissements: dec, net: enc - dec };
    });

    let solde = 0;
    const barMax: number = Math.max(...mensuel.map((m: MensuelRow) => Math.max(m.encaissements, m.decaissements)), 1);

    const generatePDFMensuel = () => {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const w = pdf.internal.pageSize.getWidth();
      let y = drawPdfHeader(pdf, { entiteName, entiteSigle, entiteAdresse, entiteNif }, 'SUIVI DE TRÉSORERIE', `Comptes classe 5 — Exercice ${exerciceAnnee}`);

      // En-tête tableau
      const colX = [15, 50, 90, 130, 165];
      pdf.setFillColor(26, 58, 92);
      pdf.rect(15, y, w - 30, 7, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Mois', colX[0] + 2, y + 5);
      pdf.text('Encaissements', colX[1] + 2, y + 5);
      pdf.text('Décaissements', colX[2] + 2, y + 5);
      pdf.text('Solde mensuel', colX[3] + 2, y + 5);
      pdf.text('Solde cumulé', colX[4] + 2, y + 5);
      y += 9;

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(8);
      let soldePdf = 0;
      mensuel.forEach((m, i) => {
        if (y > 275) { pdf.addPage(); y = 15; }
        soldePdf += m.net;
        const bg = m.net < 0;
        if (bg) { pdf.setFillColor(254, 242, 242); pdf.rect(15, y - 3.5, w - 30, 5.5, 'F'); }
        pdf.setFont('helvetica', 'bold');
        pdf.text(MOIS_FULL[i], colX[0] + 2, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(fmtPdf(m.encaissements), colX[2] - 2, y, { align: 'right' });
        pdf.text(fmtPdf(m.decaissements), colX[3] - 2, y, { align: 'right' });
        pdf.setFont('helvetica', 'bold');
        pdf.text(fmtPdf(m.net), colX[4] - 2, y, { align: 'right' });
        pdf.text(fmtPdf(soldePdf), w - 17, y, { align: 'right' });
        pdf.setFont('helvetica', 'normal');
        y += 5.5;
      });

      drawPdfFooter(pdf);
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfBlob(blob);
      setPreviewUrl(url);
    };

    return (
      <ReportWrapper title="Suivi de trésorerie" subtitle={`Comptes classe 5 — ${exerciceAnnee}`} onBack={onBack}>
        {/* Barre d'actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setVue('graphique')} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
              border: vue === 'graphique' ? '2px solid #1A3A5C' : '1px solid #d1d5db',
              background: vue === 'graphique' ? '#eef2f7' : '#fff', color: vue === 'graphique' ? '#1A3A5C' : '#666',
              fontWeight: vue === 'graphique' ? 600 : 400,
            }}><LuChartBarIncreasing size={15} /> Graphique</button>
            <button onClick={() => setVue('tableau')} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
              border: vue === 'tableau' ? '2px solid #1A3A5C' : '1px solid #d1d5db',
              background: vue === 'tableau' ? '#eef2f7' : '#fff', color: vue === 'tableau' ? '#1A3A5C' : '#666',
              fontWeight: vue === 'tableau' ? 600 : 400,
            }}><LuTable size={15} /> Tableau</button>
          </div>
          <button onClick={generatePDFMensuel} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
            border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 500,
          }}><LuEye size={15} /> Aperçu / Imprimer</button>
        </div>

        {/* KPI */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <KpiCard label="Total encaissements" value={fmt(mensuel.reduce((s, m) => s + m.encaissements, 0))} color="#D4A843" />
          <KpiCard label="Total décaissements" value={fmt(mensuel.reduce((s, m) => s + m.decaissements, 0))} color="#dc2626" />
          <KpiCard label="Solde net" value={fmt(mensuel.reduce((s, m) => s + m.net, 0))} color={mensuel.reduce((s, m) => s + m.net, 0) >= 0 ? '#059669' : '#dc2626'} />
        </div>

        {/* Graphique */}
        {vue === 'graphique' && (
          <>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 180, marginBottom: 24, padding: '0 10px' }}>
              {mensuel.map((m: MensuelRow, i: number) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 150 }}>
                    <div style={{ width: 14, background: '#D4A843', borderRadius: '3px 3px 0 0', height: `${(m.encaissements / barMax) * 150}px` }} title={`Encaissements: ${fmt(m.encaissements)}`}></div>
                    <div style={{ width: 14, background: '#dc2626', borderRadius: '3px 3px 0 0', height: `${(m.decaissements / barMax) * 150}px` }} title={`Décaissements: ${fmt(m.decaissements)}`}></div>
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>{MOIS_LABELS[i]}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, fontSize: 13 }}>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#D4A843', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span> Encaissements</span>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#dc2626', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span> Décaissements</span>
            </div>
          </>
        )}

        {/* Tableau */}
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyleR}>Mois</th>
              <th style={{ ...thStyleR, textAlign: 'right' }}>Encaissements</th>
              <th style={{ ...thStyleR, textAlign: 'right' }}>Décaissements</th>
              <th style={{ ...thStyleR, textAlign: 'right' }}>Solde mensuel</th>
              <th style={{ ...thStyleR, textAlign: 'right' }}>Solde cumulé</th>
            </tr>
          </thead>
          <tbody>
            {mensuel.map((m: MensuelRow, i: number) => {
              solde += m.net;
              return (
                <tr key={i} style={{ background: m.net < 0 ? '#fef2f2' : 'transparent' }}>
                  <td style={{ ...tdStyleR, fontWeight: 600 }}>{MOIS_FULL[i]}</td>
                  <td style={{ ...tdStyleR, textAlign: 'right', color: '#D4A843' }}>{fmt(m.encaissements)}</td>
                  <td style={{ ...tdStyleR, textAlign: 'right', color: '#dc2626' }}>{fmt(m.decaissements)}</td>
                  <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 600, color: m.net >= 0 ? '#059669' : '#dc2626' }}>{fmt(m.net)}</td>
                  <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, color: solde >= 0 ? '#059669' : '#dc2626' }}>{fmt(solde)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Modale aperçu PDF */}
        {previewUrl && (
          <div className="pdf-preview-overlay" onClick={closePreview}>
            <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
              <div className="pdf-preview-header">
                <h3>Aperçu — Suivi de trésorerie {exerciceAnnee}</h3>
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
                  title="Aperçu Suivi de trésorerie"
                  className="pdf-preview-iframe"
                />
              </div>
            </div>
          </div>
        )}
      </ReportWrapper>
    );
  }

  // === VUE ANNUELLE (balance importée) ===
  const comptesAnnuels: CompteAnnuel[] = balanceData.map(r => ({
    compte: (r.numero_compte || '').trim(),
    debit: parseFloat(r.solde_debiteur) || 0,
    credit: parseFloat(r.solde_crediteur) || 0,
    solde: (parseFloat(r.solde_debiteur) || 0) - (parseFloat(r.solde_crediteur) || 0),
  })).sort((a, b) => a.compte.localeCompare(b.compte));

  const totalDebit = comptesAnnuels.reduce((s, c) => s + c.debit, 0);
  const totalCredit = comptesAnnuels.reduce((s, c) => s + c.credit, 0);
  const totalSolde = totalDebit - totalCredit;
  const barMax = Math.max(...comptesAnnuels.map(c => Math.max(c.debit, c.credit)), 1);

  const generatePDFAnnuel = () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = pdf.internal.pageSize.getWidth();
    let y = drawPdfHeader(pdf, { entiteName, entiteSigle, entiteAdresse, entiteNif }, 'SUIVI DE TRÉSORERIE', `Comptes classe 5 — Exercice ${exerciceAnnee} (annuel)`);

    // En-tête tableau
    pdf.setFillColor(26, 58, 92);
    pdf.rect(15, y, w - 30, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Compte', 17, y + 5);
    pdf.text('Débit', 100, y + 5, { align: 'right' });
    pdf.text('Crédit', 140, y + 5, { align: 'right' });
    pdf.text('Solde', w - 17, y + 5, { align: 'right' });
    y += 9;

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');

    comptesAnnuels.forEach(c => {
      if (y > 275) { pdf.addPage(); y = 15; }
      pdf.setFont('helvetica', 'bold');
      pdf.text(c.compte, 17, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(fmtPdf(c.debit), 100, y, { align: 'right' });
      pdf.text(fmtPdf(c.credit), 140, y, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(fmtPdf(c.solde), w - 17, y, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      y += 5.5;
    });

    // Ligne TOTAL
    if (y > 270) { pdf.addPage(); y = 15; }
    pdf.setFillColor(26, 58, 92);
    pdf.rect(15, y - 3, w - 30, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', 17, y + 1);
    pdf.text(fmtPdf(totalDebit), 100, y + 1, { align: 'right' });
    pdf.text(fmtPdf(totalCredit), 140, y + 1, { align: 'right' });
    pdf.text(fmtPdf(totalSolde), w - 17, y + 1, { align: 'right' });

    drawPdfFooter(pdf);
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    setPdfBlob(blob);
    setPreviewUrl(url);
  };

  return (
    <ReportWrapper title="Suivi de trésorerie" subtitle={`Comptes classe 5 — ${exerciceAnnee} (annuel)`} onBack={onBack}>
      {comptesAnnuels.length === 0 ? <Empty msg="Aucun compte de trésorerie dans la balance." /> : (
        <>
          {/* Barre d'actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setVue('graphique')} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                border: vue === 'graphique' ? '2px solid #1A3A5C' : '1px solid #d1d5db',
                background: vue === 'graphique' ? '#eef2f7' : '#fff', color: vue === 'graphique' ? '#1A3A5C' : '#666',
                fontWeight: vue === 'graphique' ? 600 : 400,
              }}><LuChartBarIncreasing size={15} /> Graphique</button>
              <button onClick={() => setVue('tableau')} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                border: vue === 'tableau' ? '2px solid #1A3A5C' : '1px solid #d1d5db',
                background: vue === 'tableau' ? '#eef2f7' : '#fff', color: vue === 'tableau' ? '#1A3A5C' : '#666',
                fontWeight: vue === 'tableau' ? 600 : 400,
              }}><LuTable size={15} /> Tableau</button>
            </div>
            <button onClick={generatePDFAnnuel} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
              border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 500,
            }}><LuEye size={15} /> Aperçu / Imprimer</button>
          </div>

          {/* KPI */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <KpiCard label="Total Débit" value={fmt(totalDebit)} color="#D4A843" />
            <KpiCard label="Total Crédit" value={fmt(totalCredit)} color="#dc2626" />
            <KpiCard label="Solde trésorerie" value={fmt(totalSolde)} color={totalSolde >= 0 ? '#059669' : '#dc2626'} />
          </div>

          {/* Graphique barres horizontales */}
          {vue === 'graphique' && (
            <>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Solde par compte de trésorerie</h3>
              <div style={{ marginBottom: 24 }}>
                {comptesAnnuels.map(c => (
                  <div key={c.compte} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 100, fontSize: 13, fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>{c.compte}</div>
                    <div style={{ flex: 1, display: 'flex', gap: 2, height: 24 }}>
                      <div style={{ width: `${(c.debit / barMax) * 100}%`, background: '#D4A843', borderRadius: '4px 0 0 4px', minWidth: c.debit > 0 ? 2 : 0 }} title={`Débit: ${fmt(c.debit)}`}></div>
                      <div style={{ width: `${(c.credit / barMax) * 100}%`, background: '#dc2626', borderRadius: '0 4px 4px 0', minWidth: c.credit > 0 ? 2 : 0 }} title={`Crédit: ${fmt(c.credit)}`}></div>
                    </div>
                    <div style={{ width: 110, fontSize: 13, fontWeight: 600, textAlign: 'right', color: c.solde >= 0 ? '#059669' : '#dc2626' }}>{fmt(c.solde)}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 24, fontSize: 13 }}>
                <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#D4A843', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span> Débit</span>
                <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#dc2626', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span> Crédit</span>
              </div>
            </>
          )}

          {/* Tableau détaillé */}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyleR}>Compte</th>
                <th style={{ ...thStyleR, textAlign: 'right' }}>Débit</th>
                <th style={{ ...thStyleR, textAlign: 'right' }}>Crédit</th>
                <th style={{ ...thStyleR, textAlign: 'right' }}>Solde</th>
              </tr>
            </thead>
            <tbody>
              {comptesAnnuels.map(c => (
                <tr key={c.compte}>
                  <td style={{ ...tdStyleR, fontWeight: 600 }}>{c.compte}</td>
                  <td style={{ ...tdStyleR, textAlign: 'right' }}>{fmt(c.debit)}</td>
                  <td style={{ ...tdStyleR, textAlign: 'right' }}>{fmt(c.credit)}</td>
                  <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 600, color: c.solde >= 0 ? '#059669' : '#dc2626' }}>{fmt(c.solde)}</td>
                </tr>
              ))}
              <tr style={{ background: '#1A3A5C' }}>
                <td style={{ ...tdStyleR, fontWeight: 700, color: '#fff' }}>TOTAL</td>
                <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(totalDebit)}</td>
                <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(totalCredit)}</td>
                <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(totalSolde)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
      {/* Modale aperçu PDF */}
      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Aperçu — Suivi de trésorerie {exerciceAnnee} (annuel)</h3>
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
                title="Aperçu Suivi de trésorerie"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </ReportWrapper>
  );
}

export default SuiviTresorerie;
