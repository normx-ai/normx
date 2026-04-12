import React, { useState, useRef, useEffect } from 'react';
import '../BilanSYCEBNL.css';
import '../FicheIdentification.css';
import type { EtatBaseProps } from '../../types';
import { useNoteData } from './useNoteData';
import { usePDFPreview } from './usePDFPreview';
import NoteToolbar from './NoteToolbar';
import PDFPreviewModal from './PDFPreviewModal';
import EditableComment from './EditableComment';
import { thStyle, tdStyle, tdRight, inputSt } from './noteStyles';
import { LuInfo } from 'react-icons/lu';

interface Note16BProps extends EtatBaseProps {
  onGoToParametres?: () => void;
}

const HYPOTHESES = [
  'Taux d\'augmentation des salaires',
  'Taux d\'actualisation',
  'Taux d\'inflation',
  'Probabilite d\'etre present dans l\'entite a la date de depart a la retraite (experience passee)',
  'Probabilite d\'etre en vie a l\'age de depart a la retraite (table de mortalite)',
  'Taux de rendement effectif des actifs du regime',
];

const VARIATIONS = [
  'Obligation au titre des engagements de retraite a l\'ouverture',
  'Cout des services rendus au cours de l\'exercice',
  'Cout financier',
  'Pertes actuarielles / (gain)',
  'Prestations payees au cours de l\'exercice',
  'Cout des services passes',
  'Obligation au titre des engagements de retraite a la cloture',
];

const SENSIBILITE = [
  'Taux d\'actualisation (variation de ...%)',
  'Taux de progression des salaires (variation de ...%)',
  'Taux de depart du personnel (variation de ...%)',
];

const ACTIF_PASSIF_NET = [
  'Valeur actuelle de l\'obligation resultant de regimes finances',
  'Valeur actuelle des actifs affectes aux plans de retraite',
  'Excedent / Deficit de regime',
];

const ACTIFS_REGIME = [
  'Actions',
  'Obligations',
  'Autres',
];

const DEFAULT_COMM_HYP = '• Commenter les variations d\'hypotheses actuarielles utilisees pour le calcul des engagements de retraite et avantages assimiles.';
const DEFAULT_COMM_VAR = '• Indiquer le montant de la charge par nature comptabilisee au cours de l\'exercice.';
const DEFAULT_COMM_SENS = '• Indiquer l\'impact des variations obtenues sur le montant des engagements de retraite.';
const DEFAULT_COMM_AP_NET = '• Indiquer le montant comptabilise au passif (si actif) ou a l\'actif (si deficit) a la cloture de l\'exercice.';
const DEFAULT_COMM_ACTIFS = '• Expliquer comment les taux de rendement attendus par categorie d\'actifs et global ont ete determines.\n• Indiquer le montant des rendements reels des actifs affectes aux plans en N et N-1.';

function Note16B({ entiteName, entiteNif = '', entiteId, offre, onBack }: Note16BProps): React.JSX.Element {
  const {
    exercices, selectedExercice, setSelectedExercice,
    params, setParams, editing, setEditing, saving, saved, saveParams, annee, dateFin, duree,
  } = useNoteData({ entiteId });

  const pageRef = useRef<HTMLDivElement>(null);
  const pdf = usePDFPreview({ pageRef, fileName: `Note16B_${annee}.pdf`, editing, setEditing });

  const [data, setData] = useState<Record<string, string>>({});
  const [commentaireHyp, setCommentaireHyp] = useState(DEFAULT_COMM_HYP);
  const [commentaireVar, setCommentaireVar] = useState(DEFAULT_COMM_VAR);
  const [commentaireSens, setCommentaireSens] = useState(DEFAULT_COMM_SENS);
  const [commentaireAPNet, setCommentaireAPNet] = useState(DEFAULT_COMM_AP_NET);
  const [commentaireActifs, setCommentaireActifs] = useState(DEFAULT_COMM_ACTIFS);

  const getVal = (key: string): string => data[key] || '';
  const setVal = (key: string, value: string) => setData(prev => ({ ...prev, [key]: value }));

  // Charger data/commentaires depuis params
  useEffect(() => {
    if (!params['note16b_data'] && !params['note16b_comm_hyp']) return;
    if (params['note16b_data']) { try { setData(JSON.parse(params['note16b_data'])); } catch { /* */ } }
    setCommentaireHyp(params['note16b_comm_hyp'] || DEFAULT_COMM_HYP);
    setCommentaireVar(params['note16b_comm_var'] || DEFAULT_COMM_VAR);
    setCommentaireSens(params['note16b_comm_sens'] || DEFAULT_COMM_SENS);
    setCommentaireAPNet(params['note16b_comm_apnet'] || DEFAULT_COMM_AP_NET);
    setCommentaireActifs(params['note16b_comm_actifs'] || DEFAULT_COMM_ACTIFS);
  }, [params]);

  const handleSave = () => saveParams({
    ...params,
    note16b_data: JSON.stringify(data),
    note16b_comm_hyp: commentaireHyp,
    note16b_comm_var: commentaireVar,
    note16b_comm_sens: commentaireSens,
    note16b_comm_apnet: commentaireAPNet,
    note16b_comm_actifs: commentaireActifs,
  });

  const fmtDateShort = (d: string): string => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const renderInput = (key: string) => {
    if (!editing) return getVal(key);
    return <input value={getVal(key)} onChange={e => setVal(key, e.target.value)} style={inputSt} />;
  };

  return (
    <div>
      <NoteToolbar
        title="Note 16B — Engagements de retraite et avantages assimiles"
        exercices={exercices} selectedExercice={selectedExercice} onSelectExercice={setSelectedExercice}
        editing={editing} saving={saving} saved={saved}
        onEdit={() => setEditing(true)} onSave={handleSave} onPreview={pdf.openPreview} onBack={onBack}
      />

      {pdf.previewUrl && (
        <PDFPreviewModal previewUrl={pdf.previewUrl} title="Apercu — Note 16B" onClose={pdf.closePreview} onDownload={pdf.downloadPDF} onPrint={pdf.printPDF} />
      )}


      {/* Bulle d'information */}
      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Note 16B
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Engagement actuariel :</strong> Calcule selon la methode des unites de credit projetees (IAS 19 adapte SYSCOHADA).</li>
          <li><strong>Hypotheses cles :</strong> Taux d'actualisation, taux de rotation du personnel, taux d'augmentation des salaires, table de mortalite.</li>
          <li><strong>Comptabilisation :</strong> Provision au passif (compte 197) si methode retenue, sinon information en hors bilan.</li>
          <li>Doit etre reevalue chaque cloture par un actuaire ou une methode simplifiee documentee.</li>
        </ul>
      </div>

      <div ref={pageRef} style={{
        width: '210mm', minHeight: '297mm', background: '#fff',
        margin: '0 auto 20px', padding: '6mm 10mm',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)', boxSizing: 'border-box',
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", fontSize: 12, color: '#1a1a1a',
      }}>
        <div className="etat-header-officiel">
          <div className="etat-header-grid">
            <div className="etat-header-row">
              <span className="etat-header-label">Designation entite :</span>
              <span className="etat-header-value">{entiteName || ''}</span>
              <span className="etat-header-label">Exercice clos le :</span>
              <span className="etat-header-value-right">{fmtDateShort(dateFin)}</span>
            </div>
            <div className="etat-header-row">
              <span className="etat-header-label">Numero d'identification :</span>
              <span className="etat-header-value">{entiteNif || ''}</span>
              <span className="etat-header-label">Duree (en mois) :</span>
              <span className="etat-header-value-right">{duree}</span>
            </div>
          </div>
        </div>
        <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '30px 0 20px', textDecoration: 'underline' }}>
          NOTE 16B — ENGAGEMENTS DE RETRAITE ET AVANTAGES ASSIMILES
        </h3>

        {/* HYPOTHESES ACTUARIELLES */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, margin: '10px 0 6px', border: '0.5px solid #000', padding: 6, background: '#f9f9f9' }}>HYPOTHESES ACTUARIELLES</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '60%' }}>Libelles</th>
              <th style={thStyle}>Annee N</th>
              <th style={thStyle}>Annee N-1</th>
            </tr>
          </thead>
          <tbody>
            {HYPOTHESES.map((h, i) => (
              <tr key={i}>
                <td style={tdStyle}>{h}</td>
                <td style={tdRight}>{renderInput(`hyp_${i}_n`)}</td>
                <td style={tdRight}>{renderInput(`hyp_${i}_n1`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '6px 10px', marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaireHyp} onChange={setCommentaireHyp} editing={editing} minHeight={35} />
        </div>

        {/* VARIATION DE LA VALEUR DE L'ENGAGEMENT */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, margin: '10px 0 6px', border: '0.5px solid #000', padding: 6, background: '#f9f9f9' }}>VARIATION DE LA VALEUR DE L'ENGAGEMENT DE RETRAITE AU COURS DE L'EXERCICE</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '60%' }}>Libelles</th>
              <th style={thStyle}>Annee N</th>
              <th style={thStyle}>Annee N-1</th>
            </tr>
          </thead>
          <tbody>
            {VARIATIONS.map((v, i) => (
              <tr key={i}>
                <td style={i === 0 || i === VARIATIONS.length - 1 ? { ...tdStyle, fontWeight: 600, fontStyle: 'italic' } : tdStyle}>{v}</td>
                <td style={tdRight}>{renderInput(`var_${i}_n`)}</td>
                <td style={tdRight}>{renderInput(`var_${i}_n1`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '6px 10px', marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaireVar} onChange={setCommentaireVar} editing={editing} minHeight={35} />
        </div>

        {/* ACTIF / PASSIF NET COMPTABILISE AU TITRE DES REGIMES FINANCES */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, margin: '10px 0 6px', border: '0.5px solid #000', padding: 6, background: '#f9f9f9' }}>ACTIF / PASSIF NET COMPTABILISE AU TITRE DES REGIMES FINANCES</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '60%' }}>Libelles</th>
              <th style={thStyle}>Annee N</th>
              <th style={thStyle}>Annee N-1</th>
            </tr>
          </thead>
          <tbody>
            {ACTIF_PASSIF_NET.map((l, i) => (
              <tr key={i}>
                <td style={i === ACTIF_PASSIF_NET.length - 1 ? { ...tdStyle, fontWeight: 700 } : tdStyle}>{l}</td>
                <td style={tdRight}>{renderInput(`apnet_${i}_n`)}</td>
                <td style={tdRight}>{renderInput(`apnet_${i}_n1`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '6px 10px', marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaireAPNet} onChange={setCommentaireAPNet} editing={editing} minHeight={35} />
        </div>

        {/* VALEUR ACTUELLE DES ACTIFS DE REGIME */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, margin: '10px 0 6px', border: '0.5px solid #000', padding: 6, background: '#f9f9f9' }}>VALEUR ACTUELLE DES ACTIFS DE REGIME</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '40%' }} rowSpan={2}>Libelles</th>
              <th style={thStyle} colSpan={2}>Annee N</th>
              <th style={thStyle} colSpan={2}>Annee N-1</th>
            </tr>
            <tr>
              <th style={thStyle}>Rendement attendu</th>
              <th style={thStyle}>Juste valeur des actifs</th>
              <th style={thStyle}>Rendement attendu</th>
              <th style={thStyle}>Juste valeur des actifs</th>
            </tr>
          </thead>
          <tbody>
            {ACTIFS_REGIME.map((l, i) => (
              <tr key={i}>
                <td style={tdStyle}>{l}</td>
                <td style={tdRight}>{renderInput(`actifs_${i}_n_rend`)}</td>
                <td style={tdRight}>{renderInput(`actifs_${i}_n_juste`)}</td>
                <td style={tdRight}>{renderInput(`actifs_${i}_n1_rend`)}</td>
                <td style={tdRight}>{renderInput(`actifs_${i}_n1_juste`)}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...tdStyle, fontWeight: 700 }}>Total</td>
              <td style={tdRight}>{renderInput(`actifs_total_n_rend`)}</td>
              <td style={tdRight}>{renderInput(`actifs_total_n_juste`)}</td>
              <td style={tdRight}>{renderInput(`actifs_total_n1_rend`)}</td>
              <td style={tdRight}>{renderInput(`actifs_total_n1_juste`)}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '6px 10px', marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaireActifs} onChange={setCommentaireActifs} editing={editing} minHeight={35} />
        </div>

        {/* ANALYSE DE SENSIBILITE */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, margin: '10px 0 6px', border: '0.5px solid #000', padding: 6, background: '#f9f9f9' }}>ANALYSE DE SENSIBILITE DES HYPOTHESES ACTUARIELLES</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '40%' }} rowSpan={2}>Libelles</th>
              <th style={thStyle} colSpan={2}>Annee N</th>
              <th style={thStyle} colSpan={2}>Annee N-1</th>
            </tr>
            <tr>
              <th style={thStyle}>Augmentation</th>
              <th style={thStyle}>Diminution</th>
              <th style={thStyle}>Augmentation</th>
              <th style={thStyle}>Diminution</th>
            </tr>
          </thead>
          <tbody>
            {SENSIBILITE.map((s, i) => (
              <tr key={i}>
                <td style={tdStyle}>{s}</td>
                <td style={tdRight}>{renderInput(`sens_${i}_n_aug`)}</td>
                <td style={tdRight}>{renderInput(`sens_${i}_n_dim`)}</td>
                <td style={tdRight}>{renderInput(`sens_${i}_n1_aug`)}</td>
                <td style={tdRight}>{renderInput(`sens_${i}_n1_dim`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ border: '0.5px solid #000', borderTop: 'none', padding: '6px 10px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>Commentaire :</p>
          <EditableComment value={commentaireSens} onChange={setCommentaireSens} editing={editing} minHeight={35} />
        </div>
      </div>
    </div>
  );
}

export default Note16B;
