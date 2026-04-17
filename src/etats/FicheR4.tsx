import React, { useState, useRef, useEffect } from 'react';
import { clientFetch } from '../lib/api';
import { useExercicesQuery } from '../hooks/useExercicesQuery';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSettings, LuSave, LuPenLine, LuInfo } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import './FicheIdentification.css';
import type { Exercice, EtatBaseProps, BalanceLigne } from '../types';

interface FicheR4Props extends EtatBaseProps {
  onGoToParametres?: () => void;
}

const NOTES: { id: string; intitule: string; defaultA?: boolean; defaultNA?: boolean }[] = [
  { id: 'note_1', intitule: 'DETTES GARANTIES PAR DES SURETES REELLES', defaultA: true },
  { id: 'note_2', intitule: 'INFORMATIONS OBLIGATOIRES', defaultA: true },
  { id: 'note_3a', intitule: 'IMMOBILISATION BRUTE', defaultA: true },
  { id: 'note_3b', intitule: 'BIENS PRIS EN LOCATION ACQUISITION', defaultNA: true },
  { id: 'note_3c', intitule: 'IMMOBILISATIONS : AMORTISSEMENTS', defaultA: true },
  { id: 'note_3d', intitule: 'IMMOBILISATIONS : PLUS-VALUES ET MOINS VALUE DE CESSION', defaultA: true },
  { id: 'note_3e', intitule: 'INFORMATIONS SUR LES REEVALUATIONS EFFECTUEES PAR L\'ENTITE', defaultA: true },
  { id: 'note_4', intitule: 'IMMOBILISATIONS FINANCIERES', defaultA: true },
  { id: 'note_5', intitule: 'ACTIF CIRCULANT ET DETTES CIRCULANTES HAO', defaultA: true },
  { id: 'note_6', intitule: 'STOCKS ET ENCOURS', defaultA: true },
  { id: 'note_7', intitule: 'CLIENTS', defaultA: true },
  { id: 'note_8', intitule: 'AUTRES CREANCES', defaultA: true },
  { id: 'note_9', intitule: 'TITRES DE PLACEMENT', defaultNA: true },
  { id: 'note_10', intitule: 'VALEURS A ENCAISSER', defaultNA: true },
  { id: 'note_11', intitule: 'DISPONIBILITES', defaultA: true },
  { id: 'note_12', intitule: 'ECARTS DE CONVERSION ET TRANSFERTS DE CHARGES', defaultA: true },
  { id: 'note_13', intitule: 'CAPITAL : VALEUR NOMINALE DES ACTIONS OU PARTS', defaultA: true },
  { id: 'note_14', intitule: 'PRIMES ET RESERVES', defaultA: true },
  { id: 'note_15a', intitule: 'SUBVENTIONS ET PROVISIONS REGLEMENTEES', defaultA: true },
  { id: 'note_15b', intitule: 'AUTRES FONDS PROPRES', defaultNA: true },
  { id: 'note_16a', intitule: 'DETTES FINANCIERES ET RESSOURCES ASSIMILEES', defaultA: true },
  { id: 'note_16b', intitule: 'ENGAGEMENTS DE RETRAITE ET AVANTAGES ASSIMILES (METHODE ACTUARIELLE)', defaultNA: true },
  { id: 'note_16b_bis', intitule: 'ENGAGEMENTS DE RETRAITE ET AVANTAGES ASSIMILES (METHODE ACTUARIELLE)', defaultA: true },
  { id: 'note_16c', intitule: 'ACTIFS ET PASSIFS EVENTUELS', defaultA: true },
  { id: 'note_17', intitule: 'FOURNISSEURS D\'EXPLOITATION', defaultA: true },
  { id: 'note_18', intitule: 'DETTES FISCALES ET SOCIALES', defaultA: true },
  { id: 'note_19', intitule: 'AUTRES DETTES ET PROVISIONS POUR RISQUES A COURT TERME', defaultA: true },
  { id: 'note_20', intitule: 'BANQUES, CREDIT D\'ESCOMPTE ET DE TRESORERIE', defaultNA: true },
  { id: 'note_21', intitule: 'CHIFFRE D\'AFFAIRES ET AUTRES PRODUITS', defaultA: true },
  { id: 'note_22', intitule: 'ACHATS', defaultA: true },
  { id: 'note_23', intitule: 'TRANSPORTS', defaultA: true },
  { id: 'note_24', intitule: 'SERVICES EXTERIEURS', defaultA: true },
  { id: 'note_25', intitule: 'IMPOTS ET TAXES', defaultA: true },
  { id: 'note_26', intitule: 'AUTRES CHARGES', defaultA: true },
  { id: 'note_27a', intitule: 'CHARGES DE PERSONNEL', defaultA: true },
  { id: 'note_27b', intitule: 'EFFECTIFS, MASSE SALARIALE ET PERSONNEL EXTERIEUR', defaultA: true },
  { id: 'note_28', intitule: 'PROVISIONS ET DEPRECIATIONS INSCRITES AU BILAN', defaultA: true },
  { id: 'note_29', intitule: 'CHARGES ET REVENUS FINANCIERS', defaultA: true },
  { id: 'note_30', intitule: 'AUTRES CHARGES ET PRODUITS HAO', defaultA: true },
  { id: 'note_31', intitule: 'REPARTITION DU RESULTAT ET AUTRES ELEMENTS CARACTERISTIQUES DES', defaultA: true },
  { id: 'note_32', intitule: 'PRODUCTION DE L\'EXERCICE', defaultA: true },
  { id: 'note_33', intitule: 'ACHATS DESTINES A LA PRODUCTION', defaultA: true },
  { id: 'note_34', intitule: 'FICHE DE SYNTHESE DES PRINCIPAUX INDICATEURS FINANCIERS', defaultA: true },
  { id: 'note_35', intitule: 'LISTE DES INFORMATIONS SOCIALES, ENVIRONNEMENTALES ET SOCIETALES A FOURNIR', defaultNA: true },
  { id: 'note_36', intitule: 'TABLES DES CODES', defaultA: true },
];

const NOTE_LABELS: Record<string, string> = {
  note_1: 'NOTE 1', note_2: 'NOTE 2', note_3a: 'NOTE 3A', note_3b: 'NOTE 3B',
  note_3c: 'NOTE 3C', note_3d: 'NOTE 3D', note_3e: 'NOTE 3E',
  note_4: 'NOTE 4', note_5: 'NOTE 5', note_6: 'NOTE 6', note_7: 'NOTE 7',
  note_8: 'NOTE 8', note_9: 'NOTE 9', note_10: 'NOTE 10', note_11: 'NOTE 11',
  note_12: 'NOTE 12', note_13: 'NOTE 13', note_14: 'NOTE 14', note_15a: 'NOTE 15A',
  note_15b: 'NOTE 15B', note_16a: 'NOTE 16A', note_16b: 'NOTE 16B', note_16b_bis: 'NOTE 16B bis',
  note_16c: 'NOTE 16C', note_17: 'NOTE 17', note_18: 'NOTE 18', note_19: 'NOTE 19',
  note_20: 'NOTE 20', note_21: 'NOTE 21', note_22: 'NOTE 22', note_23: 'NOTE 23',
  note_24: 'NOTE 24', note_25: 'NOTE 25', note_26: 'NOTE 26', note_27a: 'NOTE 27A',
  note_27b: 'NOTE 27B', note_28: 'NOTE 28', note_29: 'NOTE 29', note_30: 'NOTE 30',
  note_31: 'NOTE 31', note_32: 'NOTE 32', note_33: 'NOTE 33', note_34: 'NOTE 34',
  note_35: 'NOTE 35', note_36: 'NOTE 36',
};

function FicheR4({ entiteName, entiteNif = '', entiteId, offre, onBack, onGoToParametres }: FicheR4Props): React.JSX.Element {
  const { exercices, selectedExercice, setSelectedExercice } = useExercicesQuery(entiteId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [noteStates, setNoteStates] = useState<Record<string, 'A' | 'NA'>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);

  const pageRef = useRef<HTMLDivElement>(null);

  // Mapping note → préfixes de comptes pour détection auto
  const NOTE_PREFIXES: Record<string, string[]> = {
    note_3a: ['21', '22', '23', '24', '25'],
    note_3b: ['22'],
    note_3c: ['28'],
    note_4: ['26', '27'],
    note_5: ['48', '481', '482', '483', '484', '485'],
    note_6: ['31', '32', '33', '34', '35', '36', '37', '38', '39'],
    note_7: ['41'],
    note_8: ['42', '43', '44', '45', '46', '471', '472', '473', '474', '476'],
    note_9: ['50'],
    note_10: ['51'],
    note_11: ['52', '53', '54', '55', '56', '57', '58'],
    note_12: ['478', '479'],
    note_13: ['10'],
    note_14: ['11'],
    note_15a: ['14', '15'],
    note_15b: ['12', '13'],
    note_16a: ['16', '17'],
    note_16b: ['19'],
    note_16c: ['19'],
    note_17: ['40'],
    note_18: ['42', '43', '44'],
    note_19: ['47', '48', '49'],
    note_20: ['52', '56'],
    note_21: ['70', '71', '72', '73', '74', '75', '76', '77', '78'],
    note_22: ['60'],
    note_23: ['61'],
    note_24: ['62', '63'],
    note_25: ['64'],
    note_26: ['65', '66', '67', '68'],
    note_27a: ['66'],
    note_27b: ['66'],
    note_28: ['29', '39', '49', '59'],
    note_29: ['77', '67'],
    note_30: ['82', '83', '84', '85', '86'],
    note_31: ['12', '13'],
    note_32: ['70', '71', '72', '73'],
    note_33: ['60'],
  };

  const hasDataForNote = (noteId: string): boolean => {
    const prefixes = NOTE_PREFIXES[noteId];
    if (!prefixes) return false;
    return lignesN.some(l => {
      const num = (l.numero_compte || '').trim();
      return prefixes.some(p => num.startsWith(p)) &&
        ((parseFloat(String(l.solde_debiteur)) || 0) !== 0 || (parseFloat(String(l.solde_crediteur)) || 0) !== 0);
    });
  };

  // Init default states
  useEffect(() => {
    const defaults: Record<string, 'A' | 'NA'> = {};
    NOTES.forEach(n => {
      defaults[n.id] = n.defaultNA ? 'NA' : 'A';
    });
    setNoteStates(defaults);
  }, []);

  // Load saved states from entité params
  useEffect(() => {
    if (!entiteId) return;
    clientFetch('/api/entites/' + entiteId)
      .then(r => r.json())
      .then(ent => {
        const data = ent.data || {};
        setParams(data);
        // Restore saved note states
        const saved: Record<string, 'A' | 'NA'> = {};
        NOTES.forEach(n => {
          const key = 'r4_' + n.id;
          if (data[key] === 'A' || data[key] === 'NA') saved[n.id] = data[key];
          else saved[n.id] = n.defaultNA ? 'NA' : 'A';
        });
        setNoteStates(saved);
      })
      .catch(() => {});
  }, [entiteId]);

  // Charger la balance pour détection auto A/NA
  const balanceSource = offre === 'comptabilite' ? 'ecritures' : 'import';
  useEffect(() => {
    if (!entiteId || !selectedExercice) return;
    const load = async () => {
      try {
        if (balanceSource === 'ecritures') {
          const res = await clientFetch('/api/ecritures/balance/' + entiteId + '/' + selectedExercice.id);
          setLignesN((await res.json()).lignes || []);
        } else {
          const res = await clientFetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
          setLignesN((await res.json()).lignes || []);
        }
      } catch { setLignesN([]); }
    };
    load();
  }, [entiteId, selectedExercice, balanceSource]);

  // Mise à jour auto des notes A/NA en fonction de la balance
  useEffect(() => {
    if (lignesN.length === 0) return;
    setNoteStates(prev => {
      const updated = { ...prev };
      NOTES.forEach(n => {
        // Notes sans mapping comptes : garder l'état actuel
        if (!NOTE_PREFIXES[n.id]) return;
        const has = hasDataForNote(n.id);
        updated[n.id] = has ? 'A' : 'NA';
      });
      return updated;
    });
  }, [lignesN]);

  const toggleNote = (id: string) => {
    setNoteStates(prev => ({
      ...prev,
      [id]: prev[id] === 'A' ? 'NA' : 'A',
    }));
  };

  // Save note states
  const saveStates = async () => {
    setSaving(true);
    const data: Record<string, string> = { ...params };
    NOTES.forEach(n => {
      data['r4_' + n.id] = noteStates[n.id] || 'A';
    });
    try {
      const res = await clientFetch(`/api/entites/${entiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      if (res.ok) {
        setParams(data);
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* */ }
    setSaving(false);
  };

  const duree = selectedExercice?.duree_mois || 12;
  const dateFin = selectedExercice?.date_fin ? new Date(selectedExercice.date_fin) : null;
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();

  const fmtDateShort = (d: Date | null): string => {
    if (!d) return '';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

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
    await saveStates();
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
    a.download = 'Fiche_R4_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    if (!previewUrl) return;
    const w = window.open(previewUrl);
    if (w) { w.onload = () => w.print(); }
  };

  const thStyle: React.CSSProperties = {
    border: '0.5px solid #000',
    padding: '6px 8px',
    fontSize: 11,
    fontWeight: 600,
    textAlign: 'center',
    verticalAlign: 'middle',
    background: '#dce6f0',
  };

  const tdStyle: React.CSSProperties = {
    border: '0.5px solid #000',
    padding: '4px 6px',
    fontSize: 10,
    verticalAlign: 'middle',
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="etat-toolbar">
        <button className="etat-back-btn" onClick={onBack}><LuArrowLeft size={18} /> Retour</button>
        <div className="etat-toolbar-title">Fiche R4 — Notes annexes</div>
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
          {!editing ? (
            <button className="etat-action-btn" onClick={() => setEditing(true)} style={{ background: '#D4A843', color: '#fff', border: 'none' }}>
              <LuPenLine size={16} /> Modifier
            </button>
          ) : (
            <button
              className="etat-action-btn"
              onClick={saveStates}
              disabled={saving}
              style={{ background: '#059669', color: '#fff', border: 'none' }}
            >
              <LuSave size={16} /> {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé' : 'Sauvegarder'}
            </button>
          )}
          <button className="etat-action-btn" onClick={openPreview}><LuEye size={16} /> Aperçu</button>
        </div>
      </div>

      {/* Preview modal */}
      {previewUrl && (
        <div className="etat-preview-overlay" onClick={closePreview}>
          <div className="etat-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="etat-preview-header">
              <span>Aperçu — Fiche R4</span>
              <div className="etat-preview-actions">
                <button onClick={printPDF} title="Imprimer"><LuPrinter size={18} /></button>
                <button onClick={downloadPDF} title="Télécharger"><LuDownload size={18} /></button>
                <button onClick={closePreview}><LuX size={18} /></button>
              </div>
            </div>
            <iframe src={previewUrl} className="etat-preview-iframe" title="Aperçu Fiche R4" />
          </div>
        </div>
      )}

      {/* Bulle d'information */}
      <div style={{ margin: '12px 20px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LuInfo size={14} /> Note d'information — Fiche R4
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Cliquer sur <strong>Modifier</strong> puis cliquer sur une ligne pour basculer entre <strong style={{ color: '#059669' }}>A</strong> (Applicable) et <strong style={{ color: '#dc2626' }}>N/A</strong> (Non applicable).</li>
          <li>Les notes applicables sont celles pour lesquelles l'entité a des opérations ou des soldes dans la balance.</li>
          <li>Cliquer sur <strong>Sauvegarder</strong> pour conserver vos choix.</li>
        </ul>
      </div>

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

        {/* Tableau des notes */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '12%' }}>NOTES</th>
              <th style={{ ...thStyle, width: '68%' }}>INTITULES</th>
              <th style={{ ...thStyle, width: '10%' }}>A</th>
              <th style={{ ...thStyle, width: '10%' }}>N/A</th>
            </tr>
          </thead>
          <tbody>
            {NOTES.map(note => {
              const state = noteStates[note.id] || 'A';
              return (
                <tr key={note.id}
                  onClick={() => { if (editing) toggleNote(note.id); }}
                  style={{ cursor: editing ? 'pointer' : 'default', background: editing && state === 'NA' ? '#fef9ee' : undefined }}
                >
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#1A3A5C' }}>{NOTE_LABELS[note.id]}</td>
                  <td style={tdStyle}>{note.intitule}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 13, color: state === 'A' ? '#059669' : '#ccc' }}>
                    {state === 'A' ? 'X' : editing ? '·' : ''}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 13, color: state === 'NA' ? '#dc2626' : '#ccc' }}>
                    {state === 'NA' ? 'X' : editing ? '·' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: 12, fontSize: 10, color: '#333' }}>
          <p style={{ margin: '4px 0' }}>A : Applicable &nbsp;&nbsp;&nbsp;&nbsp; N/A : Non applicable.</p>
          <p style={{ margin: '4px 0', fontStyle: 'italic' }}>
            Par exemple pour une entité qui n'a pas de stocks et en-cours, elle doit cocher à l'intersection ('ligne NOTE6' & 'colonne N/A')
          </p>
        </div>
      </div>
    </div>
  );
}

export default FicheR4;
