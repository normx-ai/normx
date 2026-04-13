import React, { useState } from 'react';
import EtablissementWizard, { type EtablissementFormData } from './EtablissementWizard';
import type { Etablissement } from './wizardTypes';

interface PaieDashboardEtablissement extends Etablissement {
  nb_salaries?: number;
}

interface PaieDashboardProps {
  etablissements: PaieDashboardEtablissement[];
  onAddEtablissement: (data: EtablissementFormData) => void;
  onUpdateEtablissement: (id: number | string, data: EtablissementFormData) => void;
  entiteId?: string | number | null;
}

function PaieDashboard({ etablissements, onAddEtablissement, onUpdateEtablissement }: PaieDashboardProps): React.ReactElement {
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editingData, setEditingData] = useState<EtablissementFormData | null>(null);
  const [searchRS, setSearchRS] = useState<string>('');
  const [searchNUI, setSearchNUI] = useState<string>('');

  const handleSaveEtablissement = (data: EtablissementFormData) => {
    if (editingId !== null) {
      onUpdateEtablissement(editingId, data);
    } else {
      onAddEtablissement(data);
    }
    setShowWizard(false);
    setEditingId(null);
    setEditingData(null);
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
    setEditingId(null);
    setEditingData(null);
  };

  const handleEdit = (etab: PaieDashboardEtablissement) => {
    setEditingId(etab.id);
    setEditingData(etab.data || null);
    setShowWizard(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setEditingData(null);
    setShowWizard(true);
  };

  const filtered = etablissements.filter((e: Etablissement) =>
    (e.raison_sociale || '').toLowerCase().includes(searchRS.toLowerCase()) &&
    (e.nui || '').includes(searchNUI)
  );

  return (
    <div className="paie-dashboard">
      <div className="paie-dashboard-header">
        <h3>Établissements</h3>
        <p>Créez vos établissements avec leur NUI et paramètres Congo.</p>
        <p>Vous devez créer au moins un établissement pour passer à l'étape suivante.</p>
      </div>

      <div className="paie-dashboard-actions">
        <button className="btn-add-etab" onClick={handleNew}>
          + Ajouter un établissement
        </button>
        <button className="btn-actions-dropdown">Actions &#9660;</button>
      </div>

      <div className="etab-table-wrapper">
        <table className="etab-table">
          <thead>
            <tr>
              <th>Raison sociale &#8593;</th>
              <th>NUI</th>
              <th>Nombre de salariés</th>
            </tr>
            <tr className="etab-search-row">
              <th>
                <div className="etab-search-cell">
                  <input type="text" value={searchRS} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchRS(e.target.value)} placeholder="" />
                </div>
              </th>
              <th>
                <div className="etab-search-cell">
                  <input type="text" value={searchNUI} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchNUI(e.target.value)} placeholder="" />
                </div>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={3} className="etab-table-empty">Aucune donnée</td></tr>
            ) : (
              filtered.map((etab: PaieDashboardEtablissement) => (
                <tr key={etab.id} onClick={() => handleEdit(etab)} style={{ cursor: 'pointer' }}>
                  <td>{etab.raison_sociale}</td>
                  <td>{etab.nui || '-'}</td>
                  <td>{etab.nb_salaries || 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="paie-pagination">
        <span>Voir <select className="pagination-select"><option>25</option></select> éléments</span>
        <span>Page <input className="pagination-input" type="text" value={filtered.length > 0 ? '1' : '0'} readOnly /> sur {filtered.length > 0 ? 1 : 0}</span>
        <span>{filtered.length} élément{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {showWizard && (
        <EtablissementWizard
          onClose={handleCloseWizard}
          onSave={handleSaveEtablissement}
          initialData={editingData || undefined}
        />
      )}
    </div>
  );
}

export default PaieDashboard;
