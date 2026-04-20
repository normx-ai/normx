// Formulaire overlay de creation / edition d'un tiers.

import React from 'react';
import { LuSave, LuX } from 'react-icons/lu';
import type { CompteComptable } from '../../types';
import { TiersForm as TiersFormData, TiersItem, TYPES_TIERS } from './tiersTypes';

interface Props {
  editingTiers: TiersItem | null;
  form: TiersFormData;
  saving: boolean;
  comptesOptions: CompteComptable[];
  loadingComptes: boolean;
  setForm: React.Dispatch<React.SetStateAction<TiersFormData>>;
  onTypeChange: (type: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function TiersForm({
  editingTiers, form, saving, comptesOptions, loadingComptes,
  setForm, onTypeChange, onClose, onSave,
}: Props): React.JSX.Element {
  return (
    <div className="ecriture-overlay-backdrop" onClick={onClose}>
      <div
        className="ecriture-overlay"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        style={{ maxWidth: 900, width: '90%', maxHeight: '90vh' }}
      >
        <div className="ecriture-overlay-header">
          <div>
            <h2>{editingTiers ? 'Modifier le tiers' : 'Nouveau tiers'}</h2>
            <p>Renseignez les informations du tiers</p>
          </div>
          <button className="overlay-close-btn" onClick={onClose}><LuX /></button>
        </div>

        <div className="ecriture-overlay-body">
          <div className="ecriture-fields-card">
            <div className="ecriture-field" style={{ marginBottom: 12 }}>
              <label>Type de tiers <span className="required">*</span></label>
              <div className="tiers-type-selector">
                {TYPES_TIERS.map(tc => (
                  <button
                    key={tc.value}
                    type="button"
                    className={'tiers-type-option' + (form.type === tc.value ? ' active' : '')}
                    style={{ '--type-color': tc.color } as React.CSSProperties}
                    onClick={() => onTypeChange(tc.value)}
                  >
                    {React.createElement(tc.icon, { size: 16 })} {tc.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ecriture-fields-row">
              <div className="ecriture-field" style={{ flex: 2 }}>
                <label>Nom / Raison sociale <span className="required">*</span></label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Nom du tiers"
                />
              </div>
              <div className="ecriture-field">
                <label>Code tiers</label>
                <input type="text" value={form.code_tiers} readOnly style={{ background: '#f5f5f5', cursor: 'default' }} />
              </div>
              <div className="ecriture-field">
                <label>Compte comptable <span className="required">*</span></label>
                <select
                  value={form.compte_comptable}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, compte_comptable: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, fontFamily: 'inherit', background: '#fff' }}
                  disabled={loadingComptes}
                >
                  {loadingComptes ? (
                    <option>Chargement...</option>
                  ) : comptesOptions.length === 0 ? (
                    <option>Aucun compte disponible</option>
                  ) : (
                    comptesOptions.map(c => (
                      <option key={c.numero} value={c.numero}>{c.numero} — {c.libelle}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="ecriture-fields-row" style={{ marginTop: 12 }}>
              <div className="ecriture-field">
                <label>Telephone</label>
                <input
                  type="text"
                  value={form.telephone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, telephone: e.target.value }))}
                  placeholder="+242..."
                />
              </div>
              <div className="ecriture-field">
                <label>Email</label>
                <input
                  type="text"
                  value={form.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemple.com"
                />
              </div>
            </div>

            <div className="ecriture-fields-row" style={{ marginTop: 12 }}>
              <div className="ecriture-field" style={{ flex: 1 }}>
                <label>Adresse</label>
                <input
                  type="text"
                  value={form.adresse}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, adresse: e.target.value }))}
                  placeholder="Adresse complete"
                />
              </div>
            </div>
          </div>

          <div className="ecriture-fields-card" style={{ marginTop: 12 }}>
            <div className="ecriture-fields-row">
              <div className="ecriture-field">
                <label>Personne de contact</label>
                <input
                  type="text"
                  value={form.data.contact_nom || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, data: { ...f.data, contact_nom: e.target.value } }))}
                  placeholder="Nom du contact"
                />
              </div>
              <div className="ecriture-field">
                <label>Fonction</label>
                <input
                  type="text"
                  value={form.data.contact_fonction || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, data: { ...f.data, contact_fonction: e.target.value } }))}
                  placeholder="Ex: Tresorier"
                />
              </div>
            </div>
            <div className="ecriture-fields-row" style={{ marginTop: 12 }}>
              <div className="ecriture-field" style={{ flex: 1 }}>
                <label>Notes</label>
                <textarea
                  value={form.data.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, data: { ...f.data, notes: e.target.value } }))}
                  placeholder="Notes internes..."
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="ecriture-overlay-footer">
          <div></div>
          <div className="overlay-footer-actions">
            <button className="compta-action-btn" onClick={onClose}>Annuler</button>
            <button
              className="compta-action-btn primary"
              onClick={onSave}
              disabled={!form.nom.trim() || !form.compte_comptable || saving}
            >
              <LuSave /> {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
