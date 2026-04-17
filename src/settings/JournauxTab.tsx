import React, { useState } from 'react';
import { LuPlus, LuSave, LuTrash2, LuX } from 'react-icons/lu';
import { useQueryClient } from '@tanstack/react-query';
import { useJournaux } from '../lib/queries';
import { clientFetch } from '../lib/api';

interface Journal {
  id: number;
  code: string;
  libelle: string;
  type: 'achat' | 'vente' | 'tresorerie' | 'od';
  contrepartie_defaut: string | null;
  actif: boolean;
  nb_ecritures: number;
  created_at: string;
}

const TYPE_LABELS: Record<Journal['type'], string> = {
  achat: 'Achats',
  vente: 'Ventes',
  tresorerie: 'Trésorerie',
  od: 'Opérations diverses',
};

const EMPTY_NEW: Pick<Journal, 'code' | 'libelle' | 'type' | 'contrepartie_defaut'> = {
  code: '',
  libelle: '',
  type: 'od',
  contrepartie_defaut: null,
};

export default function JournauxTab(): React.ReactElement {
  const queryClient = useQueryClient();
  const { data: journaux = [] as Journal[], isLoading: loading } = useJournaux() as { data: Journal[] | undefined; isLoading: boolean };
  const [error, setError] = useState<string>('');
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_NEW);
  const [editing, setEditing] = useState<Record<number, Partial<Journal>>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const invalidateJournaux = () => queryClient.invalidateQueries({ queryKey: ['journaux'] });

  const handleAdd = async (): Promise<void> => {
    setError('');
    if (!newForm.code.trim() || !newForm.libelle.trim()) {
      setError('Code et libellé obligatoires.');
      return;
    }
    try {
      const r = await clientFetch('/api/journaux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'Erreur création.');
      }
      setShowAdd(false); setNewForm(EMPTY_NEW);
      invalidateJournaux();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
  };

  const applyEdit = async (j: Journal): Promise<void> => {
    const patch = editing[j.id];
    if (!patch) return;
    setSaving(j.id);
    try {
      const r = await clientFetch(`/api/journaux/${j.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'Erreur MAJ.');
      }
      setEditing(prev => { const n = { ...prev }; delete n[j.id]; return n; });
      invalidateJournaux();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    setSaving(null);
  };

  const handleDelete = async (j: Journal): Promise<void> => {
    if (j.nb_ecritures > 0) {
      setError(`Impossible : ce journal porte ${j.nb_ecritures} écriture(s).`);
      return;
    }
    if (!window.confirm(`Supprimer le journal « ${j.code} — ${j.libelle} » ?`)) return;
    try {
      const r = await clientFetch(`/api/journaux/${j.id}`, { method: 'DELETE' });
      if (!r.ok && r.status !== 204) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'Erreur suppression.');
      }
      invalidateJournaux();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
  };

  const updateEdit = (id: number, field: keyof Journal, value: string | boolean | null): void => {
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const getValue = (j: Journal, field: 'libelle' | 'type' | 'contrepartie_defaut' | 'actif'): unknown => {
    const e = editing[j.id];
    if (e && field in e) return e[field];
    return j[field];
  };

  if (loading) return <div style={{ padding: 24, color: '#888' }}>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Journaux comptables</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
            {journaux.length} journal{journaux.length > 1 ? 'x' : ''} configuré{journaux.length > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowAdd(v => !v)} style={btnPrimary}>
          <LuPlus size={14} /> Ajouter un journal
        </button>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      {showAdd && (
        <div style={addBox}>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 180px 140px auto', gap: 10, alignItems: 'end' }}>
            <div><label style={lbl}>Code</label><input style={inp} maxLength={10} value={newForm.code} onChange={e => setNewForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="AC" /></div>
            <div><label style={lbl}>Libellé</label><input style={inp} value={newForm.libelle} onChange={e => setNewForm(f => ({ ...f, libelle: e.target.value }))} placeholder="Achats" /></div>
            <div><label style={lbl}>Type</label>
              <select style={inp} value={newForm.type} onChange={e => setNewForm(f => ({ ...f, type: e.target.value as Journal['type'] }))}>
                {(['achat','vente','tresorerie','od'] as Journal['type'][]).map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Contrepartie</label><input style={inp} value={newForm.contrepartie_defaut || ''} onChange={e => setNewForm(f => ({ ...f, contrepartie_defaut: e.target.value || null }))} placeholder="401" /></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleAdd} style={btnPrimary}><LuSave size={14} /></button>
              <button onClick={() => { setShowAdd(false); setNewForm(EMPTY_NEW); }} style={btnGhost}><LuX size={14} /></button>
            </div>
          </div>
        </div>
      )}

      <table style={tbl}>
        <thead>
          <tr>
            <th style={th}>Code</th><th style={th}>Libellé</th><th style={th}>Type</th>
            <th style={th}>Contrepartie</th><th style={th}>Écritures</th><th style={th}>Actif</th><th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {journaux.map(j => {
            const hasEdit = !!editing[j.id];
            return (
              <tr key={j.id} style={hasEdit ? { background: '#fffbf0' } : {}}>
                <td style={td}><strong>{j.code}</strong></td>
                <td style={td}>
                  <input style={inpMini} value={String(getValue(j, 'libelle'))} onChange={e => updateEdit(j.id, 'libelle', e.target.value)} />
                </td>
                <td style={td}>
                  <select style={inpMini} value={String(getValue(j, 'type'))} onChange={e => updateEdit(j.id, 'type', e.target.value)}>
                    {(['achat','vente','tresorerie','od'] as Journal['type'][]).map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <input style={inpMini} value={(getValue(j, 'contrepartie_defaut') as string | null) || ''} onChange={e => updateEdit(j.id, 'contrepartie_defaut', e.target.value || null)} placeholder="—" />
                </td>
                <td style={{ ...td, textAlign: 'center', color: j.nb_ecritures > 0 ? '#1a3a5c' : '#aaa', fontWeight: j.nb_ecritures > 0 ? 700 : 400 }}>{j.nb_ecritures}</td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <input type="checkbox" checked={Boolean(getValue(j, 'actif'))} onChange={e => updateEdit(j.id, 'actif', e.target.checked)} />
                </td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {hasEdit && <button onClick={() => applyEdit(j)} disabled={saving === j.id} style={btnPrimary}><LuSave size={13} /></button>}
                  {!hasEdit && j.nb_ecritures === 0 && <button onClick={() => handleDelete(j)} style={btnDanger}><LuTrash2 size={13} /></button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: '#D4A843', color: '#0F2A42', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' };
const btnDanger: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, cursor: 'pointer' };
const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#374151' };
const td: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #f1f5f9' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 };
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6 };
const inpMini: React.CSSProperties = { width: '100%', padding: '4px 6px', fontSize: 12, border: '1px solid transparent', borderRadius: 3, background: 'transparent' };
const addBox: React.CSSProperties = { background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 14 };
const errorBox: React.CSSProperties = { background: '#fef2f2', color: '#991b1b', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12 };
