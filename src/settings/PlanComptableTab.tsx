import React, { useState, useMemo } from 'react';
import { LuPlus, LuSearch, LuX, LuCircleCheck, LuCircleSlash, LuSave } from 'react-icons/lu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientFetch } from '../lib/api';

interface CompteFusionne {
  numero: string;
  libelle: string;
  classe?: number | string | null;
  sens?: 'debiteur' | 'crediteur' | 'mixte' | null;
  source: 'syscohada' | 'custom' | 'syscohada_disabled';
  disabled: boolean;
}

interface CompteCustom {
  id: number;
  numero: string;
  libelle: string | null;
  type: 'custom' | 'disabled';
}

const CLASSES = [
  { v: 0, l: 'Toutes classes' }, { v: 1, l: 'Classe 1 — Capitaux' },
  { v: 2, l: 'Classe 2 — Immobilisations' }, { v: 3, l: 'Classe 3 — Stocks' },
  { v: 4, l: 'Classe 4 — Tiers' }, { v: 5, l: 'Classe 5 — Trésorerie' },
  { v: 6, l: 'Classe 6 — Charges' }, { v: 7, l: 'Classe 7 — Produits' },
  { v: 8, l: 'Classe 8 — HAO' }, { v: 9, l: 'Classe 9 — Engagements' },
];

export default function PlanComptableTab(): React.ReactElement {
  const queryClient = useQueryClient();

  const { data: comptes = [], isLoading: loadingPlan } = useQuery<CompteFusionne[]>({
    queryKey: ['comptes-custom', 'plan-fusionne'],
    queryFn: async () => {
      const r = await clientFetch('/api/comptes-custom/plan-fusionne');
      if (!r.ok) throw new Error('Erreur chargement plan.');
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const { data: customs = [], isLoading: loadingCustom } = useQuery<CompteCustom[]>({
    queryKey: ['comptes-custom'],
    queryFn: async () => {
      const r = await clientFetch('/api/comptes-custom');
      if (!r.ok) throw new Error('Erreur chargement comptes custom.');
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const loading = loadingPlan || loadingCustom;

  const invalidateComptes = () => {
    queryClient.invalidateQueries({ queryKey: ['comptes-custom'] });
  };

  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterClasse, setFilterClasse] = useState(0);
  const [showDisabled, setShowDisabled] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCompte, setNewCompte] = useState({ numero: '', libelle: '', sens: 'debiteur' });
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return comptes.filter(c => {
      if (!showDisabled && c.disabled) return false;
      if (filterClasse > 0 && String(c.classe || '') !== String(filterClasse)) return false;
      if (term) {
        return c.numero.toLowerCase().includes(term) || c.libelle.toLowerCase().includes(term);
      }
      return true;
    });
  }, [comptes, search, filterClasse, showDisabled]);

  const handleAdd = async (): Promise<void> => {
    setError('');
    if (!newCompte.numero.trim() || !newCompte.libelle.trim()) {
      setError('Numéro et libellé obligatoires.'); return;
    }
    try {
      const r = await clientFetch('/api/comptes-custom', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: newCompte.numero.trim(), libelle: newCompte.libelle.trim(), sens: newCompte.sens, type: 'custom' }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'Erreur création.');
      }
      setShowAdd(false); setNewCompte({ numero: '', libelle: '', sens: 'debiteur' });
      invalidateComptes();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
  };

  const toggleDisable = async (c: CompteFusionne): Promise<void> => {
    setError('');
    // Trouver l'override existant (si compte déjà custom ou disabled)
    const existing = customs.find(cc => cc.numero === c.numero);
    try {
      if (c.source === 'syscohada' && !c.disabled) {
        // Désactiver : créer un override type=disabled
        const r = await clientFetch('/api/comptes-custom', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ numero: c.numero, type: 'disabled' }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error || 'Erreur désactivation.');
        }
      } else if (c.disabled && existing) {
        // Réactiver : supprimer l'override disabled
        const r = await clientFetch(`/api/comptes-custom/${existing.id}`, { method: 'DELETE' });
        if (!r.ok && r.status !== 204) throw new Error('Erreur réactivation.');
      }
      invalidateComptes();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
  };

  const deleteCustom = async (c: CompteFusionne): Promise<void> => {
    if (c.source !== 'custom') return;
    const existing = customs.find(cc => cc.numero === c.numero);
    if (!existing) return;
    if (!window.confirm(`Supprimer le compte personnalisé « ${c.numero} — ${c.libelle} » ?`)) return;
    try {
      const r = await clientFetch(`/api/comptes-custom/${existing.id}`, { method: 'DELETE' });
      if (!r.ok && r.status !== 204) throw new Error('Erreur suppression.');
      invalidateComptes();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
  };

  if (loading) return <div style={{ padding: 24, color: '#888' }}>Chargement du plan comptable...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Plan comptable SYSCOHADA</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
            {comptes.length} comptes au total · {comptes.filter(c => c.source === 'custom').length} personnalisés · {comptes.filter(c => c.disabled).length} désactivés
          </p>
        </div>
        <button onClick={() => setShowAdd(v => !v)} style={btnPrimary}>
          <LuPlus size={14} /> Ajouter un compte
        </button>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <LuSearch size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
          <input style={{ ...inp, paddingLeft: 32 }} value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Rechercher par numéro ou libellé…" />
        </div>
        <select style={inp} value={filterClasse} onChange={e => { setFilterClasse(parseInt(e.target.value, 10)); setPage(0); }}>
          {CLASSES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
          <input type="checkbox" checked={showDisabled} onChange={e => setShowDisabled(e.target.checked)} />
          Afficher les désactivés
        </label>
      </div>

      {showAdd && (
        <div style={addBox}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 160px auto', gap: 10, alignItems: 'end' }}>
            <div><label style={lbl}>Numéro</label><input style={inp} value={newCompte.numero} onChange={e => setNewCompte(f => ({ ...f, numero: e.target.value }))} placeholder="ex: 40110001" /></div>
            <div><label style={lbl}>Libellé</label><input style={inp} value={newCompte.libelle} onChange={e => setNewCompte(f => ({ ...f, libelle: e.target.value }))} placeholder="Fournisseur TEST SA" /></div>
            <div><label style={lbl}>Sens</label>
              <select style={inp} value={newCompte.sens} onChange={e => setNewCompte(f => ({ ...f, sens: e.target.value }))}>
                <option value="debiteur">Débiteur</option>
                <option value="crediteur">Créditeur</option>
                <option value="mixte">Mixte</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleAdd} style={btnPrimary}><LuSave size={14} /></button>
              <button onClick={() => { setShowAdd(false); setNewCompte({ numero: '', libelle: '', sens: 'debiteur' }); }} style={btnGhost}><LuX size={14} /></button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxHeight: 520, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <table style={tbl}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={th}>Numéro</th><th style={th}>Libellé</th>
              <th style={{ ...th, width: 90, textAlign: 'center' }}>Sens</th>
              <th style={{ ...th, width: 110 }}>Source</th>
              <th style={{ ...th, width: 120, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(c => (
              <tr key={c.numero} style={c.disabled ? { opacity: 0.5, background: '#f9fafb' } : {}}>
                <td style={{ ...td, fontFamily: 'ui-monospace, monospace' }}>{c.numero}</td>
                <td style={td}>{c.libelle}</td>
                <td style={{ ...td, textAlign: 'center', fontSize: 11, color: '#6b7280' }}>
                  {c.sens === 'debiteur' ? 'D' : c.sens === 'crediteur' ? 'C' : c.sens === 'mixte' ? 'D/C' : '—'}
                </td>
                <td style={{ ...td, fontSize: 11 }}>
                  {c.source === 'custom' && <span style={badge('#D4A843', '#fef3c7')}>Custom</span>}
                  {c.source === 'syscohada_disabled' && <span style={badge('#dc2626', '#fef2f2')}>Désactivé</span>}
                  {c.source === 'syscohada' && <span style={{ color: '#9ca3af' }}>SYSCOHADA</span>}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {c.source === 'custom' ? (
                    <button onClick={() => deleteCustom(c)} style={btnDanger} title="Supprimer ce compte personnalisé">×</button>
                  ) : c.disabled ? (
                    <button onClick={() => toggleDisable(c)} style={btnGhost} title="Réactiver"><LuCircleCheck size={14} /></button>
                  ) : (
                    <button onClick={() => toggleDisable(c)} style={btnGhost} title="Désactiver"><LuCircleSlash size={14} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', fontSize: 13, color: '#6b7280' }}>
          <span>{filtered.length} comptes · page {page + 1} / {Math.ceil(filtered.length / PAGE_SIZE)}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(0)} disabled={page === 0} style={paginBtn}>{'<<'}</button>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={paginBtn}>{'<'}</button>
            <button onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / PAGE_SIZE) - 1, p + 1))} disabled={(page + 1) * PAGE_SIZE >= filtered.length} style={paginBtn}>{'>'}</button>
            <button onClick={() => setPage(Math.ceil(filtered.length / PAGE_SIZE) - 1)} disabled={(page + 1) * PAGE_SIZE >= filtered.length} style={paginBtn}>{'>>'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const badge = (color: string, bg: string): React.CSSProperties => ({
  display: 'inline-block', background: bg, color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
});
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: '#D4A843', color: '#0F2A42', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'transparent', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' };
const btnDanger: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700 };
const paginBtn: React.CSSProperties = { padding: '6px 12px', background: 'white', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, cursor: 'pointer', color: '#374151' };
const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#374151' };
const td: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #f1f5f9' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 };
const inp: React.CSSProperties = { padding: '8px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, background: 'white' };
const addBox: React.CSSProperties = { background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 14 };
const errorBox: React.CSSProperties = { background: '#fef2f2', color: '#991b1b', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12 };
