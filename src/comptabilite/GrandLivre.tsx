import React, { useState, useCallback, useEffect } from 'react';
import { LuChevronLeft, LuDownload } from 'react-icons/lu';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { CompteComptable, JournalType } from '../types';
import './Comptabilite.css';

interface GrandLivreProps {
  entiteId: number;
  exerciceId: number;
  exerciceAnnee: number;
  entiteName?: string;
  entiteSigle?: string;
  entiteAdresse?: string;
  entiteNif?: string;
  onBack: () => void;
}

interface MouvementAPI {
  numero_compte: string;
  libelle_compte: string;
  date_ecriture: string;
  numero_piece: string;
  journal: string;
  tiers_nom: string;
  libelle_ecriture: string;
  date_document: string;
  reference: string;
  lettrage: string;
  solde_anterieur: number;
  debit: number | string;
  credit: number | string;
}

interface CompteData {
  libelle: string;
  mouvements: MouvementAPI[];
  totalDebit: number;
  totalCredit: number;
}

interface TableRow {
  compte: string;
  date: string;
  numero: string;
  journal: string;
  tiers: string;
  libelle: string;
  dateDocument: string;
  reference: string;
  lettrage: string;
  soldeAnterieur: number;
  debit: number;
  credit: number;
  solde: number;
}

interface FilterFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
}

const MOIS: string[] = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const JOURNAUX_LIST: JournalType[] = [
  { code: 'OD', intitule: 'Opérations diverses' },
  { code: 'ACH', intitule: 'Achats' },
  { code: 'VTE', intitule: 'Ventes' },
  { code: 'BQ', intitule: 'Banque' },
  { code: 'CAI', intitule: 'Caisse' },
  { code: 'SUB', intitule: 'Subventions' },
  { code: 'DOT', intitule: 'Dotations' },
  { code: 'AMO', intitule: 'Amortissements' },
  { code: 'RAN', intitule: 'Report à nouveau' },
];

function FilterField({ label, required, children }: FilterFieldProps): React.JSX.Element {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }: ToggleProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
        border: '1px solid #ddd', borderRadius: 20, background: value ? '#059669' : '#fff',
        color: value ? '#fff' : '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: 'fit-content'
      }}>
        {value ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, minWidth: 120 };
const genBtnStyle: React.CSSProperties = { padding: '9px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-end' };
const exportBtnStyle: React.CSSProperties = { padding: '8px 16px', background: '#fff', color: '#D4A843', border: '1px solid #D4A843', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
const thStyle: React.CSSProperties = { padding: '10px 10px', fontSize: 13, fontWeight: 600, background: '#e8edf5', color: '#333', textAlign: 'left', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '9px 10px', borderBottom: '1px solid #eee', fontSize: 14 };

const fmt = (v: string | number): string => { const n = parseFloat(String(v)); if (!n) return ''; return n.toLocaleString('fr-FR'); };

const fmtPdf = (val: string | number): string => {
  const n = parseFloat(String(val));
  if (!n) return '';
  return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

function GrandLivre({ entiteId, exerciceId, exerciceAnnee, entiteName = '', entiteSigle = '', entiteAdresse = '', entiteNif = '', onBack }: GrandLivreProps): React.JSX.Element {
  const [mouvements, setMouvements] = useState<MouvementAPI[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [generated, setGenerated] = useState<boolean>(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // Filters
  const now = new Date();
  const [mois, setMois] = useState<number | string>(now.getMonth() + 1);
  const [dateDu, setDateDu] = useState<string>(`${exerciceAnnee}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [dateAu, setDateAu] = useState<string>(`${exerciceAnnee}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(exerciceAnnee, now.getMonth() + 1, 0).getDate()}`);
  const [compteDe, setCompteDe] = useState<string>('');
  const [compteA, setCompteA] = useState<string>('');
  const [journalFilter, setJournalFilter] = useState<string>('');

  // Toggles
  const [ecrituresLettrees, setEcrituresLettrees] = useState<boolean>(true);
  const [reportNouveau, setReportNouveau] = useState<boolean>(false);

  // Comptes list for dropdowns
  const [comptesOptions, setComptesOptions] = useState<CompteComptable[]>([]);

  useEffect(() => {
    if (!entiteId || !exerciceId) return;
    fetch(`/api/ecritures/comptes/${entiteId}/${exerciceId}`)
      .then(r => r.ok ? r.json() : [])
      .then((list: CompteComptable[]) => setComptesOptions(list))
      .catch(() => {});
  }, [entiteId, exerciceId]);

  const updateDatesFromMois = (m: number | string): void => {
    setMois(m);
    if (m) {
      const mNum = Number(m);
      const lastDay = new Date(exerciceAnnee, mNum, 0).getDate();
      setDateDu(`${exerciceAnnee}-${String(mNum).padStart(2, '0')}-01`);
      setDateAu(`${exerciceAnnee}-${String(mNum).padStart(2, '0')}-${lastDay}`);
    }
  };

  const loadGrandLivre = useCallback(async (): Promise<void> => {
    if (!entiteId || !exerciceId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (compteDe) params.set('compte', compteDe);
      if (compteA) params.set('compte_a', compteA);
      if (journalFilter) params.set('journal', journalFilter);
      if (dateDu) params.set('date_du', dateDu);
      if (dateAu) params.set('date_au', dateAu);
      if (ecrituresLettrees) params.set('lettrees', '1');
      if (reportNouveau) params.set('report_nouveau', '1');
      const qs = params.toString() ? '?' + params.toString() : '';
      const url = '/api/ecritures/grand-livre/' + entiteId + '/' + exerciceId + qs;
      const res = await fetch(url);
      if (res.ok) {
        setMouvements(await res.json());
        setGenerated(true);
      }
    } catch (_err) {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [entiteId, exerciceId, compteDe, compteA, journalFilter, dateDu, dateAu, ecrituresLettrees, reportNouveau]);

  // Grouper par compte
  const comptes: Record<string, CompteData> = {};
  for (const m of mouvements) {
    if (!comptes[m.numero_compte]) {
      comptes[m.numero_compte] = { libelle: m.libelle_compte, mouvements: [], totalDebit: 0, totalCredit: 0 };
    }
    const d = parseFloat(String(m.debit)) || 0;
    const c = parseFloat(String(m.credit)) || 0;
    comptes[m.numero_compte].mouvements.push(m);
    comptes[m.numero_compte].totalDebit += d;
    comptes[m.numero_compte].totalCredit += c;
  }

  // Totaux généraux
  const totalGeneralDebit = Object.values(comptes).reduce((s, c) => s + c.totalDebit, 0);
  const totalGeneralCredit = Object.values(comptes).reduce((s, c) => s + c.totalCredit, 0);

  // Flatten data for table display
  const tableRows: TableRow[] = [];
  for (const [num, cdata] of Object.entries(comptes)) {
    let soldeCumul = 0;
    for (const m of cdata.mouvements) {
      const d = parseFloat(String(m.debit)) || 0;
      const c = parseFloat(String(m.credit)) || 0;
      soldeCumul += d - c;
      tableRows.push({
        compte: num,
        date: m.date_ecriture,
        numero: m.numero_piece || '',
        journal: m.journal || '',
        tiers: m.tiers_nom || '',
        libelle: m.libelle_ecriture || '',
        dateDocument: m.date_document || '',
        reference: m.reference || '',
        lettrage: m.lettrage || '',
        soldeAnterieur: m.solde_anterieur || 0,
        debit: d,
        credit: c,
        solde: soldeCumul,
      });
    }
  }

  // === EXPORTS ===
  const exportCSV = (): void => {
    const header = 'Compte;Date;Numéro;Journal;Tiers;Libellé;Date du document;Référence;Lettrage;Solde antérieur;Débit;Crédit;Solde\n';
    const rows = tableRows.map(r =>
      [r.compte, r.date, r.numero, r.journal, '"' + r.tiers + '"', '"' + r.libelle + '"', r.dateDocument, r.reference, r.lettrage, r.soldeAnterieur, r.debit, r.credit, r.solde].join(';')
    ).join('\n');
    const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grand_livre.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = (): void => {
    const data: Record<string, string | number>[] = [];
    for (const [num, cdata] of Object.entries(comptes)) {
      let soldeCumul = 0;
      for (const m of cdata.mouvements) {
        const d = parseFloat(String(m.debit)) || 0;
        const c = parseFloat(String(m.credit)) || 0;
        soldeCumul += d - c;
        data.push({
          'Compte': num,
          'Date': m.date_ecriture,
          'Numéro': m.numero_piece || '',
          'Journal': m.journal,
          'Tiers': m.tiers_nom || '',
          'Libellé': m.libelle_ecriture || '',
          'Date du document': m.date_document || '',
          'Référence': m.reference || '',
          'Lettrage': m.lettrage || '',
          'Solde antérieur': m.solde_anterieur || '',
          'Débit': d || '',
          'Crédit': c || '',
          'Solde': soldeCumul,
        });
      }
      data.push({
        'Compte': '',
        'Date': '',
        'Numéro': '',
        'Journal': '',
        'Tiers': '',
        'Libellé': 'TOTAL ' + num,
        'Date du document': '',
        'Référence': '',
        'Lettrage': '',
        'Solde antérieur': '',
        'Débit': cdata.totalDebit,
        'Crédit': cdata.totalCredit,
        'Solde': cdata.totalDebit - cdata.totalCredit,
      });
    }
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 35 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Grand Livre');
    XLSX.writeFile(wb, 'grand_livre.xlsx');
  };

  const buildPDF = (): jsPDF => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.setFont(undefined as never, 'bold');
    doc.text('GRAND LIVRE', pageW / 2, 14, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont(undefined as never, 'normal');
    let y = 22;
    doc.text('Dénomination : ' + (entiteName || '\u2014'), 14, y);
    doc.text('Sigle : ' + (entiteSigle || '\u2014'), pageW / 2, y);
    y += 5;
    doc.text('Adresse : ' + (entiteAdresse || '\u2014'), 14, y);
    doc.text('NUI : ' + (entiteNif || '\u2014'), pageW / 2, y);
    y += 5;
    doc.text('Exercice : ' + (exerciceAnnee || '\u2014'), 14, y);
    y += 8;

    const comptesEntries = Object.entries(comptes);
    for (const [num, cdata] of comptesEntries) {
      if (y > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        y = 14;
      }

      doc.setFontSize(10);
      doc.setFont(undefined as never, 'bold');
      const solde = cdata.totalDebit - cdata.totalCredit;
      doc.text(num + ' - ' + cdata.libelle + '    Solde : ' + fmtPdf(Math.abs(solde)) + (solde >= 0 ? ' D' : ' C'), 14, y);
      y += 2;

      let soldeCumul = 0;
      const body = cdata.mouvements.map(m => {
        const d = parseFloat(String(m.debit)) || 0;
        const c = parseFloat(String(m.credit)) || 0;
        soldeCumul += d - c;
        return [
          new Date(m.date_ecriture).toLocaleDateString('fr-FR'),
          m.journal,
          m.libelle_ecriture || '',
          m.numero_piece || '',
          fmtPdf(m.debit),
          fmtPdf(m.credit),
          fmtPdf(Math.abs(soldeCumul)) + (soldeCumul >= 0 ? ' D' : ' C'),
        ];
      });
      body.push([
        { content: 'TOTAUX', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } } as never,
        { content: fmtPdf(cdata.totalDebit), styles: { fontStyle: 'bold' } } as never,
        { content: fmtPdf(cdata.totalCredit), styles: { fontStyle: 'bold' } } as never,
        { content: fmtPdf(Math.abs(solde)) + (solde >= 0 ? ' D' : ' C'), styles: { fontStyle: 'bold' } } as never,
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Journal', 'Libellé', 'N° Pièce', 'Débit', 'Crédit', 'Solde']],
        body,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [26, 58, 92], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 18 },
          3: { cellWidth: 22 },
          4: { halign: 'right', cellWidth: 28 },
          5: { halign: 'right', cellWidth: 28 },
          6: { halign: 'right', cellWidth: 28 },
        },
        margin: { left: 14, right: 14 },
      });

      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }

    // Totaux généraux
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 14;
    }
    doc.setFontSize(10);
    doc.setFont(undefined as never, 'bold');
    doc.text('Total général \u2014 Débit : ' + fmtPdf(totalGeneralDebit) + '   Crédit : ' + fmtPdf(totalGeneralCredit), 14, y);

    return doc;
  };

  const exportPDF = (): void => {
    buildPDF().save('grand_livre.pdf');
  };

  const previewPDF = (): void => {
    const doc = buildPDF();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    setPdfPreviewUrl(url);
  };

  const closePreview = (): void => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
  };

  return (
    <div className="compta-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D4A843', fontSize: 15 }}>
            <LuChevronLeft size={20} />
          </button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Grand-livre</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {generated && mouvements.length > 0 && (
            <button onClick={exportPDF} style={exportBtnStyle}><LuDownload size={15} /> Exporter en PDF</button>
          )}
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888' }}>&#10005;</button>
        </div>
      </div>

      {/* Filter row 1 */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
        <FilterField label="Exercice" required>
          <input type="text" value={exerciceAnnee} readOnly style={{ ...inputStyle, background: '#f5f5f5' }} />
        </FilterField>
        <FilterField label="Mois">
          <select value={mois} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateDatesFromMois(parseInt(e.target.value))} style={inputStyle}>
            <option value="">Tous</option>
            {MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </FilterField>
        <FilterField label="Date du" required>
          <input type="date" value={dateDu} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateDu(e.target.value)} style={inputStyle} />
        </FilterField>
        <FilterField label="au" required>
          <input type="date" value={dateAu} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateAu(e.target.value)} style={inputStyle} />
        </FilterField>
        <FilterField label="Compte de">
          <select value={compteDe} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCompteDe(e.target.value)} style={inputStyle}>
            <option value="">Sélectionner...</option>
            {comptesOptions.map(c => <option key={c.numero} value={c.numero}>{c.numero} - {c.libelle}</option>)}
          </select>
        </FilterField>
        <FilterField label="à">
          <select value={compteA} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCompteA(e.target.value)} style={inputStyle}>
            <option value="">Sélectionner...</option>
            {comptesOptions.map(c => <option key={c.numero} value={c.numero}>{c.numero} - {c.libelle}</option>)}
          </select>
        </FilterField>
        <FilterField label="Journal">
          <select value={journalFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setJournalFilter(e.target.value)} style={inputStyle}>
            <option value="">Sélectionner...</option>
            {JOURNAUX_LIST.map(j => <option key={j.code} value={j.code}>{j.code} - {j.intitule}</option>)}
          </select>
        </FilterField>
      </div>

      {/* Filter row 2: toggles + Générer */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 20 }}>
        <Toggle label="Écritures lettrées incluses" value={ecrituresLettrees} onChange={setEcrituresLettrees} />
        <Toggle label="Inclure les lignes d'écritures de report à nouveau temporaire." value={reportNouveau} onChange={setReportNouveau} />
        <button onClick={loadGrandLivre} style={genBtnStyle}>Générer</button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {['Compte', 'Date', 'Numéro', 'Journal', 'Tiers', 'Libellé', 'Date du document', 'Référence', 'Lettrage', 'Solde antérieur', 'Débit', 'Crédit', 'Solde'].map(h => (
                <th key={h} style={{ ...thStyle, textAlign: ['Solde antérieur', 'Débit', 'Crédit', 'Solde'].includes(h) ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={13} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Chargement...</td></tr>}
            {!loading && generated && tableRows.length === 0 && <tr><td colSpan={13} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Aucun élément à afficher.</td></tr>}
            {!loading && !generated && <tr><td colSpan={13} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Cliquez sur "Générer" pour afficher le grand-livre.</td></tr>}
            {!loading && tableRows.map((r, i) => (
              <tr key={i}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{r.compte}</td>
                <td style={tdStyle}>{r.date ? new Date(r.date).toLocaleDateString('fr-FR') : ''}</td>
                <td style={tdStyle}>{r.numero}</td>
                <td style={tdStyle}>{r.journal}</td>
                <td style={tdStyle}>{r.tiers}</td>
                <td style={{ ...tdStyle, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.libelle}</td>
                <td style={tdStyle}>{r.dateDocument ? new Date(r.dateDocument).toLocaleDateString('fr-FR') : ''}</td>
                <td style={tdStyle}>{r.reference}</td>
                <td style={tdStyle}>{r.lettrage}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.soldeAnterieur)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.debit)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.credit)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(Math.abs(r.solde))} {r.solde >= 0 ? 'D' : 'C'}
                </td>
              </tr>
            ))}
            {generated && tableRows.length > 0 && (
              <tr style={{ background: '#1A3A5C' }}>
                <td colSpan={10} style={{ ...tdStyle, fontWeight: 700, color: '#fff' }}>TOTAL GÉNÉRAL</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(totalGeneralDebit)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(totalGeneralCredit)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#fff' }}>
                  {fmt(Math.abs(totalGeneralDebit - totalGeneralCredit))} {totalGeneralDebit - totalGeneralCredit >= 0 ? 'D' : 'C'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Aperçu PDF */}
      {pdfPreviewUrl && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closePreview}>
          <div style={{ background: '#fff', borderRadius: 12, width: '90vw', maxWidth: 1100, height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Aperçu — Grand Livre</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={exportPDF} style={exportBtnStyle}>
                  <LuDownload size={15} /> Télécharger PDF
                </button>
                <button onClick={closePreview} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#888' }}>&times;</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <iframe src={pdfPreviewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Aperçu PDF" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GrandLivre;
