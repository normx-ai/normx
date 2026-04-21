import React, { useState, useRef, useEffect } from 'react';
import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSettings } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import './FicheIdentification.css';
import type { EtatBaseProps, BalanceLigne } from '../types';
import { FicheR1 } from './fiche/FicheR1';
import { FicheR2 } from './fiche/FicheR2';

interface FicheIdentificationProps extends EtatBaseProps {
  page?: 'R1' | 'R2';
  onGoToParametres?: () => void;
}

// Comptes du CA HT (SYSCOHADA) : 701, 702-704, 705-706, 707
const CA_COMPTES = ['701', '702', '703', '704', '705', '706', '707'];

function matchCA(num: string): boolean {
  return CA_COMPTES.some(c => num.startsWith(c));
}

function computeCAHT(lignes: BalanceLigne[]): number {
  let total = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    if (matchCA(num)) {
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      total += sc - sd;
    }
  }
  return total;
}

function FicheIdentification({
  entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '',
  entiteId, offre, onBack, onGoToParametres, page = 'R1',
}: FicheIdentificationProps): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [caHT, setCaHT] = useState<number>(0);

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entiteId) return;
    clientFetch(api.entites.byId(entiteId))
      .then(r => r.json())
      .then(ent => {
        setParams({
          nom: ent.nom || '',
          sigle: ent.sigle || '',
          adresse: ent.adresse || '',
          nif: ent.nif || '',
          telephone: ent.telephone || '',
          email: ent.email || '',
          ...(ent.data || {}),
        });
      })
      .catch(() => {});
  }, [entiteId]);

  const balanceSource = offre === 'comptabilite' ? 'ecritures' : 'import';
  useEffect(() => {
    if (!entiteId || !selectedExercice) { setCaHT(0); return; }
    const load = async () => {
      try {
        let lignes: BalanceLigne[] = [];
        if (balanceSource === 'ecritures') {
          const res = await clientFetch(api.ecritures.balance(entiteId, selectedExercice.id));
          const data = await res.json();
          lignes = data.lignes || [];
        } else {
          const res = await clientFetch(api.balance.byExercice(entiteId, selectedExercice.id, 'N'));
          const data = await res.json();
          lignes = data.lignes || [];
        }
        setCaHT(computeCAHT(lignes));
      } catch { setCaHT(0); }
    };
    load();
  }, [entiteId, selectedExercice, balanceSource]);

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const duree = selectedExercice?.duree_mois || 12;
  const dateDebut = selectedExercice?.date_debut ? new Date(selectedExercice.date_debut) : null;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;

  const fmtDate = (d: Date | null): string => {
    if (!d) return '';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const fmtDateShort = (d: Date | null): string => {
    if (!d) return '';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const p = (key: string): string => params[key] || '';

  const codeBoxes = (value: string, length: number): React.JSX.Element => {
    const chars = value.padEnd(length, ' ').split('').slice(0, length);
    return (
      <span className="fi-code-boxes">
        {chars.map((c, i) => <span key={i} className="fi-code-box">{c.trim()}</span>)}
      </span>
    );
  };

  const fmtMontant = (val: string): string => {
    const n = parseFloat(val);
    if (!n || isNaN(n)) return '';
    return Math.round(n).toLocaleString('fr-FR');
  };

  const prevEx = exercices.find(e => e.annee === annee - 1);
  const prevDateFin = prevEx?.date_fin ? fmtDateShort(new Date(prevEx.date_fin)) : (p('exercice_precedent_clos') ? fmtDateShort(new Date(p('exercice_precedent_clos'))) : '');
  const prevDuree = prevEx?.duree_mois?.toString() || p('duree_exo_precedent') || '';

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
    a.download = 'Fiche_identification_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    if (!previewUrl) return;
    const win = window.open(previewUrl, '_blank');
    if (win) win.print();
  };

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>{page === 'R1' ? 'Fiche R1' : 'Fiche R2'}</h2>
        </div>
        <div className="bilan-toolbar-right">
          {onGoToParametres && (
            <button className="bilan-export-btn secondary" onClick={onGoToParametres}>
              <LuSettings /> Modifier dans Paramètres
            </button>
          )}
          <button className="bilan-export-btn secondary" onClick={openPreview}>
            <LuEye /> Apercu
          </button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('Fiche_identification_' + annee + '.pdf'); }}>
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

      {page === 'R1' && (
        <FicheR1
          pageRef={pageRef}
          entiteName={entiteName}
          entiteSigle={entiteSigle}
          entiteAdresse={entiteAdresse}
          entiteNif={entiteNif}
          dateDebut={dateDebut}
          dateFin={dateFin}
          duree={duree}
          prevDateFin={prevDateFin}
          prevDuree={prevDuree}
          p={p}
          fmtDate={fmtDate}
          fmtDateShort={fmtDateShort}
        />
      )}

      {page === 'R2' && (
        <FicheR2
          pageRef={pageRef}
          entiteName={entiteName}
          entiteNif={entiteNif}
          dateFin={dateFin}
          duree={duree}
          caHT={caHT}
          p={p}
          fmtDateShort={fmtDateShort}
          codeBoxes={codeBoxes}
          fmtMontant={fmtMontant}
        />
      )}

      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Apercu — Fiche d'identification {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF}><LuPrinter /> Imprimer</button>
                <button className="pdf-action-btn primary" onClick={downloadPDF}><LuDownload /> Telecharger</button>
                <button className="pdf-close-btn" onClick={closePreview}><LuX /></button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe src={previewUrl} title="Apercu Fiche identification PDF" className="pdf-preview-iframe" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FicheIdentification;
