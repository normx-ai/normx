import React, { useState, useRef, useEffect } from 'react';
import { LuDownload, LuArrowLeft, LuEye, LuX, LuPrinter, LuSettings } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import './FicheIdentification.css';
import type { Exercice, EtatBaseProps, BalanceLigne } from '../types';

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

function FicheIdentification({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', entiteId, offre, onBack, onGoToParametres, page = 'R1' }: FicheIdentificationProps): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [caHT, setCaHT] = useState<number>(0);

  const pageRef = useRef<HTMLDivElement>(null);

  // Charger entité complète (paramètres depuis data jsonb)
  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/entites/' + entiteId)
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

  useEffect(() => {
    if (!entiteId) return;
    fetch('/api/balance/exercices/' + entiteId)
      .then(r => r.json())
      .then((data: Exercice[]) => {
        setExercices(data);
        if (data.length > 0) {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth();
          const preferYear = month <= 2 ? year - 1 : year;
          const pick = data.find(e => e.annee === preferYear)
            || data.find(e => e.annee === year)
            || data.find(e => e.annee === year - 1)
            || data[0];
          setSelectedExercice(pick);
        }
      })
      .catch(() => {});
  }, [entiteId]);

  // Charger la balance pour calculer le CA HT
  const balanceSource = offre === 'comptabilite' ? 'ecritures' : 'import';
  useEffect(() => {
    if (!entiteId || !selectedExercice) { setCaHT(0); return; }
    const load = async () => {
      try {
        let lignes: BalanceLigne[] = [];
        if (balanceSource === 'ecritures') {
          const res = await fetch('/api/ecritures/balance/' + entiteId + '/' + selectedExercice.id);
          const data = await res.json();
          lignes = data.lignes || [];
        } else {
          const res = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
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

  // Code boxes helper : affiche chaque caractère dans une case
  const codeBoxes = (value: string, length: number): React.JSX.Element => {
    const chars = value.padEnd(length, ' ').split('').slice(0, length);
    return (
      <span className="fi-code-boxes">
        {chars.map((c, i) => <span key={i} className="fi-code-box">{c.trim()}</span>)}
      </span>
    );
  };

  // Format montant
  const fmtMontant = (val: string): string => {
    const n = parseFloat(val);
    if (!n || isNaN(n)) return '';
    return Math.round(n).toLocaleString('fr-FR');
  };

  // Exercice précédent
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

      {/* FICHE R1 */}
      {page === 'R1' && <div className="a4-page fi-page" ref={pageRef}>

        {/* En-tête identique au Bilan */}
        <div className="etat-header-officiel">
          <div className="etat-header-grid">
            <div className="etat-header-row">
              <span className="etat-header-label">Désignation entité :</span>
              <span className="etat-header-value">{entiteName || ''}</span>
              <span className="etat-header-label">Exercice clos le :</span>
              <span className="etat-header-value-right">{fmtDateShort(dateFin)}</span>
            </div>
            <div className="etat-header-row">
              <span className="etat-header-label">Numéro d'identification :</span>
              <span className="etat-header-value">{entiteNif || ''}</span>
              <span className="etat-header-label">Durée (en mois) :</span>
              <span className="etat-header-value-right">{duree}</span>
            </div>
          </div>
          <div className="etat-sub-titre">Fiche R1</div>
        </div>

        {/* Lignes REF — 7 colonnes pour ZG (tel, email, Code, BP, Ville) */}
        <table className="fi-ref-table">
          <colgroup>
            <col style={{ width: '4%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '18%' }} />
          </colgroup>
          <tbody>
            {/* ZA */}
            <tr>
              <td className="fi-ref">ZA</td>
              <td className="fi-val" style={{ whiteSpace: 'nowrap' }}>EXERCICE COMPTABLE :</td>
              <td className="fi-val" style={{ textAlign: 'right' }}>DU :</td>
              <td className="fi-val" style={{ textAlign: 'center' }}>{fmtDate(dateDebut)}</td>
              <td className="fi-val" style={{ textAlign: 'right' }}>AU :</td>
              <td className="fi-val" colSpan={2} style={{ textAlign: 'center' }}>{fmtDate(dateFin)}</td>
            </tr>

            {/* ZB */}
            <tr>
              <td className="fi-ref">ZB</td>
              <td className="fi-val" colSpan={2}>DATE D'ARRETE EFFECTIF DES COMPTES :</td>
              <td className="fi-val" colSpan={4}>{p('date_arrete_comptes') ? fmtDate(new Date(p('date_arrete_comptes'))) : ''}</td>
            </tr>

            {/* ZC */}
            <tr>
              <td className="fi-ref">ZC</td>
              <td className="fi-val" colSpan={2}>EXERCICE PRECEDENT CLOS LE :</td>
              <td className="fi-val" style={{ textAlign: 'center' }}>{prevDateFin}</td>
              <td className="fi-val" colSpan={2} style={{ whiteSpace: 'nowrap' }}>DUREE EXERCICE PRECEDENT EN MOIS :</td>
              <td className="fi-val" style={{ textAlign: 'center' }}>{prevDuree}</td>
            </tr>

            {/* ZD */}
            <tr>
              <td className="fi-ref">ZD</td>
              <td className="fi-val" style={{ textAlign: 'center' }}>{p('greffe')}</td>
              <td className="fi-val" colSpan={2} style={{ textAlign: 'center' }}>{p('num_registre')}</td>
              <td className="fi-val" colSpan={3} style={{ textAlign: 'center' }}>{p('num_repertoire')}</td>
            </tr>
            <tr className="fi-label-row">
              <td></td>
              <td className="fi-sub-label" style={{ textAlign: 'center' }}>Greffe</td>
              <td className="fi-sub-label" colSpan={2} style={{ textAlign: 'center' }}>N° Registre du Commerce</td>
              <td className="fi-sub-label" colSpan={3} style={{ textAlign: 'center' }}>N° registre des entités</td>
            </tr>

            {/* ZE */}
            <tr>
              <td className="fi-ref">ZE</td>
              <td className="fi-val" style={{ textAlign: 'center' }}>{p('num_cnss')}</td>
              <td className="fi-val" colSpan={2} style={{ textAlign: 'center' }}>{p('code_importateur')}</td>
              <td className="fi-val" colSpan={3} style={{ textAlign: 'center' }}>{p('code_activite_principale')}</td>
            </tr>
            <tr className="fi-label-row">
              <td></td>
              <td className="fi-sub-label" style={{ textAlign: 'center' }}>N° de caisse sociale</td>
              <td className="fi-sub-label" colSpan={2} style={{ textAlign: 'center' }}>N° Code Importateur</td>
              <td className="fi-sub-label" colSpan={3} style={{ textAlign: 'center' }}>Code activité principale</td>
            </tr>

            {/* ZF */}
            <tr>
              <td className="fi-ref">ZF</td>
              <td className="fi-val" colSpan={4} style={{ textAlign: 'center' }}>{entiteName}</td>
              <td className="fi-val" colSpan={2} style={{ textAlign: 'center' }}>{entiteSigle}</td>
            </tr>
            <tr className="fi-label-row">
              <td></td>
              <td className="fi-sub-label" colSpan={4} style={{ textAlign: 'center' }}>Désignation de l'entité</td>
              <td className="fi-sub-label" colSpan={2} style={{ textAlign: 'center' }}>Sigle</td>
            </tr>

            {/* ZG — 5 sous-colonnes : tel, email, Code, BP, Ville */}
            <tr>
              <td className="fi-ref">ZG</td>
              <td className="fi-val" style={{ textAlign: 'center' }}>{p('telephone')}</td>
              <td className="fi-val" style={{ textAlign: 'center' }}>{p('email')}</td>
              <td className="fi-val" style={{ textAlign: 'center' }}>{p('code_postal')}</td>
              <td className="fi-val" style={{ textAlign: 'center' }}>{p('boite_postale')}</td>
              <td className="fi-val" colSpan={2} style={{ textAlign: 'center' }}>{p('ville')}</td>
            </tr>
            <tr className="fi-label-row">
              <td></td>
              <td className="fi-sub-label" style={{ textAlign: 'center' }}>N° de téléphone</td>
              <td className="fi-sub-label" style={{ textAlign: 'center' }}>email</td>
              <td className="fi-sub-label" style={{ textAlign: 'center' }}>Code</td>
              <td className="fi-sub-label" style={{ textAlign: 'center' }}>Boîte postale</td>
              <td className="fi-sub-label" colSpan={2} style={{ textAlign: 'center' }}>Ville</td>
            </tr>

            {/* ZH */}
            <tr>
              <td className="fi-ref">ZH</td>
              <td className="fi-val" colSpan={6} style={{ textAlign: 'center' }}>{entiteAdresse}</td>
            </tr>
            <tr className="fi-label-row">
              <td></td>
              <td className="fi-sub-label" colSpan={6} style={{ textAlign: 'center' }}>Adresse géographique complète (Immeuble, rue, quartier, ville, pays)</td>
            </tr>

            {/* ZI */}
            <tr>
              <td className="fi-ref">ZI</td>
              <td className="fi-val" colSpan={6} style={{ textAlign: 'center' }}>{p('activite_principale')}</td>
            </tr>
            <tr className="fi-label-row">
              <td></td>
              <td className="fi-sub-label" colSpan={6} style={{ textAlign: 'center' }}>Désignation précise de l'activité principale exercée par l'entité</td>
            </tr>
          </tbody>
        </table>

        {/* Contact */}
        <div className="fi-text-block">
          <div className="fi-text-value" style={{ textAlign: 'center' }}>{p('personne_contact')}</div>
          <div className="fi-sub-label-indent" style={{ textAlign: 'center' }}>Nom, adresse et qualité de la personne à contacter en cas de demande d'informations complémentaires</div>
        </div>

        {/* Comptable */}
        <div className="fi-text-block">
          <div className="fi-text-value" style={{ textAlign: 'center' }}>
            {[p('professionnel_ef_nom'), p('professionnel_ef_adresse'), p('professionnel_ef_tel')].filter(Boolean).join(' ')}
          </div>
          <div className="fi-sub-label-indent" style={{ textAlign: 'center' }}>
            Nom du professionnel salarié de l'entité ou<br />
            nom, adresse et téléphone du cabinet comptable ou du professionnel <strong>INSCRIT A L'ORDRE NATIONAL<br />
            DES EXPERTS COMPTABLES ET DES COMPTABLES AGREES</strong> ayant établi les états financiers
          </div>
        </div>

        {/* Visa + AG dans le même bloc (comme sur l'image) */}
        <div className="fi-visa-ag-block">
          <div className="fi-visa-left">
            <div className="fi-visa-line-sep"></div>
            <div className="fi-text-value" style={{ textAlign: 'center', padding: '6px 0' }}>{p('visa_expert')}</div>
            <div className="fi-sub-label" style={{ textAlign: 'center' }}>Visa de l'Expert comptable ou du Comptable agréé</div>
          </div>
          <div className="fi-ag-right">
            <div className="fi-ag-checkboxes">
              <span className="fi-ag-option">
                <span className="fi-checkbox-box">☐</span>
                <span>Non</span>
              </span>
              <span className="fi-ag-option">
                <span className="fi-checkbox-box">{p('ag_approuve').toLowerCase() === 'non' ? '☑' : '☐'}</span>
                <span>Non</span>
              </span>
              <span className="fi-ag-option">
                <span className="fi-checkbox-box">{p('ag_approuve').toLowerCase() === 'oui' ? '☑' : '☐'}</span>
                <span>Oui</span>
              </span>
            </div>
            <div className="fi-sub-label" style={{ textAlign: 'right', marginTop: 4 }}>Etats financiers approuvés par l'Assemblée<br />Générale (cocher la case)</div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}></div>

        {/* Signataire + Banques — deux cadres séparés côte à côte */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 0, alignItems: 'stretch' }}>
          {/* Cadre gauche : Signataire + zone signature */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ textAlign: 'center', padding: 8, border: '0.5px solid #000' }}>{p('signataire_nom')}</div>
            <div style={{ textAlign: 'center', fontSize: 9, fontStyle: 'italic', color: '#555', padding: '2px 6px' }}>Nom du signataire des états financiers</div>
            <div style={{ textAlign: 'center', padding: 8, border: '0.5px solid #000' }}>{p('signataire_qualite')}</div>
            <div style={{ textAlign: 'center', fontSize: 9, fontStyle: 'italic', color: '#555', padding: '2px 6px' }}>Qualité du signataire des états financiers</div>
            <div style={{ textAlign: 'center', padding: 8, border: '0.5px solid #000' }}>{p('date_signature')}</div>
            <div style={{ textAlign: 'center', fontSize: 9, fontStyle: 'italic', color: '#555', padding: '2px 6px' }}>Date de signature</div>
            <div style={{ flex: 1, border: '0.5px solid #000', minHeight: 60 }}></div>
          </div>

          {/* Cadre droit : Banques */}
          <div style={{ flex: 1, border: '0.5px solid #000', display: 'flex', flexDirection: 'column' }}>
            <div style={{ textAlign: 'center', fontWeight: 600, padding: 8, borderBottom: '0.5px solid #000' }}>Domiciliations bancaires :</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', flex: 1 }}>
              <colgroup>
                <col style={{ width: '50%' }} />
                <col style={{ width: '50%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'center', fontSize: 9, fontStyle: 'italic', color: '#555', padding: '1px 4px', borderRight: '0.5px solid #000' }}>Banque</td>
                  <td style={{ textAlign: 'center', fontSize: 9, fontStyle: 'italic', color: '#555', padding: '1px 4px' }}>Numéro de compte</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center', padding: '4px 4px', borderTop: '0.5px solid #000', borderRight: '0.5px solid #000' }}>{p('banque')}</td>
                  <td style={{ textAlign: 'center', padding: '4px 4px', borderTop: '0.5px solid #000' }}>{p('numero_compte')}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center', padding: '4px 4px', borderTop: '0.5px solid #000', borderRight: '0.5px solid #000' }}>{p('banque_2')}</td>
                  <td style={{ textAlign: 'center', padding: '4px 4px', borderTop: '0.5px solid #000' }}>{p('numero_compte_2')}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center', padding: '4px 4px', borderTop: '0.5px solid #000', borderRight: '0.5px solid #000' }}>{p('banque_3')}</td>
                  <td style={{ textAlign: 'center', padding: '4px 4px', borderTop: '0.5px solid #000' }}>{p('numero_compte_3')}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center', padding: '4px 4px', borderTop: '0.5px solid #000', borderRight: '0.5px solid #000' }}>{p('banque_4')}</td>
                  <td style={{ textAlign: 'center', padding: '4px 4px', borderTop: '0.5px solid #000' }}>{p('numero_compte_4')}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center', padding: '4px 4px', borderTop: '0.5px solid #000', borderRight: '0.5px solid #000' }}>{p('banque_5')}</td>
                  <td style={{ textAlign: 'center', padding: '4px 4px', borderTop: '0.5px solid #000' }}>{p('numero_compte_5')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>}

      {/* FICHE R2 */}
      {page === 'R2' && <div className="a4-page fi-page" ref={pageRef}>

        {/* En-tête identique au Bilan */}
        <div className="etat-header-officiel">
          <div className="etat-header-grid">
            <div className="etat-header-row">
              <span className="etat-header-label">Désignation entité :</span>
              <span className="etat-header-value">{entiteName || ''}</span>
              <span className="etat-header-label">Exercice clos le :</span>
              <span className="etat-header-value-right">{fmtDateShort(dateFin)}</span>
            </div>
            <div className="etat-header-row">
              <span className="etat-header-label">Numéro d'identification :</span>
              <span className="etat-header-value">{entiteNif || ''}</span>
              <span className="etat-header-label">Durée (en mois) :</span>
              <span className="etat-header-value-right">{duree}</span>
            </div>
          </div>
          <div className="etat-sub-titre" style={{ marginTop: 16 }}>Fiche R2</div>
        </div>

        {/* Bloc ZK-ZP + Contrôle */}
        <div className="fi-p2-grid">
          {/* Colonne gauche : ZK à ZP */}
          <div className="fi-p2-left">
            <table className="fi-ref-table">
              <tbody>
                <tr>
                  <td className="fi-ref">ZK</td>
                  <td className="fi-val">Forme juridique (1) :</td>
                  <td className="fi-val">{codeBoxes(p('code_forme_juridique'), 4)}</td>
                </tr>
                <tr>
                  <td className="fi-ref">ZL</td>
                  <td className="fi-val">Régime fiscal (1) :</td>
                  <td className="fi-val">{codeBoxes(p('code_regime_fiscal'), 4)}</td>
                </tr>
                <tr>
                  <td className="fi-ref">ZM</td>
                  <td className="fi-val">Pays du siège social (1) :</td>
                  <td className="fi-val">{codeBoxes(p('code_pays_siege'), 4)}</td>
                </tr>
                <tr>
                  <td className="fi-ref">ZN</td>
                  <td className="fi-val">Nombre d'établissements dans le pays :</td>
                  <td className="fi-val">{codeBoxes(p('nb_etablissement_pays'), 4)}</td>
                </tr>
                <tr>
                  <td className="fi-ref">ZO</td>
                  <td className="fi-val" style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>
                    Nombre d'établissements hors du pays pour<br />
                    lesquels une comptabilité distincte est tenue :
                  </td>
                  <td className="fi-val">{codeBoxes(p('nb_etablissement_hors'), 4)}</td>
                </tr>
                <tr>
                  <td className="fi-ref">ZP</td>
                  <td className="fi-val">Première année d'exercice dans le pays :</td>
                  <td className="fi-val">{codeBoxes(p('premiere_annee_exercice'), 4)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Colonne droite : Contrôle de l'entité */}
          <div className="fi-p2-right">
            <div className="fi-controle-title">Contrôle de l'entité (cocher la case)</div>
            <table className="fi-controle-table">
              <tbody>
                <tr>
                  <td className="fi-ref">ZQ</td>
                  <td className="fi-val">Entité sous contrôle public</td>
                  <td className="fi-val fi-check-cell">
                    <span className="fi-checkbox-box">{p('controle_entite') === 'public' ? '☑' : '☐'}</span>
                  </td>
                </tr>
                <tr>
                  <td className="fi-ref">ZQ</td>
                  <td className="fi-val">Entité sous contrôle privé national</td>
                  <td className="fi-val fi-check-cell">
                    <span className="fi-checkbox-box">{p('controle_entite') === 'prive_national' ? '☑' : '☐'}</span>
                  </td>
                </tr>
                <tr>
                  <td className="fi-ref">ZS</td>
                  <td className="fi-val">Entité sous contrôle privé étranger</td>
                  <td className="fi-val fi-check-cell">
                    <span className="fi-checkbox-box">{p('controle_entite') === 'prive_etranger' ? '☑' : '☐'}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ACTIVITE DE L'ENTITE */}
        <div className="fi-activite-title">ACTIVITE DE L'ENTITE</div>

        <table className="fi-activite-table">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Désignation de l'activité (<sup>2</sup>)</th>
              <th style={{ width: '20%' }}>Code nomenclature<br />d'activité (<sup>1</sup>)</th>
              <th style={{ width: '25%' }}>Chiffre d'affaires HT<br />(CA HT)</th>
              <th style={{ width: '20%' }}>% activité<br />dans le CA<br />HT</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const ca2 = parseFloat(p('activite_2_ca_ht')) || 0;
              const ca1 = caHT - ca2;
              const pct1 = caHT > 0 ? (ca1 / caHT * 100).toFixed(2) : '';
              const pct2 = caHT > 0 && ca2 > 0 ? (ca2 / caHT * 100).toFixed(2) : '';
              return (<>
            <tr>
              <td>{p('activite_principale') || p('activite_1_designation')}</td>
              <td className="fi-val-center">{p('activite_1_code') ? codeBoxes(p('activite_1_code'), 5) : ''}</td>
              <td className="fi-val-right">{fmtMontant(String(caHT || 0))}</td>
              <td className="fi-val-right">{pct1 ? pct1 + '%' : ''}</td>
            </tr>
            <tr>
              <td>{p('activite_2_designation')}</td>
              <td className="fi-val-center">{p('activite_2_code') ? codeBoxes(p('activite_2_code'), 5) : ''}</td>
              <td className="fi-val-right"></td>
              <td className="fi-val-right">{pct2 && parseFloat(pct2) > 0 ? pct2 + '%' : ''}</td>
            </tr>
            <tr>
              <td style={{ height: 28 }}></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>Divers</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr className="fi-total-row">
              <td></td>
              <td style={{ fontWeight: 700, textAlign: 'center' }}>TOTAL</td>
              <td></td>
              <td></td>
            </tr>
              </>);
            })()}
          </tbody>
        </table>

        {/* Notes */}
        <div className="fi-notes">
          <div className="fi-note-line"></div>
          <p>(<sup>1</sup>) NOTE 36</p>
          <p>(<sup>2</sup>) Lister de manière précise les activités dans l'ordre décroissant du C.A.HT, ou de la valeur ajoutée (V.A).</p>
        </div>

      </div>}

      {/* Modale apercu PDF */}
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
