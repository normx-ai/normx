import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import React, { useState, useEffect } from 'react';
import { LuUsers, LuChevronDown, LuChevronRight, LuSave, LuClipboardList } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import {
  ODEcriture, Suggestion,
  soldeNet, soldeCreditNet, totalSoldeCreditNet,
  ChargePersonnelLigne, AvanceLigne, DetteSocialeLigne, ProvisionCongesData,
  TRAVAUX_PERSONNEL,
} from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';
import { Controle1Charges } from './personnel/Controle1Charges';
import { Controle2Conges } from './personnel/Controle2Conges';
import { Controle3Avances } from './personnel/Controle3Avances';
import { Controle4Dettes } from './personnel/Controle4Dettes';

interface RevisionPersonnelProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

function RevisionPersonnel({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionPersonnelProps): React.ReactElement {
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);

  const [congesData, setCongesData] = useState<ProvisionCongesData>({
    masseSalariale: 0,
    joursCongesParMois: 2,
    tauxChargesSociales: 20,
    tauxChargesFiscales: 5,
  });

  const [avancesEdit, setAvancesEdit] = useState<Record<string, { anteriorite: string; accordFormalise: string; observations: string }>>({});
  const [dettesCommentaires, setDettesCommentaires] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ c1: true, c2: true, c3: true, c4: true });

  const toggleSection = (key: string): void => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- Contrôle 1 : Cadrage charges de personnel (comptes 66x) ---
  const chargesPersonnel: ChargePersonnelLigne[] = (() => {
    const comptesVus = new Set<string>();
    const lignes: ChargePersonnelLigne[] = [];
    for (const bl of balanceN) {
      if (!bl.numero_compte.startsWith('66')) continue;
      if (comptesVus.has(bl.numero_compte)) continue;
      comptesVus.add(bl.numero_compte);
      const sN = soldeNet(bl);
      const soldeN1 = (parseFloat(String(bl.si_debit ?? 0)) || 0) - (parseFloat(String(bl.si_credit ?? 0)) || 0);
      const variation = sN - soldeN1;
      const variationPct = soldeN1 !== 0 ? (variation / Math.abs(soldeN1)) * 100 : (sN !== 0 ? 100 : 0);
      lignes.push({ compte: bl.numero_compte, designation: bl.libelle_compte, soldeN: sN, soldeN1, variation, variationPct });
    }
    lignes.sort((a, b) => a.compte.localeCompare(b.compte));
    return lignes;
  })();

  const totalChargesN = chargesPersonnel.reduce((s, l) => s + l.soldeN, 0);
  const totalChargesN1 = chargesPersonnel.reduce((s, l) => s + l.soldeN1, 0);
  const totalChargesVariation = totalChargesN - totalChargesN1;
  const totalChargesVariationPct = totalChargesN1 !== 0 ? (totalChargesVariation / Math.abs(totalChargesN1)) * 100 : 0;
  const hasAnomalieCharges = chargesPersonnel.some(l => Math.abs(l.variationPct) > 10);

  // --- Contrôle 2 : Calcul provision congés payés ---
  const joursAcquis = 12 * congesData.joursCongesParMois;
  const joursOuvrablesMois = 26;
  const provisionConges = congesData.masseSalariale > 0
    ? (congesData.masseSalariale * joursAcquis) / (joursOuvrablesMois * 12)
    : 0;
  const chargesSocialesConges = provisionConges * (congesData.tauxChargesSociales / 100);
  const chargesFiscalesConges = provisionConges * (congesData.tauxChargesFiscales / 100);
  const totalProvisionConges = provisionConges + chargesSocialesConges + chargesFiscalesConges;
  const solde4281 = totalSoldeCreditNet(balanceN.filter(l => l.numero_compte.startsWith('4281')));
  const ecartConges = totalProvisionConges - solde4281;

  // --- Contrôle 3 : Avances (421x) ---
  const avancesLignes: AvanceLigne[] = (() => {
    const lignes: AvanceLigne[] = [];
    const comptesVus = new Set<string>();
    for (const bl of balanceN) {
      if (!bl.numero_compte.startsWith('421')) continue;
      if (comptesVus.has(bl.numero_compte)) continue;
      comptesVus.add(bl.numero_compte);
      const sN = soldeNet(bl);
      const soldeN1 = (parseFloat(String(bl.si_debit ?? 0)) || 0) - (parseFloat(String(bl.si_credit ?? 0)) || 0);
      const edit = avancesEdit[bl.numero_compte] || { anteriorite: '', accordFormalise: 'Non', observations: '' };
      lignes.push({ compte: bl.numero_compte, designation: bl.libelle_compte, soldeN: sN, soldeN1, ...edit });
    }
    lignes.sort((a, b) => a.compte.localeCompare(b.compte));
    return lignes;
  })();

  const totalAvancesN = avancesLignes.reduce((s, l) => s + l.soldeN, 0);
  const totalAvancesN1 = avancesLignes.reduce((s, l) => s + l.soldeN1, 0);

  // --- Contrôle 4 : Dettes sociales (43x) ---
  const dettesLignes: DetteSocialeLigne[] = (() => {
    const lignes: DetteSocialeLigne[] = [];
    const comptesVus = new Set<string>();
    for (const bl of balanceN) {
      if (!bl.numero_compte.startsWith('43')) continue;
      if (comptesVus.has(bl.numero_compte)) continue;
      comptesVus.add(bl.numero_compte);
      const sN = soldeCreditNet(bl);
      const soldeN1 = (parseFloat(String(bl.si_credit ?? 0)) || 0) - (parseFloat(String(bl.si_debit ?? 0)) || 0);
      const variation = sN - soldeN1;
      const commentaire = dettesCommentaires[bl.numero_compte] || '';
      lignes.push({ compte: bl.numero_compte, designation: bl.libelle_compte, soldeN: sN, soldeN1, variation, commentaire });
    }
    lignes.sort((a, b) => a.compte.localeCompare(b.compte));
    return lignes;
  })();

  const totalDettesN = dettesLignes.reduce((s, l) => s + l.soldeN, 0);
  const totalDettesN1 = dettesLignes.reduce((s, l) => s + l.soldeN1, 0);
  const totalDettesVariation = totalDettesN - totalDettesN1;
  const hasDettesAnomalie = dettesLignes.some(l => {
    const pct = l.soldeN1 !== 0 ? Math.abs(l.variation / Math.abs(l.soldeN1)) * 100 : (l.variation !== 0 ? 100 : 0);
    return pct > 20;
  });

  // --- Load / Save ---
  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    clientFetch(api.revision.onglet(entiteId, exerciceId, 'personnel'))
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: { congesData?: ProvisionCongesData; avancesEdit?: Record<string, { anteriorite: string; accordFormalise: string; observations: string }>; dettesCommentaires?: Record<string, string>; odEcritures?: ODEcriture[] }) => {
        if (data.congesData) setCongesData(data.congesData);
        if (data.avancesEdit) setAvancesEdit(data.avancesEdit);
        if (data.dettesCommentaires) setDettesCommentaires(data.dettesCommentaires);
        if (data.odEcritures) { setOdEcritures(data.odEcritures); if (data.odEcritures.length > 0) setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1); }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      const res = await clientFetch(api.revision.onglet(entiteId, exerciceId, 'personnel'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ congesData, avancesEdit, dettesCommentaires, odEcritures }),
      });
      if (!res.ok) throw new Error('Erreur sauvegarde');
      setSaved(true);
    } catch {
      setSaved(false);
      alert('Erreur lors de la sauvegarde. Reessayez.');
    }
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
  const updateOd = (id: number, field: keyof ODEcriture, value: string | number): void => { setOdEcritures(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e)); setSaved(false); };
  const removeOd = (id: number): void => { setOdEcritures(prev => prev.filter(e => e.id !== id)); setSaved(false); };

  // --- Suggestions ---
  const suggestions: Suggestion[] = [];

  if (congesData.masseSalariale > 0 && Math.abs(ecartConges) > 0.5 && !odEcritures.some(od => od.source === 'Personnel-C2-Conges')) {
    if (ecartConges > 0) {
      suggestions.push({
        compteDebit: '6610', libelleDebit: 'Indemnités de congés payés',
        compteCredit: '4281', libelleCredit: 'Charges à payer — congés payés',
        montant: provisionConges > 0 ? Math.min(ecartConges, provisionConges) : ecartConges,
        libelle: 'Provision pour congés payés — indemnités',
        source: 'Personnel-C2-Conges',
      });
      const ecartCharges = ecartConges - Math.min(ecartConges, provisionConges);
      if ((chargesSocialesConges + chargesFiscalesConges) > 0 && ecartCharges > 0.5) {
        suggestions.push({
          compteDebit: '6641', libelleDebit: 'Charges sociales sur congés payés',
          compteCredit: '4281', libelleCredit: 'Charges à payer — congés payés',
          montant: ecartCharges,
          libelle: 'Provision pour congés payés — charges patronales (sociales + fiscales)',
          source: 'Personnel-C2-Charges',
        });
      }
    } else {
      suggestions.push({
        compteDebit: '4281', libelleDebit: 'Charges à payer — congés payés',
        compteCredit: '6610', libelleCredit: 'Indemnités de congés payés',
        montant: Math.abs(ecartConges),
        libelle: 'Reprise provision congés payés excédentaire',
        source: 'Personnel-C2-Conges',
      });
    }
  }

  for (const av of avancesLignes) {
    const edit = avancesEdit[av.compte];
    if (edit && edit.anteriorite && av.soldeN > 0) {
      const isOld = edit.anteriorite.toLowerCase().includes('> 6')
        || edit.anteriorite.toLowerCase().includes('>6')
        || edit.anteriorite.toLowerCase().includes('ancien')
        || edit.anteriorite.toLowerCase().includes('plus de 6');
      if (isOld && !odEcritures.some(od => od.source === `Personnel-C3-${av.compte}`)) {
        suggestions.push({
          compteDebit: '6594', libelleDebit: 'Charges provisionnées — personnel',
          compteCredit: '4912', libelleCredit: 'Dépréciation avances au personnel',
          montant: av.soldeN,
          libelle: `Dépréciation avance au personnel ${av.compte} (antériorité : ${edit.anteriorite})`,
          source: `Personnel-C3-${av.compte}`,
        });
      }
    }
  }

  return (
    <div className="revision-kp">
      <div className="revision-section-header">
        <h3><LuUsers size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />Comptes de Personnel</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer de l'exhaustivité, de la réalité et de la correcte évaluation des charges de personnel, des provisions pour congés payés, des avances au personnel et des dettes sociales.
      </div>

      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux à effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_PERSONNEL.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      <FonctionnementCompte prefixes={['42','66']} titre="Personnel" />

      <Controle1Charges
        chargesPersonnel={chargesPersonnel}
        totalChargesN={totalChargesN}
        totalChargesN1={totalChargesN1}
        totalChargesVariation={totalChargesVariation}
        totalChargesVariationPct={totalChargesVariationPct}
        hasAnomalieCharges={hasAnomalieCharges}
        exerciceAnnee={exerciceAnnee}
        isOpen={openSections.c1}
        toggle={() => toggleSection('c1')}
      />

      <Controle2Conges
        congesData={congesData}
        setCongesData={setCongesData}
        setSaved={setSaved}
        joursAcquis={joursAcquis}
        joursOuvrablesMois={joursOuvrablesMois}
        provisionConges={provisionConges}
        chargesSocialesConges={chargesSocialesConges}
        chargesFiscalesConges={chargesFiscalesConges}
        totalProvisionConges={totalProvisionConges}
        solde4281={solde4281}
        ecartConges={ecartConges}
        isOpen={openSections.c2}
        toggle={() => toggleSection('c2')}
      />

      <Controle3Avances
        avancesLignes={avancesLignes}
        avancesEdit={avancesEdit}
        setAvancesEdit={setAvancesEdit}
        setSaved={setSaved}
        totalAvancesN={totalAvancesN}
        totalAvancesN1={totalAvancesN1}
        isOpen={openSections.c3}
        toggle={() => toggleSection('c3')}
      />

      <Controle4Dettes
        dettesLignes={dettesLignes}
        dettesCommentaires={dettesCommentaires}
        setDettesCommentaires={setDettesCommentaires}
        setSaved={setSaved}
        totalDettesN={totalDettesN}
        totalDettesN1={totalDettesN1}
        totalDettesVariation={totalDettesVariation}
        hasDettesAnomalie={hasDettesAnomalie}
        exerciceAnnee={exerciceAnnee}
        isOpen={openSections.c4}
        toggle={() => toggleSection('c4')}
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

export default RevisionPersonnel;
