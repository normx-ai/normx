import React, { useState, useEffect } from 'react';
import {
  LuScale, LuLandmark, LuShieldCheck, LuBuilding, LuPackage,
  LuTruck, LuUsers, LuBriefcase, LuWallet, LuFileSpreadsheet, LuHandCoins,
  LuUserCog, LuFileText,
} from 'react-icons/lu';
import { BalanceLigne, Exercice } from '../types';
import RevisionKP from './RevisionKP';
import RevisionProv from './RevisionProv';
import RevisionSubv from './RevisionSubv';
import RevisionDF from './RevisionDF';
import RevisionImmo from './RevisionImmo';
import RevisionStocks from './RevisionStocks';
import RevisionFourn from './RevisionFourn';
import RevisionClients from './RevisionClients';
import RevisionEtat from './RevisionEtat';
import RevisionTreso from './RevisionTreso';
import RevisionPersonnel from './RevisionPersonnel';
import RevisionAutresTiers from './RevisionAutresTiers';
import './RevisionComptes.css';

interface RevisionComptesProps {
  entiteId: number;
  exerciceId: number;
  exerciceAnnee: number;
  entiteName: string;
}

interface SectionDef {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ size?: number }>;
}

const SECTIONS: SectionDef[] = [
  { id: 'kp', label: 'Capitaux propres', shortLabel: 'KP', icon: LuScale },
  { id: 'prov', label: 'Provisions réglementées', shortLabel: 'Prov régl.', icon: LuShieldCheck },
  { id: 'subv', label: 'Subventions', shortLabel: 'Subv', icon: LuHandCoins },
  { id: 'df', label: 'Dettes financières', shortLabel: 'DF', icon: LuLandmark },
  { id: 'immo', label: 'Immobilisations', shortLabel: 'Immo', icon: LuBuilding },
  { id: 'stocks', label: 'Stocks', shortLabel: 'Stocks', icon: LuPackage },
  { id: 'fourn', label: 'Fournisseurs', shortLabel: "F'sseur", icon: LuTruck },
  { id: 'clients', label: 'Clients', shortLabel: 'Clients', icon: LuUsers },
  { id: 'etat', label: 'État (IS, TVA)', shortLabel: 'État', icon: LuBriefcase },
  { id: 'treso', label: 'Trésorerie', shortLabel: 'Tréso', icon: LuWallet },
  { id: 'personnel', label: 'Personnel', shortLabel: 'Personnel', icon: LuUserCog },
  { id: 'autres', label: 'Autres tiers', shortLabel: 'Autres', icon: LuFileText },
];

function RevisionComptes({ entiteId, exerciceId, exerciceAnnee, entiteName }: RevisionComptesProps): React.ReactElement {
  const [activeSection, setActiveSection] = useState<string>(() => {
    return localStorage.getItem(`revision-tab-${entiteId}-${exerciceId}`) || 'kp';
  });

  const handleSetActiveSection = (section: string): void => {
    setActiveSection(section);
    localStorage.setItem(`revision-tab-${entiteId}-${exerciceId}`, section);
  };
  const [balanceN, setBalanceN] = useState<BalanceLigne[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!entiteId || !exerciceId) return;
    setLoading(true);
    fetch(`/api/balance/${entiteId}/${exerciceId}/N`).then(r => r.json())
      .then(dataN => {
        setBalanceN(dataN.lignes || []);
      }).catch(() => {})
      .finally(() => setLoading(false));
  }, [entiteId, exerciceId]);

  if (loading) {
    return (
      <div className="revision-comptes">
        <div className="revision-loading">Chargement des données...</div>
      </div>
    );
  }

  if (balanceN.length === 0) {
    return (
      <div className="revision-comptes">
        <div className="revision-empty">
          <LuFileSpreadsheet size={40} />
          <h3>Aucune balance importée</h3>
          <p>Importez la balance N pour accéder à la révision comptable.</p>
        </div>
      </div>
    );
  }

  const renderSection = (): React.ReactElement => {
    switch (activeSection) {
      case 'kp':
        return (
          <RevisionKP
            balanceN={balanceN}

            exerciceAnnee={exerciceAnnee}
            entiteId={entiteId}
            exerciceId={exerciceId}
          />
        );
      case 'prov':
        return (
          <RevisionProv
            balanceN={balanceN}

            exerciceAnnee={exerciceAnnee}
            entiteId={entiteId}
            exerciceId={exerciceId}
          />
        );
      case 'subv':
        return (
          <RevisionSubv
            balanceN={balanceN}

            exerciceAnnee={exerciceAnnee}
            entiteId={entiteId}
            exerciceId={exerciceId}
          />
        );
      case 'df':
        return (
          <RevisionDF
            balanceN={balanceN}

            exerciceAnnee={exerciceAnnee}
            entiteId={entiteId}
            exerciceId={exerciceId}
          />
        );
      case 'immo':
        return (
          <RevisionImmo
            balanceN={balanceN}

            exerciceAnnee={exerciceAnnee}
            entiteId={entiteId}
            exerciceId={exerciceId}
          />
        );
      case 'stocks':
        return (
          <RevisionStocks
            balanceN={balanceN}

            exerciceAnnee={exerciceAnnee}
            entiteId={entiteId}
            exerciceId={exerciceId}
          />
        );
      case 'fourn':
        return (
          <RevisionFourn
            balanceN={balanceN}

            exerciceAnnee={exerciceAnnee}
            entiteId={entiteId}
            exerciceId={exerciceId}
          />
        );
      case 'clients':
        return (
          <RevisionClients
            balanceN={balanceN}

            exerciceAnnee={exerciceAnnee}
            entiteId={entiteId}
            exerciceId={exerciceId}
          />
        );
      case 'etat':
        return (
          <RevisionEtat
            balanceN={balanceN}

            exerciceAnnee={exerciceAnnee}
            entiteId={entiteId}
            exerciceId={exerciceId}
          />
        );
      case 'treso':
        return (
          <RevisionTreso
            balanceN={balanceN}

            exerciceAnnee={exerciceAnnee}
            entiteId={entiteId}
            exerciceId={exerciceId}
          />
        );
      case 'personnel':
        return (
          <RevisionPersonnel
            balanceN={balanceN}

            exerciceAnnee={exerciceAnnee}
            entiteId={entiteId}
            exerciceId={exerciceId}
          />
        );
      case 'autres':
        return (
          <RevisionAutresTiers
            balanceN={balanceN}

            exerciceAnnee={exerciceAnnee}
            entiteId={entiteId}
            exerciceId={exerciceId}
          />
        );
      default:
        return (
          <div className="revision-placeholder">
            <h3>{SECTIONS.find(s => s.id === activeSection)?.label}</h3>
            <p>Section en cours de développement.</p>
          </div>
        );
    }
  };

  return (
    <div className="revision-comptes">
      <div className="revision-header">
        <h2><LuFileSpreadsheet size={20} /> Révision des comptes — {entiteName} ({exerciceAnnee})</h2>
      </div>

      <div className="revision-tabs">
        {SECTIONS.map(sec => {
          const Icon = sec.icon;
          return (
            <button
              key={sec.id}
              className={`revision-tab ${activeSection === sec.id ? 'active' : ''}`}
              onClick={() => handleSetActiveSection(sec.id)}
            >
              <Icon size={14} />
              <span>{sec.shortLabel}</span>
            </button>
          );
        })}
      </div>

      <div className="revision-content">
        {renderSection()}
      </div>
    </div>
  );
}

export default RevisionComptes;
