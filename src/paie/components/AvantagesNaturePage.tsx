import React, { useState } from 'react';
import { calculerAvantagesForfaitaires } from '../data/cotisationsCongo';
import type { AvantagesNatureCalcules } from '../types/paie.types';

/* ---- Types locaux ---- */

type TypeAvantage = 'logement' | 'domesticite' | 'electricite' | 'voiture' | 'telephone' | 'nourriture';

interface SalarieIdentite {
  nom?: string;
  prenom?: string;
}

interface SalarieSalaireHoraires {
  salaire_base?: string;
}

interface SalarieEmploi {
  etablissement?: string;
}

interface SalarieAvantagesNature {
  logement?: number;
  domesticite?: number;
  electricite?: number;
  voiture?: number;
  telephone?: number;
  nourriture?: number;
}

interface Salarie {
  id: number | string;
  identite?: SalarieIdentite;
  emploi?: SalarieEmploi;
  salaire_horaires?: SalarieSalaireHoraires;
  avantages_nature?: SalarieAvantagesNature;
  [key: string]: string | number | SalarieIdentite | SalarieEmploi | SalarieSalaireHoraires | SalarieAvantagesNature | null | undefined;
}

interface AvantagesNaturePageProps {
  salaries: Salarie[];
  onUpdateSalarie: (salarieId: number | string, avantages: SalarieAvantagesNature) => void;
}

interface AvantageTypeDef {
  key: TypeAvantage;
  label: string;
  article: string;
  description: string;
}

interface ModalForm {
  checked: Record<TypeAvantage, boolean>;
  useReel: Record<TypeAvantage, boolean>;
  reelValues: Record<TypeAvantage, string>;
}

/* ---- Constantes ---- */

const TYPES_AVANTAGES: AvantageTypeDef[] = [
  { key: 'logement',     label: 'Logement',      article: 'Art. 39 CGI', description: '20% du plafond CNSS (1 200 000 FCFA)' },
  { key: 'domesticite',  label: 'Domesticité',   article: 'Art. 39 CGI', description: '7% du salaire brut' },
  { key: 'electricite',  label: 'Électricité',   article: 'Art. 39 CGI', description: '5% du salaire brut' },
  { key: 'voiture',      label: 'Voiture',       article: 'Art. 39 CGI', description: '3% du salaire brut' },
  { key: 'telephone',    label: 'Téléphone',     article: 'Art. 39 CGI', description: '2% du salaire brut' },
  { key: 'nourriture',   label: 'Nourriture',    article: 'Art. 39 CGI', description: '20% du salaire brut' },
];

const EMPTY_MODAL_FORM: ModalForm = {
  checked: { logement: false, domesticite: false, electricite: false, voiture: false, telephone: false, nourriture: false },
  useReel: { logement: false, domesticite: false, electricite: false, voiture: false, telephone: false, nourriture: false },
  reelValues: { logement: '', domesticite: '', electricite: '', voiture: '', telephone: '', nourriture: '' },
};

function formatMontant(n: number): string {
  return n.toLocaleString('fr-FR');
}

function getSalaireBrut(s: Salarie): number {
  const raw = s.salaire_horaires?.salaire_base || '0';
  return parseInt(String(raw).replace(/\s/g, '').replace(',', '.'), 10) || 0;
}

function getTotalAvantages(avantages: SalarieAvantagesNature | undefined): number {
  if (!avantages) return 0;
  return (avantages.logement || 0)
    + (avantages.domesticite || 0)
    + (avantages.electricite || 0)
    + (avantages.voiture || 0)
    + (avantages.telephone || 0)
    + (avantages.nourriture || 0);
}

function getActiveTypes(avantages: SalarieAvantagesNature | undefined): string {
  if (!avantages) return '-';
  const active: string[] = [];
  for (const t of TYPES_AVANTAGES) {
    if (avantages[t.key] && avantages[t.key]! > 0) {
      active.push(t.label);
    }
  }
  return active.length > 0 ? active.join(', ') : '-';
}

/* ---- Composant principal ---- */

function AvantagesNaturePage({ salaries, onUpdateSalarie }: AvantagesNaturePageProps): React.ReactElement {
  const [searchNom, setSearchNom] = useState<string>('');
  const [editingSalarieId, setEditingSalarieId] = useState<number | string | null>(null);
  const [modalForm, setModalForm] = useState<ModalForm>(EMPTY_MODAL_FORM);
  const [forfaits, setForfaits] = useState<AvantagesNatureCalcules | null>(null);

  const filtered = salaries.filter((s: Salarie) =>
    (s.identite?.nom || '').toLowerCase().includes(searchNom.toLowerCase()) ||
    (s.identite?.prenom || '').toLowerCase().includes(searchNom.toLowerCase())
  );

  /* -- Ouvrir le modal pour un salarie -- */
  const handleOpenModal = (salarie: Salarie): void => {
    const brut = getSalaireBrut(salarie);
    const computed = calculerAvantagesForfaitaires(brut);
    setForfaits(computed);

    const existing = salarie.avantages_nature;
    const checked = { ...EMPTY_MODAL_FORM.checked };
    const useReel = { ...EMPTY_MODAL_FORM.useReel };
    const reelValues = { ...EMPTY_MODAL_FORM.reelValues };

    if (existing) {
      for (const t of TYPES_AVANTAGES) {
        const val = existing[t.key];
        if (val && val > 0) {
          checked[t.key] = true;
          if (val !== computed[t.key]) {
            useReel[t.key] = true;
            reelValues[t.key] = String(val);
          }
        }
      }
    }

    setModalForm({ checked, useReel, reelValues });
    setEditingSalarieId(salarie.id);
  };

  /* -- Fermer le modal -- */
  const handleCloseModal = (): void => {
    setEditingSalarieId(null);
    setModalForm(EMPTY_MODAL_FORM);
    setForfaits(null);
  };

  /* -- Cocher/decocher un type -- */
  const handleToggleType = (key: TypeAvantage): void => {
    setModalForm(prev => ({
      ...prev,
      checked: { ...prev.checked, [key]: !prev.checked[key] },
    }));
  };

  /* -- Basculer montant reel -- */
  const handleToggleReel = (key: TypeAvantage): void => {
    setModalForm(prev => ({
      ...prev,
      useReel: { ...prev.useReel, [key]: !prev.useReel[key] },
    }));
  };

  /* -- Modifier montant reel -- */
  const handleReelChange = (key: TypeAvantage, value: string): void => {
    setModalForm(prev => ({
      ...prev,
      reelValues: { ...prev.reelValues, [key]: value },
    }));
  };

  /* -- Sauvegarder -- */
  const handleSave = (): void => {
    if (editingSalarieId === null || !forfaits) return;

    const avantages: SalarieAvantagesNature = {};
    for (const t of TYPES_AVANTAGES) {
      if (modalForm.checked[t.key]) {
        if (modalForm.useReel[t.key] && modalForm.reelValues[t.key]) {
          avantages[t.key] = parseInt(modalForm.reelValues[t.key].replace(/\s/g, ''), 10) || 0;
        } else {
          avantages[t.key] = forfaits[t.key];
        }
      }
    }

    onUpdateSalarie(editingSalarieId, avantages);
    handleCloseModal();
  };

  /* -- Montant effectif pour un type -- */
  const getEffectiveMontant = (key: TypeAvantage): number => {
    if (!modalForm.checked[key] || !forfaits) return 0;
    if (modalForm.useReel[key] && modalForm.reelValues[key]) {
      return parseInt(modalForm.reelValues[key].replace(/\s/g, ''), 10) || 0;
    }
    return forfaits[key];
  };

  const totalModal = TYPES_AVANTAGES.reduce((sum, t) => sum + getEffectiveMontant(t.key), 0);

  const editingSalarie = salaries.find(s => s.id === editingSalarieId);

  return (
    <div style={{ padding: 24 }}>
      {/* En-tete */}
      <div className="paie-dashboard-header">
        <h3>Avantages en nature</h3>
        <p>Article 39 CGI Congo-Brazzaville — Evaluation forfaitaire des avantages en nature</p>
      </div>

      {/* Alerte info */}
      <div className="wizard-alert info" style={{ marginBottom: 16 }}>
        Les avantages en nature sont evaluees forfaitairement selon l&apos;article 39 du CGI.
        Le montant forfaitaire est calcule automatiquement, avec possibilite de saisir le montant reel.
      </div>

      {/* Recherche */}
      <div className="paie-dashboard-actions">
        <input
          type="text"
          value={searchNom}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchNom(e.target.value)}
          placeholder="Rechercher par nom ou prenom..."
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', fontSize: 13, width: 300 }}
        />
      </div>

      {/* Tableau */}
      <table className="etab-table">
        <thead>
          <tr>
            <th>Salarie</th>
            <th>Salaire brut</th>
            <th>Types d&apos;avantages</th>
            <th>Montant total</th>
            <th style={{ width: 100 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={5} className="etab-table-empty">Aucun salarie</td></tr>
          ) : (
            filtered.map((sal: Salarie) => {
              const total = getTotalAvantages(sal.avantages_nature);
              return (
                <tr key={sal.id}>
                  <td style={{ fontWeight: 600 }}>
                    {sal.identite?.nom || '-'} {sal.identite?.prenom || ''}
                  </td>
                  <td>{formatMontant(getSalaireBrut(sal))} FCFA</td>
                  <td>{getActiveTypes(sal.avantages_nature)}</td>
                  <td style={{ fontWeight: 600, color: total > 0 ? '#D4A843' : '#9ca3af' }}>
                    {total > 0 ? `${formatMontant(total)} FCFA` : '-'}
                  </td>
                  <td>
                    <button
                      className="btn-add-small"
                      onClick={() => handleOpenModal(sal)}
                    >
                      Modifier
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Recapitulatif */}
      {salaries.length > 0 && (
        <div className="avantages-recap-bar">
          <span className="avantages-recap-label">Total avantages en nature (tous salaries)</span>
          <span className="avantages-recap-montant">
            {formatMontant(salaries.reduce((sum, s) => sum + getTotalAvantages(s.avantages_nature), 0))} FCFA
          </span>
        </div>
      )}

      {/* Modal d'edition */}
      {editingSalarieId !== null && editingSalarie && forfaits && (
        <div className="wizard-overlay" onClick={handleCloseModal}>
          <div className="avantages-modal" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            {/* Header */}
            <div className="wizard-modal-header">
              <h3>
                Avantages en nature — {editingSalarie.identite?.nom || ''} {editingSalarie.identite?.prenom || ''}
              </h3>
              <button className="wizard-close-btn" onClick={handleCloseModal}>&times;</button>
            </div>

            {/* Body */}
            <div className="avantages-modal-body">
              {/* Info salaire */}
              <div className="avantages-info-bar">
                <div className="avantages-info-item">
                  <span className="avantages-info-label">Salaire brut</span>
                  <span className="avantages-info-value">{formatMontant(getSalaireBrut(editingSalarie))} FCFA</span>
                </div>
                <div className="avantages-info-item">
                  <span className="avantages-info-label">Plafond CNSS</span>
                  <span className="avantages-info-value">1 200 000 FCFA</span>
                </div>
              </div>

              {/* Liste des types */}
              <div className="wizard-form-section">
                <h4>Types d&apos;avantages (Article 39 CGI)</h4>

                {TYPES_AVANTAGES.map((t: AvantageTypeDef) => (
                  <div key={t.key} className={`avantages-type-row ${modalForm.checked[t.key] ? 'active' : ''}`}>
                    <div className="avantages-type-left">
                      <label className="avantages-checkbox-label">
                        <input
                          type="checkbox"
                          checked={modalForm.checked[t.key]}
                          onChange={() => handleToggleType(t.key)}
                          className="avantages-checkbox"
                        />
                        <span className="avantages-type-name">{t.label}</span>
                      </label>
                      <span className="avantages-type-desc">{t.description}</span>
                    </div>

                    {modalForm.checked[t.key] && (
                      <div className="avantages-type-right">
                        <div className="avantages-forfait-col">
                          <span className="avantages-col-label">Forfait</span>
                          <span className="avantages-col-value">{formatMontant(forfaits[t.key])} FCFA</span>
                        </div>
                        <div className="avantages-reel-col">
                          <label className="avantages-checkbox-label avantages-reel-toggle">
                            <input
                              type="checkbox"
                              checked={modalForm.useReel[t.key]}
                              onChange={() => handleToggleReel(t.key)}
                              className="avantages-checkbox"
                            />
                            <span style={{ fontSize: 11 }}>Montant reel</span>
                          </label>
                          {modalForm.useReel[t.key] && (
                            <input
                              type="text"
                              value={modalForm.reelValues[t.key]}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleReelChange(t.key, e.target.value)}
                              placeholder="Montant"
                              className="avantages-reel-input"
                            />
                          )}
                        </div>
                        <div className="avantages-effectif-col">
                          <span className="avantages-col-label">Effectif</span>
                          <span className="avantages-col-value avantages-effectif-value">
                            {formatMontant(getEffectiveMontant(t.key))} FCFA
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="avantages-total-bar">
                <span className="avantages-total-label">Total avantages en nature</span>
                <span className="avantages-total-value">{formatMontant(totalModal)} FCFA</span>
              </div>
            </div>

            {/* Footer */}
            <div className="wizard-footer">
              <div className="wizard-footer-left">
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {TYPES_AVANTAGES.filter(t => modalForm.checked[t.key]).length} avantage(s) selectionne(s)
                </span>
              </div>
              <div className="wizard-footer-right">
                <button className="btn-wizard-cancel" onClick={handleCloseModal}>Annuler</button>
                <button className="btn-wizard-save" onClick={handleSave}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AvantagesNaturePage;
