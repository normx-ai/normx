import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { LuEye, LuPrinter, LuDownload, LuX } from 'react-icons/lu';
import { Exercice } from '../types';
import { SubReportProps, CLASSE_LABELS, POSTE_LABELS, tableStyle, thStyleR, tdStyleR, fmt } from './types';
import { ReportWrapper, Loading, Empty } from './SharedComponents';
import { drawPdfHeader, drawPdfFooter, fmtPdf } from './pdfUtils';

interface ComparatifRow { poste: string; debit: string; credit: string; }
interface ComparatifData { n: ComparatifRow[]; n1: ComparatifRow[]; }
interface BalanceRow { numero_compte: string; solde_debiteur: string; solde_crediteur: string; }
interface PosteSolde { debit: number; credit: number; }

function balanceToPostes(rows: BalanceRow[]): ComparatifRow[] {
  const map: Record<string, { debit: number; credit: number }> = {};
  for (const r of rows) {
    const poste = (r.numero_compte || '').trim().substring(0, 2);
    if (!poste) continue;
    if (!map[poste]) map[poste] = { debit: 0, credit: 0 };
    map[poste].debit += parseFloat(r.solde_debiteur) || 0;
    map[poste].credit += parseFloat(r.solde_crediteur) || 0;
  }
  return Object.entries(map).map(([poste, v]) => ({ poste, debit: String(v.debit), credit: String(v.credit) }));
}

async function fetchBalance(entiteId: number, exId: number): Promise<BalanceRow[]> {
  const res = await fetch(`/api/balance/${entiteId}/${exId}/N`);
  if (!res.ok) return [];
  const result: BalanceRow[] | { lignes?: BalanceRow[] } = await res.json();
  return Array.isArray(result) ? result : (result.lignes || []);
}

function ComparatifNN1({ entiteId, exerciceId, exerciceAnnee, exercices, offre, entiteName, entiteSigle, entiteAdresse, entiteNif, onBack }: SubReportProps): React.ReactElement {
  const [data, setData] = useState<ComparatifData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exN1, setExN1] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  useEffect(() => {
    const prev: Exercice | undefined = exercices.find((e: Exercice) => e.annee === (exerciceAnnee - 1));
    if (prev) setExN1(String(prev.id));
  }, [exercices, exerciceAnnee]);

  useEffect(() => {
    (async (): Promise<void> => {
      setLoading(true);
      if (offre === 'comptabilite') {
        try {
          const qs: string = exN1 ? `?exercice_id_n1=${exN1}` : '';
          const res: Response = await fetch(`/api/ecritures/rapports/comparatif/${entiteId}/${exerciceId}${qs}`);
          if (res.ok) setData(await res.json());
        } catch (_e) { /* network error */ }
      } else {
        try {
          // Balance importée : N et N-1 dans le même exercice
          const rowsN = await fetchBalance(entiteId, exerciceId);
          const n = balanceToPostes(rowsN);
          const resN1 = await fetch(`/api/balance/${entiteId}/${exerciceId}/N-1`);
          let n1: ComparatifRow[] = [];
          if (resN1.ok) {
            const resultN1: BalanceRow[] | { lignes?: BalanceRow[] } = await resN1.json();
            const rowsN1 = Array.isArray(resultN1) ? resultN1 : (resultN1.lignes || []);
            n1 = balanceToPostes(rowsN1);
          }
          setData({ n, n1 });
        } catch (_e) { /* network error */ }
      }
      setLoading(false);
    })();
  }, [entiteId, exerciceId, exN1, offre]);

  const generatePDF = () => {
    if (!data) return;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const w = pdf.internal.pageSize.getWidth();
    let y = drawPdfHeader(pdf, { entiteName: entiteName || '', entiteSigle: entiteSigle || '', entiteAdresse: entiteAdresse || '', entiteNif: entiteNif || '' }, 'COMPARATIF N / N-1', `${exerciceAnnee} vs ${exerciceAnnee - 1}`);

    const postes = [...new Set([...data.n.map(r => r.poste), ...data.n1.map(r => r.poste)])].sort();
    const mN: Record<string, PosteSolde> = {}; data.n.forEach(r => { mN[r.poste] = { debit: parseFloat(r.debit), credit: parseFloat(r.credit) }; });
    const mN1: Record<string, PosteSolde> = {}; data.n1.forEach(r => { mN1[r.poste] = { debit: parseFloat(r.debit), credit: parseFloat(r.credit) }; });

    // Colonnes : Poste | Libellé | Solde N | Solde N-1 | Variation | %
    const cols = [20, 60, 155, 195, 235, 265];
    const colR = [155, 195, 235, 265]; // right-aligned cols end X

    // En-tête tableau
    pdf.setFillColor(26, 58, 92);
    pdf.rect(15, y, w - 30, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Poste', cols[0], y + 5.5);
    pdf.text('Libellé', cols[1], y + 5.5);
    pdf.text(`Solde N (${exerciceAnnee})`, cols[2] - 2, y + 5.5, { align: 'right' });
    pdf.text(`Solde N-1 (${exerciceAnnee - 1})`, cols[3] - 2, y + 5.5, { align: 'right' });
    pdf.text('Variation', cols[4] - 2, y + 5.5, { align: 'right' });
    pdf.text('%', cols[5] - 2, y + 5.5, { align: 'right' });
    y += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    for (const poste of postes) {
      if (y > 185) {
        drawPdfFooter(pdf);
        pdf.addPage();
        y = 15;
      }
      const n = mN[poste] || { debit: 0, credit: 0 };
      const n1 = mN1[poste] || { debit: 0, credit: 0 };
      const soldeN = n.debit - n.credit;
      const soldeN1 = n1.debit - n1.credit;
      const variation = soldeN - soldeN1;
      const pct = soldeN1 !== 0 ? (variation / Math.abs(soldeN1)) * 100 : (soldeN !== 0 ? 100 : 0);
      const label = CLASSE_LABELS[poste] || POSTE_LABELS[poste] || 'Poste ' + poste;

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(poste, cols[0], y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(label.substring(0, 50), cols[1], y);
      pdf.text(fmtPdf(soldeN), cols[2] - 2, y, { align: 'right' });
      pdf.text(fmtPdf(soldeN1), cols[3] - 2, y, { align: 'right' });

      // Variation colorée
      if (variation >= 0) pdf.setTextColor(5, 150, 105);
      else pdf.setTextColor(220, 38, 38);
      pdf.setFont('helvetica', 'bold');
      pdf.text((variation > 0 ? '+' : '') + fmtPdf(variation), cols[4] - 2, y, { align: 'right' });

      // Pourcentage coloré
      if (pct >= 0) pdf.setTextColor(5, 150, 105);
      else pdf.setTextColor(220, 38, 38);
      pdf.setFont('helvetica', 'normal');
      pdf.text((pct > 0 ? '+' : '') + pct.toFixed(1) + '%', cols[5] - 2, y, { align: 'right' });

      pdf.setTextColor(0, 0, 0);
      y += 6;
    }

    drawPdfFooter(pdf);
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
    a.download = `comparatif_n_n1_${exerciceAnnee}.pdf`;
    a.click();
  };

  if (loading) return <ReportWrapper title="Comparatif N / N-1" onBack={onBack}><Loading /></ReportWrapper>;
  if (!data) return <ReportWrapper title="Comparatif N / N-1" onBack={onBack}><Empty /></ReportWrapper>;

  const allPostes: string[] = [...new Set([...data.n.map((r: ComparatifRow) => r.poste), ...data.n1.map((r: ComparatifRow) => r.poste)])].sort();
  const mapN: Record<string, PosteSolde> = {}; data.n.forEach((r: ComparatifRow) => { mapN[r.poste] = { debit: parseFloat(r.debit), credit: parseFloat(r.credit) }; });
  const mapN1: Record<string, PosteSolde> = {}; data.n1.forEach((r: ComparatifRow) => { mapN1[r.poste] = { debit: parseFloat(r.debit), credit: parseFloat(r.credit) }; });

  return (
    <ReportWrapper title="Comparatif N / N-1" subtitle={`${exerciceAnnee} vs ${exerciceAnnee - 1}`} onBack={onBack}>
      {offre === 'comptabilite' && (
        <div style={{ marginBottom: 16, fontSize: 14 }}>
          <label style={{ marginRight: 8, color: '#888' }}>Exercice N-1 :</label>
          <select value={exN1} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExN1(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}>
            <option value="">-- Aucun --</option>
            {exercices.filter((e: Exercice) => e.id !== exerciceId).map((e: Exercice) => (
              <option key={e.id} value={e.id}>{e.annee}</option>
            ))}
          </select>
        </div>
      )}
      {offre === 'etats' && (
        <div style={{ marginBottom: 16, fontSize: 13, color: '#888' }}>
          N-1 : balance importée
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
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
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyleR}>Poste</th>
            <th style={thStyleR}>Libellé</th>
            <th style={{ ...thStyleR, textAlign: 'right' }}>Solde N ({exerciceAnnee})</th>
            <th style={{ ...thStyleR, textAlign: 'right' }}>Solde N-1 ({exerciceAnnee - 1})</th>
            <th style={{ ...thStyleR, textAlign: 'right' }}>Variation</th>
            <th style={{ ...thStyleR, textAlign: 'right' }}>%</th>
          </tr>
        </thead>
        <tbody>
          {allPostes.map((poste: string) => {
            const n: PosteSolde = mapN[poste] || { debit: 0, credit: 0 };
            const n1: PosteSolde = mapN1[poste] || { debit: 0, credit: 0 };
            const soldeN: number = n.debit - n.credit;
            const soldeN1: number = n1.debit - n1.credit;
            const variation: number = soldeN - soldeN1;
            const pct: number = soldeN1 !== 0 ? (variation / Math.abs(soldeN1)) * 100 : (soldeN !== 0 ? 100 : 0);
            const label: string = CLASSE_LABELS[poste] || POSTE_LABELS[poste] || 'Poste ' + poste;
            return (
              <tr key={poste}>
                <td style={{ ...tdStyleR, fontWeight: 600, textAlign: 'center' }}>{poste}</td>
                <td style={tdStyleR}>{label}</td>
                <td style={{ ...tdStyleR, textAlign: 'right' }}>{fmt(soldeN)}</td>
                <td style={{ ...tdStyleR, textAlign: 'right' }}>{fmt(soldeN1)}</td>
                <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 600, color: variation >= 0 ? '#059669' : '#dc2626' }}>{variation > 0 ? '+' : ''}{fmt(variation)}</td>
                <td style={{ ...tdStyleR, textAlign: 'right', color: pct >= 0 ? '#059669' : '#dc2626' }}>{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</td>
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
              <h3>Aperçu — Comparatif N/N-1 {exerciceAnnee}</h3>
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
                title="Aperçu Comparatif N/N-1"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </ReportWrapper>
  );
}

export default ComparatifNN1;
