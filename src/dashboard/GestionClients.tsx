import React, { useState } from 'react';
import { LuSearch, LuPlus } from 'react-icons/lu';
import { Entite, NormxModule } from '../types';
import { apiPost, apiPut, apiDelete, ApiError } from '../api';
import { ENABLED_MODULES } from '../config/modules';
import ConfirmModal from '../components/ConfirmModal';
import ClientsTable from './clients/ClientsTable';
import ClientFormModal, { NewClientForm } from './clients/ClientFormModal';
import CabinetExerciceModal from './clients/CabinetExerciceModal';
import './GestionClients.css';

interface GestionClientsProps {
  entites: Entite[];
  currentEntiteId: number;
  onSelectEntite: (entite: Entite) => void;
  onEntiteCreated: (entite: Entite) => void;
  onEntiteUpdated: (entite: Entite) => void;
  onEntiteDeleted: (id: number) => void;
  onOpenModule: (entite: Entite, mod: NormxModule) => void;
}

// Module par defaut : compta si disponible, sinon etats, sinon le 1er
// module active de la liste ENABLED_MODULES. Une seule case cochee a
// l'ouverture du modal puisque compta et etats sont mutuellement exclusifs
// (la compta genere nativement ses etats, cocher les deux na pas de sens).
function defaultModule(): Set<string> {
  if (ENABLED_MODULES.includes('compta')) return new Set(['compta']);
  if (ENABLED_MODULES.includes('etats')) return new Set(['etats']);
  return new Set(ENABLED_MODULES.slice(0, 1));
}

const EMPTY_FORM: NewClientForm = {
  nom: '',
  type_activite: 'entreprise',
  offre: 'comptabilite',
  modules: defaultModule(),
  sigle: '',
  adresse: '',
  nif: '',
  telephone: '',
  email: '',
};

function GestionClients({ entites, currentEntiteId, onSelectEntite, onEntiteCreated, onEntiteUpdated, onEntiteDeleted, onOpenModule }: GestionClientsProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'nom' | 'type' | 'date'>('nom');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<NewClientForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exerciceModalOpen, setExerciceModalOpen] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'archive';
    confirmLabel?: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', variant: 'danger', onConfirm: () => {} });

  const filtered = entites
    .filter((e) => e.nom.toLowerCase().includes(search.toLowerCase()) || (e.sigle || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'nom') return a.nom.localeCompare(b.nom);
      if (sortBy === 'type') return a.type_activite.localeCompare(b.type_activite);
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

  const openNewForm = (): void => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM, modules: defaultModule() });
    setShowForm(true);
    setError('');
  };

  const openEditForm = (ent: Entite): void => {
    setEditingId(ent.id);
    setFormData({
      nom: ent.nom,
      type_activite: ent.type_activite,
      offre: ent.offre,
      modules: new Set(ent.modules || []),
      sigle: ent.sigle || '',
      adresse: ent.adresse || '',
      nif: ent.nif || '',
      telephone: ent.telephone || '',
      email: ent.email || '',
    });
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (): Promise<void> => {
    if (!formData.nom.trim()) { setError('Le nom est obligatoire.'); return; }
    if (formData.modules.size === 0) { setError('Sélectionnez au moins un module.'); return; }

    setLoading(true);
    setError('');
    const modules = Array.from(formData.modules);

    try {
      if (editingId) {
        const updated = await apiPut<Entite>(`/api/entites/${editingId}`, { ...formData, modules });
        onEntiteUpdated(updated);
      } else {
        const created = await apiPost<Entite>('/api/entites', { ...formData, modules });
        onEntiteCreated(created);
      }
      setShowForm(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EXERCICE_REQUIRED') {
        setExerciceModalOpen(true);
      } else {
        setError(err instanceof Error ? err.message : 'Impossible de contacter le serveur.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExerciceCreated = async (): Promise<void> => {
    setExerciceModalOpen(false);
    await handleSubmit();
  };

  const handleDelete = async (id: number, nom: string, slug?: string): Promise<void> => {
    let hasData = false;
    try {
      const headers: Record<string, string> = {};
      if (slug) headers['X-Client-Slug'] = slug;
      const res = await fetch(`/api/balance/exercices/${id}`, { credentials: 'include', headers });
      if (res.ok) {
        const exercices = await res.json();
        hasData = exercices.length > 0;
      }
    } catch { /* ignore */ }

    const runDelete = async (): Promise<void> => {
      setConfirmState((prev) => ({ ...prev, open: false }));
      try {
        await apiDelete(`/api/entites/${id}`);
        onEntiteDeleted(id);
      } catch { /* silently fail */ }
    };

    if (hasData) {
      setConfirmState({
        open: true,
        title: `Archiver "${nom}" ?`,
        message: 'Ce dossier contient des exercices et des données comptables. Il sera archivé et pourra être restauré ultérieurement.',
        variant: 'archive',
        confirmLabel: 'Archiver',
        onConfirm: runDelete,
      });
    } else {
      setConfirmState({
        open: true,
        title: `Supprimer "${nom}" ?`,
        message: 'Ce dossier ne contient aucune donnée. Il sera définitivement supprimé.',
        variant: 'danger',
        confirmLabel: 'Supprimer',
        onConfirm: runDelete,
      });
    }
  };

  return (
    <div className="gc-container">
      <div className="gc-header">
        <div>
          <h2 className="gc-title">Clients et dossiers</h2>
          <p className="gc-subtitle">{entites.length} dossier{entites.length > 1 ? 's' : ''} actif{entites.length > 1 ? 's' : ''}</p>
        </div>
        <button className="gc-add-btn" onClick={openNewForm}>
          <LuPlus size={16} /> Nouveau client
        </button>
      </div>

      <div className="gc-toolbar">
        <div className="gc-search">
          <LuSearch size={16} />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="gc-sort">
          <span>Trier par</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'nom' | 'type' | 'date')}>
            <option value="nom">Nom de A à Z</option>
            <option value="type">Type d'activité</option>
            <option value="date">Date de création</option>
          </select>
        </div>
      </div>

      <ClientsTable
        entites={filtered}
        currentEntiteId={currentEntiteId}
        onSelectEntite={onSelectEntite}
        onOpenModule={onOpenModule}
        onEdit={openEditForm}
        onDelete={handleDelete}
      />

      <ClientFormModal
        open={showForm}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        loading={loading}
        error={error}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
      />

      <CabinetExerciceModal
        open={exerciceModalOpen}
        onClose={() => setExerciceModalOpen(false)}
        onCreated={handleExerciceCreated}
      />

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}

export default GestionClients;
