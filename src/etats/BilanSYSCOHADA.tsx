import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { BalanceLigne, Exercice, EtatBaseProps, ActifMapping, PassifMapping, BilanRow, Offre, BilanMode } from '../types';

// ===================== CALCUL XI DU CR (RÉSULTAT NET) pour CJ du Bilan =====================
// Reproduit exactement XI = Produits - Charges du Compte de Résultat SYSCOHADA

const CR_PRODUITS = ['70', '71', '72', '73', '75', '77', '78', '79', '82', '84', '86', '88'];
const CR_CHARGES = ['60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '81', '83', '85', '87', '89'];

function computeResultatNetCR(lignes: BalanceLigne[]): number {
  let produits = 0;
  let charges = 0;
  for (const l of lignes) {
    const num = (l.numero_compte || '').trim();
    const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
    const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
    if (CR_PRODUITS.some(p => num.startsWith(p))) {
      produits += sc - sd;
    }
    if (CR_CHARGES.some(p => num.startsWith(p))) {
      charges += sd - sc;
    }
  }
  return produits - charges;
}

// ===================== TABLEAU DE CORRESPONDANCE — BILAN SYSCOHADA =====================

// ACTIF — Mapping REF -> comptes OHADA (BRUT et Amortissements separement)
const ACTIF_MAPPING: Record<string, ActifMapping> = {
  AE: { brut: ['211', '2181', '2191'], amort: ['2811', '2818', '2911', '2918', '2919'] },
  AF: { brut: ['212', '213', '214', '2193'], amort: ['2812', '2813', '2814', '2912', '2913', '2914', '2919'] },
  AG: { brut: ['215', '216'], amort: ['2815', '2816', '2915', '2916'] },
  AH: { brut: ['217', '218', '2198'], brutExclude: ['2181'], amort: ['2817', '2818', '2917', '2918', '2919'] },
  AJ: { brut: ['22'], amort: ['282', '292'] },
  AK: { brut: ['231', '232', '233', '237', '2391'], amort: ['2831', '2832', '2833', '2837', '2931', '2932', '2933', '2937', '2939'] },
  AL: { brut: ['234', '235', '238', '2392', '2393'], amort: ['2834', '2835', '2838', '2934', '2935', '2938', '2939'] },
  AM: { brut: ['24'], brutExclude: ['245', '2495'], amort: ['284', '294', '2949'], amortExclude: ['2845', '2945'] },
  AN: { brut: ['245', '2495'], amort: ['2845', '2945', '2949'] },
  AP: { brut: ['251', '252'], amort: ['2951', '2952'] },
  AR: { brut: ['26'], amort: ['296'] },
  AS: { brut: ['27'], amort: ['297'] },
  BA: { brut: ['485', '488'], amort: ['498'] },
  BB: { brut: ['31', '32', '33', '34', '35', '36', '37', '38'], amort: ['39'] },
  BH: { brut: ['409'], amort: ['490'] },
  BI: { brut: ['41'], brutExclude: ['419'], amort: ['491'], debitOnly: ['41'] },
  BJ: { brut: ['185', '42', '43', '44', '45', '46', '47'], brutExclude: ['478'], amort: ['492', '493', '494', '495', '496', '497'], debitOnly: ['42', '43', '44', '45', '46', '47'] },
  BQ: { brut: ['50'], amort: ['590'] },
  BR: { brut: ['51'], amort: ['591'] },
  BS: { brut: ['52', '53', '54', '55', '57', '581', '582'], amort: ['592', '593', '594'], debitOnly: ['52', '53'] },
  BU: { brut: ['478'], amort: [] },
};

// PASSIF — Mapping REF -> comptes OHADA (soldes crediteurs)
const PASSIF_MAPPING: Record<string, PassifMapping> = {
  CA: { comptes: ['101', '102', '103', '104'] },
  CB: { comptes: ['109'], debitAccount: true },
  CD: { comptes: ['105'] },
  CE: { comptes: ['106'] },
  CF: { comptes: ['111', '112', '113'] },
  CG: { comptes: ['118'] },
  CH: { comptes: ['12'], computeSign: true },
  // CJ: calculé = XI du Compte de Résultat (produits - charges)
  CL: { comptes: ['14'] },
  CM: { comptes: ['15'] },
  DA: { comptes: ['16', '181', '182', '183', '184'] },
  DB: { comptes: ['17'] },
  DC: { comptes: ['19'] },
  DH: { comptes: ['481', '482', '484', '4998'] },
  DI: { comptes: ['419'] },
  DJ: { comptes: ['40'], exclude: ['409'] },
  DK: { comptes: ['42', '43', '44'], creditOnly: ['42', '43', '44'] },
  DM: { comptes: ['185', '45', '46', '47'], exclude: ['479'], creditOnly: ['185', '45', '46', '47'] },
  DN: { comptes: ['499', '599'], exclude: ['4998'] },
  DQ: { comptes: ['564', '565'] },
  DR: { comptes: ['52', '53', '561', '566'], creditOnly: ['52', '53'] },
  DV: { comptes: ['479'] },
};

// ===================== ACTIF ROWS =====================
const ACTIF_ROWS: BilanRow[] = [
  { ref: 'AD', type: 'subsection', note: '3', libelle: 'IMMOBILISATIONS INCORPORELLES', sumRefs: ['AE', 'AF', 'AG', 'AH'] },
  { ref: 'AE', type: 'indent', note: '', libelle: 'Frais de développement et de prospection' },
  { ref: 'AF', type: 'indent', note: '', libelle: 'Brevets, licences, logiciels et droits similaires' },
  { ref: 'AG', type: 'indent', note: '', libelle: 'Fonds commercial et droit au bail' },
  { ref: 'AH', type: 'indent', note: '', libelle: 'Autres immobilisations incorporelles' },
  { ref: 'AI', type: 'subsection', note: '3', libelle: 'IMMOBILISATIONS CORPORELLES', sumRefs: ['AJ', 'AK', 'AL', 'AM', 'AN'] },
  { ref: 'AJ', type: 'indent', note: '(1)', libelle: 'Terrains' },
  { ref: 'AK', type: 'indent', note: '', libelle: 'Bâtiments' },
  { ref: 'AL', type: 'indent', note: '', libelle: 'Aménagements, agencements et installations' },
  { ref: 'AM', type: 'indent', note: '', libelle: 'Matériel, mobilier et actifs biologiques' },
  { ref: 'AN', type: 'indent', note: '', libelle: 'Matériel de transport' },
  { ref: 'AP', type: 'indent', note: '3', libelle: 'Avances et acomptes versés sur immobilisations' },
  { ref: 'AQ', type: 'subsection', note: '4', libelle: 'IMMOBILISATIONS FINANCIÈRES', sumRefs: ['AR', 'AS'] },
  { ref: 'AR', type: 'indent', note: '', libelle: 'Titres de participation' },
  { ref: 'AS', type: 'indent', note: '', libelle: 'Autres immobilisations financières' },
  { ref: 'AZ', type: 'subtotal', libelle: 'TOTAL ACTIF IMMOBILISÉ', sumRefs: ['AE', 'AF', 'AG', 'AH', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AP', 'AR', 'AS'] },

  { ref: 'BA', type: 'indent', note: '5', libelle: 'Actif circulant HAO' },
  { ref: 'BB', type: 'indent', note: '6', libelle: 'Stocks et encours' },
  { ref: 'BG', type: 'subsection', note: '', libelle: 'CRÉANCES ET EMPLOIS ASSIMILÉS', sumRefs: ['BH', 'BI', 'BJ'] },
  { ref: 'BH', type: 'indent', note: '17', libelle: 'Fournisseurs avances versées' },
  { ref: 'BI', type: 'indent', note: '7', libelle: 'Clients' },
  { ref: 'BJ', type: 'indent', note: '8', libelle: 'Autres créances' },
  { ref: 'BK', type: 'subtotal', libelle: 'TOTAL ACTIF CIRCULANT', sumRefs: ['BA', 'BB', 'BH', 'BI', 'BJ'] },

  { ref: 'BQ', type: 'indent', note: '9', libelle: 'Titres de placement' },
  { ref: 'BR', type: 'indent', note: '10', libelle: 'Valeurs à encaisser' },
  { ref: 'BS', type: 'indent', note: '11', libelle: 'Banques, chèques postaux, caisse et assimilés' },
  { ref: 'BT', type: 'subtotal', libelle: 'TOTAL TRÉSORERIE-ACTIF', sumRefs: ['BQ', 'BR', 'BS'] },

  { ref: 'BU', type: 'indent', note: '12', libelle: 'Écart de conversion-Actif' },
  { ref: 'BZ', type: 'total', libelle: 'TOTAL GÉNÉRAL', sumRefs: ['AZ', 'BK', 'BT', 'BU'] },
];

// ===================== PASSIF ROWS =====================
const PASSIF_ROWS: BilanRow[] = [
  { ref: 'CA', type: 'indent', note: '13', libelle: 'Capital' },
  { ref: 'CB', type: 'indent', note: '13', libelle: 'Apporteurs capital non appelé (-)', negativeRef: true },
  { ref: 'CD', type: 'indent', note: '14', libelle: 'Primes liées au capital social' },
  { ref: 'CE', type: 'indent', note: '3e', libelle: 'Écarts de réévaluation' },
  { ref: 'CF', type: 'indent', note: '14', libelle: 'Réserves indisponibles' },
  { ref: 'CG', type: 'indent', note: '14', libelle: 'Réserves libres' },
  { ref: 'CH', type: 'indent', note: '14', libelle: 'Report à nouveau (+ ou -)' },
  { ref: 'CJ', type: 'subtotal', note: '', libelle: 'Résultat net de l\'exercice (bénéfice + ou perte -)' },
  { ref: 'CL', type: 'indent', note: '15', libelle: 'Subventions d\'investissement' },
  { ref: 'CM', type: 'indent', note: '15', libelle: 'Provisions réglementées' },
  { ref: 'CP', type: 'subtotal', libelle: 'TOTAL CAPITAUX PROPRES ET RESSOURCES ASSIMILÉES', sumRefs: ['CA', 'CB', 'CD', 'CE', 'CF', 'CG', 'CH', 'CJ', 'CL', 'CM'] },

  { ref: 'DA', type: 'indent', note: '16', libelle: 'Emprunts et dettes financières diverses' },
  { ref: 'DB', type: 'indent', note: '16', libelle: 'Dettes de location acquisition' },
  { ref: 'DC', type: 'indent', note: '16', libelle: 'Provisions pour risques et charges' },
  { ref: 'DD', type: 'subtotal', libelle: 'TOTAL DETTES FINANCIÈRES ET RESSOURCES ASSIMILÉES', sumRefs: ['DA', 'DB', 'DC'] },

  { ref: 'DF', type: 'subtotal', libelle: 'TOTAL RESSOURCES STABLES', sumRefs: ['CP', 'DD'] },

  { ref: 'DH', type: 'indent', note: '5', libelle: 'Dettes circulantes HAO' },
  { ref: 'DI', type: 'indent', note: '7', libelle: 'Clients, avances reçues' },
  { ref: 'DJ', type: 'indent', note: '17', libelle: 'Fournisseurs d\'exploitation' },
  { ref: 'DK', type: 'indent', note: '18', libelle: 'Dettes fiscales et sociales' },
  { ref: 'DM', type: 'indent', note: '19', libelle: 'Autres dettes' },
  { ref: 'DN', type: 'indent', note: '19', libelle: 'Provisions pour risques à court terme' },
  { ref: 'DP', type: 'subtotal', libelle: 'TOTAL PASSIF CIRCULANT', sumRefs: ['DH', 'DI', 'DJ', 'DK', 'DM', 'DN'] },

  { ref: 'DQ', type: 'indent', note: '20', libelle: 'Banques, crédits d\'escompte' },
  { ref: 'DR', type: 'indent', note: '20', libelle: 'Banques, établissements financiers et crédits de trésorerie' },
  { ref: 'DT', type: 'subtotal', libelle: 'TOTAL TRÉSORERIE-PASSIF', sumRefs: ['DQ', 'DR'] },

  { ref: 'DV', type: 'indent', note: '12', libelle: 'Écart de conversion-Passif' },
  { ref: 'DZ', type: 'total', libelle: 'TOTAL GÉNÉRAL', sumRefs: ['DF', 'DP', 'DT', 'DV'] },
];

interface ActifResult {
  brut: number;
  amort: number;
  net: number;
}

interface PassifResult {
  net: number;
}

function formatMontant(val: number): string {
  if (!val || val === 0) return '';
  return Math.round(val).toLocaleString('fr-FR');
}

// Check if account number matches any prefix in the list
function matchesComptes(numCompte: string, prefixes: string[]): boolean {
  return prefixes.some(p => numCompte.startsWith(p));
}

// Compute ACTIF values from balance lines
// debitOnly: comptes partages — ne prendre que si solde debiteur
// brutExclude/amortExclude: prefixes a exclure
function computeFromBalance(lignes: BalanceLigne[], mapping: Record<string, ActifMapping>): Record<string, ActifResult> {
  const result: Record<string, ActifResult> = {};

  for (const ref in mapping) {
    const brutComptes = mapping[ref].brut || [];
    const brutExclude = mapping[ref].brutExclude || [];
    const amortComptes = mapping[ref].amort || [];
    const amortExclude = mapping[ref].amortExclude || [];
    const debitOnly = mapping[ref].debitOnly || [];
    let brut = 0;
    let amort = 0;

    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;

      // Comptes brut (avec exclusions)
      if (matchesComptes(num, brutComptes) && !matchesComptes(num, brutExclude)) {
        if (debitOnly.length > 0 && matchesComptes(num, debitOnly)) {
          if (sd > sc) brut += sd - sc;
        } else {
          brut += sd - sc;
        }
      }
      // Comptes amortissements/depreciations (avec exclusions)
      if (matchesComptes(num, amortComptes) && !matchesComptes(num, amortExclude)) {
        amort += sc - sd;
      }
    }

    result[ref] = { brut, amort, net: brut - amort };
  }

  return result;
}

// Compute PASSIF values from balance lines
// creditOnly: comptes partages — ne prendre que si solde crediteur
// exclude: prefixes a exclure
// debitAccount: compte a solde debiteur (ex: 109 Apporteurs capital non appele)
function computePassifFromBalance(lignes: BalanceLigne[], mapping: Record<string, PassifMapping>): Record<string, PassifResult> {
  const result: Record<string, PassifResult> = {};

  for (const ref in mapping) {
    const comptes = mapping[ref].comptes || [];
    const exclude = mapping[ref].exclude || [];
    const creditOnly = mapping[ref].creditOnly || [];
    const isDebitAccount = mapping[ref].debitAccount || false;
    let net = 0;

    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;

      if (matchesComptes(num, comptes) && !matchesComptes(num, exclude)) {
        if (isDebitAccount) {
          // Compte 109: solde debiteur, apparait en negatif au passif
          net += sd - sc;
        } else if (creditOnly.length > 0 && matchesComptes(num, creditOnly)) {
          if (sc > sd) net += sc - sd;
        } else {
          net += sc - sd;
        }
      }
    }

    result[ref] = { net };
  }

  return result;
}

interface BilanSYSCOHADAProps extends EtatBaseProps {
  page?: BilanMode;
  offre?: Offre;
}

function BilanSYSCOHADA({ page = 'actif', entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: BilanSYSCOHADAProps): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const [balanceFound, setBalanceFound] = useState<boolean>(false);
  // Source automatique selon l'offre
  const balanceSource: string = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [sourceUsed, setSourceUsed] = useState<string>(''); // info affichee
  const [_notes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [showN1Detail, setShowN1Detail] = useState<boolean>(false);

  const pageActifRef = useRef<HTMLDivElement>(null);
  const pagePassifRef = useRef<HTMLDivElement>(null);

  // Load exercices
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

  // Charger balance depuis les ecritures et convertir au format balance_lignes
  const loadBalanceFromEcritures = async (entId: number, exId: number): Promise<BalanceLigne[]> => {
    const res = await fetch('/api/ecritures/balance/' + entId + '/' + exId);
    if (!res.ok) return [];
    const data: BalanceLigne[] = await res.json();
    // Convertir au meme format que balance_lignes
    return data.map(row => ({
      numero_compte: row.numero_compte,
      libelle_compte: row.libelle_compte,
      debit: parseFloat(String(row.debit)) || 0,
      credit: parseFloat(String(row.credit)) || 0,
      solde_debiteur: parseFloat(String(row.solde_debiteur)) || 0,
      solde_crediteur: parseFloat(String(row.solde_crediteur)) || 0,
      solde_debiteur_revise: row.solde_debiteur_revise != null ? parseFloat(String(row.solde_debiteur_revise)) : undefined,
      solde_crediteur_revise: row.solde_crediteur_revise != null ? parseFloat(String(row.solde_crediteur_revise)) : undefined,
    }));
  };

  // Load balance when exercice changes
  const loadBalance = useCallback(async (): Promise<void> => {
    if (!entiteId || !selectedExercice) return;
    setLoading(true);

    try {
      let lignesNResult: BalanceLigne[] = [];
      let lignesN1Result: BalanceLigne[] = [];
      let source = '';

      // --- Balance N ---
      if (balanceSource === 'ecritures') {
        lignesNResult = await loadBalanceFromEcritures(entiteId, selectedExercice.id);
        source = 'Ecritures comptables';
      } else {
        const resN = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N');
        const dataN = await resN.json();
        lignesNResult = dataN.lignes || [];
        source = 'Import balance';
      }

      setLignesN(lignesNResult);
      setBalanceFound(lignesNResult.length > 0);
      setSourceUsed(source);

      // --- Balance N-1 ---
      const prevExercice = exercices.find(e => e.annee === selectedExercice.annee - 1);
      if (prevExercice) {
        if (balanceSource === 'ecritures') {
          lignesN1Result = await loadBalanceFromEcritures(entiteId, prevExercice.id);
        } else {
          const resN1 = await fetch('/api/balance/' + entiteId + '/' + prevExercice.id + '/N');
          const dataN1 = await resN1.json();
          lignesN1Result = dataN1.lignes || [];
        }
      } else if (balanceSource === 'import') {
        const resN1 = await fetch('/api/balance/' + entiteId + '/' + selectedExercice.id + '/N-1');
        const dataN1 = await resN1.json();
        lignesN1Result = dataN1.lignes || [];
      }

      setLignesN1(lignesN1Result);
    } catch (_err) {
      // Erreur chargement balance silencieuse
    } finally {
      setLoading(false);
    }
  }, [entiteId, selectedExercice, exercices, balanceSource]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  // Compute values
  const actifN = computeFromBalance(lignesN, ACTIF_MAPPING);
  const actifN1 = computeFromBalance(lignesN1, ACTIF_MAPPING);
  const passifN: Record<string, PassifResult> = computePassifFromBalance(lignesN, PASSIF_MAPPING);
  const passifN1: Record<string, PassifResult> = computePassifFromBalance(lignesN1, PASSIF_MAPPING);

  // CJ = XI du Compte de Résultat (produits - charges)
  passifN['CJ'] = { net: computeResultatNetCR(lignesN) };
  passifN1['CJ'] = { net: computeResultatNetCR(lignesN1) };

  // Compute subtotals and totals
  const getActifValue = (ref: string, field: 'brut' | 'amort' | 'net'): number => {
    const row = ACTIF_ROWS.find(r => r.ref === ref);
    if (row && row.sumRefs) {
      return row.sumRefs.reduce((sum: number, r: string) => {
        const subRow = ACTIF_ROWS.find(sr => sr.ref === r);
        if (subRow && subRow.sumRefs) {
          return sum + getActifValue(r, field);
        }
        return sum + (actifN[r] ? (actifN[r][field] || 0) : 0);
      }, 0);
    }
    return actifN[ref] ? (actifN[ref][field] || 0) : 0;
  };

  const getActifValueN1 = (ref: string, field: 'brut' | 'amort' | 'net'): number => {
    const row = ACTIF_ROWS.find(r => r.ref === ref);
    if (row && row.sumRefs) {
      return row.sumRefs.reduce((sum: number, r: string) => {
        const subRow = ACTIF_ROWS.find(sr => sr.ref === r);
        if (subRow && subRow.sumRefs) {
          return sum + getActifValueN1(r, field);
        }
        return sum + (actifN1[r] ? (actifN1[r][field] || 0) : 0);
      }, 0);
    }
    return actifN1[ref] ? (actifN1[ref][field] || 0) : 0;
  };

  const getPassifValue = (ref: string, isN1: boolean): number => {
    const data = isN1 ? passifN1 : passifN;
    const row = PASSIF_ROWS.find(r => r.ref === ref);
    if (row && row.sumRefs) {
      return row.sumRefs.reduce((sum: number, r: string) => {
        const subRow = PASSIF_ROWS.find(sr => sr.ref === r);
        // CB (Apporteurs capital non appele) is negative in the sum
        const passifRow = PASSIF_ROWS.find(pr => pr.ref === r);
        const sign = (passifRow && passifRow.negativeRef) ? -1 : 1;
        if (subRow && subRow.sumRefs) {
          return sum + sign * getPassifValue(r, isN1);
        }
        return sum + sign * (data[r] ? (data[r].net || 0) : 0);
      }, 0);
    }
    return data[ref] ? (data[ref].net || 0) : 0;
  };

  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();

  const generatePDF = async (): Promise<jsPDF> => {
    const pdf = new jsPDF('p', 'mm', 'a4');

    const currentRef = page === 'passif' ? pagePassifRef : pageActifRef;
    if (currentRef.current) {
      const canvas = await html2canvas(currentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

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
    a.download = 'Bilan_SYSCOHADA_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = (): void => {
    if (!previewUrl) return;
    const win = window.open(previewUrl, '_blank');
    if (win) win.print();
  };

  const duree = selectedExercice?.duree_mois || 12;

  const renderHeader = (_titre: string, sousTitre: string): React.JSX.Element => (
    <div className="etat-header-officiel">
      <div className="etat-header-grid">
        <div className="etat-header-row">
          <span className="etat-header-label">Désignation entité :</span>
          <span className="etat-header-value">{entiteName || ''}</span>
          <span className="etat-header-label">Exercice clos le :</span>
          <span className="etat-header-value-right">31-12-{annee}</span>
        </div>
        <div className="etat-header-row">
          <span className="etat-header-label">Numéro d'identification :</span>
          <span className="etat-header-value">{entiteNif || ''}</span>
          <span className="etat-header-label">Durée (en mois) :</span>
          <span className="etat-header-value-right">{duree}</span>
        </div>
      </div>
      <div className="etat-sub-titre">{sousTitre}</div>
    </div>
  );

  const renderFooter = (): React.JSX.Element => (
    <div className="bilan-footer">
      <span>NORMX États — SYSCOHADA</span>
      <span>Exercice clos le 31/12/{annee}</span>
    </div>
  );

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Bilan SYSCOHADA — {page === 'passif' ? 'Passif' : 'Actif'}</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}>
            <LuEye /> Aperçu
          </button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('Bilan_' + (page === 'passif' ? 'Passif' : 'Actif') + '_SYSCOHADA_' + annee + '.pdf'); }}>
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
        {sourceUsed && <span style={{ marginLeft: 16, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Source : {sourceUsed}</span>}
        <span>(Montants en FCFA)</span>
      </div>

      {!balanceFound && !loading && (
        <div className="bilan-alert">
          <LuTriangleAlert /> Aucune donnée pour cet exercice. {balanceSource === 'ecritures' ? 'Saisissez des écritures comptables pour cet exercice.' : 'Importez une balance CSV pour cet exercice.'}
        </div>
      )}

      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      {/* PAGE ACTIF */}
      {page === 'actif' && (<>
        <div className="a4-page" ref={pageActifRef}>
          {renderHeader('SYSTÈME COMPTABLE OHADA (SYSCOHADA)', `BILAN ACTIF AU 31/12/${annee}`)}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }} className="no-print">
            <button
              onClick={() => setShowN1Detail(!showN1Detail)}
              style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer', color: '#555' }}
            >
              {showN1Detail ? '− Masquer détail N-1' : '+ Détail N-1'}
            </button>
          </div>
          <table className="bilan-table">
            <thead>
              <tr>
                <th className="col-ref" rowSpan={2}>REF</th>
                <th className="col-libelle" rowSpan={2}>ACTIF</th>
                <th className="col-note" rowSpan={2}>Note</th>
                <th className="col-montant-group" colSpan={3}>EXERCICE AU 31/12/{annee}</th>
                {showN1Detail && <th className="col-montant-group n1-detail" colSpan={3}>EXERCICE AU 31/12/{annee - 1}</th>}
                {!showN1Detail && <th className="col-montant" rowSpan={2}>EXERCICE AU 31/12/{annee - 1}<br/>NET</th>}
              </tr>
              <tr>
                <th className="col-montant">BRUT</th>
                <th className="col-montant">AMORT et DÉPREC.</th>
                <th className="col-montant">NET</th>
                {showN1Detail && <th className="col-montant n1-detail">BRUT</th>}
                {showN1Detail && <th className="col-montant n1-detail">AMORT et DÉPREC.</th>}
                {showN1Detail && <th className="col-montant n1-detail">NET</th>}
              </tr>
            </thead>
            <tbody>
              {ACTIF_ROWS.map((row, i) => {
                const rowClass = row.type === 'subsection' ? 'row-subsection'
                  : row.type === 'total' ? 'row-total'
                  : row.type === 'subtotal' ? 'row-subtotal'
                  : 'row-indent';

                const ref = row.ref || '';
                const isComputed = row.type === 'subtotal' || row.type === 'total' || !!row.sumRefs;

                let brut: number, amort: number, netN: number;
                let brutN1: number, amortN1: number, netN1: number;
                if (isComputed) {
                  brut = getActifValue(ref, 'brut');
                  amort = getActifValue(ref, 'amort');
                  netN = getActifValue(ref, 'net');
                  brutN1 = getActifValueN1(ref, 'brut');
                  amortN1 = getActifValueN1(ref, 'amort');
                  netN1 = getActifValueN1(ref, 'net');
                } else {
                  brut = actifN[ref] ? actifN[ref].brut : 0;
                  amort = actifN[ref] ? actifN[ref].amort : 0;
                  netN = actifN[ref] ? actifN[ref].net : 0;
                  brutN1 = actifN1[ref] ? actifN1[ref].brut : 0;
                  amortN1 = actifN1[ref] ? actifN1[ref].amort : 0;
                  netN1 = actifN1[ref] ? actifN1[ref].net : 0;
                }

                return (
                  <tr key={i} className={rowClass}>
                    <td className="col-ref">{ref}</td>
                    <td className="col-libelle">{row.libelle}</td>
                    <td className="col-note">{row.note || ''}</td>
                    <td className="col-montant">{formatMontant(brut)}</td>
                    <td className="col-montant">{formatMontant(amort)}</td>
                    <td className="col-montant">{formatMontant(netN)}</td>
                    {showN1Detail && <td className="col-montant n1-detail">{formatMontant(brutN1)}</td>}
                    {showN1Detail && <td className="col-montant n1-detail">{formatMontant(amortN1)}</td>}
                    <td className="col-montant">{formatMontant(netN1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {renderFooter()}
      </>)}

      {/* PAGE PASSIF */}
      {page === 'passif' && (<>
        <div className="a4-page" ref={pagePassifRef}>
          {renderHeader('SYSTÈME COMPTABLE OHADA (SYSCOHADA)', `BILAN PASSIF AU 31/12/${annee}`)}

          <table className="bilan-table">
            <thead>
              <tr>
                <th className="col-ref">REF</th>
                <th className="col-libelle">PASSIF</th>
                <th className="col-note">Note</th>
                <th className="col-montant">EXERCICE AU 31/12/{annee}<br/>NET</th>
                <th className="col-montant">EXERCICE AU 31/12/{annee - 1}<br/>NET</th>
              </tr>
            </thead>
            <tbody>
              {PASSIF_ROWS.map((row, i) => {
                const rowClass = row.type === 'total' ? 'row-total'
                  : row.type === 'subtotal' ? 'row-subtotal'
                  : 'row-indent';

                const ref = row.ref || '';
                const isComputed = row.type === 'subtotal' || row.type === 'total';

                let netN = isComputed ? getPassifValue(ref, false) : (passifN[ref] ? passifN[ref].net : 0);
                let netN1Val = isComputed ? getPassifValue(ref, true) : (passifN1[ref] ? passifN1[ref].net : 0);

                // CB is displayed as negative (Apporteurs capital non appele)
                if (row.negativeRef && !isComputed) {
                  netN = -netN;
                  netN1Val = -netN1Val;
                }

                return (
                  <tr key={i} className={rowClass}>
                    <td className="col-ref">{ref}</td>
                    <td className="col-libelle">{row.libelle}</td>
                    <td className="col-note">{row.note || ''}</td>
                    <td className="col-montant">{formatMontant(netN)}</td>
                    <td className="col-montant">{formatMontant(netN1Val)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

        </div>
        {/* Equilibre */}
        <div className="bilan-equilibre">
          {(() => {
            const totalActif = getActifValue('BZ', 'net');
            const totalPassif = getPassifValue('DZ', false);
            const ecart = Math.abs(totalActif - totalPassif);
            const ok = ecart < 1;
            return (
              <span className={ok ? 'equilibre-ok' : 'equilibre-ko'}>
                {ok
                  ? 'Équilibre vérifié : Actif = Passif'
                  : 'Ecart Actif/Passif : ' + formatMontant(ecart) + ' FCFA'
                }
              </span>
            );
          })()}
        </div>
        {renderFooter()}
      </>)}

      {/* Modale apercu PDF */}
      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Aperçu — Bilan {page === 'passif' ? 'Passif' : 'Actif'} SYSCOHADA {annee}</h3>
              <div className="pdf-preview-actions">
                <button className="pdf-action-btn" onClick={printPDF}>
                  <LuPrinter /> Imprimer
                </button>
                <button className="pdf-action-btn primary" onClick={downloadPDF}>
                  <LuDownload /> Télécharger
                </button>
                <button className="pdf-close-btn" onClick={closePreview}>
                  <LuX />
                </button>
              </div>
            </div>
            <div className="pdf-preview-body">
              <iframe
                src={previewUrl}
                title="Aperçu Bilan PDF"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BilanSYSCOHADA;
