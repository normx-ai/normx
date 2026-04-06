import React from 'react';
import { formaterMontant } from '../utils/calculPaie';
import type { Salarie, Etablissement } from './wizardTypes';

interface PaieMainDashboardProps {
  salaries: Salarie[];
  etablissements: Etablissement[];
}

function PaieMainDashboard({ salaries, etablissements }: PaieMainDashboardProps) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Tableau de bord Paie</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', padding: 20, border: '1px solid #e2e5ea' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Établissements</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1A3A5C' }}>{etablissements.length}</div>
        </div>
        <div style={{ background: '#fff', padding: 20, border: '1px solid #e2e5ea' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Salariés</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1A3A5C' }}>{salaries.length}</div>
        </div>
        <div style={{ background: '#fff', padding: 20, border: '1px solid #e2e5ea' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Masse salariale</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1A3A5C' }}>
            {formaterMontant(salaries.reduce((s: number, sal: Salarie) => s + (parseInt(String(sal.salaire_horaires?.salaire_base)) || 0), 0))}
          </div>
        </div>
        <div style={{ background: '#fff', padding: 20, border: '1px solid #e2e5ea' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Devise</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1A3A5C' }}>XAF</div>
        </div>
      </div>

      <div style={{ background: '#fff', padding: 20, border: '1px solid #e2e5ea' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Actions rapides</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, padding: 16, background: '#fef9ee', border: '1px solid #D4A843', textAlign: 'center', fontSize: 13, color: '#C09935', cursor: 'pointer' }}>
            Calculer les bulletins
          </div>
          <div style={{ flex: 1, padding: 16, background: '#fef9ee', border: '1px solid #D4A843', textAlign: 'center', fontSize: 13, color: '#C09935', cursor: 'pointer' }}>
            Déclarations CNSS
          </div>
          <div style={{ flex: 1, padding: 16, background: '#fef9ee', border: '1px solid #D4A843', textAlign: 'center', fontSize: 13, color: '#C09935', cursor: 'pointer' }}>
            États de paie
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaieMainDashboard;
