// Ecran Echeancier : liste des dettes / creances avec echeances, statut paye/du.

import { clientFetch } from '../../lib/api';
import React, { useState, useCallback } from 'react';
import { LuChevronLeft, LuFileText } from 'react-icons/lu';
import { fmt } from '../../utils/formatters';
import { FilterField } from './FilterField';
import {
  EcheancierRow,
  exportBtnStyle,
  genBtnStyle,
  inputStyle,
  tableStyle,
  tdStyle,
  thStyle,
} from './journauxShared';

interface Props {
  entiteId: number;
  exerciceId: number;
  exerciceAnnee: number;
  onBack: () => void;
}

export function Echeancier({ entiteId, exerciceId, exerciceAnnee, onBack }: Props): React.JSX.Element {
  void exerciceAnnee;
  const [data, setData] = useState<EcheancierRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [generated, setGenerated] = useState<boolean>(false);

  const [dateDu, setDateDu] = useState<string>('');
  const [dateAu, setDateAu] = useState<string>('');
  const [typeTiers, setTypeTiers] = useState<string>('');
  const [tiersDe, setTiersDe] = useState<string>('');
  const [tiersA, setTiersA] = useState<string>('');
  const [statutFilter, setStatutFilter] = useState<string>('du');

  const loadData = useCallback(async (): Promise<void> => {
    if (!entiteId || !exerciceId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateDu) params.append('date_du', dateDu);
      if (dateAu) params.append('date_au', dateAu);
      if (typeTiers) params.append('type_tiers', typeTiers);
      if (statutFilter) params.append('statut', statutFilter);
      const qs = params.toString() ? '?' + params.toString() : '';
      const res = await clientFetch(`/api/ecritures/rapports/echeancier/${entiteId}/${exerciceId}${qs}`);
      if (res.ok) { setData(await res.json()); setGenerated(true); }
    } catch (_e) {
      // silently ignore
    }
    setLoading(false);
  }, [entiteId, exerciceId, dateDu, dateAu, typeTiers, statutFilter]);

  return (
    <div className="compta-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D4A843', fontSize: 15 }}>
            <LuChevronLeft size={20} />
          </button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Échéancier</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {generated && <button onClick={() => {}} style={exportBtnStyle}><LuFileText size={15} /> Exporter en PDF</button>}
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888' }}>&#10005;</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <FilterField label="Date du">
          <input type="date" value={dateDu} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateDu(e.target.value)} style={inputStyle} />
        </FilterField>
        <FilterField label="au">
          <input type="date" value={dateAu} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateAu(e.target.value)} style={inputStyle} />
        </FilterField>
        <FilterField label="Type de tiers">
          <select value={typeTiers} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeTiers(e.target.value)} style={inputStyle}>
            <option value="">Tous</option>
            <option value="membre">Membre</option>
            <option value="fournisseur">Fournisseur</option>
            <option value="bailleur">Bailleur</option>
            <option value="personnel">Personnel</option>
          </select>
        </FilterField>
        <FilterField label="Tiers de">
          <select value={tiersDe} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTiersDe(e.target.value)} style={inputStyle}>
            <option value="">Sélectionner...</option>
          </select>
        </FilterField>
        <FilterField label="à">
          <select value={tiersA} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTiersA(e.target.value)} style={inputStyle}>
            <option value="">Sélectionner...</option>
          </select>
        </FilterField>
        <FilterField label="Statut">
          <select value={statutFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatutFilter(e.target.value)} style={inputStyle}>
            <option value="du">Dû</option>
            <option value="paye">Payé</option>
            <option value="">Tous</option>
          </select>
        </FilterField>
        <button onClick={loadData} style={genBtnStyle}>Générer</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {['Date d\'échéance', 'Tiers', 'Numéro de facture', 'Montant', 'Montant payé', 'Montant dû', 'Mode de paiement', 'Statut'].map(h => (
                <th key={h} style={{ ...thStyle, textAlign: ['Montant', 'Montant payé', 'Montant dû'].includes(h) ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Chargement...</td></tr>}
            {!loading && generated && data.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Aucun élément à afficher.</td></tr>}
            {!loading && data.map((l, i) => (
              <tr key={i}>
                <td style={tdStyle}>{l.date_echeance ? new Date(l.date_echeance).toLocaleDateString('fr-FR') : ''}</td>
                <td style={tdStyle}>{l.tiers_nom}</td>
                <td style={tdStyle}>{l.numero_piece}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(l.montant)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(l.montant_paye)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(l.montant_du)}</td>
                <td style={tdStyle}>{l.mode_paiement || ''}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      fontSize: 12, padding: '2px 10px', borderRadius: 10, fontWeight: 500,
                      background: l.montant_du > 0 ? '#fef2f2' : '#f0fdf4',
                      color: l.montant_du > 0 ? '#dc2626' : '#059669',
                    }}
                  >
                    {l.montant_du > 0 ? 'Dû' : 'Payé'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
