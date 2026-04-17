import React, { useState, useRef } from 'react';
import { clientFetch } from '../lib/api';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import './PageDeGarde.css';
import type { Exercice, EtatBaseProps } from '../types';

interface PageDeGardeProps extends EtatBaseProps {}

function PageDeGarde({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, onBack }: PageDeGardeProps): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const duree = selectedExercice?.duree_mois || 12;

  const systeme = typeActivite === 'entreprise' ? 'SYSTEME NORMAL' : 'SYSTEME NORMAL';

  const generatePDF = async (): Promise<jsPDF> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    if (!pageRef.current) return pdf;
    const canvas = await html2canvas(pageRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    return pdf;
  };

  const openPreview = async (): Promise<void> => {
    const pdf = await generatePDF();
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    setPdfBlob(blob);
    setPreviewUrl(url);
  };

  const closePreview = (): void => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPdfBlob(null);
  };

  const downloadPDF = (): void => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Page_de_garde_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = (): void => {
    if (!previewUrl) return;
    const win = window.open(previewUrl, '_blank');
    if (win) win.print();
  };

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Page de garde</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}>
            <LuEye /> Apercu
          </button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('Page_de_garde_' + annee + '.pdf'); }}>
            <LuDownload /> Exporter PDF
          </button>
        </div>
      </div>

      <div className="bilan-exercice-select">
        <label>Exercice :</label>
        <select
          value={selectedExercice ? selectedExercice.id : ''}
          onChange={e => {
            const ex = exercices.find(x => x.id === parseInt(e.target.value));
            setSelectedExercice(ex || null);
          }}
        >
          {exercices.length === 0 && <option value="">Aucun exercice</option>}
          {exercices.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.annee}</option>
          ))}
        </select>
      </div>

      {/* PAGE DE GARDE A4 */}
      <div className="a4-page pdg-page" ref={pageRef}>

        {/* Bloc supérieur — République / Ministère / Direction */}
        <div className="pdg-top-block">
          <div className="pdg-field-row">
            <span className="pdg-label-bold">REPUBLIQUE :</span>
            <span className="pdg-underline-value"></span>
          </div>
          <div className="pdg-field-row">
            <span className="pdg-label-bold">MINISTERE :</span>
            <span className="pdg-underline-value"></span>
          </div>
          <div className="pdg-field-row">
            <span className="pdg-label-bold">DIRECTION :</span>
            <span className="pdg-underline-value"></span>
          </div>
        </div>

        {/* Centre de dépôt */}
        <div className="pdg-field-row" style={{ marginTop: 16 }}>
          <span className="pdg-label-bold pdg-underline">CENTRE DE DEPOT DE :</span>
          <span className="pdg-underline-value"></span>
        </div>

        {/* Titre principal */}
        <div className="pdg-main-title">
          <div className="pdg-title-line">ETATS FINANCIERS NORMALISES</div>
          <div className="pdg-title-line">SYSTEME COMPTABLE OHADA (SYSCOHADA)</div>
          <div className="pdg-dotted-line"></div>
        </div>

        {/* Exercice clos le */}
        <div className="pdg-exercice-row">
          <span className="pdg-label-bold">EXERCICE CLOS LE :</span>
          <span className="pdg-exercice-value">31 décembre {annee}</span>
        </div>

        {/* Désignation de l'entité */}
        <div className="pdg-section-title">DESIGNATION DE L'ENTITE</div>

        <div className="pdg-field-row">
          <span className="pdg-label-bold pdg-underline">DENOMINATION SOCIALE :</span>
          <span className="pdg-underline-value pdg-value-center">{entiteName || ''}</span>
        </div>
        <div className="pdg-field-sub">(ou nom et prénoms de l'exploitant)</div>

        <div className="pdg-spacer"></div>

        <div className="pdg-field-row">
          <span className="pdg-label-bold pdg-underline">SIGLE USUEL :</span>
          <span className="pdg-underline-value pdg-value-center">{entiteSigle || ''}</span>
        </div>

        <div className="pdg-spacer"></div>

        <div className="pdg-field-row">
          <span className="pdg-label-bold pdg-underline">ADRESSE COMPLETE :</span>
          <span className="pdg-underline-value">{entiteAdresse || ''}</span>
        </div>

        <div className="pdg-spacer-sm"></div>

        <div className="pdg-field-row">
          <span className="pdg-label-bold pdg-underline">N° IDENTIFICATION FISCALE :</span>
          <span className="pdg-underline-value">{entiteNif || ''}</span>
        </div>

        {/* Système */}
        <div className="pdg-systeme-title">{systeme}</div>

        {/* Deux colonnes : Documents déposés + Réservé DGI */}
        <div className="pdg-two-cols">
          {/* Colonne gauche */}
          <div className="pdg-col-left">
            <div className="pdg-col-header">Documents déposés</div>
            <div className="pdg-doc-box">
              <div className="pdg-doc-list">
                <div className="pdg-doc-item">
                  <span>Fiche d'identification et renseignements divers</span>
                  <span className="pdg-checkbox">☑</span>
                </div>
                <div className="pdg-doc-item">
                  <span>Bilan</span>
                  <span className="pdg-checkbox">☑</span>
                </div>
                <div className="pdg-doc-item">
                  <span>Compte de résultat</span>
                  <span className="pdg-checkbox">☑</span>
                </div>
                <div className="pdg-doc-item">
                  <span>Tableau des flux de trésorerie</span>
                  <span className="pdg-checkbox">☑</span>
                </div>
                <div className="pdg-doc-item">
                  <span>Notes annexées</span>
                  <span className="pdg-checkbox">☑</span>
                </div>
              </div>

              <div className="pdg-pages-section">
                <div className="pdg-pages-row">
                  <span>Nombre de pages déposées par exemplaire :</span>
                  <span className="pdg-pages-input"></span>
                </div>
                <div className="pdg-pages-row">
                  <span>Nombre d'exemplaires déposés :</span>
                  <span className="pdg-pages-input"></span>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div className="pdg-col-right">
            <div className="pdg-col-header">Réservé à la Direction Générale des Impôts</div>
            <div className="pdg-dgi-box">
              <div className="pdg-dgi-field">
                <span className="pdg-dgi-label">Date de dépôt</span>
              </div>
              <div className="pdg-dgi-field">
                <span className="pdg-dgi-value">30 avril {annee + 1}</span>
              </div>
              <div className="pdg-dgi-field" style={{ marginTop: 12 }}>
                <span className="pdg-dgi-label">Nom de l'agent de la DGI ayant réceptionné le dépôt</span>
              </div>
              <div className="pdg-dgi-spacer"></div>
              <div className="pdg-dgi-field" style={{ marginTop: 'auto' }}>
                <span className="pdg-dgi-label">Signature de l'agent et cachet du service</span>
              </div>
              <div className="pdg-dgi-spacer-large"></div>
            </div>
          </div>
        </div>

      </div>

      {/* Modale apercu PDF */}
      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Apercu — Page de garde {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF}>
                  <LuPrinter /> Imprimer
                </button>
                <button className="pdf-action-btn primary" onClick={downloadPDF}>
                  <LuDownload /> Telecharger
                </button>
                <button className="pdf-close-btn" onClick={closePreview}>
                  <LuX />
                </button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe
                src={previewUrl}
                title="Apercu Page de garde PDF"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PageDeGarde;
