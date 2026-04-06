import React, { useState, useCallback, useEffect } from 'react';
import { fmt, fmtDate } from '../utils/formatters';

interface LettrageProps {
  entiteId: number;
  exerciceId: number;
  exerciceAnnee: number;
  onBack: () => void;
}

interface TiersLettrageItem {
  id: number;
  nom: string;
  code_tiers: string;
  type: string;
  solde: number | string;
}

interface EcritureLettrageItem {
  id: number;
  journal: string;
  date_ecriture: string;
  numero_piece: string;
  numero_compte: string;
  libelle_ecriture: string;
  libelle_compte: string;
  debit: number | string;
  credit: number | string;
  lettrage_code: string;
}

const TYPE_LABELS: Record<string, string> = {
  membre: 'Membre',
  fournisseur: 'Fournisseur',
  bailleur: 'Bailleur',
  personnel: 'Personnel',
};
const TYPE_COLORS: Record<string, string> = {
  membre: '#D4A843',
  fournisseur: '#059669',
  bailleur: '#d97706',
  personnel: '#7c3aed',
};
const ALL_TYPES: string[] = Object.keys(TYPE_LABELS);

const thStyle: React.CSSProperties = { padding: '10px 8px', fontSize: 14, fontWeight: 600, color: '#555', textAlign: 'center', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '9px 8px', textAlign: 'center', fontSize: 14 };

function Lettrage({ entiteId, exerciceId, exerciceAnnee, onBack }: LettrageProps): React.JSX.Element {
  // Left panel
  const [tiersList, setTiersList] = useState<TiersLettrageItem[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([...ALL_TYPES]);
  const [searchTiers, setSearchTiers] = useState<string>('');
  const [selectedTiers, setSelectedTiers] = useState<TiersLettrageItem | null>(null);
  const [loadingTiers, setLoadingTiers] = useState<boolean>(false);

  // Right panel
  const [ecritures, setEcritures] = useState<EcritureLettrageItem[]>([]);
  const [loadingEcr, setLoadingEcr] = useState<boolean>(false);
  const [statut, setStatut] = useState<string>('non_lettrees');
  const [anneeDe, setAnneeDe] = useState<number | string>(exerciceAnnee || new Date().getFullYear());
  const [anneeA, setAnneeA] = useState<number | string>(exerciceAnnee || new Date().getFullYear());
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [showTypeDropdown, setShowTypeDropdown] = useState<boolean>(false);

  // Reset selection when type filter changes
  useEffect(() => {
    setSelectedTiers(null);
    setEcritures([]);
    setCheckedIds(new Set());
  }, [selectedTypes]);

  // Load tiers list
  const loadTiers = useCallback(async (): Promise<void> => {
    if (!entiteId || !exerciceId) return;
    setLoadingTiers(true);
    try {
      const typeFilter = selectedTypes.length < ALL_TYPES.length ? `?type_tiers=${selectedTypes.join(',')}` : '';
      const res = await fetch(`/api/ecritures/lettrage/tiers/${entiteId}/${exerciceId}${typeFilter}`);
      if (res.ok) setTiersList(await res.json());
    } catch (_e) {
      // silently ignore
    }
    setLoadingTiers(false);
  }, [entiteId, exerciceId, selectedTypes]);

  useEffect(() => { loadTiers(); }, [loadTiers]);

  // Load ecritures for selected tiers
  const loadEcritures = useCallback(async (): Promise<void> => {
    if (!selectedTiers) return;
    setLoadingEcr(true);
    try {
      const params = new URLSearchParams();
      if (statut) params.append('statut', statut);
      if (anneeDe) params.append('annee_de', String(anneeDe));
      if (anneeA) params.append('annee_a', String(anneeA));
      const qs = params.toString() ? '?' + params.toString() : '';
      const res = await fetch(`/api/ecritures/lettrage/ecritures/${entiteId}/${exerciceId}/${selectedTiers.id}${qs}`);
      if (res.ok) {
        setEcritures(await res.json());
        setCheckedIds(new Set());
      }
    } catch (_e) {
      // silently ignore
    }
    setLoadingEcr(false);
  }, [selectedTiers, entiteId, exerciceId, statut, anneeDe, anneeA]);

  useEffect(() => { loadEcritures(); }, [loadEcritures]);

  // Filter tiers by search
  const filteredTiers = tiersList.filter(t =>
    !searchTiers || t.nom.toLowerCase().includes(searchTiers.toLowerCase()) ||
    (t.code_tiers && t.code_tiers.toLowerCase().includes(searchTiers.toLowerCase()))
  );

  // Toggle type filter
  const toggleType = (type: string): void => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) return prev.filter(t => t !== type);
      return [...prev, type];
    });
  };
  const toggleAllTypes = (): void => {
    setSelectedTypes(prev => prev.length === ALL_TYPES.length ? [] : [...ALL_TYPES]);
  };

  // Checkbox handling
  const toggleCheck = (id: number): void => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAllChecks = (): void => {
    if (checkedIds.size === ecritures.length) setCheckedIds(new Set());
    else setCheckedIds(new Set(ecritures.map(e => e.id)));
  };

  // Compute ecart for selected lines
  const selectedLines = ecritures.filter(e => checkedIds.has(e.id));
  const ecartSelected = selectedLines.reduce((acc, l) => acc + parseFloat(String(l.debit || 0)) - parseFloat(String(l.credit || 0)), 0);
  const soldeComptable = ecritures.reduce((acc, l) => acc + parseFloat(String(l.debit || 0)) - parseFloat(String(l.credit || 0)), 0);

  // Detect if selection contains only lettered lines
  const selectedLettrees = selectedLines.filter(l => l.lettrage_code);
  const selectedNonLettrees = selectedLines.filter(l => !l.lettrage_code);
  const uniqueLettrageCode = selectedLettrees.length > 0 && selectedNonLettrees.length === 0
    ? [...new Set(selectedLettrees.map(l => l.lettrage_code))]
    : [];
  const isDelettrerMode = uniqueLettrageCode.length === 1;

  // Lettrer action
  const handleLettrer = async (): Promise<void> => {
    if (selectedLines.length < 2) { alert('Sélectionnez au moins 2 lignes.'); return; }
    if (Math.abs(ecartSelected) > 0.01) { alert(`Écart non nul: ${fmt(ecartSelected)}. Les lignes doivent s'équilibrer.`); return; }
    try {
      const res = await fetch('/api/ecritures/lettrage/lettrer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ligne_ids: [...checkedIds], entite_id: entiteId }),
      });
      const responseData: { error?: string } = await res.json();
      if (!res.ok) { alert(responseData.error); return; }
      loadEcritures();
      loadTiers();
    } catch (_e) {
      alert('Erreur réseau.');
    }
  };

  // Delettrer action
  const handleDelettrer = async (code: string): Promise<void> => {
    if (!window.confirm(`Supprimer le lettrage ${code} ?`)) return;
    try {
      const res = await fetch('/api/ecritures/lettrage/delettrer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lettrage_code: code, entite_id: entiteId }),
      });
      if (res.ok) { loadEcritures(); loadTiers(); }
    } catch (_e) {
      // silently ignore
    }
  };


  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', gap: 0, background: '#f5f6fa' }}>
      {/* LEFT PANEL - Tiers list */}
      <div style={{ width: 320, minWidth: 280, borderRight: '1px solid #e2e5ea', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        {/* Filters */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e5ea' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <button
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', fontSize: 14, textAlign: 'left', cursor: 'pointer', color: '#555' }}
              >
                {selectedTypes.length === ALL_TYPES.length ? 'Tous les types' : selectedTypes.length === 0 ? 'Aucun type' : selectedTypes.map(t => TYPE_LABELS[t]).join(', ')}
                <span style={{ float: 'right' }}>&#9662;</span>
              </button>
              {showTypeDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 100, padding: '6px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', fontSize: 14, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedTypes.length === ALL_TYPES.length} onChange={toggleAllTypes} />
                    Tout sélectionner
                  </label>
                  {ALL_TYPES.map(type => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', fontSize: 14, cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => toggleType(type)} />
                      {TYPE_LABELS[type]}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <input
            type="text"
            placeholder="Rechercher un tiers..."
            value={searchTiers}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTiers(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {/* Tiers list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingTiers && <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 14 }}>Chargement...</div>}
          {!loadingTiers && filteredTiers.map(t => (
            <div
              key={t.id}
              onClick={() => setSelectedTiers(t)}
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid #f0f0f0',
                cursor: 'pointer',
                background: selectedTiers?.id === t.id ? '#eff6ff' : '#fff',
                borderLeft: selectedTiers?.id === t.id ? '3px solid #D4A843' : '3px solid transparent',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 15, color: '#1a1a1a', marginBottom: 3 }}>{t.nom}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#888' }}>{t.code_tiers}</span>
                  <span style={{
                    fontSize: 12, padding: '2px 8px', borderRadius: 3, fontWeight: 500,
                    background: TYPE_COLORS[t.type] + '18', color: TYPE_COLORS[t.type],
                  }}>
                    {TYPE_LABELS[t.type]}
                  </span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: parseFloat(String(t.solde)) === 0 ? '#888' : parseFloat(String(t.solde)) > 0 ? '#059669' : '#dc2626' }}>
                  {fmt(t.solde)}
                </span>
              </div>
            </div>
          ))}
          {!loadingTiers && filteredTiers.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 14 }}>Aucun tiers trouvé.</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid #e2e5ea', fontSize: 13, color: '#888' }}>
          {filteredTiers.length} élément{filteredTiers.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* RIGHT PANEL - Ecritures */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
        {!selectedTiers ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 16 }}>
            SÉLECTIONNER UN ÉLÉMENT DANS LA LISTE
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e5ea' }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>{selectedTiers.nom}</h3>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 13, color: '#888' }}>Statut</label>
                  <select value={statut} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatut(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}>
                    <option value="non_lettrees">Écritures non lettrées</option>
                    <option value="">Toutes les écritures</option>
                    <option value="lettrees">Écritures lettrées</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 13, color: '#888' }}>Exercice de</label>
                  <input type="number" value={anneeDe} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnneeDe(e.target.value)} style={{ width: 80, padding: '7px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 13, color: '#888' }}>a</label>
                  <input type="number" value={anneeA} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnneeA(e.target.value)} style={{ width: 80, padding: '7px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }} />
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
              {loadingEcr ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Chargement...</div>
              ) : ecritures.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Aucune écriture trouvée.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8f9fb', borderBottom: '2px solid #e2e5ea' }}>
                      <th style={{ padding: '8px 6px', width: 30 }}>
                        <input type="checkbox" checked={checkedIds.size === ecritures.length && ecritures.length > 0} onChange={toggleAllChecks} />
                      </th>
                      <th style={thStyle}>Journal</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>N° piece</th>
                      <th style={thStyle}>Compte</th>
                      <th style={{ ...thStyle, textAlign: 'left', minWidth: 160 }}>Libellé</th>
                      <th style={{ ...thStyle, width: 60 }}>Lettrage</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Débit</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Crédit</th>
                      <th style={{ ...thStyle, width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ecritures.map(l => (
                      <tr
                        key={l.id}
                        style={{
                          borderBottom: '1px solid #f0f0f0',
                          background: checkedIds.has(l.id) ? '#eff6ff' : l.lettrage_code ? '#f0fdf4' : '#fff',
                        }}
                      >
                        <td style={{ padding: '7px 6px', textAlign: 'center' }}>
                          <input type="checkbox" checked={checkedIds.has(l.id)} onChange={() => toggleCheck(l.id)} />
                        </td>
                        <td style={tdStyle}>{l.journal}</td>
                        <td style={tdStyle}>{fmtDate(l.date_ecriture)}</td>
                        <td style={tdStyle}>{l.numero_piece}</td>
                        <td style={tdStyle}>{l.numero_compte}</td>
                        <td style={{ ...tdStyle, textAlign: 'left' }}>{l.libelle_ecriture || l.libelle_compte}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#D4A843' }}>{l.lettrage_code || ''}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{parseFloat(String(l.debit)) > 0 ? fmt(l.debit) : ''}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{parseFloat(String(l.credit)) > 0 ? fmt(l.credit) : ''}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {l.lettrage_code && (
                            <button onClick={() => handleDelettrer(l.lettrage_code)} title="Supprimer le lettrage" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 14, padding: 2 }}>&#10005;</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom bar */}
            <div style={{ padding: '10px 20px', borderTop: '1px solid #e2e5ea', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fb' }}>
              <div style={{ display: 'flex', gap: 20, fontSize: 14 }}>
                <div>
                  <span style={{ color: '#888' }}>Solde comptable : </span>
                  <span style={{ fontWeight: 600, color: Math.abs(soldeComptable) < 0.01 ? '#059669' : '#1a1a1a' }}>{fmt(soldeComptable)}</span>
                </div>
                <div>
                  <span style={{ color: '#888' }}>Écart sélection : </span>
                  <span style={{ fontWeight: 600, color: Math.abs(ecartSelected) < 0.01 ? '#059669' : '#dc2626' }}>{fmt(ecartSelected)}</span>
                </div>
                <div style={{ color: '#888' }}>
                  {checkedIds.size} ligne{checkedIds.size > 1 ? 's' : ''} sélectionnée{checkedIds.size > 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setCheckedIds(new Set())}
                  style={{ padding: '8px 18px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', fontSize: 14, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                {isDelettrerMode ? (
                  <button
                    onClick={() => handleDelettrer(uniqueLettrageCode[0])}
                    style={{
                      padding: '8px 20px', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      background: '#dc2626', color: '#fff',
                    }}
                  >
                    Délettrer ({uniqueLettrageCode[0]})
                  </button>
                ) : (
                  <button
                    onClick={handleLettrer}
                    disabled={checkedIds.size < 2 || Math.abs(ecartSelected) > 0.01 || selectedLettrees.length > 0}
                    style={{
                      padding: '8px 20px', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      background: checkedIds.size >= 2 && Math.abs(ecartSelected) <= 0.01 && selectedLettrees.length === 0 ? '#D4A843' : '#ccc',
                      color: '#fff',
                    }}
                  >
                    Lettrer
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      {/* Close type dropdown on outside click */}
      {showTypeDropdown && <div onClick={() => setShowTypeDropdown(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />}
    </div>
  );
}

export default Lettrage;
