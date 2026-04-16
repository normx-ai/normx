import React, { useEffect, useState, useCallback } from 'react';
import { LuSave } from 'react-icons/lu';

interface TvaConfig {
  id: number;
  taux_normal: string;
  taux_reduit: string | null;
  regime: 'normal' | 'simplifie' | 'non_assujetti';
  numero_assujetti: string | null;
  updated_at: string;
}

const REGIMES: { value: TvaConfig['regime']; label: string; description: string }[] = [
  { value: 'normal', label: 'Régime normal', description: 'Déclaration mensuelle ou trimestrielle, droit à déduction' },
  { value: 'simplifie', label: 'Régime simplifié', description: 'Déclaration annuelle avec acomptes' },
  { value: 'non_assujetti', label: 'Non-assujetti', description: "Pas d'obligation de collecter la TVA (CA sous le seuil, etc.)" },
];

export default function TvaTab(): React.ReactElement {
  const [config, setConfig] = useState<TvaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (): Promise<void> => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/tva-config');
      if (!r.ok) throw new Error('Erreur chargement TVA.');
      const data = await r.json() as TvaConfig;
      setConfig(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (): Promise<void> => {
    if (!config) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      const r = await fetch('/api/tva-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taux_normal: config.taux_normal,
          taux_reduit: config.taux_reduit || null,
          regime: config.regime,
          numero_assujetti: config.numero_assujetti || null,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'Erreur sauvegarde.');
      }
      const data = await r.json() as TvaConfig;
      setConfig(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: 24, color: '#888' }}>Chargement...</div>;
  if (!config) return <div style={{ padding: 24, color: '#dc2626' }}>Configuration TVA non chargée.</div>;

  return (
    <div style={{ maxWidth: 640 }}>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Configuration TVA</h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>
        Paramètres fiscaux TVA applicables à l'ensemble des écritures comptables.
      </p>

      {error && <div style={errorBox}>{error}</div>}
      {saved && <div style={successBox}>Configuration enregistrée.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={lbl}>Taux normal (%)</label>
          <input type="number" step="0.01" min="0" max="100" style={inp}
            value={config.taux_normal}
            onChange={e => setConfig(c => c ? { ...c, taux_normal: e.target.value } : c)} />
          <small style={hint}>Congo : 18% par défaut.</small>
        </div>
        <div>
          <label style={lbl}>Taux réduit (%)</label>
          <input type="number" step="0.01" min="0" max="100" style={inp}
            value={config.taux_reduit || ''}
            onChange={e => setConfig(c => c ? { ...c, taux_reduit: e.target.value } : c)}
            placeholder="ex: 5" />
          <small style={hint}>Laisser vide si non applicable.</small>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={lbl}>Régime fiscal</label>
        <div style={{ display: 'grid', gap: 8 }}>
          {REGIMES.map(r => (
            <label key={r.value} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: 12, border: `1.5px solid ${config.regime === r.value ? '#D4A843' : '#e5e7eb'}`,
              borderRadius: 8, cursor: 'pointer',
              background: config.regime === r.value ? '#fef3c7' : 'white',
            }}>
              <input type="radio" name="regime" value={r.value} checked={config.regime === r.value}
                onChange={() => setConfig(c => c ? { ...c, regime: r.value } : c)}
                style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.label}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{r.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {config.regime !== 'non_assujetti' && (
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>N° d'assujetti TVA</label>
          <input style={inp}
            value={config.numero_assujetti || ''}
            onChange={e => setConfig(c => c ? { ...c, numero_assujetti: e.target.value } : c)}
            placeholder="Numéro d'identification fiscale" />
        </div>
      )}

      <button onClick={handleSave} disabled={saving} style={btnPrimary}>
        <LuSave size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>

      {config.updated_at && (
        <p style={{ marginTop: 16, fontSize: 12, color: '#9ca3af' }}>
          Dernière modification : {new Date(config.updated_at).toLocaleString('fr-FR')}
        </p>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 };
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6 };
const hint: React.CSSProperties = { display: 'block', fontSize: 11, color: '#9ca3af', marginTop: 4 };
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#D4A843', color: '#0F2A42', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer' };
const errorBox: React.CSSProperties = { background: '#fef2f2', color: '#991b1b', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 };
const successBox: React.CSSProperties = { background: '#f0fdf4', color: '#15803d', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 };
