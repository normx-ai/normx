import React, { useState } from 'react';
import {
  LuSearch, LuPlus, LuPenLine, LuTrash2, LuChevronDown,
  LuBuilding2, LuBookOpen, LuFileSpreadsheet, LuCoins,
  LuExternalLink, LuX, LuArchive
} from 'react-icons/lu';
import { Entite, TypeActivite, Offre, NormxModule } from '../types';
import { apiPost, apiPut, apiDelete } from '../api';
import ConfirmModal from '../components/ConfirmModal';
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

interface NewClientForm {
  nom: string;
  type_activite: TypeActivite;
  offre: Offre;
  modules: Set<string>;
  sigle: string;
  adresse: string;
  nif: string;
  telephone: string;
  email: string;
}

const MODULE_LABELS: Record<string, { label: string; icon: React.ComponentType<{ size?: number }>; color: string }> = {
  compta: { label: 'Comptabilité', icon: LuBookOpen, color: '#1A3A5C' },
  etats: { label: 'États', icon: LuFileSpreadsheet, color: '#1A3A5C' },
  paie: { label: 'Paie', icon: LuCoins, color: '#16a34a' },
};

function getTypeLabel(t: TypeActivite): string {
  switch (t) {
    case 'entreprise': return 'Entreprise';
    case 'association': return 'Association';
    case 'ordre_professionnel': return 'Ordre professionnel';
    case 'projet_developpement': return 'Projet';
    case 'smt': return 'Entreprise (SMT)';
    default: return t;
  }
}

function GestionClients({ entites, currentEntiteId, onSelectEntite, onEntiteCreated, onEntiteUpdated, onEntiteDeleted, onOpenModule }: GestionClientsProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'nom' | 'type' | 'date'>('nom');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<NewClientForm>({
    nom: '', type_activite: 'entreprise', offre: 'comptabilite', modules: new Set(['compta']),
    sigle: '', adresse: '', nif: '', telephone: '', email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filtered = entites
    .filter(e => e.nom.toLowerCase().includes(search.toLowerCase()) || (e.sigle || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'nom') return a.nom.localeCompare(b.nom);
      if (sortBy === 'type') return a.type_activite.localeCompare(b.type_activite);
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

  const openNewForm = (): void => {
    setEditingId(null);
    setFormData({
      nom: '', type_activite: 'entreprise', offre: 'comptabilite', modules: new Set(['compta']),
      sigle: '', adresse: '', nif: '', telephone: '', email: ''
    });
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

  const toggleModule = (mod: string): void => {
    const next = new Set(formData.modules);
    if (next.has(mod)) {
      next.delete(mod);
    } else {
      if (mod === 'compta' && next.has('etats')) next.delete('etats');
      if (mod === 'etats' && next.has('compta')) next.delete('compta');
      next.add(mod);
    }
    const offre: Offre = next.has('compta') ? 'comptabilite' : 'etats';
    setFormData({ ...formData, modules: next, offre });
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
      setError(err instanceof Error ? err.message : 'Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'archive';
    confirmLabel?: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', variant: 'danger', onConfirm: () => {} });

  const handleDelete = async (id: number, nom: string): Promise<void> => {
    // Vérifier si l'entité a des données (exercices)
    let hasData = false;
    try {
      const token = localStorage.getItem('normx_kc_access_token');
      const res = await fetch(`/api/balance/exercices/${id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const exercices = await res.json();
        hasData = exercices.length > 0;
      }
    } catch { /* ignore */ }

    if (hasData) {
      setConfirmState({
        open: true,
        title: `Archiver "${nom}" ?`,
        message: 'Ce dossier contient des exercices et des données comptables. Il sera archivé et pourra être restauré ultérieurement.',
        variant: 'archive',
        confirmLabel: 'Archiver',
        onConfirm: async () => {
          setConfirmState(prev => ({ ...prev, open: false }));
          try {
            await apiDelete(`/api/entites/${id}`);
            onEntiteDeleted(id);
          } catch { /* silently fail */ }
        },
      });
    } else {
      setConfirmState({
        open: true,
        title: `Supprimer "${nom}" ?`,
        message: 'Ce dossier ne contient aucune donnée. Il sera définitivement supprimé.',
        variant: 'danger',
        confirmLabel: 'Supprimer',
        onConfirm: async () => {
          setConfirmState(prev => ({ ...prev, open: false }));
          try {
            await apiDelete(`/api/entites/${id}`);
            onEntiteDeleted(id);
          } catch { /* silently fail */ }
        },
      });
    }
  };

  return (
    <div className="gc-container">
      {/* Header */}
      <div className="gc-header">
        <div>
          <h2 className="gc-title">Clients et dossiers</h2>
          <p className="gc-subtitle">{entites.length} dossier{entites.length > 1 ? 's' : ''} actif{entites.length > 1 ? 's' : ''}</p>
        </div>
        <button className="gc-add-btn" onClick={openNewForm}>
          <LuPlus size={16} /> Nouveau client
        </button>
      </div>

      {/* Toolbar */}
      <div className="gc-toolbar">
        <div className="gc-search">
          <LuSearch size={16} />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="gc-sort">
          <span>Trier par</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'nom' | 'type' | 'date')}>
            <option value="nom">Nom de A à Z</option>
            <option value="type">Type d'activité</option>
            <option value="date">Date de création</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="gc-table-wrap">
        <table className="gc-table">
          <thead>
            <tr>
              <th></th>
              <th>Nom</th>
              <th>Type d'entité</th>
              <th>Modules</th>
              <th>Téléphone</th>
              <th>E-mail</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="gc-empty">
                {entites.length === 0
                  ? 'Aucun dossier client. Cliquez sur "Nouveau client" pour créer votre premier dossier.'
                  : 'Aucun client trouvé pour cette recherche.'}
              </td></tr>
            )}
            {filtered.map(ent => (
              <tr key={ent.id} className={ent.id === currentEntiteId ? 'gc-row-active' : ''}>
                <td className="gc-icon-cell"><LuBuilding2 size={18} /></td>
                <td>
                  <button className="gc-name-link" onClick={() => onSelectEntite(ent)}>
                    {ent.nom}
                  </button>
                  {ent.sigle && <span className="gc-sigle">{ent.sigle}</span>}
                </td>
                <td>
                  <span className={`gc-type-badge ${ent.type_activite}`}>{getTypeLabel(ent.type_activite)}</span>
                </td>
                <td>
                  <div className="gc-modules">
                    {(ent.modules || []).map(mod => {
                      const info = MODULE_LABELS[mod];
                      if (!info) return null;
                      const ModIcon = info.icon;
                      return (
                        <button
                          key={mod}
                          className="gc-module-tag"
                          style={{ borderColor: info.color, color: info.color }}
                          onClick={() => onOpenModule(ent, mod as NormxModule)}
                          title={`Ouvrir ${info.label}`}
                        >
                          <ModIcon size={12} /> {info.label}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="gc-cell-light">{ent.telephone || '-'}</td>
                <td className="gc-cell-light">{ent.email || '-'}</td>
                <td>
                  <div className="gc-actions">
                    <button className="gc-action-btn" title="Ouvrir" onClick={() => onSelectEntite(ent)}>
                      <LuExternalLink size={15} />
                    </button>
                    <button className="gc-action-btn" title="Modifier" onClick={() => openEditForm(ent)}>
                      <LuPenLine size={15} />
                    </button>
                    <button className="gc-action-btn gc-action-danger" title="Désactiver" onClick={() => handleDelete(ent.id, ent.nom)}>
                      <LuTrash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal formulaire */}
      {showForm && (
        <div className="gc-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="gc-modal" onClick={e => e.stopPropagation()}>
            <div className="gc-modal-header">
              <h3>{editingId ? 'Modifier le dossier' : 'Nouveau client'}</h3>
              <button className="gc-modal-close" onClick={() => setShowForm(false)}><LuX size={18} /></button>
            </div>

            {error && <div className="gc-modal-error">{error}</div>}

            <div className="gc-modal-body">
              <div className="gc-form-row">
                <div className="gc-form-group gc-form-wide">
                  <label>Nom de l'entité <span className="required">*</span></label>
                  <input type="text" value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} placeholder="Nom du client / dossier" />
                </div>
              </div>

              <div className="gc-form-row">
                <div className="gc-form-group">
                  <label>Sigle</label>
                  <input type="text" value={formData.sigle} onChange={e => setFormData({ ...formData, sigle: e.target.value })} placeholder="Abréviation" />
                </div>
                <div className="gc-form-group">
                  <label>Type d'activité <span className="required">*</span></label>
                  <select value={formData.type_activite === 'smt' ? 'entreprise' : formData.type_activite} onChange={e => setFormData({ ...formData, type_activite: e.target.value as TypeActivite })}>
                    <option value="entreprise">Entreprise</option>
                    <option value="association">Association</option>
                    <option value="ordre_professionnel">Ordre professionnel</option>
                    <option value="projet_developpement">Projet de développement</option>
                  </select>
                </div>
              </div>

              {/* Sous-choix système comptable pour Entreprise */}
              {(formData.type_activite === 'entreprise' || formData.type_activite === 'smt') && (
                <div className="gc-form-row">
                  <div className="gc-form-group gc-form-wide">
                    <label>Système comptable</label>
                    <div className="gc-module-picker">
                      <button
                        type="button"
                        className={`gc-module-pick ${formData.type_activite === 'entreprise' ? 'selected' : ''}`}
                        style={formData.type_activite === 'entreprise' ? { borderColor: '#1A3A5C', background: '#1A3A5C10', color: '#1A3A5C' } : {}}
                        onClick={() => setFormData({ ...formData, type_activite: 'entreprise' })}
                      >
                        Système normal (SYSCOHADA)
                      </button>
                      <button
                        type="button"
                        className={`gc-module-pick ${formData.type_activite === 'smt' ? 'selected' : ''}`}
                        style={formData.type_activite === 'smt' ? { borderColor: '#D4A843', background: '#D4A84310', color: '#D4A843' } : {}}
                        onClick={() => setFormData({ ...formData, type_activite: 'smt' })}
                      >
                        SMT (très petite entité)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="gc-form-row">
                <div className="gc-form-group">
                  <label>NIF</label>
                  <input type="text" value={formData.nif} onChange={e => setFormData({ ...formData, nif: e.target.value })} />
                </div>
                <div className="gc-form-group">
                  <label>Adresse</label>
                  <input type="text" value={formData.adresse} onChange={e => setFormData({ ...formData, adresse: e.target.value })} />
                </div>
              </div>

              <div className="gc-form-row">
                <div className="gc-form-group">
                  <label>Téléphone</label>
                  <input type="tel" value={formData.telephone} onChange={e => setFormData({ ...formData, telephone: e.target.value })} placeholder="+XXX XX XXX XX XX" />
                </div>
                <div className="gc-form-group">
                  <label>E-mail</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="contact@entite.com" />
                </div>
              </div>

              <div className="gc-form-group">
                <label>Modules <span className="required">*</span></label>
                <div className="gc-module-picker">
                  {Object.entries(MODULE_LABELS).map(([key, info]) => {
                    const isSelected = formData.modules.has(key);
                    const ModIcon = info.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`gc-module-pick ${isSelected ? 'selected' : ''}`}
                        style={isSelected ? { borderColor: info.color, background: info.color + '10', color: info.color } : {}}
                        onClick={() => toggleModule(key)}
                      >
                        <ModIcon size={16} /> {info.label}
                      </button>
                    );
                  })}
                </div>
                <p className="gc-form-hint">Comptabilité et États financiers ne peuvent pas être combinés.</p>
              </div>
            </div>

            <div className="gc-modal-footer">
              <button className="gc-btn-cancel" onClick={() => setShowForm(false)}>Annuler</button>
              <button className="gc-btn-save" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Créer le dossier'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}

export default GestionClients;
