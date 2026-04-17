import React, { useState, useRef, useEffect } from 'react';
import { clientFetch } from '../lib/api';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSettings } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import './FicheIdentification.css';
import type { Exercice, EtatBaseProps } from '../types';

interface FicheR3Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

function FicheR3({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', entiteId, onBack, onGoToParametres }: FicheR3Props): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entiteId) return;
    clientFetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        setParams({
          nom: ent.nom || '',
          sigle: ent.sigle || '',
          adresse: ent.adresse || '',
          nif: ent.nif || '',
          ...(ent.data || {}),
        });
      })
      .catch(() => {});
  }, [entiteId]);

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;

  const fmtDateShort = (d: Date | null): string => {
    if (!d) return '';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const p = (key: string): string => params[key] || '';

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

  const openPreview = async () => {
    const pdf = await generatePDF();
    const blob = pdf.output('blob');
    setPdfBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPdfBlob(null);
  };

  const downloadPDF = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Fiche_R3_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    if (!previewUrl) return;
    const w = window.open(previewUrl);
    if (w) { w.onload = () => w.print(); }
  };

  // Dirigeants (max 3)
  const dirigeants = [1, 2, 3, 4, 5].map(i => ({
    nom: p(`dirigeant_${i}_nom`),
    prenoms: p(`dirigeant_${i}_prenoms`),
    qualite: p(`dirigeant_${i}_qualite`),
    nif: p(`dirigeant_${i}_nif`),
    adresse: p(`dirigeant_${i}_adresse`),
  }));

  // Membres CA (max 5)
  const membresCA = [1, 2, 3, 4, 5].map(i => ({
    nom: p(`membre_ca_${i}_nom`),
    prenoms: p(`membre_ca_${i}_prenoms`),
    qualite: p(`membre_ca_${i}_qualite`),
    adresse: p(`membre_ca_${i}_adresse`),
  }));

  const thStyle: React.CSSProperties = {
    border: '0.5px solid #000',
    padding: '8px 6px',
    fontSize: 11,
    fontWeight: 600,
    textAlign: 'center',
    verticalAlign: 'middle',
    background: '#dce6f0',
  };

  const tdStyle: React.CSSProperties = {
    border: '0.5px solid #000',
    padding: '6px 8px',
    fontSize: 11,
    verticalAlign: 'middle',
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Fiche R3 — Dirigeants et Membres du CA</div>
        <div className="etat-toolbar-actions">
          {onGoToParametres && (
            <button className="etat-action-btn" onClick={onGoToParametres}><LuSettings size={16} /> Paramètres</button>
          )}
          <select
            className="etat-exercice-select"
            value={selectedExercice?.id || ''}
            onChange={e => {
              const ex = exercices.find(ex => ex.id === Number(e.target.value));
              if (ex) setSelectedExercice(ex);
            }}
          >
            {exercices.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.annee}</option>
            ))}
          </select>
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>

      {/* Preview modal */}
      {previewUrl && (
        <div className="etat-preview-overlay" onClick={closePreview}>
          <div className="etat-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="etat-preview-header">
              <span>Aperçu — Fiche R3</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Fiche R3" />
          </div>
        </div>
      )}

      {/* Page A4 */}
      <div className="a4-page fi-page" ref={pageRef}>
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12 }}><strong>Désignation entité :</strong> {entiteName}</div>
            <div style={{ fontSize: 12 }}><strong>Numéro d'identification :</strong> {entiteNif}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12 }}><strong>Exercice clos le</strong> {dateFin ? fmtDateShort(dateFin) : ''}</div>
            <div style={{ fontSize: 12 }}><strong>Durée (en mois)</strong> {duree}</div>
          </div>
        </div>

        {/* DIRIGEANTS */}
        <h3 style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
          DIRIGEANTS (<sup>1</sup>)
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <thead>
            <tr>
              <th style={thStyle}>Nom</th>
              <th style={thStyle}>Prénoms</th>
              <th style={thStyle}>Qualité</th>
              <th style={thStyle}>N° identification<br />fiscale</th>
              <th style={thStyle}>Adresse (BP, ville,<br />pays)</th>
            </tr>
          </thead>
          <tbody>
            {dirigeants.map((d, i) => (
              <tr key={i}>
                <td style={tdStyle}>{d.nom}</td>
                <td style={tdStyle}>{d.prenoms}</td>
                <td style={tdStyle}>{d.qualite}</td>
                <td style={tdStyle}>{d.nif}</td>
                <td style={tdStyle}>{d.adresse}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: 10, fontStyle: 'italic', color: '#333', marginBottom: 30 }}>
          (1) Dirigeants = Président Directeur Général, Directeur Général, Administrateur Général, Gérant, Autres
        </p>

        {/* MEMBRES DU CONSEIL D'ADMINISTRATION */}
        <h3 style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
          MEMBRES DU CONSEIL D'ADMINISTRATION
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <thead>
            <tr>
              <th style={thStyle}>Nom</th>
              <th style={thStyle}>Prénoms</th>
              <th style={thStyle}>Qualité</th>
              <th style={thStyle}>Adresse (BP, ville,<br />pays)</th>
            </tr>
          </thead>
          <tbody>
            {membresCA.map((m, i) => (
              <tr key={i}>
                <td style={tdStyle}>{m.nom}</td>
                <td style={tdStyle}>{m.prenoms}</td>
                <td style={tdStyle}>{m.qualite}</td>
                <td style={tdStyle}>{m.adresse}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FicheR3;
