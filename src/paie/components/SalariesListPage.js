import React, { useState } from 'react';

function SalariesListPage({ salaries, onAddSalarie }) {
  const [searchNom, setSearchNom] = useState('');

  const filtered = salaries.filter(s =>
    (s.nom || '').toLowerCase().includes(searchNom.toLowerCase()) ||
    (s.prenom || '').toLowerCase().includes(searchNom.toLowerCase())
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Liste des salariés</h2>
        <button className="btn-add-etab" onClick={onAddSalarie}>+ Ajouter un salarié</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={searchNom}
          onChange={e => setSearchNom(e.target.value)}
          placeholder="Rechercher par nom ou prénom..."
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', fontSize: 13, width: 300 }}
        />
      </div>

      <table className="etab-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Établissement</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={3} className="etab-table-empty">Aucun salarié</td></tr>
          ) : (
            filtered.map((sal, i) => (
              <tr key={sal.id || i}>
                <td>{sal.nom || '-'}</td>
                <td>{sal.prenom || '-'}</td>
                <td>{sal.etablissement_nom || '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default SalariesListPage;
