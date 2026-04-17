import React, { useState, useEffect, useCallback } from 'react';
import { clientFetch } from '../lib/api';
import { LuPlus, LuPenLine, LuTrash2, LuSearch, LuX, LuSave, LuUsers, LuTruck, LuHandshake, LuUser, LuDownload, LuSheet, LuFileText } from 'react-icons/lu';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { CompteComptable } from '../types';
import './Comptabilite.css';

interface TiersPageProps {
  entiteId: number;
  entiteName?: string;
  defaultType?: string;
  onBack: () => void;
}

interface TypeTiersConfig {
  value: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  prefixes: string[];
  compteDefaut: string;
  color: string;
}

interface TiersData {
  contact_nom?: string;
  contact_fonction?: string;
  notes?: string;
}

interface TiersItem {
  id: number;
  code_tiers: string;
  nom: string;
  type: string;
  compte_comptable: string;
  telephone: string;
  email: string;
  adresse: string;
  data: TiersData;
}

interface TiersForm {
  type: string;
  code_tiers: string;
  nom: string;
  compte_comptable: string;
  telephone: string;
  email: string;
  adresse: string;
  data: TiersData;
}

const TYPES_TIERS: TypeTiersConfig[] = [
  { value: 'membre', label: 'Membre / Apporteur', icon: LuUsers, prefixes: ['411', '418', '451', '452', '453'], compteDefaut: '451', color: '#D4A843' },
  { value: 'fournisseur', label: 'Fournisseur', icon: LuTruck, prefixes: ['401', '402', '408', '409', '481'], compteDefaut: '401', color: '#dc2626' },
  { value: 'bailleur', label: 'Bailleur / Partenaire', icon: LuHandshake, prefixes: ['462', '463', '464', '469'], compteDefaut: '462', color: '#059669' },
  { value: 'personnel', label: 'Personnel', icon: LuUser, prefixes: ['421', '422', '425', '428'], compteDefaut: '421', color: '#d97706' },
];

function TiersPage({ entiteId, entiteName = '', defaultType = '', onBack }: TiersPageProps): React.JSX.Element {
  const [tiers, setTiers] = useState<TiersItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>(defaultType);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingTiers, setEditingTiers] = useState<TiersItem | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedTiers, setSelectedTiers] = useState<TiersItem | null>(null);
  const [comptesOptions, setComptesOptions] = useState<CompteComptable[]>([]);
  const [loadingComptes, setLoadingComptes] = useState<boolean>(false);

  // Formulaire
  const [form, setForm] = useState<TiersForm>({
    type: 'membre',
    code_tiers: '',
    nom: '',
    compte_comptable: '451',
    telephone: '',
    email: '',
    adresse: '',
    data: { contact_nom: '', contact_fonction: '', notes: '' },
  });

  // Charger les comptes comptables depuis le plan comptable
  useEffect(() => {
    const typeCfg = TYPES_TIERS.find(t => t.value === form.type);
    if (!typeCfg) return;

    const fetchComptes = async (): Promise<void> => {
      setLoadingComptes(true);
      try {
        const allResults = await Promise.all(
          typeCfg.prefixes.map(prefix =>
            clientFetch('/api/plan-comptable?search=' + encodeURIComponent(prefix))
              .then(r => r.json())
          )
        );
        const seen = new Set<string>();
        const comptes: CompteComptable[] = (allResults as CompteComptable[][]).flat().filter(c => {
          if (seen.has(c.numero)) return false;
          seen.add(c.numero);
          return true;
        }).sort((a, b) => a.numero.localeCompare(b.numero));
        setComptesOptions(comptes);
        if (comptes.length > 0 && !comptes.find(c => c.numero === form.compte_comptable)) {
          setForm(f => ({ ...f, compte_comptable: typeCfg.compteDefaut }));
        }
      } catch (_err) {
        setComptesOptions([]);
      } finally {
        setLoadingComptes(false);
      }
    };
    fetchComptes();
  }, [form.type]);

  useEffect(() => {
    setFilterType(defaultType);
  }, [defaultType]);

  const loadTiers = useCallback(async (): Promise<void> => {
    if (!entiteId) return;
    setLoading(true);
    try {
      const res = await clientFetch('/api/tiers/' + entiteId);
      if (res.ok) { const j = await res.json(); setTiers(Array.isArray(j) ? j : j.data || j.tiers || []); }
    } catch (_err) {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [entiteId]);

  useEffect(() => {
    loadTiers();
  }, [loadTiers]);

  const resetForm = (): void => {
    setForm({
      type: 'membre',
      code_tiers: '',
      nom: '',
      compte_comptable: '451',
      telephone: '',
      email: '',
      adresse: '',
      data: { contact_nom: '', contact_fonction: '', notes: '' },
    });
    setEditingTiers(null);
  };

  const generateCodeTiers = (type: string): string => {
    const prefixes: Record<string, string> = { membre: 'MBR', fournisseur: 'FRN', bailleur: 'BAI', personnel: 'PER' };
    const prefix = prefixes[type] || 'TRS';
    const existing = tiers.filter(t => t.type === type);
    const nums = existing.map(t => {
      const m = (t.code_tiers || '').match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
    const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
    return prefix + '-' + String(next).padStart(3, '0');
  };

  const openCreate = (type: string): void => {
    resetForm();
    const typeCfg = TYPES_TIERS.find(t => t.value === type) || TYPES_TIERS[0];
    const code = generateCodeTiers(type || 'membre');
    setForm(f => ({ ...f, type: type || 'membre', compte_comptable: typeCfg.compteDefaut, code_tiers: code }));
    setShowForm(true);
  };

  const openEdit = (t: TiersItem): void => {
    setEditingTiers(t);
    setForm({
      type: t.type,
      code_tiers: t.code_tiers || '',
      nom: t.nom,
      compte_comptable: t.compte_comptable || '',
      telephone: t.telephone || '',
      email: t.email || '',
      adresse: t.adresse || '',
      data: t.data || { contact_nom: '', contact_fonction: '', notes: '' },
    });
    setShowForm(true);
  };

  const closeForm = (): void => {
    setShowForm(false);
    resetForm();
  };

  const handleTypeChange = (type: string): void => {
    const typeCfg = TYPES_TIERS.find(t => t.value === type) || TYPES_TIERS[0];
    const code = editingTiers ? form.code_tiers : generateCodeTiers(type);
    setForm(f => ({ ...f, type, compte_comptable: typeCfg.compteDefaut, code_tiers: code }));
  };

  const saveTiers = async (): Promise<void> => {
    if (!form.nom.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, entite_id: entiteId };
      const url = editingTiers ? '/api/tiers/' + editingTiers.id : '/api/tiers';
      const method = editingTiers ? 'PUT' : 'POST';
      const res = await clientFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        loadTiers();
        closeForm();
      } else {
        const err: { error?: string } = await res.json();
        alert(err.error || 'Erreur');
      }
    } catch (_err) {
      alert('Erreur reseau');
    } finally {
      setSaving(false);
    }
  };

  const deleteTiers = async (id: number): Promise<void> => {
    if (!window.confirm('Supprimer ce tiers ?')) return;
    try {
      await clientFetch('/api/tiers/' + id, { method: 'DELETE' });
      if (selectedTiers?.id === id) setSelectedTiers(null);
      loadTiers();
    } catch (_err) {
      // silently ignore
    }
  };

  const getTypeConfig = (type: string): TypeTiersConfig => TYPES_TIERS.find(t => t.value === type) || TYPES_TIERS[0];

  // Compteurs par type
  const counts: Record<string, number> = {};
  for (const t of TYPES_TIERS) counts[t.value] = 0;
  for (const t of tiers) { if (counts[t.type] !== undefined) counts[t.type]++; }

  // Tiers filtres
  const tiersAffiches = tiers.filter(t => {
    if (filterType && t.type !== filterType) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (t.nom || '').toLowerCase().includes(term) ||
        (t.code_tiers || '').toLowerCase().includes(term) ||
        (t.compte_comptable || '').toLowerCase().includes(term);
    }
    return true;
  });

  // === EXPORTS ===
  const exportCSV = (): void => {
    const header = 'Type;Code;Nom;Compte;Telephone;Email;Adresse\n';
    const rows = tiersAffiches.map(t =>
      [t.type, t.code_tiers || '', '"' + t.nom + '"', t.compte_comptable || '', t.telephone || '', t.email || '', '"' + (t.adresse || '') + '"'].join(';')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tiers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = (): void => {
    const data = tiersAffiches.map(t => ({
      'Type': getTypeConfig(t.type).label,
      'Code': t.code_tiers || '',
      'Nom': t.nom,
      'Compte': t.compte_comptable || '',
      'Telephone': t.telephone || '',
      'Email': t.email || '',
      'Adresse': t.adresse || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 18 }, { wch: 25 }, { wch: 35 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tiers');
    XLSX.writeFile(wb, 'tiers.xlsx');
  };

  const exportPDF = (): void => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFontSize(14);
    doc.setFont(undefined as never, 'bold');
    doc.text('LISTE DES TIERS', pageW / 2, 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont(undefined as never, 'normal');
    doc.text('Entite : ' + (entiteName || '—'), 14, 22);
    doc.text(tiersAffiches.length + ' tiers', 14, 27);

    autoTable(doc, {
      startY: 32,
      head: [['Type', 'Code', 'Nom', 'Compte', 'Telephone', 'Email', 'Adresse']],
      body: tiersAffiches.map(t => [
        getTypeConfig(t.type).label,
        t.code_tiers || '',
        t.nom,
        t.compte_comptable || '',
        t.telephone || '',
        t.email || '',
        t.adresse || '',
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [26, 58, 92], textColor: 255, fontStyle: 'bold' },
    });
    doc.save('tiers.pdf');
  };

  return (
    <div className="compta-wrapper">
      {/* Header */}
      <div className="compta-page-header">
        <div>
          <h1 className="compta-page-title">Gestion des tiers</h1>
          <p className="compta-page-subtitle">Membres, fournisseurs, bailleurs et personnel</p>
        </div>
        <div className="compta-header-actions">
          <button className="compta-action-btn" onClick={exportCSV} disabled={tiers.length === 0}><LuDownload /> CSV</button>
          <button className="compta-action-btn" onClick={exportExcel} disabled={tiers.length === 0}><LuSheet /> Excel</button>
          <button className="compta-action-btn" onClick={exportPDF} disabled={tiers.length === 0}><LuFileText /> PDF</button>
          <button className="compta-action-btn" onClick={onBack}>&larr; Retour</button>
          <button className="compta-action-btn primary" onClick={() => openCreate(filterType || 'membre')}>
            <LuPlus /> Nouveau tiers
          </button>
        </div>
      </div>

      {/* Compteurs par type */}
      <div className="tiers-type-cards">
        <div className={'tiers-type-card' + (!filterType ? ' active' : '')} onClick={() => setFilterType('')}>
          <span className="tiers-type-count">{tiers.length}</span>
          <span className="tiers-type-label">Tous</span>
        </div>
        {TYPES_TIERS.map(tc => (
          <div
            key={tc.value}
            className={'tiers-type-card' + (filterType === tc.value ? ' active' : '')}
            style={{ '--type-color': tc.color } as React.CSSProperties}
            onClick={() => setFilterType(filterType === tc.value ? '' : tc.value)}
          >
            {React.createElement(tc.icon, { size: 18 })}
            <span className="tiers-type-count">{counts[tc.value]}</span>
            <span className="tiers-type-label">{tc.label}</span>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <div className="saisie-filters">
        <div className="saisie-filter-search" style={{ marginLeft: 0 }}>
          <LuSearch />
          <input type="text" value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} placeholder="Rechercher par nom, code, email..." />
        </div>
      </div>

      {/* Table */}
      <div className="ecritures-table-wrapper">
        <table className="ecritures-main-table">
          <thead>
            <tr>
              <th style={{ width: 140 }}>Type</th>
              <th style={{ width: 90 }}>Code</th>
              <th>Nom</th>
              <th style={{ width: 90 }}>Compte</th>
              <th>Telephone</th>
              <th>Email</th>
              <th style={{ width: 70 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tiersAffiches.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  <div className="empty-state-inline">
                    <LuUsers size={32} />
                    <p>Aucun tiers</p>
                    <span>Cliquez sur "Nouveau tiers" pour commencer</span>
                  </div>
                </td>
              </tr>
            ) : (
              tiersAffiches.map(t => {
                const tc = getTypeConfig(t.type);
                return (
                  <tr key={t.id} className={selectedTiers?.id === t.id ? 'main-line selected-row' : 'main-line'} onClick={() => setSelectedTiers(t)}>
                    <td>
                      <span className="tiers-badge" style={{ background: tc.color + '18', color: tc.color, borderColor: tc.color + '40' }}>
                        {React.createElement(tc.icon, { size: 13 })} {tc.label}
                      </span>
                    </td>
                    <td className="cell-journal">{t.code_tiers || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{t.nom}</td>
                    <td className="compte-cell">{t.compte_comptable || ''}</td>
                    <td>{t.telephone || ''}</td>
                    <td>{t.email || ''}</td>
                    <td className="cell-actions">
                      <button className="action-icon-btn edit" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); openEdit(t); }} title="Modifier"><LuPenLine /></button>
                      <button className="action-icon-btn delete" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); deleteTiers(t.id); }} title="Supprimer"><LuTrash2 /></button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="saisie-footer">
        <div className="saisie-footer-count">{tiersAffiches.length} tiers</div>
      </div>

      {/* Fiche detail */}
      {selectedTiers && !showForm && (
        <div className="tiers-detail-panel">
          <div className="tiers-detail-header">
            <h3>{selectedTiers.nom}</h3>
            <button className="overlay-close-btn" onClick={() => setSelectedTiers(null)}><LuX /></button>
          </div>
          <div className="tiers-detail-body">
            <div className="tiers-detail-row">
              <span className="tiers-detail-label">Type</span>
              <span>{getTypeConfig(selectedTiers.type).label}</span>
            </div>
            <div className="tiers-detail-row">
              <span className="tiers-detail-label">Code</span>
              <span>{selectedTiers.code_tiers || '—'}</span>
            </div>
            <div className="tiers-detail-row">
              <span className="tiers-detail-label">Compte comptable</span>
              <span>{selectedTiers.compte_comptable || '—'}</span>
            </div>
            <div className="tiers-detail-row">
              <span className="tiers-detail-label">Telephone</span>
              <span>{selectedTiers.telephone || '—'}</span>
            </div>
            <div className="tiers-detail-row">
              <span className="tiers-detail-label">Email</span>
              <span>{selectedTiers.email || '—'}</span>
            </div>
            <div className="tiers-detail-row">
              <span className="tiers-detail-label">Adresse</span>
              <span>{selectedTiers.adresse || '—'}</span>
            </div>
            {selectedTiers.data?.contact_nom && (
              <div className="tiers-detail-row">
                <span className="tiers-detail-label">Contact</span>
                <span>{selectedTiers.data.contact_nom}{selectedTiers.data.contact_fonction ? ' — ' + selectedTiers.data.contact_fonction : ''}</span>
              </div>
            )}
            {selectedTiers.data?.notes && (
              <div className="tiers-detail-row">
                <span className="tiers-detail-label">Notes</span>
                <span>{selectedTiers.data.notes}</span>
              </div>
            )}
            <div className="tiers-detail-actions">
              <button className="compta-action-btn" onClick={() => openEdit(selectedTiers)}><LuPenLine /> Modifier</button>
              <button className="compta-action-btn" style={{ color: '#dc2626', borderColor: '#dc2626' }} onClick={() => deleteTiers(selectedTiers.id)}><LuTrash2 /> Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire overlay */}
      {showForm && (
        <div className="ecriture-overlay-backdrop" onClick={closeForm}>
          <div className="ecriture-overlay" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()} style={{ maxWidth: 900, width: '90%', maxHeight: '90vh' }}>
            <div className="ecriture-overlay-header">
              <div>
                <h2>{editingTiers ? 'Modifier le tiers' : 'Nouveau tiers'}</h2>
                <p>Renseignez les informations du tiers</p>
              </div>
              <button className="overlay-close-btn" onClick={closeForm}><LuX /></button>
            </div>

            <div className="ecriture-overlay-body">
              {/* Type */}
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
                        onClick={() => handleTypeChange(tc.value)}
                      >
                        {React.createElement(tc.icon, { size: 16 })} {tc.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ecriture-fields-row">
                  <div className="ecriture-field" style={{ flex: 2 }}>
                    <label>Nom / Raison sociale <span className="required">*</span></label>
                    <input type="text" value={form.nom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Nom du tiers" />
                  </div>
                  <div className="ecriture-field">
                    <label>Code tiers</label>
                    <input type="text" value={form.code_tiers} readOnly style={{ background: '#f5f5f5', cursor: 'default' }} />
                  </div>
                  <div className="ecriture-field">
                    <label>Compte comptable <span className="required">*</span></label>
                    <select value={form.compte_comptable} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, compte_comptable: e.target.value }))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, fontFamily: 'inherit', background: '#fff' }} disabled={loadingComptes}>
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
                    <input type="text" value={form.telephone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="+242..." />
                  </div>
                  <div className="ecriture-field">
                    <label>Email</label>
                    <input type="text" value={form.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemple.com" />
                  </div>
                </div>

                <div className="ecriture-fields-row" style={{ marginTop: 12 }}>
                  <div className="ecriture-field" style={{ flex: 1 }}>
                    <label>Adresse</label>
                    <input type="text" value={form.adresse} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, adresse: e.target.value }))} placeholder="Adresse complete" />
                  </div>
                </div>
              </div>

              {/* Contact & Notes */}
              <div className="ecriture-fields-card" style={{ marginTop: 12 }}>
                <div className="ecriture-fields-row">
                  <div className="ecriture-field">
                    <label>Personne de contact</label>
                    <input type="text" value={form.data.contact_nom || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, data: { ...f.data, contact_nom: e.target.value } }))} placeholder="Nom du contact" />
                  </div>
                  <div className="ecriture-field">
                    <label>Fonction</label>
                    <input type="text" value={form.data.contact_fonction || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, data: { ...f.data, contact_fonction: e.target.value } }))} placeholder="Ex: Tresorier" />
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
                <button className="compta-action-btn" onClick={closeForm}>Annuler</button>
                <button className="compta-action-btn primary" onClick={saveTiers} disabled={!form.nom.trim() || !form.compte_comptable || saving}>
                  <LuSave /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TiersPage;
