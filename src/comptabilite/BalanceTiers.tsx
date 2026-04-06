import React, { useState, useEffect, useCallback } from 'react';
import { LuDownload, LuSheet, LuFileText, LuSearch, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { fmt, MOIS } from '../utils/formatters';
import './Comptabilite.css';

interface BalanceTiersProps {
  entiteId: number;
  exerciceId: number;
  exerciceAnnee: number;
  entiteName?: string;
  entiteSigle?: string;
  entiteAdresse?: string;
  entiteNif?: string;
  onBack: () => void;
}

interface TypeTiersOption {
  value: string;
  label: string;
}

interface BalanceTiersRow {
  tiers_id: number;
  tiers_nom: string;
  code_tiers: string;
  tiers_type: string;
  compte_comptable: string;
  debit: number | string;
  credit: number | string;
  solde_debiteur: number | string;
  solde_crediteur: number | string;
}

const TYPES_TIERS: TypeTiersOption[] = [
  { value: '', label: 'Tous' },
  { value: 'membre', label: 'Membres' },
  { value: 'fournisseur', label: 'Fournisseurs' },
  { value: 'bailleur', label: 'Bailleurs' },
  { value: 'personnel', label: 'Personnel' },
];


function BalanceTiers({ entiteId, exerciceId, exerciceAnnee, entiteName, entiteSigle, entiteAdresse, entiteNif, onBack }: BalanceTiersProps): React.JSX.Element {
  const [data, setData] = useState<BalanceTiersRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterMois, setFilterMois] = useState<string>('');
  const [filterDateDu, setFilterDateDu] = useState<string>('');
  const [filterDateAu, setFilterDateAu] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (filterMois) {
      const moisIdx = MOIS.indexOf(filterMois);
      if (moisIdx >= 0) {
        const year = exerciceAnnee || new Date().getFullYear();
        const m = String(moisIdx + 1).padStart(2, '0');
        setFilterDateDu(year + '-' + m + '-01');
        const lastDay = new Date(year, moisIdx + 1, 0).getDate();
        setFilterDateAu(year + '-' + m + '-' + lastDay);
      }
    } else {
      setFilterDateDu('');
      setFilterDateAu('');
    }
  }, [filterMois, exerciceAnnee]);

  const loadData = useCallback(async (): Promise<void> => {
    if (!entiteId || !exerciceId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type_tiers', filterType);
      if (filterDateDu) params.set('date_du', filterDateDu);
      if (filterDateAu) params.set('date_au', filterDateAu);
      const qs = params.toString() ? '?' + params.toString() : '';
      const res = await fetch('/api/ecritures/balance-tiers/' + entiteId + '/' + exerciceId + qs);
      if (res.ok) setData(await res.json());
    } catch (_err) {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [entiteId, exerciceId, filterType, filterDateDu, filterDateAu]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const fmtPdf = (n: number): string => {
    if (!n) return '';
    return Math.round(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const filtered = data.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return r.tiers_nom.toLowerCase().includes(term) || (r.code_tiers || '').toLowerCase().includes(term);
  });

  const totalDebit = filtered.reduce((s, r) => s + (parseFloat(String(r.debit)) || 0), 0);
  const totalCredit = filtered.reduce((s, r) => s + (parseFloat(String(r.credit)) || 0), 0);
  const totalSD = filtered.reduce((s, r) => s + (parseFloat(String(r.solde_debiteur)) || 0), 0);
  const totalSC = filtered.reduce((s, r) => s + (parseFloat(String(r.solde_crediteur)) || 0), 0);

  const exportCSV = (): void => {
    let csv = 'Code;Tiers;Type;Compte;Débit;Crédit;Solde Débiteur;Solde Créditeur\n';
    for (const r of filtered) {
      csv += [r.code_tiers || '', '"' + r.tiers_nom + '"', r.tiers_type, r.compte_comptable || '', parseFloat(String(r.debit)) || 0, parseFloat(String(r.credit)) || 0, parseFloat(String(r.solde_debiteur)) || 0, parseFloat(String(r.solde_crediteur)) || 0].join(';') + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'balance_tiers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = (): void => {
    const rows = filtered.map(r => ({
      'Code': r.code_tiers || '',
      'Tiers': r.tiers_nom,
      'Type': r.tiers_type,
      'Compte': r.compte_comptable || '',
      'Débit': parseFloat(String(r.debit)) || 0,
      'Crédit': parseFloat(String(r.credit)) || 0,
      'Solde Débiteur': parseFloat(String(r.solde_debiteur)) || 0,
      'Solde Créditeur': parseFloat(String(r.solde_crediteur)) || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 14 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Balance Tiers');
    XLSX.writeFile(wb, 'balance_tiers.xlsx');
  };

  const buildPDF = (): jsPDF => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    let y = 10;

    doc.setFontSize(12);
    doc.setFont(undefined as never, 'bold');
    doc.text('BALANCE DES TIERS', pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.setFont(undefined as never, 'normal');
    doc.text('Dénomination : ' + (entiteName || ''), 14, y);
    doc.text('Exercice : ' + (exerciceAnnee || ''), pageW - 14, y, { align: 'right' });
    y += 5;
    doc.text('NUI : ' + (entiteNif || ''), 14, y);
    y += 6;

    const body: (string | number)[][] = filtered.map(r => [
      r.code_tiers || '',
      r.tiers_nom,
      r.tiers_type,
      r.compte_comptable || '',
      fmtPdf(parseFloat(String(r.debit))),
      fmtPdf(parseFloat(String(r.credit))),
      fmtPdf(parseFloat(String(r.solde_debiteur))),
      fmtPdf(parseFloat(String(r.solde_crediteur))),
    ]);
    body.push(['', 'TOTAUX', '', '', fmtPdf(totalDebit), fmtPdf(totalCredit), fmtPdf(totalSD), fmtPdf(totalSC)]);

    autoTable(doc, {
      startY: y,
      head: [['Code', 'Tiers', 'Type', 'Compte', 'Débit', 'Crédit', 'Solde D', 'Solde C']],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [8, 8, 13], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
      didParseCell: (hookData) => {
        if (hookData.row.index === body.length - 1 && hookData.section === 'body') {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [235, 235, 235];
        }
      },
    });

    return doc;
  };

  const exportPDF = (): void => { buildPDF().save('balance_tiers.pdf'); };

  const previewPDF = (): void => {
    const doc = buildPDF();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    setPdfBlob(blob);
    setPreviewUrl(url);
  };

  const closePreview = (): void => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPdfBlob(null);
  };

  return (
    <div className="compta-wrapper">
      <div className="compta-page-header">
        <div>
          <h1 className="compta-page-title">Balance des tiers</h1>
          <p className="compta-page-subtitle">Soldes par tiers — écritures validées</p>
        </div>
        <div className="compta-header-actions">
          <button className="compta-action-btn" onClick={exportCSV} disabled={data.length === 0}><LuDownload /> CSV</button>
          <button className="compta-action-btn" onClick={exportExcel} disabled={data.length === 0}><LuSheet /> Excel</button>
          <button className="compta-action-btn" onClick={previewPDF} disabled={data.length === 0}><LuEye /> Aperçu</button>
          <button className="compta-action-btn" onClick={exportPDF} disabled={data.length === 0}><LuFileText /> PDF</button>
          <button className="compta-action-btn" onClick={onBack}>&larr; Retour</button>
        </div>
      </div>

      <div className="saisie-filters">
        <div className="saisie-filter-group">
          <label>Type</label>
          <select value={filterType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value)}>
            {TYPES_TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="saisie-filter-group">
          <label>Mois</label>
          <select value={filterMois} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterMois(e.target.value)}>
            <option value="">Tous</option>
            {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="saisie-filter-group">
          <label>Du</label>
          <input type="date" value={filterDateDu} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFilterDateDu(e.target.value); setFilterMois(''); }} />
        </div>
        <div className="saisie-filter-group">
          <label>Au</label>
          <input type="date" value={filterDateAu} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFilterDateAu(e.target.value); setFilterMois(''); }} />
        </div>
        <div className="saisie-filter-search">
          <LuSearch />
          <input type="text" value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} placeholder="Rechercher un tiers..." />
        </div>
      </div>

      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      {/* En-tete societe */}
      <div className="balance-societe-header">
        <div className="balance-societe-titre">BALANCE DES TIERS</div>
        <div className="balance-societe-row">
          <span className="balance-societe-label">Dénomination :</span>
          <span className="balance-societe-value">{entiteName || ''}</span>
          <span className="balance-societe-label">Sigle :</span>
          <span className="balance-societe-value">{entiteSigle || ''}</span>
        </div>
        <div className="balance-societe-row">
          <span className="balance-societe-label">NUI :</span>
          <span className="balance-societe-value">{entiteNif || ''}</span>
          <span className="balance-societe-label">Exercice :</span>
          <span className="balance-societe-value">{exerciceAnnee || ''}</span>
        </div>
      </div>

      <div className="ecritures-table-wrapper">
        <table className="ecritures-main-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Code</th>
              <th>Tiers</th>
              <th style={{ width: 100 }}>Type</th>
              <th style={{ width: 80 }}>Compte</th>
              <th style={{ textAlign: 'right' }}>Débit</th>
              <th style={{ textAlign: 'right' }}>Crédit</th>
              <th style={{ textAlign: 'right' }}>Solde D</th>
              <th style={{ textAlign: 'right' }}>Solde C</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && !loading ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  <div className="empty-state-inline">
                    <p>Aucun solde tiers pour cet exercice</p>
                    <span>Associez des tiers aux lignes d'écritures dans la saisie</span>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={i} className="main-line">
                  <td className="cell-journal">{r.code_tiers || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{r.tiers_nom}</td>
                  <td>{r.tiers_type}</td>
                  <td>{r.compte_comptable || ''}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(r.debit)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(r.credit)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(r.solde_debiteur)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(r.solde_crediteur)}</td>
                </tr>
              ))
            )}
            {filtered.length > 0 && (
              <tr className="main-line" style={{ fontWeight: 700, background: '#f0f4ff' }}>
                <td colSpan={4} style={{ textAlign: 'right' }}>TOTAUX</td>
                <td style={{ textAlign: 'right' }}>{fmt(totalDebit)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(totalCredit)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(totalSD)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(totalSC)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="saisie-footer">
        <div className="saisie-footer-count">{filtered.length} tiers</div>
        <div className="saisie-footer-totaux">
          <div className="footer-total-card">
            <span className="footer-total-amount">{fmt(totalDebit)}</span>
            <span className="footer-total-label">Total débit</span>
          </div>
          <div className="footer-total-card">
            <span className="footer-total-amount">{fmt(totalCredit)}</span>
            <span className="footer-total-label">Total crédit</span>
          </div>
          <div className="footer-total-card">
            <span className={'footer-total-amount ' + (Math.abs(totalDebit - totalCredit) < 0.01 ? 'ok' : '')}>
              {fmt(Math.abs(totalDebit - totalCredit))}
            </span>
            <span className="footer-total-label">Écart</span>
          </div>
        </div>
      </div>

      {/* Apercu PDF */}
      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Aperçu — Balance des tiers</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={() => { const w = window.open(previewUrl, '_blank'); if (w) w.print(); }}>
                  <LuPrinter /> Imprimer
                </button>
                <button className="pdf-action-btn primary" onClick={() => { if (pdfBlob) { const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = 'balance_tiers.pdf'; a.click(); URL.revokeObjectURL(u); } }}>
                  <LuDownload /> Télécharger
                </button>
                <button className="pdf-close-btn" onClick={closePreview}><LuX /></button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe src={previewUrl} title="Aperçu Balance Tiers" className="pdf-preview-iframe" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BalanceTiers;
