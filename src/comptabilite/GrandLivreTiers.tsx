import React, { useState, useEffect, useCallback } from 'react';
import { LuDownload, LuSheet, LuFileText, LuSearch, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './Comptabilite.css';

interface GrandLivreTiersProps {
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

interface GLTiersRow {
  tiers_id: number;
  tiers_nom: string;
  code_tiers: string;
  tiers_type: string;
  date_ecriture: string;
  journal: string;
  numero_piece: string;
  numero_compte: string;
  libelle_ecriture: string;
  debit: number | string;
  credit: number | string;
}

interface GroupedTiers {
  tiers_nom: string;
  code_tiers: string;
  tiers_type: string;
  lignes: GLTiersRow[];
}

const TYPES_TIERS: TypeTiersOption[] = [
  { value: '', label: 'Tous' },
  { value: 'membre', label: 'Membres' },
  { value: 'fournisseur', label: 'Fournisseurs' },
  { value: 'bailleur', label: 'Bailleurs' },
  { value: 'personnel', label: 'Personnel' },
];

const MOIS: string[] = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function GrandLivreTiers({ entiteId, exerciceId, exerciceAnnee, entiteName, entiteSigle, entiteAdresse, entiteNif, onBack }: GrandLivreTiersProps): React.JSX.Element {
  const [data, setData] = useState<GLTiersRow[]>([]);
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
      const res = await fetch('/api/ecritures/grand-livre-tiers/' + entiteId + '/' + exerciceId + qs);
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

  const fmt = (val: string | number): string => {
    const n = parseFloat(String(val));
    if (!n) return '';
    return n.toLocaleString('fr-FR');
  };

  const fmtPdf = (n: number): string => {
    if (!n) return '';
    return Math.round(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Grouper par tiers
  const grouped: Record<number, GroupedTiers> = {};
  for (const row of data) {
    const key = row.tiers_id;
    if (!grouped[key]) {
      grouped[key] = { tiers_nom: row.tiers_nom, code_tiers: row.code_tiers, tiers_type: row.tiers_type, lignes: [] };
    }
    grouped[key].lignes.push(row);
  }

  // Filtrer par recherche
  const tiersKeys = Object.keys(grouped).filter(k => {
    if (!searchTerm) return true;
    const g = grouped[Number(k)];
    const term = searchTerm.toLowerCase();
    return g.tiers_nom.toLowerCase().includes(term) || (g.code_tiers || '').toLowerCase().includes(term);
  });

  const totalDebit = data.reduce((s, r) => s + (parseFloat(String(r.debit)) || 0), 0);
  const totalCredit = data.reduce((s, r) => s + (parseFloat(String(r.credit)) || 0), 0);

  // Exports
  const exportCSV = (): void => {
    let csv = 'Tiers;Code;Date;Journal;Pièce;Compte;Libellé;Débit;Crédit\n';
    for (const k of tiersKeys) {
      const g = grouped[Number(k)];
      for (const r of g.lignes) {
        csv += ['"' + g.tiers_nom + '"', g.code_tiers || '', new Date(r.date_ecriture).toLocaleDateString('fr-FR'), r.journal, r.numero_piece || '', r.numero_compte, '"' + r.libelle_ecriture + '"', parseFloat(String(r.debit)) || '', parseFloat(String(r.credit)) || ''].join(';') + '\n';
      }
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grand_livre_tiers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = (): void => {
    const rows: Record<string, string | number>[] = [];
    for (const k of tiersKeys) {
      const g = grouped[Number(k)];
      for (const r of g.lignes) {
        rows.push({
          'Tiers': g.tiers_nom,
          'Code': g.code_tiers || '',
          'Date': new Date(r.date_ecriture).toLocaleDateString('fr-FR'),
          'Journal': r.journal,
          'Pièce': r.numero_piece || '',
          'Compte': r.numero_compte,
          'Libellé': r.libelle_ecriture,
          'Débit': parseFloat(String(r.debit)) || 0,
          'Crédit': parseFloat(String(r.credit)) || 0,
        });
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 35 }, { wch: 15 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GL Tiers');
    XLSX.writeFile(wb, 'grand_livre_tiers.xlsx');
  };

  const buildPDF = (): jsPDF => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    let y = 10;

    doc.setFontSize(12);
    doc.setFont(undefined as never, 'bold');
    doc.text('GRAND LIVRE TIERS', pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.setFont(undefined as never, 'normal');
    doc.text('Dénomination : ' + (entiteName || ''), 14, y);
    doc.text('Exercice : ' + (exerciceAnnee || ''), pageW - 14, y, { align: 'right' });
    y += 5;
    doc.text('NUI : ' + (entiteNif || ''), 14, y);
    y += 6;

    for (const k of tiersKeys) {
      const g = grouped[Number(k)];
      doc.setFontSize(10);
      doc.setFont(undefined as never, 'bold');
      doc.text((g.code_tiers || '') + ' — ' + g.tiers_nom, 14, y);
      y += 1;

      let tiersDebit = 0;
      let tiersCredit = 0;
      const body = g.lignes.map(r => {
        const d = parseFloat(String(r.debit)) || 0;
        const c = parseFloat(String(r.credit)) || 0;
        tiersDebit += d;
        tiersCredit += c;
        return [
          new Date(r.date_ecriture).toLocaleDateString('fr-FR'),
          r.journal,
          r.numero_piece || '',
          r.numero_compte,
          r.libelle_ecriture,
          d ? fmtPdf(d) : '',
          c ? fmtPdf(c) : '',
        ];
      });
      body.push(['', '', '', '', 'SOLDE ' + g.tiers_nom, fmtPdf(tiersDebit), fmtPdf(tiersCredit)]);

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Jnl', 'Pièce', 'Compte', 'Libellé', 'Débit', 'Crédit']],
        body,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [8, 8, 13], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' } },
        didParseCell: (hookData) => {
          if (hookData.row.index === body.length - 1 && hookData.section === 'body') {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fillColor = [235, 235, 235];
          }
        },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      if (y > 180) { doc.addPage(); y = 14; }
    }

    return doc;
  };

  const exportPDF = (): void => { buildPDF().save('grand_livre_tiers.pdf'); };

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
          <h1 className="compta-page-title">Grand-livre des tiers</h1>
          <p className="compta-page-subtitle">Mouvements groupés par tiers — écritures validées</p>
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

      <div className="ecritures-table-wrapper">
        {tiersKeys.length === 0 && !loading ? (
          <div className="empty-state-inline" style={{ padding: 40 }}>
            <p>Aucun mouvement tiers pour cet exercice</p>
            <span>Associez des tiers aux lignes d'écritures dans la saisie</span>
          </div>
        ) : (
          tiersKeys.map(k => {
            const g = grouped[Number(k)];
            let cumDebit = 0;
            let cumCredit = 0;
            return (
              <div key={k} style={{ marginBottom: 24 }}>
                <div style={{ background: '#f0f4ff', padding: '8px 12px', borderRadius: 6, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                  {g.code_tiers || ''} — {g.tiers_nom}
                  <span style={{ marginLeft: 12, fontSize: 11, color: '#666', fontWeight: 400 }}>({g.tiers_type})</span>
                </div>
                <table className="ecritures-main-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Journal</th>
                      <th>Piece</th>
                      <th>Compte</th>
                      <th>Libellé</th>
                      <th style={{ textAlign: 'right' }}>Débit</th>
                      <th style={{ textAlign: 'right' }}>Crédit</th>
                      <th style={{ textAlign: 'right' }}>Solde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.lignes.map((r, i) => {
                      cumDebit += parseFloat(String(r.debit)) || 0;
                      cumCredit += parseFloat(String(r.credit)) || 0;
                      const solde = cumDebit - cumCredit;
                      return (
                        <tr key={i} className="main-line">
                          <td>{new Date(r.date_ecriture).toLocaleDateString('fr-FR')}</td>
                          <td className="cell-journal">{r.journal}</td>
                          <td>{r.numero_piece || ''}</td>
                          <td>{r.numero_compte}</td>
                          <td>{r.libelle_ecriture}</td>
                          <td style={{ textAlign: 'right' }}>{fmt(r.debit)}</td>
                          <td style={{ textAlign: 'right' }}>{fmt(r.credit)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>{fmt(Math.abs(solde))}{solde > 0 ? ' D' : solde < 0 ? ' C' : ''}</td>
                        </tr>
                      );
                    })}
                    <tr className="main-line" style={{ fontWeight: 700, background: '#f8f8f8' }}>
                      <td colSpan={5} style={{ textAlign: 'right' }}>Total {g.tiers_nom}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(cumDebit)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(cumCredit)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(Math.abs(cumDebit - cumCredit))}{cumDebit - cumCredit > 0 ? ' D' : cumDebit - cumCredit < 0 ? ' C' : ''}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </div>

      <div className="saisie-footer">
        <div className="saisie-footer-count">{tiersKeys.length} tiers | {data.length} mouvements</div>
        <div className="saisie-footer-totaux">
          <div className="footer-total-card">
            <span className="footer-total-amount">{fmt(totalDebit)}</span>
            <span className="footer-total-label">Total débit</span>
          </div>
          <div className="footer-total-card">
            <span className="footer-total-amount">{fmt(totalCredit)}</span>
            <span className="footer-total-label">Total crédit</span>
          </div>
        </div>
      </div>

      {/* Apercu PDF */}
      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Aperçu — Grand-livre des tiers</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={() => { const w = window.open(previewUrl, '_blank'); if (w) w.print(); }}>
                  <LuPrinter /> Imprimer
                </button>
                <button className="pdf-action-btn primary" onClick={() => { if (pdfBlob) { const u = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = u; a.download = 'grand_livre_tiers.pdf'; a.click(); URL.revokeObjectURL(u); } }}>
                  <LuDownload /> Télécharger
                </button>
                <button className="pdf-close-btn" onClick={closePreview}><LuX /></button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe src={previewUrl} title="Aperçu GL Tiers" className="pdf-preview-iframe" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GrandLivreTiers;
