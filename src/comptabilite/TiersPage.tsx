import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import { useFetchEntity } from '../hooks/useFetchEntity';
import { LuPlus, LuSearch, LuDownload, LuSheet, LuFileText } from 'react-icons/lu';
import type { CompteComptable } from '../types';
import './Comptabilite.css';
import {
  EMPTY_FORM,
  TYPES_TIERS,
  TiersForm as TiersFormData,
  TiersItem,
  generateCodeTiers,
} from './tiers/tiersTypes';
import { exportTiersCSV, exportTiersExcel, exportTiersPDF } from './tiers/tiersExports';
import { TiersTypeCards } from './tiers/TiersTypeCards';
import { TiersTable } from './tiers/TiersTable';
import { TiersDetailPanel } from './tiers/TiersDetailPanel';
import { TiersForm } from './tiers/TiersForm';

interface TiersPageProps {
  entiteId: number;
  entiteName?: string;
  defaultType?: string;
  onBack: () => void;
}

function TiersPage({ entiteId, entiteName = '', defaultType = '', onBack }: TiersPageProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: tiers = [], isLoading: loading } = useFetchEntity<TiersItem>(
    ['tiers', entiteId],
    api.tiers.byEntite(entiteId),
    { enabled: entiteId > 0, fallbackKeys: ['tiers'], staleTime: 5 * 60 * 1000 },
  );
  const reloadTiers = (): Promise<void> => queryClient.invalidateQueries({ queryKey: ['tiers', entiteId] }) as Promise<void>;
  const [filterType, setFilterType] = useState<string>(defaultType);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingTiers, setEditingTiers] = useState<TiersItem | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedTiers, setSelectedTiers] = useState<TiersItem | null>(null);
  const [comptesOptions, setComptesOptions] = useState<CompteComptable[]>([]);
  const [loadingComptes, setLoadingComptes] = useState<boolean>(false);

  const [form, setForm] = useState<TiersFormData>(EMPTY_FORM);

  useEffect(() => {
    const typeCfg = TYPES_TIERS.find(t => t.value === form.type);
    if (!typeCfg) return;

    const fetchComptes = async (): Promise<void> => {
      setLoadingComptes(true);
      try {
        const allResults = await Promise.all(
          typeCfg.prefixes.map(prefix =>
            clientFetch(api.planComptable.search(prefix)).then(r => r.json())
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

  const resetForm = (): void => {
    setForm(EMPTY_FORM);
    setEditingTiers(null);
  };

  const openCreate = (type: string): void => {
    resetForm();
    const typeCfg = TYPES_TIERS.find(t => t.value === type) || TYPES_TIERS[0];
    const code = generateCodeTiers(type || 'membre', tiers);
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
    const code = editingTiers ? form.code_tiers : generateCodeTiers(type, tiers);
    setForm(f => ({ ...f, type, compte_comptable: typeCfg.compteDefaut, code_tiers: code }));
  };

  const saveTiers = async (): Promise<void> => {
    if (!form.nom.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, entite_id: entiteId };
      const url = editingTiers ? api.tiers.byId(editingTiers.id) : api.tiers.root;
      const method = editingTiers ? 'PUT' : 'POST';
      const res = await clientFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        reloadTiers();
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
      await clientFetch(api.tiers.byId(id), { method: 'DELETE' });
      if (selectedTiers?.id === id) setSelectedTiers(null);
      await reloadTiers();
    } catch (_err) {
      // silently ignore
    }
  };

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

  return (
    <div className="compta-wrapper">
      <div className="compta-page-header">
        <div>
          <h1 className="compta-page-title">Gestion des tiers</h1>
          <p className="compta-page-subtitle">Membres, fournisseurs, bailleurs et personnel</p>
        </div>
        <div className="compta-header-actions">
          <button className="compta-action-btn" onClick={() => exportTiersCSV(tiersAffiches)} disabled={tiers.length === 0}><LuDownload /> CSV</button>
          <button className="compta-action-btn" onClick={() => exportTiersExcel(tiersAffiches)} disabled={tiers.length === 0}><LuSheet /> Excel</button>
          <button className="compta-action-btn" onClick={() => exportTiersPDF(tiersAffiches, entiteName)} disabled={tiers.length === 0}><LuFileText /> PDF</button>
          <button className="compta-action-btn" onClick={onBack}>&larr; Retour</button>
          <button className="compta-action-btn primary" onClick={() => openCreate(filterType || 'membre')}>
            <LuPlus /> Nouveau tiers
          </button>
        </div>
      </div>

      <TiersTypeCards tiers={tiers} filterType={filterType} setFilterType={setFilterType} />

      <div className="saisie-filters">
        <div className="saisie-filter-search" style={{ marginLeft: 0 }}>
          <LuSearch />
          <input
            type="text"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, code, email..."
          />
        </div>
      </div>

      <TiersTable
        tiersAffiches={tiersAffiches}
        loading={loading}
        selectedTiers={selectedTiers}
        setSelectedTiers={setSelectedTiers}
        onEdit={openEdit}
        onDelete={deleteTiers}
      />

      <div className="saisie-footer">
        <div className="saisie-footer-count">{tiersAffiches.length} tiers</div>
      </div>

      {selectedTiers && !showForm && (
        <TiersDetailPanel
          tiers={selectedTiers}
          onClose={() => setSelectedTiers(null)}
          onEdit={openEdit}
          onDelete={deleteTiers}
        />
      )}

      {showForm && (
        <TiersForm
          editingTiers={editingTiers}
          form={form}
          saving={saving}
          comptesOptions={comptesOptions}
          loadingComptes={loadingComptes}
          setForm={setForm}
          onTypeChange={handleTypeChange}
          onClose={closeForm}
          onSave={saveTiers}
        />
      )}
    </div>
  );
}

export default TiersPage;
