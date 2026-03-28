import React, { useState, useEffect, useCallback } from 'react';
import API_BASE from '../../utils/api';

// ============ TYPES ============

type RubriqueType = 'gain' | 'retenue' | 'cotisation' | 'indemnite' | 'avantage';
type RubriqueMode = 'pourcentage' | 'fixe' | 'horaire' | 'variable';

interface Rubrique {
  id: number;
  entite_id: number;
  code: string;
  libelle: string;
  type: RubriqueType;
  mode: RubriqueMode;
  taux: number | null;
  montant: number | null;
  plafond: number | null;
  base: string | null;
  imposable: boolean;
  actif: boolean;
  ordre: number;
}

interface RubriqueFormData {
  code: string;
  libelle: string;
  type: RubriqueType;
  mode: RubriqueMode;
  taux: string;
  montant: string;
  plafond: string;
  base: string;
  imposable: boolean;
  actif: boolean;
  ordre: string;
}

interface FilterTab {
  key: string;
  label: string;
  type: RubriqueType | null;
}

const FILTER_TABS: FilterTab[] = [
  { key: 'tous', label: 'Tous', type: null },
  { key: 'gain', label: 'Gains', type: 'gain' },
  { key: 'retenue', label: 'Retenues', type: 'retenue' },
  { key: 'cotisation', label: 'Cotisations', type: 'cotisation' },
  { key: 'indemnite', label: 'Indemnites', type: 'indemnite' },
  { key: 'avantage', label: 'Avantages', type: 'avantage' },
];

const TYPE_LABELS: Record<RubriqueType, string> = {
  gain: 'Gain',
  retenue: 'Retenue',
  cotisation: 'Cotisation',
  indemnite: 'Indemnite',
  avantage: 'Avantage',
};

const MODE_LABELS: Record<RubriqueMode, string> = {
  pourcentage: 'Pourcentage',
  fixe: 'Fixe',
  horaire: 'Horaire',
  variable: 'Variable',
};

const EMPTY_FORM: RubriqueFormData = {
  code: '',
  libelle: '',
  type: 'gain',
  mode: 'fixe',
  taux: '',
  montant: '',
  plafond: '',
  base: '',
  imposable: true,
  actif: true,
  ordre: '0',
};

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return '-';
  return new Intl.NumberFormat('fr-FR').format(n);
}

// ============ COMPONENT ============

interface RubriquesPageProps {
  entiteId: number;
}

function RubriquesPage({ entiteId }: RubriquesPageProps): React.ReactElement {
  const [rubriques, setRubriques] = useState<Rubrique[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>('tous');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RubriqueFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // ---- Fetch ----
  const loadRubriques = useCallback(async () => {
    if (!entiteId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/paie/rubriques?entite_id=${entiteId}`);
      const data: { rubriques?: Rubrique[] } = await res.json();
      setRubriques(data.rubriques || []);
    } catch {
      setError('Erreur de chargement des rubriques.');
    } finally {
      setLoading(false);
    }
  }, [entiteId]);

  useEffect(() => { loadRubriques(); }, [loadRubriques]);

  // ---- Filter ----
  const filteredRubriques = activeFilter === 'tous'
    ? rubriques
    : rubriques.filter(r => r.type === activeFilter);

  // ---- Modal open/close ----
  const openCreateModal = (): void => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (rub: Rubrique): void => {
    setEditingId(rub.id);
    setForm({
      code: rub.code,
      libelle: rub.libelle,
      type: rub.type,
      mode: rub.mode,
      taux: rub.taux !== null ? String(rub.taux) : '',
      montant: rub.montant !== null ? String(rub.montant) : '',
      plafond: rub.plafond !== null ? String(rub.plafond) : '',
      base: rub.base || '',
      imposable: rub.imposable,
      actif: rub.actif,
      ordre: String(rub.ordre),
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = (): void => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  // ---- Form field update ----
  const updateField = (field: keyof RubriqueFormData, value: string | boolean): void => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ---- Save ----
  const handleSave = async (): Promise<void> => {
    if (!form.code.trim() || !form.libelle.trim()) {
      setError('Code et libelle sont obligatoires.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const payload: Record<string, string | number | boolean | null> = {
        entite_id: entiteId,
        code: form.code.trim(),
        libelle: form.libelle.trim(),
        type: form.type,
        mode: form.mode,
        taux: form.taux ? Number(form.taux) : null,
        montant: form.montant ? Number(form.montant) : null,
        plafond: form.plafond ? Number(form.plafond) : null,
        base: form.base.trim() || null,
        imposable: form.imposable,
        actif: form.actif,
        ordre: form.ordre ? Number(form.ordre) : 0,
      };

      if (editingId) {
        const res = await fetch(`${API_BASE}/api/paie/rubriques/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          setError('Erreur lors de la mise a jour.');
          return;
        }
      } else {
        const res = await fetch(`${API_BASE}/api/paie/rubriques`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          setError('Erreur lors de la creation.');
          return;
        }
      }

      closeModal();
      await loadRubriques();
    } catch {
      setError('Erreur serveur.');
    } finally {
      setSaving(false);
    }
  };

  // ---- Toggle actif ----
  const handleToggleActif = async (rub: Rubrique): Promise<void> => {
    try {
      await fetch(`${API_BASE}/api/paie/rubriques/${rub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: !rub.actif }),
      });
      await loadRubriques();
    } catch {
      setError('Erreur lors du changement de statut.');
    }
  };

  // ---- Delete (soft) ----
  const handleDelete = async (id: number): Promise<void> => {
    try {
      await fetch(`${API_BASE}/api/paie/rubriques/${id}`, { method: 'DELETE' });
      await loadRubriques();
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  // ---- Init defaults ----
  const handleInitDefaults = async (): Promise<void> => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/paie/rubriques/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entite_id: entiteId }),
      });
      if (res.ok) {
        await loadRubriques();
      }
    } catch {
      setError('Erreur lors de l\'initialisation.');
    } finally {
      setSaving(false);
    }
  };

  // ============ RENDER ============

  return (
    <div className="declarations-page">
      {/* Header */}
      <div className="declarations-header">
        <div>
          <h2>Rubriques de paie</h2>
          <p>Gerez les rubriques (lignes de bulletin) de votre dossier.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-add-etab" onClick={handleInitDefaults} disabled={saving}>
            Initialiser par defaut
          </button>
          <button className="btn-add-etab" onClick={openCreateModal}>
            + Ajouter une rubrique
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="wizard-alert error" style={{ margin: '12px 24px 0' }}>
          {error}
          <button
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontWeight: 600 }}
            onClick={() => setError('')}
          >
            x
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ padding: '16px 24px 0' }}>
        <div className="rubriques-filter-tabs">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              className={`rubriques-filter-tab ${activeFilter === tab.key ? 'active' : ''}`}
              onClick={() => setActiveFilter(tab.key)}
            >
              {tab.label}
              {tab.type !== null && (
                <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>
                  ({rubriques.filter(r => r.type === tab.type).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="declarations-content">
        {loading ? (
          <div className="etab-table-empty">Chargement...</div>
        ) : (
          <div className="etab-table-wrapper">
            <table className="etab-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Libelle</th>
                  <th>Type</th>
                  <th>Mode</th>
                  <th style={{ textAlign: 'right' }}>Taux (%)</th>
                  <th style={{ textAlign: 'right' }}>Montant</th>
                  <th style={{ textAlign: 'right' }}>Plafond</th>
                  <th>Imposable</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRubriques.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="etab-table-empty">
                      Aucune rubrique.{' '}
                      <button
                        className="wizard-form-link"
                        onClick={handleInitDefaults}
                        style={{ display: 'inline' }}
                      >
                        Initialiser les rubriques par defaut
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredRubriques.map(rub => (
                    <tr key={rub.id} style={{ opacity: rub.actif ? 1 : 0.5 }}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{rub.code}</td>
                      <td>{rub.libelle}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 600,
                          background: rub.type === 'gain' ? '#dcfce7' : rub.type === 'cotisation' ? '#dbeafe' : '#fef3c7',
                          color: rub.type === 'gain' ? '#166534' : rub.type === 'cotisation' ? '#1e40af' : '#92400e',
                        }}>
                          {TYPE_LABELS[rub.type]}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{MODE_LABELS[rub.mode]}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {rub.taux !== null ? `${rub.taux}%` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {formatNumber(rub.montant)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {formatNumber(rub.plafond)}
                      </td>
                      <td>
                        {rub.imposable ? (
                          <span style={{ color: '#166534', fontSize: 12, fontWeight: 600 }}>Oui</span>
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: 12 }}>Non</span>
                        )}
                      </td>
                      <td>
                        <button
                          className={rub.actif ? 'rubriques-badge-actif' : 'rubriques-badge-inactif'}
                          onClick={() => handleToggleActif(rub)}
                          style={{ cursor: 'pointer', border: 'none' }}
                        >
                          {rub.actif ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn-mini-cancel"
                            style={{ padding: '4px 10px', fontSize: 11 }}
                            onClick={() => openEditModal(rub)}
                          >
                            Modifier
                          </button>
                          <button
                            className="btn-mini-cancel"
                            style={{ padding: '4px 10px', fontSize: 11, color: '#991b1b' }}
                            onClick={() => handleDelete(rub.id)}
                          >
                            Suppr.
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination info */}
        {!loading && filteredRubriques.length > 0 && (
          <div className="paie-pagination">
            <span>{filteredRubriques.length} rubrique{filteredRubriques.length !== 1 ? 's' : ''}</span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="wizard-overlay" onClick={closeModal}>
          <div
            className="avantages-modal"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            style={{ maxWidth: 640 }}
          >
            {/* Header */}
            <div className="wizard-modal-header">
              <h3>{editingId ? 'Modifier la rubrique' : 'Nouvelle rubrique'}</h3>
              <button className="wizard-close-btn" onClick={closeModal}>x</button>
            </div>

            {/* Body */}
            <div className="avantages-modal-body">
              {error && (
                <div className="wizard-alert error">{error}</div>
              )}

              <div className="wizard-form-section">
                <h4>Informations generales</h4>
                <div className="wizard-form-row">
                  <div className="wizard-form-group">
                    <label>Code <span className="required">*</span></label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('code', e.target.value)}
                      placeholder="SAL_BASE"
                      disabled={editingId !== null}
                    />
                  </div>
                  <div className="wizard-form-group">
                    <label>Libelle <span className="required">*</span></label>
                    <input
                      type="text"
                      value={form.libelle}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('libelle', e.target.value)}
                      placeholder="Salaire de base"
                    />
                  </div>
                </div>
                <div className="wizard-form-row">
                  <div className="wizard-form-group">
                    <label>Type</label>
                    <select
                      value={form.type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('type', e.target.value)}
                    >
                      <option value="gain">Gain</option>
                      <option value="retenue">Retenue</option>
                      <option value="cotisation">Cotisation</option>
                      <option value="indemnite">Indemnite</option>
                      <option value="avantage">Avantage</option>
                    </select>
                  </div>
                  <div className="wizard-form-group">
                    <label>Mode de calcul</label>
                    <select
                      value={form.mode}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('mode', e.target.value)}
                    >
                      <option value="fixe">Fixe</option>
                      <option value="pourcentage">Pourcentage</option>
                      <option value="horaire">Horaire</option>
                      <option value="variable">Variable</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="wizard-form-section">
                <h4>Parametres de calcul</h4>
                <div className="wizard-form-row">
                  <div className="wizard-form-group">
                    <label>Taux (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.taux}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('taux', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="wizard-form-group">
                    <label>Montant (FCFA)</label>
                    <input
                      type="number"
                      step="1"
                      value={form.montant}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('montant', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="wizard-form-row">
                  <div className="wizard-form-group">
                    <label>Plafond (FCFA)</label>
                    <input
                      type="number"
                      step="1"
                      value={form.plafond}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('plafond', e.target.value)}
                      placeholder="Aucun"
                    />
                  </div>
                  <div className="wizard-form-group">
                    <label>Base de calcul</label>
                    <select
                      value={form.base}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('base', e.target.value)}
                    >
                      <option value="">Aucune</option>
                      <option value="brut">Salaire brut</option>
                      <option value="net_imposable">Net imposable</option>
                      <option value="salaire_base">Salaire de base</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="wizard-form-section">
                <h4>Options</h4>
                <div className="wizard-form-row">
                  <div className="wizard-form-group">
                    <label>Ordre d&apos;affichage</label>
                    <input
                      type="number"
                      value={form.ordre}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('ordre', e.target.value)}
                    />
                  </div>
                  <div className="wizard-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 20 }}>
                    <label className="avantages-checkbox-label">
                      <input
                        type="checkbox"
                        className="avantages-checkbox"
                        checked={form.imposable}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('imposable', e.target.checked)}
                      />
                      <span>Imposable (ITS)</span>
                    </label>
                    <label className="avantages-checkbox-label">
                      <input
                        type="checkbox"
                        className="avantages-checkbox"
                        checked={form.actif}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('actif', e.target.checked)}
                      />
                      <span>Actif</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="wizard-footer">
              <div className="wizard-footer-left"></div>
              <div className="wizard-footer-right">
                <button className="btn-wizard-cancel" onClick={closeModal}>Annuler</button>
                <button className="btn-wizard-save" onClick={handleSave} disabled={saving}>
                  {saving ? 'Enregistrement...' : (editingId ? 'Mettre a jour' : 'Creer')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RubriquesPage;
