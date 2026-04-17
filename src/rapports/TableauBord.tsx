import { clientFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { LuEye, LuPrinter, LuDownload, LuX } from 'react-icons/lu';
import { SubReportProps, MOIS_LABELS, CLASSE_LABELS, tableStyle, thStyleR, tdStyleR, fmt } from './types';
import { ReportWrapper, KpiCard, Loading, Empty } from './SharedComponents';
import { drawPdfHeader, drawPdfFooter, fmtPdf } from './pdfUtils';

interface BalanceRow { numero_compte: string; solde_debiteur: string; solde_crediteur: string; }
interface TableauBordClasseRow { classe: string; debit: string; credit: string; }
interface TableauBordMensuelRow { mois: number; produits: string; charges: string; }
interface TableauBordApiData { classes: TableauBordClasseRow[]; mensuel: TableauBordMensuelRow[]; tresorerie: { debit: string; credit: string } | null; }
interface ClasseValues { debit: number; credit: number; }

function buildClassesFromBalance(rows: BalanceRow[]): TableauBordClasseRow[] {
  const classMap: Record<string, { debit: number; credit: number }> = {};
  for (const r of rows) {
    const classe = (r.numero_compte || '').trim().charAt(0);
    if (!classe || classe < '1' || classe > '8') continue;
    if (!classMap[classe]) classMap[classe] = { debit: 0, credit: 0 };
    classMap[classe].debit += parseFloat(r.solde_debiteur) || 0;
    classMap[classe].credit += parseFloat(r.solde_crediteur) || 0;
  }
  return Object.entries(classMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([classe, v]) => ({ classe, debit: String(v.debit), credit: String(v.credit) }));
}

function TableauBord({ entiteId, exerciceId, exerciceAnnee, offre, onBack, entiteName, entiteSigle, entiteAdresse, entiteNif }: SubReportProps): React.ReactElement {
  const [classes, setClasses] = useState<TableauBordClasseRow[]>([]);
  const [mensuel, setMensuel] = useState<TableauBordMensuelRow[]>([]);
  const [tresorerie, setTresorerie] = useState<{ debit: string; credit: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasData, setHasData] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  useEffect(() => {
    (async (): Promise<void> => {
      setLoading(true);
      if (offre === 'comptabilite') {
        try {
          const res: Response = await clientFetch(`/api/ecritures/rapports/tableau-bord/${entiteId}/${exerciceId}`);
          if (res.ok) {
            const data: TableauBordApiData = await res.json();
            setClasses(data.classes || []);
            setMensuel(data.mensuel || []);
            setTresorerie(data.tresorerie || null);
            setHasData((data.classes || []).length > 0);
          }
        } catch (_e) { /* network error */ }
      } else {
        try {
          const res = await clientFetch(`/api/balance/${entiteId}/${exerciceId}/N`);
          if (res.ok) {
            const result: BalanceRow[] | { lignes?: BalanceRow[] } = await res.json();
            const rows = Array.isArray(result) ? result : (result.lignes || []);
            const builtClasses = buildClassesFromBalance(rows);
            setClasses(builtClasses);
            setMensuel([]);
            setTresorerie(null);
            setHasData(builtClasses.length > 0);
          }
        } catch (_e) { /* network error */ }
      }
      setLoading(false);
    })();
  }, [entiteId, exerciceId, offre]);

  if (loading) return <ReportWrapper title="Tableau de bord" onBack={onBack}><Loading /></ReportWrapper>;
  if (!hasData) return <ReportWrapper title="Tableau de bord" onBack={onBack}><Empty /></ReportWrapper>;

  const classMap: Record<string, ClasseValues> = {};
  classes.forEach((c: TableauBordClasseRow) => { classMap[c.classe] = { debit: parseFloat(c.debit), credit: parseFloat(c.credit) }; });
  const getC = (c: string): ClasseValues => classMap[c] || { debit: 0, credit: 0 };

  const totalProduits: number = getC('7').credit - getC('7').debit;
  const totalCharges: number = getC('6').debit - getC('6').credit;
  const resultat: number = totalProduits - totalCharges;
  const tresoDebit: number = parseFloat(tresorerie?.debit || '0');
  const tresoCredit: number = parseFloat(tresorerie?.credit || '0');
  const tresoSoldeApi: number = tresoDebit - tresoCredit;
  const tresoSoldeBalance: number = getC('5').debit - getC('5').credit;
  const tresoSolde: number = tresorerie ? tresoSoldeApi : tresoSoldeBalance;

  const generatePDF = (): void => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = pdf.internal.pageSize.getWidth();
    let y = drawPdfHeader(pdf, { entiteName, entiteSigle, entiteAdresse, entiteNif }, 'TABLEAU DE BORD FINANCIER', `Exercice ${exerciceAnnee}`);

    // KPI
    y += 4;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Indicateurs clés', 15, y); y += 6;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const kpis = [
      { label: 'Total Produits', value: fmtPdf(totalProduits) },
      { label: 'Total Charges', value: fmtPdf(totalCharges) },
      { label: 'Résultat net', value: fmtPdf(resultat) },
      { label: 'Trésorerie', value: fmtPdf(tresoSolde) },
    ];
    for (const kpi of kpis) {
      pdf.text(`${kpi.label} : ${kpi.value} FCFA`, 20, y);
      y += 5;
    }
    y += 6;

    // Tableau des classes
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Solde par classe de comptes', 15, y); y += 6;

    // Header
    const colX = [15, 25, 95, 135, 170];
    const colW = [10, 70, 35, 35, 25];
    pdf.setFillColor(26, 58, 92);
    pdf.rect(15, y - 4, w - 30, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Cl.', colX[0] + 1, y);
    pdf.text('Libellé', colX[1] + 1, y);
    pdf.text('Débit', colX[2] + colW[2] - 1, y, { align: 'right' });
    pdf.text('Crédit', colX[3] + colW[3] - 1, y, { align: 'right' });
    pdf.text('Solde', colX[4] + colW[4] - 1, y, { align: 'right' });
    y += 5;
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');

    for (const c of classes) {
      if (y > 270) { drawPdfFooter(pdf); pdf.addPage(); y = 15; }
      const d = parseFloat(c.debit);
      const cr = parseFloat(c.credit);
      const s = d - cr;
      pdf.setFontSize(9);
      pdf.text(c.classe, colX[0] + 3, y, { align: 'center' });
      pdf.text(CLASSE_LABELS[c.classe] || 'Classe ' + c.classe, colX[1] + 1, y);
      pdf.text(fmtPdf(d), colX[2] + colW[2] - 1, y, { align: 'right' });
      pdf.text(fmtPdf(cr), colX[3] + colW[3] - 1, y, { align: 'right' });
      pdf.text(fmtPdf(s), colX[4] + colW[4] - 1, y, { align: 'right' });
      y += 5;
    }

    // Ligne résultat
    pdf.setFillColor(26, 58, 92);
    pdf.rect(15, y - 4, w - 30, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RÉSULTAT', colX[1] + 1, y);
    pdf.text(fmtPdf(resultat), colX[4] + colW[4] - 1, y, { align: 'right' });
    pdf.setTextColor(0, 0, 0);

    drawPdfFooter(pdf);

    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setPdfBlob(blob);
  };

  const closePreview = (): void => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPdfBlob(null);
  };

  const printPDF = (): void => {
    if (!previewUrl) return;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = previewUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => { iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1000); };
  };

  const downloadPDF = (): void => {
    if (!pdfBlob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfBlob);
    link.download = `tableau_bord_${exerciceAnnee}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const hasMensuel = mensuel.length > 0;
  const barMaxMensuel: number = hasMensuel ? Math.max(...mensuel.map((m: TableauBordMensuelRow) => Math.max(parseFloat(m.produits), parseFloat(m.charges))), 1) : 1;

  // Graphique annuel par classe (pour balance importée ou complément)
  const classesList = classes.filter(c => ['6', '7', '8'].includes(c.classe));
  const barMaxClasse: number = Math.max(...classes.map(c => Math.max(parseFloat(c.debit), parseFloat(c.credit))), 1);

  return (
    <ReportWrapper title="Tableau de bord financier" subtitle={`Exercice ${exerciceAnnee}`} onBack={onBack}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <KpiCard label="Total Produits" value={fmt(totalProduits)} color="#059669" />
        <KpiCard label="Total Charges" value={fmt(totalCharges)} color="#dc2626" />
        <KpiCard label="Résultat net" value={fmt(resultat)} color={resultat >= 0 ? '#059669' : '#dc2626'} />
        <KpiCard label="Trésorerie" value={fmt(tresoSolde)} color={tresoSolde >= 0 ? '#D4A843' : '#dc2626'} />
      </div>

      {/* Bouton Aperçu / Imprimer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
        <button
          onClick={generatePDF}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 22px', background: '#1A3A5C', color: '#fff',
            border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}
        >
          <LuEye size={18} /> Aperçu / Imprimer
        </button>
      </div>

      {/* Graphique mensuel (seulement si écritures) */}
      {hasMensuel && (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Évolution mensuelle Produits / Charges</h3>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 200, marginBottom: 12, padding: '0 10px' }}>
            {Array.from({ length: 12 }, (_: undefined, i: number) => {
              const m: TableauBordMensuelRow | undefined = mensuel.find((x: TableauBordMensuelRow) => x.mois === i + 1);
              const produits: number = m ? parseFloat(m.produits) : 0;
              const charges: number = m ? parseFloat(m.charges) : 0;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 170 }}>
                    <div style={{ width: 14, background: '#059669', borderRadius: '3px 3px 0 0', height: `${(produits / barMaxMensuel) * 170}px` }}></div>
                    <div style={{ width: 14, background: '#dc2626', borderRadius: '3px 3px 0 0', height: `${(charges / barMaxMensuel) * 170}px` }}></div>
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>{MOIS_LABELS[i]}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 28, fontSize: 13 }}>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#059669', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span> Produits</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#dc2626', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span> Charges</span>
          </div>
        </>
      )}

      {/* Graphique annuel par classe (toujours affiché) */}
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Répartition annuelle par classe</h3>
      <div style={{ marginBottom: 24 }}>
        {classes.map((c: TableauBordClasseRow) => {
          const d = parseFloat(c.debit);
          const cr = parseFloat(c.credit);
          const solde = d - cr;
          return (
            <div key={c.classe} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 200, fontSize: 13, fontWeight: 500, textAlign: 'right', flexShrink: 0 }}>
                {c.classe} — {CLASSE_LABELS[c.classe] || 'Classe ' + c.classe}
              </div>
              <div style={{ flex: 1, display: 'flex', gap: 2, height: 24 }}>
                <div style={{
                  width: `${(d / barMaxClasse) * 100}%`,
                  background: '#3b82f6', borderRadius: '4px 0 0 4px', minWidth: d > 0 ? 2 : 0,
                }} title={`Débit: ${fmt(d)}`}></div>
                <div style={{
                  width: `${(cr / barMaxClasse) * 100}%`,
                  background: '#f97316', borderRadius: '0 4px 4px 0', minWidth: cr > 0 ? 2 : 0,
                }} title={`Crédit: ${fmt(cr)}`}></div>
              </div>
              <div style={{ width: 110, fontSize: 13, fontWeight: 600, textAlign: 'right', color: solde >= 0 ? '#059669' : '#dc2626' }}>
                {fmt(solde)}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, fontSize: 13 }}>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#3b82f6', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span> Débit</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#f97316', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span> Crédit</span>
      </div>

      {/* Tableau détaillé par classe */}
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Solde par classe de comptes</h3>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyleR}>Classe</th>
            <th style={thStyleR}>Libellé</th>
            <th style={{ ...thStyleR, textAlign: 'right' }}>Total Débit</th>
            <th style={{ ...thStyleR, textAlign: 'right' }}>Total Crédit</th>
            <th style={{ ...thStyleR, textAlign: 'right' }}>Solde</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((c: TableauBordClasseRow) => {
            const classSolde: number = parseFloat(c.debit) - parseFloat(c.credit);
            return (
              <tr key={c.classe}>
                <td style={{ ...tdStyleR, fontWeight: 700, textAlign: 'center' }}>{c.classe}</td>
                <td style={tdStyleR}>{CLASSE_LABELS[c.classe] || 'Classe ' + c.classe}</td>
                <td style={{ ...tdStyleR, textAlign: 'right' }}>{fmt(parseFloat(c.debit))}</td>
                <td style={{ ...tdStyleR, textAlign: 'right' }}>{fmt(parseFloat(c.credit))}</td>
                <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 600, color: classSolde >= 0 ? '#059669' : '#dc2626' }}>{fmt(classSolde)}</td>
              </tr>
            );
          })}
          <tr style={{ background: '#1A3A5C' }}>
            <td colSpan={2} style={{ ...tdStyleR, fontWeight: 700, color: '#fff' }}>RÉSULTAT</td>
            <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, color: '#fff' }}></td>
            <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, color: '#fff' }}></td>
            <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(resultat)}</td>
          </tr>
        </tbody>
      </table>

      {/* Modale aperçu PDF */}
      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <span style={{ fontWeight: 700, fontSize: 16 }}>Aperçu — Tableau de bord financier</span>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button className="pdf-action-btn" onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button className="pdf-close-btn" onClick={closePreview} title="Fermer"><LuX size={20} /></button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe className="pdf-preview-iframe" src={previewUrl} title="Aperçu PDF" />
            </div>
          </div>
        </div>
      )}
    </ReportWrapper>
  );
}

export default TableauBord;
