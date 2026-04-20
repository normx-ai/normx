import React, { useState, useEffect, useCallback } from 'react';
import API_BASE from '../../utils/api';
import {
  EMPTY_FORM,
  Rubrique,
  RubriqueFormData,
} from './rubriques/rubriquesTypes';
import { RubriquesFilters } from './rubriques/RubriquesFilters';
import { RubriquesTable } from './rubriques/RubriquesTable';
import { RubriqueModal } from './rubriques/RubriqueModal';

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

  const filteredRubriques = activeFilter === 'tous'
    ? rubriques
    : rubriques.filter(r => r.type === activeFilter);

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

  const updateField = (field: keyof RubriqueFormData, value: string | boolean): void => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

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

  const handleDelete = async (id: number): Promise<void> => {
    try {
      await fetch(`${API_BASE}/api/paie/rubriques/${id}`, { method: 'DELETE' });
      await loadRubriques();
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

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

  return (
    <div className="declarations-page">
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

      <RubriquesFilters
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        rubriques={rubriques}
      />

      <div className="declarations-content">
        <RubriquesTable
          rubriques={filteredRubriques}
          loading={loading}
          onEdit={openEditModal}
          onToggleActif={handleToggleActif}
          onDelete={handleDelete}
          onInitDefaults={handleInitDefaults}
        />

        {!loading && filteredRubriques.length > 0 && (
          <div className="paie-pagination">
            <span>{filteredRubriques.length} rubrique{filteredRubriques.length !== 1 ? 's' : ''}</span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>

      {showModal && (
        <RubriqueModal
          editingId={editingId}
          form={form}
          saving={saving}
          error={error}
          updateField={updateField}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

export default RubriquesPage;
