import React, { useState } from 'react';
import { LuPlus, LuTrash2, LuSave, LuX, LuChevronDown } from 'react-icons/lu';
import type { CompteComptable } from '../types';
import type { SaisieOverlayProps, TiersItem } from './SaisieJournal.types';
import { JOURNAUX } from './SaisieJournal.types';
import { fmt, parseInputNumber } from '../utils/formatters';
import { useReferentiel } from '../contexts/ReferentielContext';

// Mapping compte -> type de tiers pour le selecteur intelligent
const getTypeTiersFromCompte = (numero: string): string | null => {
  if (!numero) return null;
  const raw = numero.replace(/\s/g, '');
  if (raw.startsWith('401') || raw.startsWith('402') || raw.startsWith('408') || raw.startsWith('409')) return 'fournisseur';
  if (raw.startsWith('411') || raw.startsWith('418')) return 'membre';
  if (raw.startsWith('421') || raw.startsWith('422') || raw.startsWith('425') || raw.startsWith('428')) return 'personnel';
  if (raw.startsWith('462') || raw.startsWith('463') || raw.startsWith('464') || raw.startsWith('469')) return 'bailleur';
  if (raw.startsWith('451') || raw.startsWith('452') || raw.startsWith('453')) return 'membre';
  return null;
};

const getTiersForCompte = (numero: string, tiersList: TiersItem[]): TiersItem[] => {
  const type = getTypeTiersFromCompte(numero);
  if (!type) return [];
  return tiersList.filter(t => t.type === type);
};

const formatMontantInput = (val: string | number): string => {
  const raw = String(val).replace(/[^\d]/g, '');
  if (!raw) return '';
  return parseInt(raw, 10).toLocaleString('fr-FR');
};

const parseMontant = (val: string | number): string | number => {
  const raw = String(val).replace(/[^\d]/g, '');
  return raw ? parseInt(raw, 10) : '';
};

function SaisieOverlay({
  editingId,
  journal,
  setJournal,
  showJournalDropdown,
  setShowJournalDropdown,
  dateEcriture,
  setDateEcriture,
  numeroPiece,
  setNumeroPiece,
  libelle,
  setLibelle,
  lignes,
  planComptable,
  tiersList,
  exerciceAnnee,
  saving,
  onSave,
  onClose,
  onUpdateLigne,
  onSelectCompte,
  onCompteBlur,
  onAddLigne,
  onRemoveLigne,
  onEquilibrer,
}: SaisieOverlayProps): React.JSX.Element {
  const { label: planLabel } = useReferentiel();
  const [pcDropdownIdx, setPcDropdownIdx] = useState<number | null>(null);
  const [pcSearch, setPcSearch] = useState<string>('');

  const getPcSuggestions = (query: string): CompteComptable[] => {
    if (query.length < 1) return [];
    return planComptable.filter(c =>
      c.numero.startsWith(query) || c.libelle.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);
  };

  const totalDebit = lignes.reduce((s, l) => s + parseInputNumber(String(l.debit)), 0);
  const totalCredit = lignes.reduce((s, l) => s + parseInputNumber(String(l.credit)), 0);
  const solde = totalDebit - totalCredit;

  // Validation
  const pcNums = new Set(planComptable.map(c => c.numero));
  const isCompteValide = (numero: string): boolean => {
    if (pcNums.has(numero)) return true;
    let trimmed = numero.replace(/0+$/, '');
    while (trimmed.length >= 2) {
      if (pcNums.has(trimmed)) return true;
      trimmed = trimmed.slice(0, -1);
    }
    return false;
  };
  const lignesActives = lignes.filter(l => l.numero_compte && (parseInputNumber(String(l.debit)) || parseInputNumber(String(l.credit))));
  const comptesInvalides = lignesActives.filter(l => !isCompteValide(l.numero_compte));
  const allComptesValides = comptesInvalides.length === 0 && lignesActives.length >= 2;
  const dateAnnee = dateEcriture ? parseInt(dateEcriture.split('-')[0], 10) : null;
  const dateHorsExercice = exerciceAnnee && dateAnnee && dateAnnee !== exerciceAnnee;
  const isEquilibre = Math.abs(solde) < 0.01 && totalDebit > 0 && allComptesValides && !dateHorsExercice;

  const handleSelectCompte = (ligneIdx: number, compte: CompteComptable): void => {
    onSelectCompte(ligneIdx, compte);
    setPcDropdownIdx(null);
    setPcSearch('');
  };

  return (
    <div className="ecriture-overlay-backdrop" onClick={onClose}>
      <div className="ecriture-overlay" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
        <div className="ecriture-overlay-header">
          <div>
            <h2>{editingId ? 'Modifier l\'écriture' : 'Nouvelle écriture'}</h2>
            <p>Saisissez les comptes au débit et au crédit selon le plan {planLabel}</p>
          </div>
          <button className="overlay-close-btn" onClick={onClose}><LuX /></button>
        </div>

        <div className="ecriture-overlay-body">
          {/* Champs en-tete */}
          <div className="ecriture-fields-card">
            <div className="ecriture-fields-row">
              <div className="ecriture-field">
                <label>Journal <span className="required">*</span></label>
                <div className="journal-select-wrapper">
                  <button type="button" className="journal-select-btn" onClick={() => setShowJournalDropdown(!showJournalDropdown)}>
                    {journal} <LuChevronDown />
                  </button>
                  {showJournalDropdown && (
                    <div className="journal-dropdown">
                      <table>
                        <thead><tr><th>Code</th><th>Intitulé</th></tr></thead>
                        <tbody>
                          {JOURNAUX.map(j => (
                            <tr key={j.code} className={journal === j.code ? 'active' : ''}
                              onClick={() => { setJournal(j.code); setShowJournalDropdown(false); }}>
                              <td>{j.code}</td><td>{j.intitule}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
              <div className="ecriture-field">
                <label>Date <span className="required">*</span></label>
                <input type="date" value={dateEcriture} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateEcriture(e.target.value)} />
              </div>
              <div className="ecriture-field" style={{ flex: 2 }}>
                <label>Libellé <span className="required">*</span></label>
                <input type="text" value={libelle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLibelle(e.target.value)} placeholder="Libellé de l'écriture" />
              </div>
              <div className="ecriture-field">
                <label>N° pièce</label>
                <input type="text" value={numeroPiece} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumeroPiece(e.target.value)} placeholder="Facultatif" />
              </div>
            </div>
          </div>

          {/* Bouton ajouter */}
          <button className="compta-action-btn add-line-btn" onClick={onAddLigne}><LuPlus /> Ajouter ligne</button>

          {/* Table lignes */}
          <div className="overlay-table-wrapper">
            <table className="overlay-ecriture-table">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Compte</th>
                  <th style={{ width: 160 }}>Tiers</th>
                  <th>Libellé</th>
                  <th style={{ width: 140 }}>Débit</th>
                  <th style={{ width: 140 }}>Crédit</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={i}>
                    <td className="cell-compte">
                      <input
                        type="text"
                        value={l.numero_compte}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          onUpdateLigne(i, 'numero_compte', e.target.value);
                          setPcDropdownIdx(i);
                          setPcSearch(e.target.value);
                        }}
                        onFocus={() => { setPcDropdownIdx(i); setPcSearch(l.numero_compte); }}
                        onBlur={() => { setTimeout(() => setPcDropdownIdx(null), 200); onCompteBlur(i); }}
                        placeholder="N° compte"
                        className={l.numero_compte && !isCompteValide(l.numero_compte) ? 'input-invalid' : ''}
                      />
                      {pcDropdownIdx === i && getPcSuggestions(l.numero_compte || pcSearch).length > 0 && (
                        <div className="compte-dropdown">
                          {getPcSuggestions(l.numero_compte || pcSearch).map(c => (
                            <div key={c.numero} className="compte-dropdown-item"
                              onMouseDown={() => handleSelectCompte(i, c)}>
                              <span className="pc-num">{c.numero}</span> {c.libelle}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const tiersFiltered = getTiersForCompte(l.numero_compte, tiersList);
                        const isTiersCompte = tiersFiltered.length > 0;
                        return (
                          <select
                            value={l.tiers_id || ''}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onUpdateLigne(i, 'tiers_id', e.target.value ? parseInt(e.target.value) : '')}
                            disabled={!isTiersCompte}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12, fontFamily: 'inherit', background: isTiersCompte ? '#fff' : '#f5f5f5', color: isTiersCompte ? '#333' : '#bbb', cursor: isTiersCompte ? 'pointer' : 'default' }}
                          >
                            <option value="">{isTiersCompte ? '— Sélectionner —' : '—'}</option>
                            {tiersFiltered.map(t => (
                              <option key={t.id} value={t.id}>{t.code_tiers} — {t.nom}</option>
                            ))}
                          </select>
                        );
                      })()}
                    </td>
                    <td>
                      <input type="text" value={l.libelle_compte}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateLigne(i, 'libelle_compte', e.target.value)}
                        placeholder="Libellé du compte" />
                    </td>
                    <td>
                      <input type="text" value={formatMontantInput(l.debit)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateLigne(i, 'debit', parseMontant(e.target.value))}
                        placeholder="" className="input-montant" />
                    </td>
                    <td>
                      <input type="text" value={formatMontantInput(l.credit)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateLigne(i, 'credit', parseMontant(e.target.value))}
                        placeholder="" className="input-montant" />
                    </td>
                    <td>
                      <button className="ligne-delete-btn" onClick={() => onRemoveLigne(i)} disabled={lignes.length <= 2}>
                        <LuTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overlay-validation-row">
            <button className="compta-action-btn equilibre-btn" onClick={onEquilibrer}>Équilibrer</button>
            {dateHorsExercice && (
              <div className="validation-error">
                La date {dateEcriture} ne correspond pas à l'exercice {exerciceAnnee}
              </div>
            )}
            {comptesInvalides.length > 0 && (
              <div className="validation-error">
                Compte{comptesInvalides.length > 1 ? 's' : ''} invalide{comptesInvalides.length > 1 ? 's' : ''} :{' '}
                {comptesInvalides.map(l => l.numero_compte).join(', ')}
                {' '}— doit exister dans le plan {planLabel}
              </div>
            )}
          </div>
        </div>

        {/* Footer overlay */}
        <div className="ecriture-overlay-footer">
          <div className="overlay-totaux">
            <div className="overlay-total-card">
              <span className="overlay-total-amount">{fmt(solde)}</span>
              <span className="overlay-total-label">Solde</span>
            </div>
            <div className="overlay-total-card">
              <span className="overlay-total-amount">{fmt(totalDebit)}</span>
              <span className="overlay-total-label">Total débit</span>
            </div>
            <div className="overlay-total-card">
              <span className="overlay-total-amount">{fmt(totalCredit)}</span>
              <span className="overlay-total-label">Total crédit</span>
            </div>
          </div>
          <div className="overlay-footer-actions">
            <button className="compta-action-btn" onClick={onClose}>Annuler</button>
            <button className="compta-action-btn primary" onClick={onSave} disabled={!isEquilibre || saving || !libelle || !dateEcriture}>
              <LuSave /> {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Enregistrer et Nouveau'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SaisieOverlay;
