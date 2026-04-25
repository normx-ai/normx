import React, { Suspense, useRef, useState, useCallback } from 'react';
import { LuArrowLeft, LuEye } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { EtatBaseProps } from '../types';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { useNoteHasData } from '../dashboard/useNoteHasData';
import { NOTES_ANNEXES } from '../dashboard/notesConfig';
import PDFPreviewModal from './notes/PDFPreviewModal';
import {
  PageDeGarde, FicheIdentification, FicheR3, FicheR4,
  BilanSYSCOHADA, CompteResultatSYSCOHADA, TFT_SYSCOHADA, ResultatFiscal,
  Note1, Note2, Note3A, Note3B, Note3C, Note3D, Note3E,
  Note4, Note5, Note6, Note7, Note8, Note8A, Note9,
  Note10, Note11, Note12, Note13, Note14,
  Note15A, Note15B, Note16A, Note16B, Note16C,
  Note17, Note18, Note19, Note20, Note21,
  Note22, Note23, Note24, Note25, Note26,
  Note27A, Note27B, Note28, Note29, Note30,
  Note31, Note32, Note33, Note34, Note35, Note36, Note37,
} from '../dashboard/lazyModules';
import './LiasseComplete.css';

const NOTE_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType<EtatBaseProps & { onGoToParametres?: () => void }>>> = {
  note_1_sys: Note1, note_2_sys: Note2,
  note_3a_sys: Note3A, note_3b_sys: Note3B, note_3c_sys: Note3C, note_3d_sys: Note3D, note_3e_sys: Note3E,
  note_4_sys: Note4, note_5_sys: Note5, note_6_sys: Note6, note_7_sys: Note7,
  note_8_sys: Note8, note_8a_sys: Note8A, note_9_sys: Note9,
  note_10_sys: Note10, note_11_sys: Note11, note_12_sys: Note12, note_13_sys: Note13, note_14_sys: Note14,
  note_15a_sys: Note15A, note_15b_sys: Note15B,
  note_16a_sys: Note16A, note_16b_sys: Note16B, note_16c_sys: Note16C,
  note_17_sys: Note17, note_18_sys: Note18, note_19_sys: Note19, note_20_sys: Note20,
  note_21_sys: Note21, note_22_sys: Note22, note_23_sys: Note23, note_24_sys: Note24,
  note_25_sys: Note25, note_26_sys: Note26, note_27a_sys: Note27A, note_27b_sys: Note27B,
  note_28_sys: Note28, note_29_sys: Note29, note_30_sys: Note30, note_31_sys: Note31,
  note_32_sys: Note32, note_33_sys: Note33, note_34_sys: Note34, note_35_sys: Note35,
  note_36_sys: Note36, note_37_sys: Note37,
};

const PDF_WIDTH_MM = 210;
const PDF_HEIGHT_MM = 297;

export default function LiasseComplete(props: EtatBaseProps): React.JSX.Element {
  const { entiteId, offre = 'comptabilite', onBack } = props;
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const { noteHasData } = useNoteHasData(entiteId, selectedExercice?.id ?? null, offre);

  const filteredNotes = NOTES_ANNEXES.filter(n => noteHasData(n.id));

  const containerRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const noopGoToParams = (): void => { /* edition desactivee dans la liasse */ };

  const generateLiassePDF = useCallback(async (): Promise<void> => {
    if (!containerRef.current || isGenerating) return;
    setIsGenerating(true);

    try {
      const pageEls = Array.from(containerRef.current.querySelectorAll<HTMLElement>('.liasse-page > div > div[style*="210mm"]'));
      if (pageEls.length === 0) {
        setIsGenerating(false);
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      setProgress({ current: 0, total: pageEls.length });

      for (let i = 0; i < pageEls.length; i++) {
        const el = pageEls[i];
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * PDF_WIDTH_MM) / canvas.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, PDF_WIDTH_MM, Math.min(imgHeight, PDF_HEIGHT_MM));

        setProgress({ current: i + 1, total: pageEls.length });
      }

      const blob = pdf.output('blob');
      setPdfBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }, [isGenerating]);

  const closePreview = useCallback((): void => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPdfBlob(null);
  }, [previewUrl]);

  const downloadPDF = useCallback((): void => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Liasse_${selectedExercice?.annee ?? ''}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pdfBlob, selectedExercice]);

  const printPDF = useCallback((): void => {
    if (!previewUrl) return;
    const w = window.open(previewUrl);
    if (w) { w.onload = () => w.print(); }
  }, [previewUrl]);

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <>
      <div className="liasse-section-title no-print">{title}</div>
      <div className="liasse-page">{children}</div>
    </>
  );

  return (
    <div className="liasse-wrapper">
      <div className="liasse-toolbar no-print">
        <button className="liasse-toolbar-btn" onClick={onBack}>
          <LuArrowLeft size={16} /> Retour
        </button>
        <div className="liasse-toolbar-title">
          Liasse financiere complete
        </div>
        <select
          className="liasse-exercice-select"
          value={selectedExercice?.id ?? ''}
          onChange={e => {
            const ex = exercices.find(x => x.id === Number(e.target.value));
            if (ex) setSelectedExercice(ex);
          }}
          disabled={exercices.length === 0 || isGenerating}
        >
          {exercices.length === 0 && <option value="">Aucun exercice</option>}
          {exercices.map(ex => (
            <option key={ex.id} value={ex.id}>Exercice {ex.annee}</option>
          ))}
        </select>
        <button
          className="liasse-toolbar-btn liasse-toolbar-btn--primary"
          onClick={generateLiassePDF}
          disabled={!selectedExercice || isGenerating}
        >
          <LuEye size={16} />
          {isGenerating && progress
            ? `Generation ${progress.current}/${progress.total}...`
            : 'Apercu'}
        </button>
      </div>

      {previewUrl && (
        <PDFPreviewModal
          previewUrl={previewUrl}
          title={`Apercu — Liasse ${selectedExercice?.annee ?? ''}`}
          onClose={closePreview}
          onDownload={downloadPDF}
          onPrint={printPDF}
        />
      )}

      {!selectedExercice && (
        <div className="liasse-content">
          <div className="liasse-empty">
            Aucun exercice disponible. Creez un exercice pour generer la liasse.
          </div>
        </div>
      )}

      {selectedExercice && (
        <div className="liasse-content" ref={containerRef}>
          <Suspense fallback={<div className="liasse-empty">Chargement de la liasse...</div>}>
            <Section title="Page de garde">
              <PageDeGarde {...props} />
            </Section>
            <Section title="Fiche d'identification (R1)">
              <FicheIdentification {...props} page="R1" onGoToParametres={noopGoToParams} />
            </Section>
            <Section title="Fiche R2 — Informations juridiques">
              <FicheIdentification {...props} page="R2" onGoToParametres={noopGoToParams} />
            </Section>
            <Section title="Fiche R3 — Dirigeants">
              <FicheR3 {...props} onGoToParametres={noopGoToParams} />
            </Section>
            <Section title="Fiche R4 — Notes annexes (applicabilite)">
              <FicheR4 {...props} onGoToParametres={noopGoToParams} />
            </Section>
            <Section title="Bilan — Actif">
              <BilanSYSCOHADA {...props} page="actif" />
            </Section>
            <Section title="Bilan — Passif">
              <BilanSYSCOHADA {...props} page="passif" />
            </Section>
            <Section title="Compte de resultat">
              <CompteResultatSYSCOHADA {...props} />
            </Section>
            <Section title="Tableau des flux de tresorerie">
              <TFT_SYSCOHADA {...props} />
            </Section>

            {filteredNotes.map(meta => {
              const Cmp = NOTE_COMPONENTS[meta.id];
              if (!Cmp) return null;
              return (
                <Section key={meta.id} title={`${meta.titre} — ${meta.desc}`}>
                  <Cmp {...props} onGoToParametres={noopGoToParams} />
                </Section>
              );
            })}

            <Section title="Note 37 bis — Determination du resultat fiscal">
              <ResultatFiscal {...props} />
            </Section>
          </Suspense>
        </div>
      )}
    </div>
  );
}
