import React, { Suspense, useRef, useState, useCallback } from 'react';
import { LuArrowLeft, LuEye } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useQueryClient } from '@tanstack/react-query';
import type { EtatBaseProps } from '../types';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { NOTES_ANNEXES } from '../dashboard/notesConfig';
import { createLogger } from '../utils/logger';
import PDFPreviewModal from './notes/PDFPreviewModal';
import {
  PageDeGarde, FicheIdentification, FicheR3, FicheR4,
  BilanSYSCOHADA, CompteResultatSYSCOHADA, TFT_SYSCOHADA, ResultatFiscal,
  Note1, Note2, Note3A, Note3B, Note3C, Note3D, Note3E, Note3F,
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
  note_3a_sys: Note3A, note_3b_sys: Note3B, note_3c_sys: Note3C, note_3d_sys: Note3D, note_3e_sys: Note3E, note_3f_sys: Note3F,
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

const log = createLogger('Liasse');

// Hors du composant : evite que React remonte tout l'arbre au moindre re-render
// de LiasseComplete (sinon chaque toggle d'etat retire/remet 47 notes => 429)
const LiasseSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <>
    <div className="liasse-section-title no-print">{title}</div>
    <div className="liasse-page">{children}</div>
  </>
);

export default function LiasseComplete(props: EtatBaseProps): React.JSX.Element {
  const { entiteId, onBack } = props;
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);

  // Liasse officielle : toutes les notes annexes, meme vides
  const allNotes = NOTES_ANNEXES;

  const containerRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [waitingData, setWaitingData] = useState(false);
  const queryClient = useQueryClient();

  const noopGoToParams = (): void => { /* edition desactivee dans la liasse */ };

  const generateLiassePDF = useCallback(async (): Promise<void> => {
    if (!containerRef.current || isGenerating) return;

    // Toutes les notes utilisent React Query pour leurs balances : on attend
    // simplement que isFetching tombe a 0 puis un microtick pour laisser le
    // DOM se mettre a jour apres les setStates.
    setWaitingData(true);
    const start = Date.now();
    const TIMEOUT_MS = 30_000;
    while (Date.now() - start < TIMEOUT_MS) {
      if (queryClient.isFetching() === 0) break;
      await new Promise(r => setTimeout(r, 100));
    }
    await new Promise(r => setTimeout(r, 100));
    setWaitingData(false);

    setIsGenerating(true);

    try {
      // Les pages A4 utilisent deux conventions de style historiques :
      //   - inline `style={{ width: '210mm', ... }}` (notes annexes Note1-Note37,
      //     certaines en paysage avec `width: '297mm'`)
      //   - className `a4-page` defini en CSS (Bilan/CR/TFT SYSCOHADA, fiches
      //     R1-R4, SYCEBNL, projets, etc., toujours en portrait)
      // Le selecteur capture les deux sinon les etats financiers SYSCOHADA
      // sont silencieusement absents du PDF (cf bug "liasse sans etats").
      const pageEls = Array.from(containerRef.current.querySelectorAll<HTMLElement>(
        '.liasse-page > div > div[style*="210mm"], .liasse-page > div > div.a4-page',
      ));
      if (pageEls.length === 0) {
        setIsGenerating(false);
        return;
      }

      // Le PDF demarre en portrait, mais chaque page suivante est ajoutee
      // dans la bonne orientation via pdf.addPage(format, orientation) selon
      // le ratio reel du canvas (width > height ⇒ landscape).
      const pdf = new jsPDF('p', 'mm', 'a4');
      setProgress({ current: 0, total: pageEls.length });

      let pagesAdded = 0;
      const errors: string[] = [];
      for (let i = 0; i < pageEls.length; i++) {
        const el = pageEls[i];
        // Sauter les pages vides ou non rendues (evite "Unable to find element in cloned iframe")
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || !el.isConnected) {
          setProgress({ current: i + 1, total: pageEls.length });
          continue;
        }
        try {
          const canvas = await html2canvas(el, {
            // scale 1.5 (vs 2 avant) reduit la taille des images de ~44%
            // sans perte visible sur du texte/tableau. Combine avec JPEG
            // quality 0.85 ci-dessous, on tient ~50 pages dans le doc
            // sans hitter la limite max-string-length de V8 lors du
            // pdf.output('blob') (cf bug "Invalid string length").
            scale: 1.5,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            removeContainer: true,
          });
          // JPEG quality 0.85 : compression ~10x meilleure que PNG sur
          // des pages texte/tableau, qualite visuelle identique. PNG
          // etait la source du RangeError "Invalid string length" sur
          // une liasse complete (47+ pages).
          const imgData = canvas.toDataURL('image/jpeg', 0.85);
          // Detecte l'orientation depuis le ratio reel du canvas :
          // landscape si plus large que haut (cas Note 17, Note 21, etc.).
          const isLandscape = canvas.width > canvas.height;
          const pageW = isLandscape ? PDF_HEIGHT_MM : PDF_WIDTH_MM;
          const pageH = isLandscape ? PDF_WIDTH_MM : PDF_HEIGHT_MM;
          const imgHeight = (canvas.height * pageW) / canvas.width;
          if (pagesAdded > 0) {
            pdf.addPage('a4', isLandscape ? 'l' : 'p');
          } else if (isLandscape) {
            // 1ere page paysage : recreer le doc dans la bonne orientation
            // jsPDF ne permet pas de changer l'orientation de la page par
            // defaut apres construction, sinon laisser tel quel.
            pdf.deletePage(1);
            pdf.addPage('a4', 'l');
          }
          pdf.addImage(imgData, 'JPEG', 0, 0, pageW, Math.min(imgHeight, pageH));
          pagesAdded++;
        } catch (err) {
          errors.push(`Page ${i + 1} : ${(err as Error).message}`);
        }
        setProgress({ current: i + 1, total: pageEls.length });
      }

      if (pagesAdded === 0) {
        if (errors.length > 0) log.error('Aucune page generee', errors);
        setIsGenerating(false);
        return;
      }
      if (errors.length > 0) log.warn('Pages ignorees', errors);

      const blob = pdf.output('blob');
      setPdfBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }, [isGenerating, queryClient]);

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
          disabled={!selectedExercice || isGenerating || waitingData}
        >
          <LuEye size={16} />
          {waitingData
            ? 'Chargement des donnees...'
            : isGenerating && progress
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
            <LiasseSection title="Page de garde">
              <PageDeGarde {...props} />
            </LiasseSection>
            <LiasseSection title="Fiche d'identification (R1)">
              <FicheIdentification {...props} page="R1" onGoToParametres={noopGoToParams} />
            </LiasseSection>
            <LiasseSection title="Fiche R2 — Informations juridiques">
              <FicheIdentification {...props} page="R2" onGoToParametres={noopGoToParams} />
            </LiasseSection>
            <LiasseSection title="Fiche R3 — Dirigeants">
              <FicheR3 {...props} onGoToParametres={noopGoToParams} />
            </LiasseSection>
            <LiasseSection title="Fiche R4 — Notes annexes (applicabilite)">
              <FicheR4 {...props} onGoToParametres={noopGoToParams} />
            </LiasseSection>
            <LiasseSection title="Bilan — Actif">
              <BilanSYSCOHADA {...props} page="actif" />
            </LiasseSection>
            <LiasseSection title="Bilan — Passif">
              <BilanSYSCOHADA {...props} page="passif" />
            </LiasseSection>
            <LiasseSection title="Compte de resultat">
              <CompteResultatSYSCOHADA {...props} />
            </LiasseSection>
            <LiasseSection title="Tableau des flux de tresorerie">
              <TFT_SYSCOHADA {...props} />
            </LiasseSection>

            {allNotes.map(meta => {
              const Cmp = NOTE_COMPONENTS[meta.id];
              if (!Cmp) return null;
              return (
                <LiasseSection key={meta.id} title={`${meta.titre} — ${meta.desc}`}>
                  <Cmp {...props} onGoToParametres={noopGoToParams} />
                </LiasseSection>
              );
            })}

            <LiasseSection title="Note 37 bis — Determination du resultat fiscal">
              <ResultatFiscal {...props} />
            </LiasseSection>
          </Suspense>
        </div>
      )}
    </div>
  );
}
