import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { LuDownload, LuArrowLeft, LuTriangleAlert, LuEye, LuX, LuPrinter } from 'react-icons/lu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './BilanSYCEBNL.css';
import type { BalanceLigne, Exercice, EtatBaseProps, Offre } from '../types';
import { createLogger } from '../utils/logger';
import {
  PRODUITS_PREFIXES, CHARGES_PREFIXES, DOTATIONS_PREFIXES, REPRISES_PREFIXES_TFT, TFT_ROWS,
  formatMontant, matchesComptes,
  getSD, getSC, sumSoldeDebiteur, sumSoldeCrediteur, rawSD, rawSC, sumMvtDebit, sumMvtCredit,
  actifNet, passifVal,
  bilanBA, bilanBB, bilanBH, bilanBI, bilanBJ, bilanTresoActif, bilanDP, bilanTresoPassif,
  bilanAD_brut, bilanAI_brut,
  computeResultatNet, computeCAFG, computeAllFlux,
} from './TFT_helpers';

interface TFT_SYSCOHADAProps extends EtatBaseProps {
  offre?: Offre;
}

const log = createLogger('TFT');

function TFT_SYSCOHADA({ entiteName, entiteSigle = '', entiteAdresse = '', entiteNif = '', typeActivite, entiteId, offre = 'comptabilite', onBack }: TFT_SYSCOHADAProps): React.JSX.Element {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [lignesN, setLignesN] = useState<BalanceLigne[]>([]);
  const [lignesN1, setLignesN1] = useState<BalanceLigne[]>([]);
  const [lignesN2, setLignesN2] = useState<BalanceLigne[]>([]);
  const [balanceFound, setBalanceFound] = useState<boolean>(false);
  const balanceSource: string = offre === 'comptabilite' ? 'ecritures' : 'import';
  const [sourceUsed, setSourceUsed] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);

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

  const loadBalanceFromEcritures = async (entId: number, exId: number): Promise<BalanceLigne[]> => {
    const res = await fetch('/api/ecritures/balance/' + entId + '/' + exId);
    if (!res.ok) return [];
    const data: BalanceLigne[] = await res.json();
    return data.map(row => ({
      numero_compte: row.numero_compte,
      libelle_compte: row.libelle_compte,
      si_debit: parseFloat(String(row.si_debit)) || 0,
      si_credit: parseFloat(String(row.si_credit)) || 0,
      debit: parseFloat(String(row.debit)) || 0,
      credit: parseFloat(String(row.credit)) || 0,
      solde_debiteur: parseFloat(String(row.solde_debiteur)) || 0,
      solde_crediteur: parseFloat(String(row.solde_crediteur)) || 0,
      solde_debiteur_revise: row.solde_debiteur_revise != null ? parseFloat(String(row.solde_debiteur_revise)) : undefined,
      solde_crediteur_revise: row.solde_crediteur_revise != null ? parseFloat(String(row.solde_crediteur_revise)) : undefined,
    }));
  };

  const loadBalance = useCallback(async (): Promise<void> => {
    if (!entiteId || !selectedExercice) return;
    setLoading(true);
    log.info('loadBalance', { offre, balanceSource, entiteId, exerciceId: selectedExercice.id, annee: selectedExercice.annee });
    try {
      let lignesNResult: BalanceLigne[] = [];
      let lignesN1Result: BalanceLigne[] = [];
      let source = '';

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

      log.info('Balance N-1 chargee', { nbLignes: lignesN1Result.length, prevExercice: prevExercice?.annee ?? 'aucun', tresoComptes: lignesN1Result.filter(l => l.numero_compte.startsWith('5')).map(l => ({ c: l.numero_compte, sd: l.solde_debiteur, sc: l.solde_crediteur })) });
      setLignesN1(lignesN1Result);

      // Charger N-2 pour calculer les flux N-1
      let lignesN2Result: BalanceLigne[] = [];
      const prevPrevExercice = exercices.find(e => e.annee === selectedExercice.annee - 2);
      if (prevPrevExercice) {
        if (balanceSource === 'ecritures') {
          lignesN2Result = await loadBalanceFromEcritures(entiteId, prevPrevExercice.id);
        } else {
          const resN2 = await fetch('/api/balance/' + entiteId + '/' + prevPrevExercice.id + '/N');
          const dataN2 = await resN2.json();
          lignesN2Result = dataN2.lignes || [];
        }
      } else if (balanceSource === 'import') {
        // Essayer N-1 de l'exercice N-1
        const prevExN1 = exercices.find(e => e.annee === selectedExercice.annee - 1);
        if (prevExN1) {
          const resN2 = await fetch('/api/balance/' + entiteId + '/' + prevExN1.id + '/N-1');
          const dataN2 = await resN2.json();
          lignesN2Result = dataN2.lignes || [];
        }
      }
      setLignesN2(lignesN2Result);
    } catch (_err) {
      // Erreur chargement balance silencieuse
    } finally {
      setLoading(false);
    }
  }, [entiteId, selectedExercice, exercices, balanceSource]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  // ===================== CALCUL DES FLUX — Formules detaillees PDF p.1275-1282 =====================

  const fluxN = computeAllFlux(lignesN, lignesN1);
  const fluxN1 = useMemo(() => {
    if (lignesN1.length === 0) return {} as Record<string, number>;
    return computeAllFlux(lignesN1, lignesN2);
  }, [lignesN1, lignesN2]);
  const annee = selectedExercice ? selectedExercice.annee : new Date().getFullYear();
  const [showDebug, setShowDebug] = useState(false);

  const getValue = (ref: string): number => {
    return fluxN[ref] || 0;
  };

  const getValueN1 = (ref: string): number => {
    return fluxN1[ref] || 0;
  };

  // Formules détaillées du TFT avec valeurs intermédiaires
  const fdt = useMemo(() => {
    if (!balanceFound) return null;
    const lN = lignesN, lN1 = lignesN1;

    // CAFG
    const resultatNet = computeResultatNet(lN);
    const dotations = sumSoldeDebiteur(lN, DOTATIONS_PREFIXES);
    const reprises = sumSoldeCrediteur(lN, REPRISES_PREFIXES_TFT);
    const vncCessions = sumSoldeDebiteur(lN, ['81']);
    const prodCessions = sumSoldeCrediteur(lN, ['82']);

    // ZA
    const tresoActifN1 = bilanTresoActif(lN1);
    const tresoPassifN1 = bilanTresoPassif(lN1);
    const ecartConvN1 = rawSC(lN1, ['4726']);

    // FB
    const baN = bilanBA(lN), baN1 = bilanBA(lN1);
    const sd485N = rawSD(lN, ['485']), sd485N1 = rawSD(lN1, ['485']);
    const sd47818N = rawSD(lN, ['47818']), sd47818N1 = rawSD(lN1, ['47818']);
    const sc47918N = rawSC(lN, ['47918']), sc47918N1 = rawSC(lN1, ['47918']);

    // FC
    const bbN = bilanBB(lN), bbN1 = bilanBB(lN1);

    // FD
    const bhN = bilanBH(lN), bhN1 = bilanBH(lN1);
    const biN = bilanBI(lN), biN1 = bilanBI(lN1);
    const bjN = bilanBJ(lN), bjN1 = bilanBJ(lN1);
    const creancesN = bhN + biN + bjN, creancesN1 = bhN1 + biN1 + bjN1;
    const sd414N = rawSD(lN, ['414','4494','458','461','467','4752']);
    const sd414N1 = rawSD(lN1, ['414','4494','458','461','467']);
    const mvtD2714 = sumMvtDebit(lN, ['2714','2766']);
    const sd47811N = rawSD(lN, ['47811']), sd47811N1 = rawSD(lN1, ['47811']);
    const sc47911N = rawSC(lN, ['47911']), sc47911N1 = rawSC(lN1, ['47911']);

    // FE
    const dpN = bilanDP(lN), dpN1 = bilanDP(lN1);
    const feAdj = ['404','461','465','4726','481','482'];
    const scFeN = rawSC(lN, feAdj), scFeN1 = rawSC(lN1, feAdj);
    const sc4793N = rawSC(lN, ['4793']), sc4793N1 = rawSC(lN1, ['4793']);
    const sd4783N = rawSD(lN, ['4783']), sd4783N1 = rawSD(lN1, ['4783']);
    const mvtD4752 = sumMvtDebit(lN, ['4752']), mvtC4752 = sumMvtCredit(lN, ['4752']);

    // FF
    const adN = bilanAD_brut(lN), adN1 = bilanAD_brut(lN1);
    const mvtD251 = sumMvtDebit(lN, ['251']), mvtC251 = sumMvtCredit(lN, ['251']);
    const ffSup = ['4041','4046','4811','48161','48171','48181','4821'];
    const mvtDffSup = sumMvtDebit(lN, [...ffSup, '281']), mvtCffSup = sumMvtCredit(lN, ffSup);
    const sd6541_811 = rawSD(lN, ['6541','811']);

    // FG
    const aiN = bilanAI_brut(lN), aiN1 = bilanAI_brut(lN1);
    const mvtD252 = sumMvtDebit(lN, ['252']), mvtC252 = sumMvtCredit(lN, ['252']);
    const fgSup = ['4042','4047','4812','48162','48172','48182','4822'];
    const mvtDfgSup = sumMvtDebit(lN, [...fgSup, '282','283','284']);
    const mvtCfgSup = sumMvtCredit(lN, ['17','19842',...fgSup]);
    const sd6542_812 = rawSD(lN, ['6542','812']);

    // FH
    const mvtD26_27 = sumMvtDebit(lN, ['26','27'], ['2714','2766']);
    const mvtD4813 = sumMvtDebit(lN, ['4813']), mvtC4813 = sumMvtCredit(lN, ['4813']);
    const sd4782 = rawSD(lN, ['4782']), sc4792 = rawSC(lN, ['4792']);

    // FI
    const sc754_821_822 = rawSC(lN, ['754','821','822']);
    const mvtD414_485_fi = sumMvtDebit(lN, ['414','485'], ['4856']);
    const mvtC414_485_fi = sumMvtCredit(lN, ['414','485'], ['4856']);

    // FJ
    const sc826 = rawSC(lN, ['826']);
    const mvtC27_fj = sumMvtCredit(lN, ['27'], ['2714','2766']);
    const mvtD4856 = sumMvtDebit(lN, ['4856']), mvtC4856 = sumMvtCredit(lN, ['4856']);

    // FK
    const scCapN = rawSC(lN, ['101','102','1051']), scCapN1 = rawSC(lN1, ['101','102','1051']);
    const sd109_fk = rawSD(lN, ['109','4613','467','4581']);
    const mvtD11_fk = sumMvtDebit(lN, ['11','12','130','131']);
    const mvtC103_fk = sumMvtCredit(lN, ['103','104','11','12','139','4619','465']);

    // FL
    const sc14N = rawSC(lN, ['14']), sc14N1 = rawSC(lN1, ['14']);
    const sc799 = rawSC(lN, ['799']);
    const sd4494_fl = rawSD(lN, ['4494','4582']);

    // FM
    const mvtD4619_fm = sumMvtDebit(lN, ['4619']);
    const mvtD103_fm = sumMvtDebit(lN, ['103','104']);

    // FN
    const mvtD465 = sumMvtDebit(lN, ['465']);

    // FO
    const mvtC161 = sumMvtCredit(lN, ['161','162','1661','1662']);
    const mvtD4713 = sumMvtDebit(lN, ['4713']);
    const sd4784 = rawSD(lN, ['4784']);

    // FP
    const mvtC163 = sumMvtCredit(lN, ['163','164','165','166','167','168','181','182','183'], ['1661','1662']);

    // FQ
    const mvtD16_fq = sumMvtDebit(lN, ['16','17','181','182','183']);
    const sc4794 = rawSC(lN, ['4794']);

    // ZI
    const tresoActifN = bilanTresoActif(lN);
    const tresoPassifN = bilanTresoPassif(lN);
    const ecartConvN = rawSC(lN, ['4726']);

    type Line = { label: string; value: number; indent?: boolean; bold?: boolean; };
    type Section = { ref: string; title: string; total: number; lines: Line[]; };

    const sections: Section[] = [
      { ref: 'ZA', title: 'Trésorerie nette au 1er janvier', total: getValue('ZA'), lines: [
        { label: 'Trésorerie actif N-1 (BQ+BR+BS)', value: tresoActifN1, indent: true },
        { label: '- Écart conversion SC(4726) N-1', value: -ecartConvN1, indent: true },
        { label: '- Trésorerie passif N-1 (DQ+DR)', value: -tresoPassifN1, indent: true },
      ]},
      { ref: 'FA', title: 'CAFG (Capacité d\'Autofinancement Globale)', total: getValue('FA'), lines: [
        { label: 'Résultat net (Produits - Charges)', value: resultatNet, indent: true },
        { label: '+ Dotations (681+691+697)', value: dotations, indent: true },
        { label: '- Reprises (791+797+798+799)', value: -reprises, indent: true },
        { label: '+ VNC cessions (81)', value: vncCessions, indent: true },
        { label: '- Produits cessions (82)', value: -prodCessions, indent: true },
      ]},
      { ref: 'FB', title: 'Variation actif circulant HAO', total: getValue('FB'), lines: [
        { label: 'BA net N', value: baN, indent: true },
        { label: 'BA net N-1', value: baN1, indent: true },
        { label: '- SD(485) N + SD(485) N-1', value: -sd485N + sd485N1, indent: true },
        { label: '+ SD(47818) N - SD(47818) N-1', value: sd47818N - sd47818N1, indent: true },
        { label: '- SC(47918) N + SC(47918) N-1', value: -sc47918N + sc47918N1, indent: true },
      ]},
      { ref: 'FC', title: 'Variation des stocks', total: getValue('FC'), lines: [
        { label: 'BB net N (stocks)', value: bbN, indent: true },
        { label: 'BB net N-1', value: bbN1, indent: true },
        { label: 'FC = -(BB_N - BB_N-1)', value: -(bbN - bbN1), indent: true, bold: true },
      ]},
      { ref: 'FD', title: 'Variation des créances', total: getValue('FD'), lines: [
        { label: 'Créances N (BH+BI+BJ)', value: creancesN, indent: true },
        { label: 'Créances N-1 (BH+BI+BJ)', value: creancesN1, indent: true },
        { label: '- SD(414,4494,458,461,467,4752) N', value: -sd414N, indent: true },
        { label: '+ SD(414,4494,458,461,467) N-1', value: sd414N1, indent: true },
        { label: '+ MvtD(2714,2766)', value: mvtD2714, indent: true },
        { label: '+ SD(47811) N - SD(47811) N-1', value: sd47811N - sd47811N1, indent: true },
        { label: '- SC(47911) N + SC(47911) N-1', value: -sc47911N + sc47911N1, indent: true },
      ]},
      { ref: 'FE', title: 'Variation du passif circulant', total: getValue('FE'), lines: [
        { label: 'DP N (passif circulant)', value: dpN, indent: true },
        { label: 'DP N-1', value: dpN1, indent: true },
        { label: '- SC(404,461,465,4726,481,482) N', value: -scFeN, indent: true },
        { label: '+ SC(404,461,465,4726,481,482) N-1', value: scFeN1, indent: true },
        { label: '+ SC(4793) N - SC(4793) N-1', value: sc4793N - sc4793N1, indent: true },
        { label: '- SD(4783) N + SD(4783) N-1', value: -sd4783N + sd4783N1, indent: true },
        { label: '+ MvtD(4752) - MvtC(4752)', value: mvtD4752 - mvtC4752, indent: true },
      ]},
      { ref: 'ZB', title: 'FLUX OPÉRATIONNELS (FA+FB+FC+FD+FE)', total: getValue('ZB'), lines: [] },
      { ref: 'FF', title: 'Décaissements acquis. immob. incorporelles', total: getValue('FF'), lines: [
        { label: 'AD brut N (immob. incorp.)', value: adN, indent: true },
        { label: 'AD brut N-1', value: adN1, indent: true },
        { label: '+ MvtD(251) - MvtC(251)', value: mvtD251 - mvtC251, indent: true },
        { label: '+ MvtD(fournisseurs,281) - MvtC(fournisseurs)', value: mvtDffSup - mvtCffSup, indent: true },
        { label: '+ SD(6541,811)', value: sd6541_811, indent: true },
      ]},
      { ref: 'FG', title: 'Décaissements acquis. immob. corporelles', total: getValue('FG'), lines: [
        { label: 'AI brut N (immob. corp.)', value: aiN, indent: true },
        { label: 'AI brut N-1', value: aiN1, indent: true },
        { label: '+ MvtD(252) - MvtC(252)', value: mvtD252 - mvtC252, indent: true },
        { label: '+ MvtD(fournisseurs,282-284) - MvtC(17,fournisseurs)', value: mvtDfgSup - mvtCfgSup, indent: true },
        { label: '+ SD(6542,812)', value: sd6542_812, indent: true },
      ]},
      { ref: 'FH', title: 'Décaissements acquis. immob. financières', total: getValue('FH'), lines: [
        { label: 'MvtD(26,27 sauf 2714,2766)', value: mvtD26_27, indent: true },
        { label: '+ MvtD(4813) - MvtC(4813)', value: mvtD4813 - mvtC4813, indent: true },
        { label: '+ SD(4782) - SC(4792)', value: sd4782 - sc4792, indent: true },
      ]},
      { ref: 'FI', title: 'Encaissements cessions incorp./corp.', total: getValue('FI'), lines: [
        { label: 'SC(754,821,822)', value: sc754_821_822, indent: true },
        { label: '- MvtD(414,485) + MvtC(414,485)', value: -mvtD414_485_fi + mvtC414_485_fi, indent: true },
      ]},
      { ref: 'FJ', title: 'Encaissements cessions financières', total: getValue('FJ'), lines: [
        { label: 'SC(826)', value: sc826, indent: true },
        { label: '+ MvtC(27 sauf 2714,2766)', value: mvtC27_fj, indent: true },
        { label: '- MvtD(4856) + MvtC(4856)', value: -mvtD4856 + mvtC4856, indent: true },
      ]},
      { ref: 'ZC', title: 'FLUX INVESTISSEMENT (FF+FG+FH+FI+FJ)', total: getValue('ZC'), lines: [] },
      { ref: 'FK', title: 'Augmentation de capital', total: getValue('FK'), lines: [
        { label: 'SC(101,102,1051) N', value: scCapN, indent: true },
        { label: '- SC(101,102,1051) N-1', value: -scCapN1, indent: true },
        { label: '- SD(109,4613,467,4581)', value: -sd109_fk, indent: true },
        { label: '- MvtD(11,12,130,131)', value: -mvtD11_fk, indent: true },
        { label: '+ MvtC(103,104,11,12,139,4619,465)', value: mvtC103_fk, indent: true },
      ]},
      { ref: 'FL', title: 'Subventions d\'investissement reçues', total: getValue('FL'), lines: [
        { label: 'SC(14) N - SC(14) N-1', value: sc14N - sc14N1, indent: true },
        { label: '+ SC(799)', value: sc799, indent: true },
        { label: '- SD(4494,4582)', value: -sd4494_fl, indent: true },
      ]},
      { ref: 'FM', title: 'Prélèvements sur le capital', total: getValue('FM'), lines: [
        { label: '- MvtD(4619)', value: -mvtD4619_fm, indent: true },
        { label: '- MvtD(103,104)', value: -mvtD103_fm, indent: true },
      ]},
      { ref: 'FN', title: 'Dividendes versés', total: getValue('FN'), lines: [
        { label: '- MvtD(465)', value: -mvtD465, indent: true },
      ]},
      { ref: 'ZD', title: 'FLUX CAPITAUX PROPRES (FK+FL+FM+FN)', total: getValue('ZD'), lines: [] },
      { ref: 'FO', title: 'Emprunts', total: getValue('FO'), lines: [
        { label: 'MvtC(161,162,1661,1662)', value: mvtC161, indent: true },
        { label: '- MvtD(4713)', value: -mvtD4713, indent: true },
        { label: '+ SD(4784)', value: sd4784, indent: true },
      ]},
      { ref: 'FP', title: 'Autres dettes financières', total: getValue('FP'), lines: [
        { label: 'MvtC(163-168,181-183 sauf 1661,1662)', value: mvtC163, indent: true },
      ]},
      { ref: 'FQ', title: 'Remboursements emprunts', total: getValue('FQ'), lines: [
        { label: '- MvtD(16,17,181-183)', value: -mvtD16_fq, indent: true },
        { label: '+ SC(4794)', value: sc4794, indent: true },
      ]},
      { ref: 'ZE', title: 'FLUX CAPITAUX ÉTRANGERS (FO+FP+FQ)', total: getValue('ZE'), lines: [] },
      { ref: 'ZF', title: 'FLUX FINANCEMENT (ZD+ZE)', total: getValue('ZF'), lines: [] },
      { ref: 'ZG', title: 'VARIATION TRÉSORERIE (ZB+ZC+ZF)', total: getValue('ZG'), lines: [] },
      { ref: 'ZH', title: 'Trésorerie nette au 31 décembre (ZG+ZA)', total: getValue('ZH'), lines: [] },
      { ref: 'ZI', title: 'Contrôle : Tréso actif N - Tréso passif N', total: getValue('ZI'), lines: [
        { label: 'Trésorerie actif N', value: tresoActifN, indent: true },
        { label: '- Écart conversion SC(4726) N', value: -ecartConvN, indent: true },
        { label: '- Trésorerie passif N', value: -tresoPassifN, indent: true },
      ]},
    ];

    return sections;
  }, [lignesN, lignesN1, balanceFound, fluxN]);

  const fmt = (v: number) => { if (!v || v === 0) return ''; const neg = v < 0; return (neg ? '(' : '') + Math.abs(Math.round(v)).toLocaleString('fr-FR') + (neg ? ')' : ''); };

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
    a.download = 'TFT_SYSCOHADA_' + annee + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = (): void => {
    if (!previewUrl) return;
    const win = window.open(previewUrl, '_blank');
    if (win) win.print();
  };

  const duree = selectedExercice?.duree_mois || 12;

  const renderHeader = (): React.JSX.Element => (
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
      <div className="etat-sub-titre">TABLEAU DES FLUX DE TRÉSORERIE AU 31/12/{annee}</div>
    </div>
  );

  const renderFooter = (): React.JSX.Element => (
    <div className="bilan-footer">
      <span>NORMX Etats — SYSCOHADA</span>
      <span>Exercice clos le 31/12/{annee}</span>
    </div>
  );

  const hasN1 = lignesN1.length > 0;

  return (
    <div className="bilan-wrapper">
      <div className="bilan-toolbar">
        <div className="bilan-toolbar-left">
          <button className="bilan-back-btn" onClick={onBack}><LuArrowLeft /> Retour</button>
          <h2>Tableau des Flux de Tresorerie SYSCOHADA</h2>
        </div>
        <div className="bilan-toolbar-right">
          <button className="bilan-export-btn secondary" onClick={openPreview}>
            <LuEye /> Apercu
          </button>
          <button className="bilan-export-btn" onClick={async () => { const pdf = await generatePDF(); pdf.save('TFT_SYSCOHADA_' + annee + '.pdf'); }}>
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
          <LuTriangleAlert /> Aucune donnee pour cet exercice. {balanceSource === 'ecritures' ? 'Saisissez des ecritures comptables.' : 'Importez une balance CSV.'}
        </div>
      )}

      {!hasN1 && balanceFound && !loading && (
        <div className="bilan-alert" style={{ background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' }}>
          <LuTriangleAlert /> Aucune donnee N-1. Les variations seront calculees par rapport a zero.
        </div>
      )}

      {loading && <div style={{ padding: 20, color: '#888' }}>Chargement...</div>}

      {/* PAGE — TFT */}
      <div className="a4-page" ref={pageRef}>
        {renderHeader()}

        <table className="bilan-table">
          <thead>
            <tr>
              <th className="col-ref">REF</th>
              <th className="col-libelle">LIBELLES</th>
              <th className="col-note">Note</th>
              <th className="col-montant">EXERCICE N<br />AU 31/12/{annee}</th>
              <th className="col-montant">EXERCICE N-1<br />AU 31/12/{annee - 1}</th>
            </tr>
          </thead>
          <tbody>
            {TFT_ROWS.map((row, i) => {
              if (row.type === 'section') {
                return (
                  <tr key={i} className="row-section">
                    <td colSpan={5} className="col-section-label">{row.libelle}</td>
                  </tr>
                );
              }
              if (row.type === 'label') {
                return (
                  <tr key={i} className="row-label">
                    <td></td>
                    <td colSpan={2} style={{ fontStyle: 'italic', fontSize: '8px', paddingTop: 2, paddingBottom: 2 }}>{row.libelle}</td>
                    <td></td>
                    <td></td>
                  </tr>
                );
              }

              const rowClass = row.type === 'total' ? 'row-total'
                : row.type === 'result' ? 'row-subtotal'
                : row.type === 'subtotal' ? 'row-subtotal'
                : 'row-indent';

              const val = getValue(row.ref || '');

              const valN1 = getValueN1(row.ref || '');

              return (
                <tr key={i} className={rowClass}>
                  <td className="col-ref">{row.ref}</td>
                  <td className="col-libelle">{row.libelle}</td>
                  <td className="col-note">{row.note || ''}</td>
                  <td className="col-montant">{formatMontant(val)}</td>
                  <td className="col-montant">{formatMontant(valN1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

      </div>

      {/* Controle */}
      <div className="bilan-equilibre">
        {(() => {
          if (!balanceFound) return null;
          const tresoTFT = getValue('ZH');
          const tresoBilan = getValue('ZI');
          const ecart = Math.abs(tresoTFT - tresoBilan);
          const ok = ecart < 1;
          return (
            <span className={ok ? 'equilibre-ok' : 'equilibre-ko'}>
              {ok
                ? 'Contrôle vérifié : trésorerie TFT = trésorerie bilan (' + formatMontant(tresoTFT) + ' FCFA)'
                : 'Écart de contrôle : ' + formatMontant(ecart) + ' FCFA (TFT: ' + formatMontant(tresoTFT) + ' / Bilan: ' + formatMontant(tresoBilan) + ')'
              }
            </span>
          );
        })()}
      </div>

      {renderFooter()}

      {/* Feuille de travail — Formules détaillées */}
      {balanceFound && fdt && (
        <div style={{ margin: '16px 0' }}>
          <button
            onClick={() => setShowDebug(!showDebug)}
            style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: '#6b7280' }}
          >
            {showDebug ? 'Masquer' : 'Afficher'} la feuille de travail
          </button>

          {showDebug && (
            <div style={{ marginTop: 12, fontSize: 11, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: 16 }}>
              <h4 style={{ fontSize: 13, marginBottom: 12, color: '#1A3A5C' }}>Feuille de travail — Formules détaillées du TFT</h4>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #1A3A5C', background: '#eef2f7' }}>
                    <th style={{ textAlign: 'left', padding: '4px 8px', width: '8%' }}>REF</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>Formule / Composante</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px', width: '18%' }}>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {fdt.map((section, si) => {
                    const isTotal = section.ref.startsWith('Z');
                    return (
                      <React.Fragment key={si}>
                        <tr style={{ borderBottom: '1px solid #d1d5db', background: isTotal ? '#1A3A5C' : '#eef2f7', color: isTotal ? '#fff' : '#1f2937', fontWeight: 700 }}>
                          <td style={{ padding: '4px 8px' }}>{section.ref}</td>
                          <td style={{ padding: '4px 8px' }}>{section.title}</td>
                          <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(section.total)}</td>
                        </tr>
                        {section.lines.map((line, li) => (
                          <tr key={li} style={{ borderBottom: '1px solid #f3f4f6', fontWeight: line.bold ? 600 : 400 }}>
                            <td style={{ padding: '2px 8px' }}></td>
                            <td style={{ padding: '2px 8px', paddingLeft: 24, color: '#4b5563' }}>{line.label}</td>
                            <td style={{ textAlign: 'right', padding: '2px 8px' }}>{fmt(line.value)}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  <tr style={{ fontWeight: 700, background: Math.abs(getValue('ZH') - getValue('ZI')) < 1 ? '#dcfce7' : '#fee2e2' }}>
                    <td style={{ padding: '4px 8px' }}></td>
                    <td style={{ padding: '4px 8px' }}>ÉCART (ZH - ZI)</td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(getValue('ZH') - getValue('ZI'))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modale apercu PDF */}
      {previewUrl && (
        <div className="pdf-preview-overlay" onClick={closePreview}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="pdf-preview-header">
              <h3>Apercu — Tableau des Flux de Tresorerie SYSCOHADA {annee}</h3>
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
                title="Apercu TFT SYSCOHADA PDF"
                className="pdf-preview-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TFT_SYSCOHADA;
