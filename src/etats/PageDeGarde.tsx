import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuPencil, LuSave } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import './PageDeGarde.css';
import type { EtatBaseProps } from '../types';
import { useNoteData } from './notes/useNoteData';

interface PageDeGardeProps extends EtatBaseProps {}

const PARAM_KEYS = {
  republique: 'pdg_republique',
  ministere: 'pdg_ministere',
  direction: 'pdg_direction',
  centreDepot: 'pdg_centre_depot',
  nbPages: 'pdg_nb_pages',
  nbExemplaires: 'pdg_nb_exemplaires',
  dateDepot: 'pdg_date_depot',
  nomAgent: 'pdg_nom_agent',
} as const;

function PageDeGarde({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, onBack }: PageDeGardeProps): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, editing, setEditing, saving, saved, saveParams, annee,
  } = useNoteData({ entiteId });
  void typeActivite;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft({
      [PARAM_KEYS.republique]: params[PARAM_KEYS.republique] || '',
      [PARAM_KEYS.ministere]: params[PARAM_KEYS.ministere] || '',
      [PARAM_KEYS.direction]: params[PARAM_KEYS.direction] || '',
      [PARAM_KEYS.centreDepot]: params[PARAM_KEYS.centreDepot] || '',
      [PARAM_KEYS.nbPages]: params[PARAM_KEYS.nbPages] || '',
      [PARAM_KEYS.nbExemplaires]: params[PARAM_KEYS.nbExemplaires] || '',
      [PARAM_KEYS.dateDepot]: params[PARAM_KEYS.dateDepot] || '',
      [PARAM_KEYS.nomAgent]: params[PARAM_KEYS.nomAgent] || '',
    });
  }, [params]);

  const setField = (key: string, value: string) => setDraft(prev => ({ ...prev, [key]: value }));
  const getField = (key: string): string => (editing ? draft[key] || '' : params[key] || '');

  const handleSave = (): void => {
    void saveParams({ ...params, ...draft });
  };

  const systeme = 'SYSTEME NORMAL';

  const generatePDF = async (): Promise<jsPDF> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    if (!pageRef.current) return pdf;
    const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
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

  const inputStyle: React.CSSProperties = {
    border: 'none', borderBottom: '1px solid #555', padding: '2px 6px',
    fontSize: 'inherit', fontFamily: 'inherit', flex: 1, background: 'transparent',
  };
  const renderField = (key: string, fallback: string = ''): React.ReactNode => {
    if (!editing) return <span className="pdg-underline-value">{params[key] || fallback}</span>;
    return (
      <input
        value={draft[key] ?? ''}
        onChange={e => setField(key, e.target.value)}
        style={inputStyle}
      />
    );
  };

  const dateDepotDefault = `30 avril ${annee + 1}`;

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Page de garde</h2>
        </div>
        <div className="bilan-toolbar-right">
          {!editing ? (
            <button className="bilan-export-btn" onClick={() => setEditing(true)}>
              <LuPencil /> Modifier
            </button>
          ) : (
            <button className="bilan-export-btn" onClick={handleSave} disabled={saving}>
              <LuSave /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          )}
          {saved && (
            <span style={{ fontSize: 11, color: '#16a34a', alignSelf: 'center' }}>✓ Enregistré</span>
          )}
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
            {renderField(PARAM_KEYS.republique)}
          </div>
          <div className="pdg-field-row">
            <span className="pdg-label-bold">MINISTERE :</span>
            {renderField(PARAM_KEYS.ministere)}
          </div>
          <div className="pdg-field-row">
            <span className="pdg-label-bold">DIRECTION :</span>
            {renderField(PARAM_KEYS.direction)}
          </div>
        </div>

        {/* Centre de dépôt */}
        <div className="pdg-field-row" style={{ marginTop: 16 }}>
          <span className="pdg-label-bold pdg-underline">CENTRE DE DEPOT DE :</span>
          {renderField(PARAM_KEYS.centreDepot)}
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
                  <span className="pdg-pages-input">{getField(PARAM_KEYS.nbPages)}</span>
                </div>
                <div className="pdg-pages-row">
                  <span>Nombre d'exemplaires déposés :</span>
                  <span className="pdg-pages-input">{getField(PARAM_KEYS.nbExemplaires)}</span>
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
                <span className="pdg-dgi-value">{getField(PARAM_KEYS.dateDepot) || dateDepotDefault}</span>
              </div>
              <div className="pdg-dgi-field" style={{ marginTop: 12 }}>
                <span className="pdg-dgi-label">Nom de l'agent de la DGI ayant réceptionné le dépôt</span>
              </div>
              <div className="pdg-dgi-field">
                <span className="pdg-dgi-value">{getField(PARAM_KEYS.nomAgent)}</span>
              </div>
              <div className="pdg-dgi-field" style={{ marginTop: 'auto' }}>
                <span className="pdg-dgi-label">Signature de l'agent et cachet du service</span>
              </div>
              <div className="pdg-dgi-spacer-large"></div>
            </div>
          </div>
        </div>

        {/* Editeur en-bas en mode edition pour les champs DGI / Documents */}
        {editing && (
          <div style={{ marginTop: 18, padding: 12, border: '1px dashed #aaa', borderRadius: 6, background: '#fafafa', fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Champs depot / DGI (saisie complementaire) :</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label>
                Nombre de pages par exemplaire :
                <input value={draft[PARAM_KEYS.nbPages] ?? ''} onChange={e => setField(PARAM_KEYS.nbPages, e.target.value)} style={{ marginLeft: 6, padding: '2px 6px', width: 100 }} />
              </label>
              <label>
                Nombre d&apos;exemplaires :
                <input value={draft[PARAM_KEYS.nbExemplaires] ?? ''} onChange={e => setField(PARAM_KEYS.nbExemplaires, e.target.value)} style={{ marginLeft: 6, padding: '2px 6px', width: 100 }} />
              </label>
              <label>
                Date de depot :
                <input value={draft[PARAM_KEYS.dateDepot] ?? ''} onChange={e => setField(PARAM_KEYS.dateDepot, e.target.value)} placeholder={dateDepotDefault} style={{ marginLeft: 6, padding: '2px 6px', width: 200 }} />
              </label>
              <label>
                Nom de l&apos;agent DGI :
                <input value={draft[PARAM_KEYS.nomAgent] ?? ''} onChange={e => setField(PARAM_KEYS.nomAgent, e.target.value)} style={{ marginLeft: 6, padding: '2px 6px', width: 200 }} />
              </label>
            </div>
          </div>
        )}

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
