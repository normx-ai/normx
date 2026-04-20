// Ecran Balance agee : aging par tiers (non echu / 30j / 45j / 60j / >60j).

import { clientFetch } from '../../lib/api';
import React, { useState, useCallback } from 'react';
import { LuChevronLeft, LuFileText } from 'react-icons/lu';
import { fmt } from '../../utils/formatters';
import { FilterField } from './FilterField';
import {
  BalanceAgeeRow,
  TiersAging,
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

export function BalanceAgee({ entiteId, exerciceId, exerciceAnnee, onBack }: Props): React.JSX.Element {
  void exerciceAnnee;
  const [data, setData] = useState<BalanceAgeeRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [generated, setGenerated] = useState<boolean>(false);

  const today = new Date().toISOString().slice(0, 10);
  const [dateSituation, setDateSituation] = useState<string>(today);
  const [typeTiers, setTypeTiers] = useState<string>('');
  const [tiersDe, setTiersDe] = useState<string>('');
  const [tiersA, setTiersA] = useState<string>('');
  const [delai1, setDelai1] = useState<number>(30);
  const [delai2, setDelai2] = useState<number>(45);
  const [delai3, setDelai3] = useState<number>(60);

  const loadData = useCallback(async (): Promise<void> => {
    if (!entiteId || !exerciceId) return;
    setLoading(true);
    try {
      const res = await clientFetch(`/api/ecritures/rapports/balance-agee/${entiteId}/${exerciceId}${typeTiers ? '?type_tiers=' + typeTiers : ''}`);
      if (res.ok) { setData(await res.json()); setGenerated(true); }
    } catch (_e) {
      // silently ignore
    }
    setLoading(false);
  }, [entiteId, exerciceId, typeTiers]);

  const refDate = new Date(dateSituation);
  const tiers: Record<number, TiersAging> = {};
  data.forEach(d => {
    if (!tiers[d.tiers_id]) tiers[d.tiers_id] = { nom: d.tiers_nom, code: d.code_tiers, type: d.tiers_type, attente: 0, non_echu: 0, t1: 0, t2: 0, t3: 0, t4: 0 };
    const daysDiff = Math.floor((refDate.getTime() - new Date(d.date_ecriture).getTime()) / 86400000);
    const montant = parseFloat(String(d.debit)) - parseFloat(String(d.credit));
    if (daysDiff <= 0) tiers[d.tiers_id].non_echu += montant;
    else if (daysDiff <= delai1) tiers[d.tiers_id].t1 += montant;
    else if (daysDiff <= delai2) tiers[d.tiers_id].t2 += montant;
    else if (daysDiff <= delai3) tiers[d.tiers_id].t3 += montant;
    else tiers[d.tiers_id].t4 += montant;
    tiers[d.tiers_id].attente += montant;
  });
  const tiersList: TiersAging[] = Object.values(tiers).sort((a, b) => a.nom.localeCompare(b.nom));

  return (
    <div className="compta-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D4A843', fontSize: 15 }}>
            <LuChevronLeft size={20} />
          </button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Balance âgée</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {generated && <button onClick={() => {}} style={exportBtnStyle}><LuFileText size={15} /> Exporter en PDF</button>}
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888' }}>&#10005;</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <FilterField label="Date de situation *" required>
          <input type="date" value={dateSituation} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateSituation(e.target.value)} style={inputStyle} />
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
        <FilterField label="1er délai">
          <input type="number" value={delai1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDelai1(parseInt(e.target.value) || 30)} style={{ ...inputStyle, width: 70 }} />
        </FilterField>
        <FilterField label="2ème délai">
          <input type="number" value={delai2} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDelai2(parseInt(e.target.value) || 45)} style={{ ...inputStyle, width: 70 }} />
        </FilterField>
        <FilterField label="3ème délai">
          <input type="number" value={delai3} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDelai3(parseInt(e.target.value) || 60)} style={{ ...inputStyle, width: 70 }} />
        </FilterField>
        <button onClick={loadData} style={genBtnStyle}>Générer</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Tiers</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>En attente de paiement</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Solde non échu</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Avant le premier délai</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Avant le second délai</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Avant le troisième délai</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Après le troisième délai</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Chargement...</td></tr>}
            {!loading && generated && tiersList.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Aucun élément à afficher.</td></tr>}
            {!loading && tiersList.map((t, i) => (
              <tr key={i}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{t.nom}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(t.attente)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(t.non_echu)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(t.t1)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(t.t2)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(t.t3)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: t.t4 ? '#dc2626' : '' }}>{fmt(t.t4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
