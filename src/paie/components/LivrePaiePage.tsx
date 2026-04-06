import React, { useState, useMemo } from 'react';
import {
  genererLivrePaieMensuel,
  genererLivrePaieAnnuel,
  genererLivrePaieEmploye,
  genererEtatChargesFiscales,
  genererEtatChargesSociales,
} from '../data/livrePaie';
import type { BulletinResume } from '../data/declarations';
import { TABS, type TabId, type SalarieItem, type EtablissementItem } from './livrePaieTypes';
import LivrePaieFilters from './LivrePaieFilters';
import { LivrePaieMensuelTable, LivrePaieAnnuelTable, LivrePaieEmployeTable } from './LivrePaieTable';
import { LivrePaieFiscal, LivrePaieSocial } from './LivrePaieSummary';

interface LivrePaiePageProps {
  salaries: SalarieItem[];
  etablissements: EtablissementItem[];
  mois: number;
  annee: number;
}

/**
 * Construit des BulletinResume simules a partir des salaries enregistres.
 */
function buildBulletinsResume(
  salaries: SalarieItem[],
  mois: number,
  annee: number,
): BulletinResume[] {
  return salaries.map((s) => {
    const base = Number(s.salaire_horaires?.salaire_base) || 0;
    const brut = base;
    const cnssBase1 = Math.min(brut, 1200000);
    const cnssBase2 = Math.min(brut, 600000);
    const cnssSalariale = Math.round(cnssBase1 * 0.04);
    const patronaleVieillesse = Math.round(cnssBase1 * 0.08);
    const patronaleAf = Math.round(cnssBase2 * 0.1003);
    const patronaleAt = Math.round(cnssBase2 * 0.0225);
    const its = Math.round(brut * 0.05);
    const tusImpot = Math.round(brut * 0.015);
    const tusCnss = Math.round(brut * 0.06);
    const camuBase = Math.max(0, (brut - cnssSalariale) - 500000);
    const camu = Math.round(camuBase * 0.005);
    const tol = 5000;
    const totalRetenues = cnssSalariale + its + tol + camu;
    const net = brut - totalRetenues;

    return {
      id: String(s.id),
      nom: s.identite?.nom || '',
      prenom: s.identite?.prenom || '',
      mois,
      annee,
      salaire_base: base,
      brut,
      cnss_salariale: cnssSalariale,
      cnss_patronale_vieillesse: patronaleVieillesse,
      cnss_patronale_af: patronaleAf,
      cnss_patronale_at: patronaleAt,
      its,
      tus_impot: tusImpot,
      tus_cnss: tusCnss,
      camu_salariale: camu,
      taxe_locaux: tol,
      net_a_payer: net,
    };
  });
}

function LivrePaiePage({
  salaries,
  etablissements,
  mois,
  annee,
}: LivrePaiePageProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabId>('mensuel');
  const [selectedMois, setSelectedMois] = useState<number>(mois);
  const [selectedAnnee, setSelectedAnnee] = useState<number>(annee);
  const [selectedSalarieId, setSelectedSalarieId] = useState<string>(
    salaries.length > 0 ? String(salaries[0].id) : '',
  );

  const employeur = etablissements.length > 0
    ? (etablissements[0].raison_sociale || 'Employeur')
    : 'Employeur';

  const bulletinsMois: BulletinResume[] = useMemo(
    () => buildBulletinsResume(salaries, selectedMois, selectedAnnee),
    [salaries, selectedMois, selectedAnnee],
  );

  const bulletinsParMois: BulletinResume[][] = useMemo(
    () => Array.from({ length: 12 }, (_, i) =>
      buildBulletinsResume(salaries, i + 1, selectedAnnee),
    ),
    [salaries, selectedAnnee],
  );

  const livreMensuel = useMemo(
    () => genererLivrePaieMensuel(bulletinsMois, employeur, selectedMois, selectedAnnee),
    [bulletinsMois, employeur, selectedMois, selectedAnnee],
  );

  const livreAnnuel = useMemo(
    () => genererLivrePaieAnnuel(bulletinsParMois, employeur, selectedAnnee),
    [bulletinsParMois, employeur, selectedAnnee],
  );

  const livreEmploye = useMemo(() => {
    if (!selectedSalarieId) return null;
    const sal = salaries.find((s) => String(s.id) === selectedSalarieId);
    if (!sal) return null;
    const bulletinsEmploye = bulletinsParMois.flatMap((bm) =>
      bm.filter((b) => b.id === selectedSalarieId),
    );
    if (bulletinsEmploye.length === 0) return null;
    return genererLivrePaieEmploye(
      bulletinsEmploye,
      selectedSalarieId,
      sal.identite?.nom || '',
      sal.identite?.prenom || '',
      selectedAnnee,
    );
  }, [bulletinsParMois, selectedSalarieId, salaries, selectedAnnee]);

  const chargesFiscales = useMemo(
    () => genererEtatChargesFiscales(bulletinsMois, employeur, selectedMois, selectedAnnee),
    [bulletinsMois, employeur, selectedMois, selectedAnnee],
  );

  const chargesSociales = useMemo(
    () => genererEtatChargesSociales(bulletinsMois, employeur, selectedMois, selectedAnnee),
    [bulletinsMois, employeur, selectedMois, selectedAnnee],
  );

  return (
    <div className="livre-paie-page">
      <div className="livre-paie-header">
        <div>
          <h3>Livre de paie</h3>
          <p>Registre obligatoire, etats des charges fiscales et sociales — CGI 2026</p>
        </div>
        <LivrePaieFilters
          selectedMois={selectedMois}
          selectedAnnee={selectedAnnee}
          onMoisChange={setSelectedMois}
          onAnneeChange={setSelectedAnnee}
        />
      </div>

      <div className="livre-paie-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`livre-paie-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="livre-paie-content">
        {activeTab === 'mensuel' && (
          <LivrePaieMensuelTable
            livreMensuel={livreMensuel}
            employeur={employeur}
            selectedMois={selectedMois}
            selectedAnnee={selectedAnnee}
          />
        )}
        {activeTab === 'annuel' && (
          <LivrePaieAnnuelTable
            livreAnnuel={livreAnnuel}
            employeur={employeur}
            selectedAnnee={selectedAnnee}
          />
        )}
        {activeTab === 'employe' && (
          <LivrePaieEmployeTable
            livreEmploye={livreEmploye}
            salaries={salaries}
            selectedSalarieId={selectedSalarieId}
            selectedAnnee={selectedAnnee}
            onSalarieChange={setSelectedSalarieId}
          />
        )}
        {activeTab === 'fiscal' && (
          <LivrePaieFiscal
            chargesFiscales={chargesFiscales}
            employeur={employeur}
            selectedMois={selectedMois}
            selectedAnnee={selectedAnnee}
          />
        )}
        {activeTab === 'social' && (
          <LivrePaieSocial
            chargesSociales={chargesSociales}
            employeur={employeur}
            selectedMois={selectedMois}
            selectedAnnee={selectedAnnee}
          />
        )}
      </div>
    </div>
  );
}

export default LivrePaiePage;
