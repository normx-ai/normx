import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import React, { useState, useEffect } from 'react';
import { LuSave, LuChevronDown, LuChevronRight, LuClipboardList } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { createLogger } from '../utils/logger';
import { KPLigne, ODEcriture, Suggestion, soldeCreditNet } from './revisionTypes';

const logger = createLogger('RevisionKP');
import ControleAffectation from './ControleAffectation';
import ControleReserveLegale from './ControleReserveLegale';
import ControleNiveauKP from './ControleNiveauKP';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';
import { computeAnalyses } from './kp/analyses';
import { findContrepartie } from './kp/contrepartie';

interface RevisionKPProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

const TRAVAUX_KP = [
  'Dresser un tableau de mouvement des capitaux propres (voir Contrôle 1 ci-dessous)',
  'Vérifier la conformité du capital social avec les statuts de la société',
  'Préparer le procès-verbal de l\'assemblée générale N-1 et vérifier la cohérence avec la variation des capitaux propres',
  'Vérifier les virements bancaires justifiant les apports en capital',
  'Vérifier le traitement fiscal des dividendes payés et préparer les justificatifs (relevés bancaires)',
  'Vérifier le niveau des réserves obligatoires (réserve légale Art. 346 OHADA)',
  'Justifier la prime d\'émission si applicable (décisions AG, protocoles de fusion/apport)',
  'Vérifier la cohérence capital par dotation / fonds de dotation reçus si entreprise publique (décret, arrêté, lettre officielle)',
  'Vérifier que le compte de l\'exploitant (104) est soldé à la clôture si entreprise individuelle',
  'Analyser l\'écart de réévaluation si applicable (évaluation des actifs à la date de réévaluation)',
];

function RevisionKP({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionKPProps): React.ReactElement {
  const [lignes, setLignes] = useState<KPLigne[]>([]);
  const [saved, setSaved] = useState<boolean>(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState<number>(1);
  const [showTravaux, setShowTravaux] = useState<boolean>(true);

  // --- Construction des lignes KP ---
  useEffect(() => {
    const kpLignes: KPLigne[] = [];
    const comptesVus = new Set<string>();

    for (const bl of balanceN) {
      const prefix3 = bl.numero_compte.substring(0, 3);
      const isKP = prefix3 >= '100' && prefix3 <= '139';
      if (!isKP) continue;
      if (comptesVus.has(bl.numero_compte)) continue;
      comptesVus.add(bl.numero_compte);

      const soldeNBal = soldeCreditNet(bl);
      const soldeN1 = (parseFloat(String(bl.si_credit ?? 0)) || 0) - (parseFloat(String(bl.si_debit ?? 0)) || 0);

      kpLignes.push({ compte: bl.numero_compte, designation: bl.libelle_compte, soldeN1, affectation: 0, dividendes: 0, variationCapital: 0, soldeNCalcule: soldeN1, soldeNBalance: soldeNBal, ecart: 0 });
    }

    kpLignes.sort((a, b) => a.compte.localeCompare(b.compte));
    prefill(kpLignes);
    recalc(kpLignes);
    setLignes(kpLignes);
    loadSaved(kpLignes);
  }, [balanceN]);

  // --- Pré-remplissage ---
  const prefill = (l: KPLigne[]): void => {
    for (const row of l) {
      const variation = row.soldeNBalance - row.soldeN1;
      if (Math.abs(variation) < 0.5) continue;
      const p3 = row.compte.substring(0, 3);
      if (p3 === '109' || (p3 >= '101' && p3 <= '106')) {
        row.variationCapital = variation;
      } else if ((p3 >= '111' && p3 <= '118') || p3 === '121' || p3 === '130') {
        row.affectation = variation;
      } else if (p3 >= '131' && p3 <= '139') {
        row.affectation = variation;
      }
    }
  };

  const recalc = (l: KPLigne[]): void => {
    for (const row of l) {
      row.soldeNCalcule = row.soldeN1 + row.affectation + row.dividendes + row.variationCapital;
      row.ecart = row.soldeNBalance - row.soldeNCalcule;
    }
  };

  // --- Load / Save ---
  const loadSaved = (defaultLignes: KPLigne[]): void => {
    clientFetch(api.revision.onglet(entiteId, exerciceId, 'kp'))
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: { lignes: KPLigne[]; odEcritures?: ODEcriture[] }) => {
        if (data.lignes) {
          const merged = defaultLignes.map(dl => {
            const s = data.lignes.find((x: KPLigne) => x.compte === dl.compte);
            return s ? { ...dl, affectation: s.affectation || 0, dividendes: s.dividendes || 0, variationCapital: s.variationCapital || 0 } : dl;
          });
          recalc(merged);
          setLignes(merged);
        }
        if (data.odEcritures) {
          setOdEcritures(data.odEcritures);
          if (data.odEcritures.length > 0) setNextOdId(Math.max(...data.odEcritures.map(e => e.id)) + 1);
        }
      })
      .catch(() => {});
  };

  const [saveNotif, setSaveNotif] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const handleSave = async (): Promise<void> => {
    setSaveNotif(null);
    try {
      const resp = await clientFetch(api.revision.onglet(entiteId, exerciceId, 'kp'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lignes, odEcritures }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        const msg = (err as { error?: string }).error || `Erreur ${resp.status}`;
        logger.error(`save failed (${resp.status})`, msg);
        setSaveNotif({ type: 'error', message: msg });
        return;
      }
      setSaved(true);
      setSaveNotif({ type: 'success', message: 'Revision sauvegardee' });
      setTimeout(() => setSaveNotif(null), 3000);
    } catch (err) {
      logger.error('save network error', err instanceof Error ? err : String(err));
      setSaveNotif({ type: 'error', message: 'Erreur reseau' });
    }
  };

  // --- Mise à jour lignes ---
  const updateLigne = (idx: number, field: 'affectation' | 'dividendes' | 'variationCapital', value: number): void => {
    setLignes(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      recalc(next);
      return next;
    });
    setSaved(false);
  };

  // --- Journal OD ---
  const addOdEcriture = (source?: string, compteDebit?: string, compteCredit?: string, montant?: number, libelle?: string): void => {
    const newOd: ODEcriture = {
      id: nextOdId, date: `${exerciceAnnee}-12-31`,
      compteDebit: compteDebit || '', libelleDebit: '',
      compteCredit: compteCredit || '', libelleCredit: '',
      montant: montant || 0, libelle: libelle || '',
      source: source || 'Manuel',
    };
    setOdEcritures(prev => [...prev, newOd]);
    setNextOdId(prev => prev + 1);
    setSaved(false);
  };

  const updateOd = (id: number, field: keyof ODEcriture, value: string | number): void => {
    setOdEcritures(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    setSaved(false);
  };

  const removeOd = (id: number): void => {
    setOdEcritures(prev => prev.filter(e => e.id !== id));
    setSaved(false);
  };

  const odImpact = (compte: string): number => {
    return odEcritures.reduce((sum, od) => {
      if (od.compteDebit === compte) return sum - od.montant;
      if (od.compteCredit === compte) return sum + od.montant;
      return sum;
    }, 0);
  };

  // --- Analyses et contrepartie (delegues aux helpers kp/) ---
  const analyses = computeAnalyses(balanceN);
  const findContrepartieLocal = (compte: string, ecartPositif: boolean) =>
    findContrepartie(compte, ecartPositif, analyses, lignes, balanceN);

  // --- Suggestions automatiques ---
  const suggestions: Suggestion[] = [];

  // Comptes couverts par le contrôle 2 (réserve légale) — pas de doublon
  const comptesControle2 = new Set<string>();
  const reserveLegaleLigneCheck = lignes.find(l => l.compte.startsWith('111'));
  if (reserveLegaleLigneCheck) {
    comptesControle2.add(reserveLegaleLigneCheck.compte);
    const ran = lignes.find(l => l.compte.startsWith('121'));
    if (ran) comptesControle2.add(ran.compte);
  }

  for (const l of lignes) {
    const ecartNet = l.ecart - odImpact(l.compte);
    if (Math.abs(ecartNet) < 0.5) continue;
    // Skip si couvert par contrôle 2
    if (comptesControle2.has(l.compte)) continue;
    const dejaPropose = odEcritures.some(od => od.source === `Contrôle 1 — ${l.compte}`);
    if (dejaPropose) continue;

    const analyse = analyses.find(a => a.compte === l.compte);
    const natureInfo = analyse?.nature ? ` (${analyse.nature})` : '';

    if (ecartNet > 0) {
      // Balance > Calculé → crédit excédentaire
      const cp = findContrepartieLocal(l.compte, true);
      suggestions.push({ compteDebit: cp.compte, libelleDebit: cp.libelle, compteCredit: l.compte, libelleCredit: l.designation, montant: ecartNet, libelle: `Régularisation ${l.designation}${natureInfo}`, source: `Contrôle 1 — ${l.compte}` });
    } else {
      // Balance < Calculé → crédit insuffisant
      const cp = findContrepartieLocal(l.compte, false);
      suggestions.push({ compteDebit: l.compte, libelleDebit: l.designation, compteCredit: cp.compte, libelleCredit: cp.libelle, montant: Math.abs(ecartNet), libelle: `Régularisation ${l.designation}${natureInfo}`, source: `Contrôle 1 — ${l.compte}` });
    }
  }

  // --- Données contrôle 2 : Réserve légale ---
  const resultatN1 = balanceN
    .filter(l => l.numero_compte.startsWith('131'))
    .reduce((s, l) => s + (parseFloat(String(l.si_credit ?? 0)) || 0) - (parseFloat(String(l.si_debit ?? 0)) || 0), 0);

  const pertesAnterieures = balanceN
    .filter(l => l.numero_compte.startsWith('121'))
    .reduce((s, l) => {
      const sid = parseFloat(String(l.si_debit ?? 0)) || 0;
      const sic = parseFloat(String(l.si_credit ?? 0)) || 0;
      return s + Math.max(0, sid - sic);
    }, 0);

  const reserveN1 = balanceN
    .filter(l => l.numero_compte.startsWith('111'))
    .reduce((s, l) => s + (parseFloat(String(l.si_credit ?? 0)) || 0) - (parseFloat(String(l.si_debit ?? 0)) || 0), 0);

  const baseReserve = Math.max(0, resultatN1 - pertesAnterieures);
  const dixPourcent = baseReserve * 0.1;

  const capitalSocial = lignes
    .filter(l => l.compte.startsWith('101') || l.compte.startsWith('102') || l.compte.startsWith('103'))
    .reduce((s, l) => s + l.soldeNBalance, 0);

  const plafondReserve = capitalSocial / 5;
  const dotationObligatoire = reserveN1 >= plafondReserve ? 0 : Math.min(dixPourcent, plafondReserve - reserveN1);
  const reserveRecalculee = reserveN1 + dotationObligatoire;
  const reserveLegaleLigne = lignes.find(l => l.compte.startsWith('111'));
  const reserveBalance = reserveLegaleLigne ? reserveLegaleLigne.soldeNBalance : 0;
  const ecartReserve = reserveBalance - reserveRecalculee;
  const plafondAtteint = reserveN1 >= plafondReserve;

  // Suggestion contrôle 2 — détermine intelligemment la contrepartie
  if (reserveLegaleLigne && Math.abs(ecartReserve) > 0.5) {
    const dejaPropose = odEcritures.some(od => od.source === 'Contrôle 2 — Réserve légale');
    if (!dejaPropose) {
      // Analyser d'où vient la dotation : si le 131 est déjà soldé → le résultat est au RAN
      const res131 = analyses.find(a => a.compte.startsWith('131'));
      const ran121 = analyses.find(a => a.compte.startsWith('121'));
      const resultatSolde = res131 && Math.abs(res131.sf) < 0.5; // 131 soldé = affecté

      // Si résultat soldé → la contrepartie est le RAN, sinon c'est le résultat
      const cp = resultatSolde && ran121
        ? { compte: ran121.compte, libelle: 'Report à nouveau' }
        : res131
        ? { compte: res131.compte, libelle: 'Résultat net' }
        : { compte: '121100', libelle: 'Report à nouveau' };

      if (ecartReserve < 0) {
        const explication = resultatSolde
          ? 'Dotation réserve légale (Art. 346 OHADA) — virement du RAN (résultat déjà affecté)'
          : 'Dotation réserve légale (Art. 346 OHADA)';
        suggestions.push({ compteDebit: cp.compte, libelleDebit: cp.libelle, compteCredit: reserveLegaleLigne.compte, libelleCredit: 'Réserve légale', montant: Math.abs(ecartReserve), libelle: explication, source: 'Contrôle 2 — Réserve légale' });
      } else {
        suggestions.push({ compteDebit: reserveLegaleLigne.compte, libelleDebit: 'Réserve légale', compteCredit: cp.compte, libelleCredit: cp.libelle, montant: ecartReserve, libelle: 'Correction dotation excédentaire réserve légale', source: 'Contrôle 2 — Réserve légale' });
      }
    }
  }

  // --- Données contrôle 3 ---
  const totalBalance = lignes.reduce((s, l) => s + l.soldeNBalance, 0);
  const moitieCapital = capitalSocial / 2;

  return (
    <div className="revision-kp">
      {saveNotif && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          padding: '12px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
          background: saveNotif.type === 'success' ? '#059669' : '#ef4444',
          color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {saveNotif.message}
          <button onClick={() => setSaveNotif(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>&times;</button>
        </div>
      )}
      <div className="revision-section-header">
        <h3>Capitaux propres</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegarde' : 'Sauvegarder'}
        </button>
      </div>

      {/* Objectif */}
      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer que les capitaux propres sont correctement constitués, que l'affectation du résultat N-1 est conforme aux décisions de l'assemblée générale, et que les obligations légales (réserve légale, niveau des KP) sont respectées.
      </div>


      {/* Travaux à effectuer */}
      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux à effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_KP.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      <FonctionnementCompte prefixes={['10','11','12','13']} titre="Capitaux propres" />

      <ControleAffectation
        lignes={lignes}
        exerciceAnnee={exerciceAnnee}
        onUpdateLigne={updateLigne}
        odImpact={odImpact}
      />

      {reserveLegaleLigne && (
        <ControleReserveLegale
          resultatN1={resultatN1}
          pertesAnterieures={pertesAnterieures}
          baseReserve={baseReserve}
          dixPourcent={dixPourcent}
          capitalSocial={capitalSocial}
          plafondReserve={plafondReserve}
          reserveN1={reserveN1}
          dotationObligatoire={dotationObligatoire}
          reserveRecalculee={reserveRecalculee}
          reserveBalance={reserveBalance}
          ecartReserve={ecartReserve}
          plafondAtteint={plafondAtteint}
          exerciceAnnee={exerciceAnnee}
        />
      )}

      <ControleNiveauKP
        capitalSocial={capitalSocial}
        moitieCapital={moitieCapital}
        totalBalance={totalBalance}
      />

      <JournalOD
        suggestions={suggestions}
        odEcritures={odEcritures}
        onAddOd={addOdEcriture}
        onUpdateOd={updateOd}
        onRemoveOd={removeOd}
      />
    </div>
  );
}

export default RevisionKP;
