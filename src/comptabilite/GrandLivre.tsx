import { clientFetch } from '../lib/api';
import React, { useState, useCallback, useEffect } from 'react';
import { LuChevronLeft, LuDownload } from 'react-icons/lu';
import type { CompteComptable } from '../types';
import './Comptabilite.css';
import {
  MouvementAPI,
  buildTableRows,
  exportBtnStyle,
  groupByCompte,
} from './grandlivre/grandLivreData';
import {
  buildGrandLivrePDF,
  exportGrandLivreCSV,
  exportGrandLivreExcel,
} from './grandlivre/grandLivreExports';
import { GrandLivreFilters } from './grandlivre/GrandLivreFilters';
import { GrandLivreTable } from './grandlivre/GrandLivreTable';

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

void exportGrandLivreCSV;
void exportGrandLivreExcel;

function GrandLivre({ entiteId, exerciceId, exerciceAnnee, entiteName = '', entiteSigle = '', entiteAdresse = '', entiteNif = '', onBack }: GrandLivreProps): React.JSX.Element {
  const [mouvements, setMouvements] = useState<MouvementAPI[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [generated, setGenerated] = useState<boolean>(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const now = new Date();
  const [mois, setMois] = useState<number | string>(now.getMonth() + 1);
  const [dateDu, setDateDu] = useState<string>(`${exerciceAnnee}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [dateAu, setDateAu] = useState<string>(`${exerciceAnnee}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(exerciceAnnee, now.getMonth() + 1, 0).getDate()}`);
  const [compteDe, setCompteDe] = useState<string>('');
  const [compteA, setCompteA] = useState<string>('');
  const [journalFilter, setJournalFilter] = useState<string>('');

  const [ecrituresLettrees, setEcrituresLettrees] = useState<boolean>(true);
  const [reportNouveau, setReportNouveau] = useState<boolean>(false);

  const [comptesOptions, setComptesOptions] = useState<CompteComptable[]>([]);

  useEffect(() => {
    if (!entiteId || !exerciceId) return;
    clientFetch(`/api/ecritures/comptes/${entiteId}/${exerciceId}`)
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

  const comptes = groupByCompte(mouvements);
  const totalGeneralDebit = Object.values(comptes).reduce((s, c) => s + c.totalDebit, 0);
  const totalGeneralCredit = Object.values(comptes).reduce((s, c) => s + c.totalCredit, 0);
  const tableRows = buildTableRows(comptes);

  const buildPDF = (): ReturnType<typeof buildGrandLivrePDF> => buildGrandLivrePDF({
    comptes, totalGeneralDebit, totalGeneralCredit,
    entiteName, entiteSigle, entiteAdresse, entiteNif, exerciceAnnee,
  });

  const exportPDF = (): void => { buildPDF().save('grand_livre.pdf'); };

  const closePreview = (): void => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
  };

  return (
    <div className="compta-wrapper">
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

      <GrandLivreFilters
        exerciceAnnee={exerciceAnnee}
        mois={mois}
        dateDu={dateDu}
        dateAu={dateAu}
        compteDe={compteDe}
        compteA={compteA}
        journalFilter={journalFilter}
        ecrituresLettrees={ecrituresLettrees}
        reportNouveau={reportNouveau}
        comptesOptions={comptesOptions}
        updateDatesFromMois={updateDatesFromMois}
        setDateDu={setDateDu}
        setDateAu={setDateAu}
        setCompteDe={setCompteDe}
        setCompteA={setCompteA}
        setJournalFilter={setJournalFilter}
        setEcrituresLettrees={setEcrituresLettrees}
        setReportNouveau={setReportNouveau}
        onGenerate={loadGrandLivre}
      />

      <GrandLivreTable
        tableRows={tableRows}
        loading={loading}
        generated={generated}
        totalGeneralDebit={totalGeneralDebit}
        totalGeneralCredit={totalGeneralCredit}
      />

      {pdfPreviewUrl && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={closePreview}
        >
          <div
            style={{ background: '#fff', borderRadius: 12, width: '90vw', maxWidth: 1100, height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
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
