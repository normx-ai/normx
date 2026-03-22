import React, { useState } from 'react';
import { LuLayoutDashboard, LuChartPie, LuWallet, LuArrowLeftRight, LuListOrdered } from 'react-icons/lu';
import { RapportsProps, RapportCard, ReportId, SubReportProps } from './types';
import JournalCentralisateur from './JournalCentralisateur';
import BalanceAgee from './BalanceAgee';
import SuiviTresorerie from './SuiviTresorerie';
import TableauBord from './TableauBord';
import RepartitionCharges from './RepartitionCharges';
import ComparatifNN1 from './ComparatifNN1';
import SoldesIntermediaires from './SoldesIntermediaires';

const RAPPORTS: RapportCard[] = [
  { id: 'tableau_bord', label: 'Tableau de bord financier', desc: 'Indicateurs clés et ratios', Icon: LuLayoutDashboard },
  { id: 'repartition_charges', label: 'Répartition des charges', desc: 'Charges par nature (classe 6)', Icon: LuChartPie },
  { id: 'suivi_tresorerie', label: 'Suivi de trésorerie', desc: 'Évolution mensuelle encaissements/décaissements', Icon: LuWallet },
  { id: 'comparatif', label: 'Comparatif N / N-1', desc: 'Évolution des postes sur 2 exercices', Icon: LuArrowLeftRight },
  { id: 'sig', label: 'Soldes Intermédiaires de Gestion', desc: 'SIG SYSCOHADA : marges, VA, EBE, résultats', Icon: LuListOrdered },
];

function Rapports({ entiteId, exerciceId, exerciceAnnee, exercices = [], offre, entiteName, entiteSigle, entiteAdresse, entiteNif }: RapportsProps): React.ReactElement | null {
  const [activeReport, setActiveReport] = useState<ReportId | null>(null);

  if (!activeReport) {
    return (
      <div style={{ padding: '24px 30px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Rapports</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>Rapports de gestion et d&apos;analyse</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {RAPPORTS.map((r: RapportCard) => (
            <div
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              style={{
                background: '#fff', border: '1px solid #e2e5ea', borderRadius: 8, padding: '20px 18px',
                cursor: 'pointer', transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ fontSize: 28, marginBottom: 10, color: '#D4A843' }}><r.Icon size={32} /></div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>{r.label}</div>
              <div style={{ fontSize: 13, color: '#888' }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const props: SubReportProps = { entiteId, exerciceId, exerciceAnnee, exercices, offre, entiteName, entiteSigle, entiteAdresse, entiteNif, onBack: () => setActiveReport(null) };
  switch (activeReport) {
    case 'journal_centralisateur': return <JournalCentralisateur {...props} />;
    case 'balance_agee': return <BalanceAgee {...props} />;
    case 'suivi_tresorerie': return <SuiviTresorerie {...props} />;
    case 'tableau_bord': return <TableauBord {...props} />;
    case 'repartition_charges': return <RepartitionCharges {...props} />;
    case 'comparatif': return <ComparatifNN1 {...props} />;
    case 'sig': return <SoldesIntermediaires {...props} />;
    default: return null;
  }
}

export default Rapports;
