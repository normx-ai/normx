import React from 'react';
import { LuX, LuBookOpen, LuFileSpreadsheet, LuCoins } from 'react-icons/lu';
import { TypeActivite, Offre } from '../../types';

export interface NewClientForm {
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

export const MODULE_LABELS: Record<string, { label: string; icon: React.ComponentType<{ size?: number }>; color: string }> = {
  compta: { label: 'Comptabilité', icon: LuBookOpen, color: '#1A3A5C' },
  etats: { label: 'États', icon: LuFileSpreadsheet, color: '#1A3A5C' },
  paie: { label: 'Paie', icon: LuCoins, color: '#16a34a' },
};

interface ClientFormModalProps {
  open: boolean;
  editingId: number | null;
  formData: NewClientForm;
  setFormData: (data: NewClientForm) => void;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: () => void;
}

function ClientFormModal({ open, editingId, formData, setFormData, loading, error, onClose, onSubmit }: ClientFormModalProps): React.ReactElement | null {
  if (!open) return null;

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

  return (
    <div className="gc-modal-overlay" onClick={onClose}>
      <div className="gc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gc-modal-header">
          <h3>{editingId ? 'Modifier le dossier' : 'Nouveau client'}</h3>
          <button className="gc-modal-close" onClick={onClose}><LuX size={18} /></button>
        </div>

        {error && <div className="gc-modal-error">{error}</div>}

        <div className="gc-modal-body">
          <div className="gc-form-row">
            <div className="gc-form-group gc-form-wide">
              <label>Nom de l'entité <span className="required">*</span></label>
              <input type="text" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} placeholder="Nom du client / dossier" />
            </div>
          </div>

          <div className="gc-form-row">
            <div className="gc-form-group">
              <label>Sigle</label>
              <input type="text" value={formData.sigle} onChange={(e) => setFormData({ ...formData, sigle: e.target.value })} placeholder="Abréviation" />
            </div>
            <div className="gc-form-group">
              <label>Type d'activité <span className="required">*</span></label>
              <select value={formData.type_activite === 'smt' ? 'entreprise' : formData.type_activite} onChange={(e) => setFormData({ ...formData, type_activite: e.target.value as TypeActivite })}>
                <option value="entreprise">Entreprise</option>
                <option value="association">Association</option>
                <option value="ordre_professionnel">Ordre professionnel</option>
                <option value="projet_developpement">Projet de développement</option>
              </select>
            </div>
          </div>

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
              <input type="text" value={formData.nif} onChange={(e) => setFormData({ ...formData, nif: e.target.value })} />
            </div>
            <div className="gc-form-group">
              <label>Adresse</label>
              <input type="text" value={formData.adresse} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} />
            </div>
          </div>

          <div className="gc-form-row">
            <div className="gc-form-group">
              <label>Téléphone</label>
              <input type="tel" value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} placeholder="+XXX XX XXX XX XX" />
            </div>
            <div className="gc-form-group">
              <label>E-mail</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="contact@entite.com" />
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
          <button className="gc-btn-cancel" onClick={onClose}>Annuler</button>
          <button className="gc-btn-save" onClick={onSubmit} disabled={loading}>
            {loading ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Créer le dossier'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClientFormModal;
