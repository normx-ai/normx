import { clientFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { LuEye, LuPrinter, LuDownload, LuX } from 'react-icons/lu';
import { Exercice } from '../types';
import { SubReportProps, tableStyle, thStyleR, tdStyleR, fmt } from './types';
import { ReportWrapper, KpiCard, Loading, Empty } from './SharedComponents';
import { drawPdfHeader, drawPdfFooter, fmtPdf } from './pdfUtils';

interface SIGBalanceRow {
  numero_compte: string;
  solde_debiteur: string;
  solde_crediteur: string;
}

interface SIGLine {
  label: string;
  bold?: boolean;
  valN?: number;
  valN1?: number;
  prefix?: string;
}

function computeSIG(data: SIGBalanceRow[]) {
  const sumCredit = (prefixes: string[]): number => {
    let total = 0;
    for (const r of data) {
      const n = (r.numero_compte || '').trim();
      if (prefixes.some(p => n.startsWith(p))) {
        total += (parseFloat(r.solde_crediteur) || 0) - (parseFloat(r.solde_debiteur) || 0);
      }
    }
    return total;
  };
  const sumDebit = (prefixes: string[]): number => {
    let total = 0;
    for (const r of data) {
      const n = (r.numero_compte || '').trim();
      if (prefixes.some(p => n.startsWith(p))) {
        total += (parseFloat(r.solde_debiteur) || 0) - (parseFloat(r.solde_crediteur) || 0);
      }
    }
    return total;
  };

  const TA = sumCredit(['701']);
  const RA = sumDebit(['601']);
  const RB = sumDebit(['6031']);
  const XA = TA - RA - RB;

  const TB = sumCredit(['702', '703', '704']);
  const TC = sumCredit(['705', '706']);
  const TD = sumCredit(['707']);
  const TE = sumCredit(['73']);
  const TF = sumCredit(['72']);
  const TG = sumCredit(['71']);
  const TH = sumCredit(['75']);
  const TI = sumCredit(['781']);
  const RC = sumDebit(['602']);
  const RD = sumDebit(['6032']);
  const RE = sumDebit(['604', '605', '608']);
  const RF = sumDebit(['6033']);
  const RG = sumDebit(['61']);
  const RH = sumDebit(['62', '63']);
  const RI = sumDebit(['64']);
  const RJ = sumDebit(['65']);
  const XB = TA + TB + TC + TD;
  const XC = XA + TB + TC + TD + TE + TF + TG + TH + TI - RC - RD - RE - RF - RG - RH - RI - RJ;

  const RK = sumDebit(['66']);
  const XD = XC - RK;

  const TJ = sumCredit(['791', '798', '799']);
  const RL = sumDebit(['681', '691']);
  const XE = XD + TJ - RL;

  const TK = sumCredit(['77']);
  const TL = sumCredit(['797']);
  const TM = sumCredit(['787']);
  const RM = sumDebit(['67']);
  const RN = sumDebit(['697']);
  const XF = TK + TL + TM - RM - RN;

  const XG = XE + XF;

  const TN = sumCredit(['82']);
  const TO = sumCredit(['84', '86', '88']);
  const RO = sumDebit(['81']);
  const RP = sumDebit(['83', '85']);
  const XH = TN + TO - RO - RP;

  const RQ = sumDebit(['87']);
  const RS = sumDebit(['89']);
  const XI = XG + XH - RQ - RS;

  return { TA, RA, RB, XA, TB, TC, TD, TE, TF, TG, TH, TI, RC, RD, RE, RF, RG, RH, RI, RJ, XB, XC, RK, XD, TJ, RL, XE, TK, TL, TM, RM, RN, XF, XG, TN, TO, RO, RP, XH, RQ, RS, XI };
}

type SIGResult = ReturnType<typeof computeSIG>;

function buildLines(n: SIGResult, n1: SIGResult): SIGLine[] {
  const l = (label: string, keyN: keyof SIGResult, prefix?: string, bold?: boolean): SIGLine => ({
    label, valN: n[keyN], valN1: n1[keyN], prefix, bold,
  });
  return [
    l('Ventes de marchandises (701)', 'TA'),
    l('Achats de marchandises (601)', 'RA', '-'),
    l('Variation de stocks de marchandises (6031)', 'RB', '-/+'),
    l('MARGE COMMERCIALE', 'XA', undefined, true),
    { label: '' },
    l('Ventes de produits fabriqués (702-704)', 'TB', '+'),
    l('Travaux, services vendus (705-706)', 'TC', '+'),
    l('Produits accessoires (707)', 'TD', '+'),
    l('Chiffre d\'affaires', 'XB', undefined, true),
    { label: '' },
    l('Production stockée ou déstockage (73)', 'TE', '-/+'),
    l('Production immobilisée (72)', 'TF', '+'),
    l('Subventions d\'exploitation (71)', 'TG', '+'),
    l('Autres produits (75)', 'TH', '+'),
    l('Transferts de charges d\'exploitation (781)', 'TI', '+'),
    l('Achats de matières premières (602)', 'RC', '-'),
    l('Variation stocks matières premières (6032)', 'RD', '-/+'),
    l('Autres achats (604, 605, 608)', 'RE', '-'),
    l('Variation stocks autres approv. (6033)', 'RF', '-/+'),
    l('Transports (61)', 'RG', '-'),
    l('Services extérieurs (62, 63)', 'RH', '-'),
    l('Impôts et taxes (64)', 'RI', '-'),
    l('Autres charges (65)', 'RJ', '-'),
    l('VALEUR AJOUTEE', 'XC', undefined, true),
    { label: '' },
    l('Charges de personnel (66)', 'RK', '-'),
    l('EXCEDENT BRUT D\'EXPLOITATION (EBE)', 'XD', undefined, true),
    { label: '' },
    l('Reprises de provisions et dépréciations (791, 798, 799)', 'TJ', '+'),
    l('Dotations aux amortissements et provisions (681, 691)', 'RL', '-'),
    l('RESULTAT D\'EXPLOITATION', 'XE', undefined, true),
    { label: '' },
    l('Revenus financiers (77)', 'TK', '+'),
    l('Reprises de provisions financières (797)', 'TL', '+'),
    l('Transferts de charges financières (787)', 'TM', '+'),
    l('Frais financiers et charges assimilées (67)', 'RM', '-'),
    l('Dotations aux provisions financières (697)', 'RN', '-'),
    l('RESULTAT FINANCIER', 'XF', undefined, true),
    { label: '' },
    l('RESULTAT DES ACTIVITES ORDINAIRES (RAO)', 'XG', undefined, true),
    { label: '' },
    l('Produits des cessions d\'immobilisations (82)', 'TN', '+'),
    l('Autres produits HAO (84, 86, 88)', 'TO', '+'),
    l('Valeurs comptables des cessions (81)', 'RO', '-'),
    l('Autres charges HAO (83, 85)', 'RP', '-'),
    l('RESULTAT HAO', 'XH', undefined, true),
    { label: '' },
    l('Participation des travailleurs (87)', 'RQ', '-'),
    l('Impôts sur le résultat (89)', 'RS', '-'),
    l('RESULTAT NET', 'XI', undefined, true),
  ];
}

function SoldesIntermediaires({ entiteId, exerciceId, exerciceAnnee, exercices, offre, entiteName, entiteSigle, entiteAdresse, entiteNif, onBack }: SubReportProps): React.ReactElement {
  const [dataN, setDataN] = useState<SIGBalanceRow[]>([]);
  const [dataN1, setDataN1] = useState<SIGBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  // Trouver exercice N-1
  const exN1: Exercice | undefined = exercices.find((e: Exercice) => e.annee === exerciceAnnee - 1);

  useEffect(() => {
    setLoading(true);
    const baseUrl = offre === 'comptabilite' ? '/api/ecritures/balance' : '/api/balance';

    const urlN = offre === 'comptabilite'
      ? `${baseUrl}/${entiteId}/${exerciceId}`
      : `${baseUrl}/${entiteId}/${exerciceId}/N`;

    const fetchN = fetch(urlN).then(r => r.json()).then((result: SIGBalanceRow[] | { lignes?: SIGBalanceRow[] }) => {
      return Array.isArray(result) ? result : (result.lignes || []);
    }).catch(() => [] as SIGBalanceRow[]);

    let fetchN1: Promise<SIGBalanceRow[]>;
    if (offre === 'comptabilite') {
      // Écritures : chercher un exercice N-1 distinct
      if (exN1) {
        fetchN1 = fetch(`${baseUrl}/${entiteId}/${exN1.id}`).then(r => r.json()).then((result: SIGBalanceRow[] | { lignes?: SIGBalanceRow[] }) => {
          return Array.isArray(result) ? result : (result.lignes || []);
        }).catch(() => [] as SIGBalanceRow[]);
      } else {
        fetchN1 = Promise.resolve([]);
      }
    } else {
      // Balance importée : N-1 est dans le même exercice
      fetchN1 = clientFetch(`/api/balance/${entiteId}/${exerciceId}/N-1`).then(r => r.json()).then((result: SIGBalanceRow[] | { lignes?: SIGBalanceRow[] }) => {
        return Array.isArray(result) ? result : (result.lignes || []);
      }).catch(() => [] as SIGBalanceRow[]);
    }

    Promise.all([fetchN, fetchN1]).then(([rowsN, rowsN1]) => {
      setDataN(rowsN);
      setDataN1(rowsN1);
      setLoading(false);
    });
  }, [entiteId, exerciceId, offre, exN1]);

  const sigN = computeSIG(dataN);
  const sigN1 = computeSIG(dataN1);
  const lines = buildLines(sigN, sigN1);
  const hasN1 = dataN1.length > 0;
  const anneeN1 = exN1 ? exN1.annee : exerciceAnnee - 1;

  const generatePDF = () => {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();

    let y = drawPdfHeader(pdf, { entiteName, entiteSigle, entiteAdresse, entiteNif },
      'SOLDES INTERMÉDIAIRES DE GESTION (SIG)',
      `Exercice ${exerciceAnnee}${hasN1 ? ` vs ${anneeN1}` : ''}`);

    // Colonnes : prefix | libellé | N | N-1 | Écart | %
    const colX = {
      prefix: 15,
      label: 27,
      valN: hasN1 ? 175 : 240,
      valN1: 210,
      ecart: 245,
      pct: 275,
    };

    // En-tête tableau
    pdf.setFillColor(26, 58, 92);
    pdf.rect(15, y, w - 30, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('', colX.prefix + 1, y + 5);
    pdf.text('Libellé', colX.label, y + 5);
    pdf.text(`N (${exerciceAnnee})`, colX.valN - 2, y + 5, { align: 'right' });
    if (hasN1) {
      pdf.text(`N-1 (${anneeN1})`, colX.valN1 - 2, y + 5, { align: 'right' });
      pdf.text('Écart', colX.ecart - 2, y + 5, { align: 'right' });
      pdf.text('%', colX.pct - 2, y + 5, { align: 'right' });
    }
    y += 9;

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(8);

    lines.forEach(l => {
      if (y > h - 20) {
        drawPdfFooter(pdf);
        pdf.addPage();
        y = 15;
      }

      if (!l.label) {
        y += 2;
        return;
      }

      const vN = l.valN ?? 0;
      const vN1 = l.valN1 ?? 0;
      const ecart = vN - vN1;
      const pct = vN1 !== 0 ? (ecart / Math.abs(vN1)) * 100 : (vN !== 0 ? 100 : 0);
      const isBold = !!l.bold;

      if (isBold) {
        pdf.setFillColor(232, 237, 245);
        pdf.rect(15, y - 3.5, w - 30, 6, 'F');
      }

      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      pdf.setFontSize(isBold ? 9 : 8);
      pdf.setTextColor(0, 0, 0);

      pdf.text(l.prefix || '', colX.prefix + 5, y, { align: 'center' });
      pdf.text(l.label, colX.label, y);

      if (l.valN !== undefined) {
        pdf.text(fmtPdf(vN), colX.valN - 2, y, { align: 'right' });
      }
      if (hasN1 && l.valN1 !== undefined) {
        pdf.text(fmtPdf(vN1), colX.valN1 - 2, y, { align: 'right' });
      }
      if (hasN1 && l.valN !== undefined) {
        pdf.text((ecart > 0 ? '+' : '') + fmtPdf(ecart), colX.ecart - 2, y, { align: 'right' });
        if (vN !== 0 || vN1 !== 0) {
          pdf.text((pct > 0 ? '+' : '') + pct.toFixed(1) + '%', colX.pct - 2, y, { align: 'right' });
        }
      }

      y += isBold ? 6 : 5;
    });

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
    a.download = `sig_${exerciceAnnee}.pdf`;
    a.click();
  };

  if (loading) return <Loading />;

  return (
    <ReportWrapper title="Soldes Intermédiaires de Gestion (SIG)" subtitle={`Exercice ${exerciceAnnee}${hasN1 ? ` vs ${anneeN1}` : ''}`} onBack={onBack}>
      {dataN.length === 0 ? <Empty msg={offre === 'comptabilite' ? "Aucune écriture pour cet exercice." : "Aucune balance importée pour cet exercice."} /> : (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <KpiCard label="Valeur ajoutée" value={fmt(sigN.XC)} color="#1A3A5C" />
            <KpiCard label="EBE" value={fmt(sigN.XD)} color="#D4A843" />
            <KpiCard label="Résultat exploitation" value={fmt(sigN.XE)} color={sigN.XE >= 0 ? '#059669' : '#dc2626'} />
            <KpiCard label="Résultat net" value={fmt(sigN.XI)} color={sigN.XI >= 0 ? '#059669' : '#dc2626'} />
          </div>
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
                <th style={{ ...thStyleR, textAlign: 'left', width: '4%' }}></th>
                <th style={{ ...thStyleR, textAlign: 'left', width: hasN1 ? '40%' : '60%' }}>Libellé</th>
                <th style={{ ...thStyleR, textAlign: 'right' }}>N ({exerciceAnnee})</th>
                {hasN1 && <th style={{ ...thStyleR, textAlign: 'right' }}>N-1 ({anneeN1})</th>}
                {hasN1 && <th style={{ ...thStyleR, textAlign: 'right' }}>Écart</th>}
                {hasN1 && <th style={{ ...thStyleR, textAlign: 'right', width: '7%' }}>%</th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                if (!l.label) return <tr key={i}><td colSpan={hasN1 ? 6 : 3} style={{ height: 8 }}></td></tr>;
                const vN = l.valN ?? 0;
                const vN1 = l.valN1 ?? 0;
                const ecart = vN - vN1;
                const pct = vN1 !== 0 ? (ecart / Math.abs(vN1)) * 100 : (vN !== 0 ? 100 : 0);
                const isBold = l.bold;
                const fontW = isBold ? 700 : 400;
                const fontSize = isBold ? 14 : 13;
                const negColor = (v: number) => isBold && v < 0 ? '#dc2626' : undefined;
                return (
                  <tr key={i} style={isBold ? { background: '#f0f4f8' } : {}}>
                    <td style={{ ...tdStyleR, fontSize: 12, color: '#888', textAlign: 'center' }}>{l.prefix || ''}</td>
                    <td style={{ ...tdStyleR, fontWeight: fontW, fontSize }}>{l.label}</td>
                    <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: fontW, fontSize, color: negColor(vN), fontVariantNumeric: 'tabular-nums' }}>
                      {l.valN !== undefined ? fmt(vN) : ''}
                    </td>
                    {hasN1 && (
                      <td style={{ ...tdStyleR, textAlign: 'right', fontWeight: fontW, fontSize, color: negColor(vN1), fontVariantNumeric: 'tabular-nums' }}>
                        {l.valN1 !== undefined ? fmt(vN1) : ''}
                      </td>
                    )}
                    {hasN1 && (
                      <td style={{
                        ...tdStyleR, textAlign: 'right', fontWeight: fontW, fontSize,
                        color: ecart > 0 ? '#059669' : ecart < 0 ? '#dc2626' : '#888',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {l.valN !== undefined ? (ecart > 0 ? '+' : '') + fmt(ecart) : ''}
                      </td>
                    )}
                    {hasN1 && (
                      <td style={{
                        ...tdStyleR, textAlign: 'right', fontSize: 12,
                        color: pct > 0 ? '#059669' : pct < 0 ? '#dc2626' : '#888',
                      }}>
                        {l.valN !== undefined && (vN !== 0 || vN1 !== 0) ? (pct > 0 ? '+' : '') + pct.toFixed(1) + '%' : ''}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* Modale aperçu PDF */}
      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Aperçu — SIG {exerciceAnnee}</h3>
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
                title="Aperçu SIG"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </ReportWrapper>
  );
}

export default SoldesIntermediaires;
