import React from 'react';
import { getResumeOrganismes, getOrganismesDeclarations } from '../data/organismes';

function OrganismesPage() {
  const organismes = getResumeOrganismes();
  const declarations = getOrganismesDeclarations();

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: '#1A3A5C' }}>
        Organismes sociaux et fiscaux
      </h2>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
        Congo-Brazzaville — Taux et cotisations en vigueur (CGI 2026)
      </p>

      {/* Tableau des cotisations */}
      <div style={{ overflowX: 'auto', marginBottom: 32 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1A3A5C', color: '#fff' }}>
              <th style={thStyle}>Organisme</th>
              <th style={thStyle}>Cotisation</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Part patronale</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Part salariale</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Plafond (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            {organismes.map((org, oi) => (
              org.lignes.map((ligne, li) => (
                <tr key={`${oi}-${li}`} style={{ borderBottom: '1px solid #eee', background: li % 2 === 0 ? '#fafafa' : '#fff' }}>
                  {li === 0 && (
                    <td rowSpan={org.lignes.length} style={{ ...tdStyle, fontWeight: 700, verticalAlign: 'top', background: '#f5f0e0', color: '#1A3A5C', borderRight: '2px solid #D4A843' }}>
                      <div style={{ fontWeight: 700 }}>{org.organisme}</div>
                      <div style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>{org.nom}</div>
                    </td>
                  )}
                  <td style={tdStyle}>{ligne.label}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{ligne.patronal}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{ligne.salarial}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#888' }}>{ligne.plafond}</td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>

      {/* Déclarations */}
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#1A3A5C' }}>
        Déclarations obligatoires
      </h3>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {declarations.map(decl => (
          <div key={decl.code} style={{
            border: '1px solid #e5e5e5',
            borderRadius: 8,
            padding: 16,
            background: '#fff',
            borderLeft: '3px solid #D4A843',
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#1A3A5C' }}>{decl.code}</div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{decl.nom}</div>
            {decl.declarations.map((d, i) => (
              <div key={i} style={{ fontSize: 12, color: '#333', padding: '2px 0' }}>• {d}</div>
            ))}
            <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
              <span style={{ fontWeight: 600 }}>Périodicité :</span> {decl.periodicite}
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>
              <span style={{ fontWeight: 600 }}>Échéance :</span> {decl.echeance}
            </div>
          </div>
        ))}
      </div>

      {/* Répartition TUS */}
      <div style={{ marginTop: 32, padding: 16, background: '#f9f7f0', borderRadius: 8, border: '1px solid #e5e0cc' }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1A3A5C', marginBottom: 8 }}>
          Répartition de la TUS (7,5%)
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Collecte DGI (20% = 1,5%) :</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { label: 'État', pct: '15%' },
                { label: 'FNH', pct: '5%' },
              ].map(item => (
                <span key={item.label} style={{ padding: '4px 10px', background: '#fff', border: '1px solid #1a5276', borderRadius: 4, color: '#1a5276' }}>
                  <strong>{item.label}</strong> {item.pct}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Collecte CNSS (80% = 6%) :</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { label: 'FIGA', pct: '27%' },
                { label: 'FONEA', pct: '23%' },
                { label: 'ACPE', pct: '10%' },
                { label: 'ADPME', pct: '5%' },
                { label: 'ACPCE', pct: '5%' },
                { label: 'ANIRSJ', pct: '5%' },
                { label: 'Univ. D. Sassou Nguesso', pct: '3%' },
                { label: 'Univ. Marien Ngouabi', pct: '2%' },
              ].map(item => (
                <span key={item.label} style={{ padding: '4px 10px', background: '#fff', border: '1px solid #d4c88a', borderRadius: 4, color: '#1A3A5C' }}>
                  <strong>{item.label}</strong> {item.pct}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
};

const tdStyle = {
  padding: '8px 12px',
};

export default OrganismesPage;
