/**
 * Tableau de bord Comptabilite — orchestration des panels.
 * Branche les hooks data + computed sur les panels (KPI, evolution,
 * tresorerie, ratios, top clients, echeances, activite recente).
 */

import React from 'react';
import {
  LuTrendingUp, LuWallet, LuPiggyBank, LuChartBar,
  LuPenLine, LuFileText, LuArrowLeftRight,
} from 'react-icons/lu';
import { useDashboardData } from './dashboard/useDashboardData';
import { useDashboardComputed } from './dashboard/useDashboardComputed';
import KpiCard from './dashboard/KpiCard';
import QuickAction from './dashboard/QuickAction';
import EvolutionPanel from './dashboard/EvolutionPanel';
import TresoreriePanel from './dashboard/TresoreriePanel';
import RatiosPanel from './dashboard/RatiosPanel';
import TopClientsPanel from './dashboard/TopClientsPanel';
import EcheancesPanel from './dashboard/EcheancesPanel';
import ActiviteRecentePanel from './dashboard/ActiviteRecentePanel';
import './ComptaDashboard.css';

interface Props {
  entiteId: number;
  exerciceId: number | null;
  openTab: (id: string) => void;
}

function ComptaDashboard({ entiteId, exerciceId, openTab }: Props): React.ReactElement {
  const { tableauBord, tbLoading, clientsTiers, ecrituresRecentes } = useDashboardData(entiteId, exerciceId);
  const { kpis, evolution, ratios, echeances } = useDashboardComputed(tableauBord);

  if (!exerciceId) {
    return <div className="cd-root"><div className="cd-empty">Sélectionnez un exercice pour afficher le tableau de bord.</div></div>;
  }
  if (tbLoading || !kpis) {
    return <div className="cd-root"><div className="cd-empty">Chargement du tableau de bord...</div></div>;
  }

  return (
    <div className="cd-root">
      <div className="cd-kpis">
        <KpiCard featured label="Chiffre d'affaires" value={kpis.ca}
          icon={<LuTrendingUp size={16} />} color="#D4A843"
          spark={evolution.map(e => ({ x: e.mois, y: e.cumulCa }))} />
        <KpiCard label="Résultat net" value={kpis.resultat}
          icon={<LuChartBar size={16} />} color="#16a34a"
          trend={`marge ${kpis.marge.toFixed(1).replace('.', ',')} %`} trendUp={kpis.resultat > 0}
          spark={evolution.map(e => ({ x: e.mois, y: e.resultat }))} />
        <KpiCard label="Trésorerie" value={kpis.tresoNet}
          icon={<LuWallet size={16} />} color="#2563eb" trendUp={kpis.tresoNet > 0}
          spark={evolution.map(e => ({ x: e.mois, y: e.cumulCa - e.charges }))} />
        <KpiCard label="BFR" value={kpis.bfr}
          icon={<LuPiggyBank size={16} />} color="#ea580c"
          trend={`DSO ${kpis.dso} j`} trendUp={kpis.dso < 60}
          spark={evolution.map(e => ({ x: e.mois, y: e.ca - e.charges }))} />
      </div>

      <div className="cd-quick">
        <QuickAction icon={<LuPenLine size={18} />} title="Saisir une écriture" sub="Journal · Tiers · OD" onClick={() => openTab('journal')} />
        <QuickAction icon={<LuArrowLeftRight size={18} />} title="Lettrage" sub="Apparier facture / paiement" onClick={() => openTab('lettrage')} />
        <QuickAction icon={<LuChartBar size={18} />} title="Balance générale" sub="Tous comptes" onClick={() => openTab('balance')} />
        <QuickAction icon={<LuFileText size={18} />} title="Générer la liasse" sub="SYSCOHADA · 36 notes" onClick={() => openTab('liasse_complete_sys')} />
      </div>

      <div className="cd-grid-2">
        <EvolutionPanel evolution={evolution} />
        <TresoreriePanel tableauBord={tableauBord} tresoNet={kpis.tresoNet} evolution={evolution} />
      </div>

      <div className="cd-grid-3">
        <RatiosPanel ratios={ratios} />
        <TopClientsPanel clientsTiers={clientsTiers} />
        <EcheancesPanel echeances={echeances} />
      </div>

      <ActiviteRecentePanel ecrituresRecentes={ecrituresRecentes} onSeeAll={() => openTab('journaux')} />
    </div>
  );
}

export default ComptaDashboard;
