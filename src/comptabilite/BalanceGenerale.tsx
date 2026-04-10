import React, { useState, useCallback } from 'react';
import { LuChevronLeft, LuDownload, LuX } from 'react-icons/lu';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { BalanceLigne } from '../types';
import { detectAnomalies, getSoldeAttendu, getLibelleSoldeAttendu } from '../etats/anomaliesComptes';
import type { AnomalieCompte } from '../etats/anomaliesComptes';
import { fmt, MOIS } from '../utils/formatters';

/* -- Shared inline components -- */

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

interface BalanceGeneraleProps {
  entiteId: number;
  exerciceId: number;
  entiteName?: string;
  entiteSigle?: string;
  entiteAdresse?: string;
  entiteNif?: string;
  exerciceAnnee: number;
  onBack: () => void;
}

interface Totaux {
  debit: number;
  credit: number;
  solde_debiteur: number;
  solde_crediteur: number;
}

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
      <span style={{ fontSize: 12, color: '#888', fontWeight: 500, maxWidth: 140 }}>{label}</span>
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

/* -- Style constants -- */

const inputStyle: React.CSSProperties = { padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, minWidth: 120 };
const genBtnStyle: React.CSSProperties = { padding: '9px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-end' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
const thStyle: React.CSSProperties = { padding: '10px 10px', fontSize: 13, fontWeight: 600, background: '#e8edf5', color: '#333', textAlign: 'left', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '9px 10px', borderBottom: '1px solid #eee', fontSize: 14 };


/* -- Component -- */

function BalanceGenerale({ entiteId, exerciceId, entiteName = '', entiteSigle = '', entiteAdresse = '', entiteNif = '', exerciceAnnee, onBack }: BalanceGeneraleProps): React.JSX.Element {
  const [balance, setBalance] = useState<BalanceLigne[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [generated, setGenerated] = useState<boolean>(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // Filter states
  const [exercice, setExercice] = useState<string | number>(exerciceAnnee || '');
  const [mois, setMois] = useState<string>('Mars');
  const [dateDu, setDateDu] = useState<string>('');
  const [dateAu, setDateAu] = useState<string>('');
  const [compteDe, setCompteDe] = useState<string>('');
  const [compteA, setCompteA] = useState<string>('');
  const [comparerCumul, setComparerCumul] = useState<boolean>(false);
  const [exclureSoldeNul, setExclureSoldeNul] = useState<boolean>(false);
  const [inclureReport, setInclureReport] = useState<boolean>(false);

  const loadBalance = useCallback(async (): Promise<void> => {
    if (!entiteId || !exerciceId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + exerciceId);
      if (res.ok) { const j = await res.json(); setBalance(Array.isArray(j) ? j : j.data || j.lignes || j.balance || []); }
    } catch (_err) {
      // silently ignore
    } finally {
      setLoading(false);
      setGenerated(true);
    }
  }, [entiteId, exerciceId]);

  const handleGenerer = (): void => {
    loadBalance();
  };

  const totaux: Totaux = balance.reduce((acc, l) => ({
    debit: acc.debit + (parseFloat(String(l.debit)) || 0),
    credit: acc.credit + (parseFloat(String(l.credit)) || 0),
    solde_debiteur: acc.solde_debiteur + (parseFloat(String(l.solde_debiteur)) || 0),
    solde_crediteur: acc.solde_crediteur + (parseFloat(String(l.solde_crediteur)) || 0),
  }), { debit: 0, credit: 0, solde_debiteur: 0, solde_crediteur: 0 });

  /* -- Exports -- */

  const exportCSV = (): void => {
    const header = 'Compte;Libellé;Débit;Crédit;Solde débiteur;Solde créditeur\n';
    const rows = balance.map(l =>
      [l.numero_compte, '"' + (l.libelle_compte || '') + '"', l.debit, l.credit, l.solde_debiteur, l.solde_crediteur].join(';')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'balance_generale.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmtPdf = (val: string | number): string => {
    const n = parseFloat(String(val));
    if (!n) return '';
    return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const buildPDF = (): jsPDF => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.setFont(undefined as never, 'bold');
    doc.text('BALANCE GÉNÉRALE', pageW / 2, 14, { align: 'center' });

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

    const head = [['Compte', 'Libellé', 'Mvt Débit', 'Mvt Crédit', 'Solde débiteur', 'Solde créditeur']];
    const body: (string | { content: string; colSpan?: number; styles: { fontStyle: 'bold' | 'italic' | 'normal' } })[][] = balance.map(l => [
      l.numero_compte,
      l.libelle_compte || '',
      fmtPdf(l.debit),
      fmtPdf(l.credit),
      fmtPdf(l.solde_debiteur),
      fmtPdf(l.solde_crediteur),
    ]);
    body.push([
      { content: 'TOTAUX', colSpan: 2, styles: { fontStyle: 'bold' } } as never,
      { content: fmtPdf(totaux.debit), styles: { fontStyle: 'bold' } } as never,
      { content: fmtPdf(totaux.credit), styles: { fontStyle: 'bold' } } as never,
      { content: fmtPdf(totaux.solde_debiteur), styles: { fontStyle: 'bold' } } as never,
      { content: fmtPdf(totaux.solde_crediteur), styles: { fontStyle: 'bold' } } as never,
    ]);

    autoTable(doc, {
      startY: y,
      head,
      body,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [8, 8, 13], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 30 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
    });

    return doc;
  };

  const exportPDF = (): void => {
    buildPDF().save('balance_generale.pdf');
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

  const exportExcel = (): void => {
    const data: Record<string, string | number>[] = balance.map(l => ({
      'Compte': l.numero_compte,
      'Libellé': l.libelle_compte || '',
      'Mouvements Débit': parseFloat(String(l.debit)) || 0,
      'Mouvements Crédit': parseFloat(String(l.credit)) || 0,
      'Solde débiteur': parseFloat(String(l.solde_debiteur)) || 0,
      'Solde créditeur': parseFloat(String(l.solde_crediteur)) || 0,
    }));
    data.push({
      'Compte': '',
      'Libellé': 'TOTAUX',
      'Mouvements Débit': totaux.debit,
      'Mouvements Crédit': totaux.credit,
      'Solde débiteur': totaux.solde_debiteur,
      'Solde créditeur': totaux.solde_crediteur,
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Balance');
    XLSX.writeFile(wb, 'balance_generale.xlsx');
  };

  /* -- Solde calculé pour la table UI (4 colonnes) -- */
  const computeSolde = (l: BalanceLigne): number => {
    const d = parseFloat(String(l.debit)) || 0;
    const c = parseFloat(String(l.credit)) || 0;
    return d - c;
  };

  const totalSolde = totaux.debit - totaux.credit;

  /* -- Render -- */

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      {/* -- Top bar -- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <LuChevronLeft size={22} color="#333" />
          </button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#222' }}>Balance générale</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={previewPDF} disabled={balance.length === 0} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
            background: balance.length === 0 ? '#ccc' : '#059669', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: balance.length === 0 ? 'default' : 'pointer'
          }}>
            <LuDownload size={15} /> Exporter en PDF
          </button>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <LuX size={20} color="#888" />
          </button>
        </div>
      </div>

      {/* -- Filter row -- */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 14, padding: '16px 20px', borderBottom: '1px solid #eee' }}>
        <FilterField label="Exercice" required>
          <select value={exercice} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExercice(e.target.value)} style={inputStyle}>
            <option value="">{exerciceAnnee || 'Sélectionner...'}</option>
            {exerciceAnnee && <option value={exerciceAnnee}>{exerciceAnnee}</option>}
          </select>
        </FilterField>

        <FilterField label="Période">
          <select value={mois} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMois(e.target.value)} style={inputStyle}>
            <option value="">Mois</option>
            {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
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
          </select>
        </FilterField>

        <FilterField label="à">
          <select value={compteA} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCompteA(e.target.value)} style={inputStyle}>
            <option value="">Sélectionner...</option>
          </select>
        </FilterField>

        <Toggle label="Comparer avec les valeurs cumulées" value={comparerCumul} onChange={setComparerCumul} />
        <Toggle label="Exclure les comptes à solde nul" value={exclureSoldeNul} onChange={setExclureSoldeNul} />
        <Toggle label="Inclure les lignes d'écritures de report à nouveau temporaire." value={inclureReport} onChange={setInclureReport} />

        <button onClick={handleGenerer} style={genBtnStyle}>Générer</button>
      </div>

      {/* -- Content -- */}
      <div style={{ padding: '16px 20px' }}>
        {loading && <div style={{ padding: 20, color: '#888', fontSize: 14 }}>Chargement...</div>}

        {!loading && !generated && (
          <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 14 }}>Aucun élément à afficher.</div>
        )}

        {!loading && generated && balance.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 14 }}>Aucun élément à afficher.</div>
        )}

        {!loading && balance.length > 0 && (
          <>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>Statut</th>
                  <th style={thStyle}>Compte</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Débit</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Crédit</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Solde</th>
                  <th style={{ ...thStyle, fontSize: 11, textAlign: 'center', width: 90 }}>Sens attendu</th>
                </tr>
              </thead>
              <tbody>
                {balance.map(l => {
                  const solde = computeSolde(l);
                  const anomalies: AnomalieCompte[] = detectAnomalies(l);
                  const hasError = anomalies.some(a => a.severity === 'error');
                  const hasWarning = anomalies.some(a => a.severity === 'warning');
                  const isOk = anomalies.length === 0;
                  const soldeAttendu = getSoldeAttendu(l.numero_compte);
                  const tooltipText = anomalies.map(a => a.message).join('\n');
                  const isClassRow = l.numero_compte.length <= 2;

                  return (
                    <tr key={l.numero_compte} style={isClassRow ? { background: '#f8f9fb', fontWeight: 600 } : {}}>
                      <td style={{ ...tdStyle, textAlign: 'center', position: 'relative' }} title={tooltipText || 'OK'}>
                        {isClassRow ? '' : isOk ? (
                          <span style={{ color: '#059669', fontSize: 18, fontWeight: 700 }}>&#10003;</span>
                        ) : hasError ? (
                          <span style={{ color: '#dc2626', fontSize: 18, fontWeight: 700, cursor: 'help' }}>&#10007;</span>
                        ) : hasWarning ? (
                          <span style={{ color: '#f59e0b', fontSize: 16, fontWeight: 700, cursor: 'help' }}>&#9888;</span>
                        ) : null}
                      </td>
                      <td style={tdStyle}>{l.numero_compte} {l.libelle_compte ? '- ' + l.libelle_compte : ''}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(l.debit)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(l.credit)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: solde < 0 ? '#dc2626' : '#333' }}>{fmt(solde)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontSize: 11, color: '#888' }}>
                        {isClassRow ? '' : soldeAttendu === 'debiteur' ? 'D' : soldeAttendu === 'crediteur' ? 'C' : 'D/C'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, background: '#f1f3f8' }}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}></td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>TOTAUX</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmt(totaux.debit)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmt(totaux.credit)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: totalSolde < 0 ? '#dc2626' : '#333' }}>{fmt(totalSolde)}</td>
                  <td style={{ ...tdStyle }}></td>
                </tr>
              </tfoot>
            </table>

            {/* -- Résumé anomalies -- */}
            {(() => {
              const allAnomalies = balance.filter(l => l.numero_compte.length > 2).map(l => ({ compte: l.numero_compte, libelle: l.libelle_compte, anomalies: detectAnomalies(l) })).filter(a => a.anomalies.length > 0);
              const errors = allAnomalies.filter(a => a.anomalies.some(x => x.severity === 'error'));
              const warnings = allAnomalies.filter(a => a.anomalies.some(x => x.severity === 'warning') && !a.anomalies.some(x => x.severity === 'error'));
              if (allAnomalies.length === 0) return null;
              return (
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#991b1b', marginBottom: 8 }}>
                    Anomalies détectées : {errors.length} erreur{errors.length > 1 ? 's' : ''}, {warnings.length} avertissement{warnings.length > 1 ? 's' : ''}
                  </div>
                  {errors.map(a => (
                    <div key={a.compte} style={{ fontSize: 13, color: '#dc2626', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>&#10007; {a.compte}</span> {a.libelle} — {a.anomalies.map(x => x.message).join(' ; ')}
                    </div>
                  ))}
                  {warnings.map(a => (
                    <div key={a.compte} style={{ fontSize: 13, color: '#b45309', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>&#9888; {a.compte}</span> {a.libelle} — {a.anomalies.map(x => x.message).join(' ; ')}
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ marginTop: 12, fontSize: 13 }}>
              {Math.abs(totaux.debit - totaux.credit) < 0.01 ? (
                <span style={{ color: '#059669' }}>Mouvements équilibrés (Débit = Crédit)</span>
              ) : (
                <span style={{ color: '#dc2626' }}>Écart mouvements : {fmt(Math.abs(totaux.debit - totaux.credit))}</span>
              )}
              {' | '}
              {Math.abs(totaux.solde_debiteur - totaux.solde_crediteur) < 0.01 ? (
                <span style={{ color: '#059669' }}>Soldes équilibrés</span>
              ) : (
                <span style={{ color: '#dc2626' }}>Écart soldes : {fmt(Math.abs(totaux.solde_debiteur - totaux.solde_crediteur))}</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* -- PDF Preview modal -- */}
      {pdfPreviewUrl && (
        <div onClick={closePreview} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 10, width: '90%', maxWidth: 900, height: '85vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Aperçu — Balance générale</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={exportPDF} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
                  background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}>
                  <LuDownload size={15} /> Télécharger PDF
                </button>
                <button onClick={closePreview} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>&times;</button>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <iframe src={pdfPreviewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Aperçu PDF" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BalanceGenerale;
