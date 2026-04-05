import React, { useState, useCallback } from 'react';
import { LuChevronLeft, LuDownload, LuFileText } from 'react-icons/lu';
import { fmt } from '../utils/formatters';
import './Comptabilite.css';

interface FilterFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

interface JournauxProps {
  entiteId: number;
  exerciceId: number;
  exerciceAnnee: number;
  entiteName?: string;
  onBack: () => void;
}

interface EcheancierProps {
  entiteId: number;
  exerciceId: number;
  exerciceAnnee: number;
  onBack: () => void;
}

interface BalanceAgeeProps {
  entiteId: number;
  exerciceId: number;
  exerciceAnnee: number;
  onBack: () => void;
}

interface JournalLine {
  journal: string;
  date: string;
  numero: string;
  compte: string;
  tiers: string;
  libelle: string;
  debit: number;
  credit: number;
}

interface EcritureAPI {
  journal: string;
  date_ecriture: string;
  numero_piece: string;
  libelle: string;
  lignes: {
    numero_compte: string;
    tiers_nom?: string;
    libelle_compte: string;
    debit: number | string;
    credit: number | string;
  }[];
}

interface EcheancierRow {
  date_echeance: string;
  tiers_nom: string;
  numero_piece: string;
  montant: number;
  montant_paye: number;
  montant_du: number;
  mode_paiement: string;
}

interface BalanceAgeeRow {
  tiers_id: number;
  tiers_nom: string;
  code_tiers: string;
  tiers_type: string;
  date_ecriture: string;
  debit: number | string;
  credit: number | string;
}

interface TiersAging {
  nom: string;
  code: string;
  type: string;
  attente: number;
  non_echu: number;
  t1: number;
  t2: number;
  t3: number;
  t4: number;
}

const MOIS: string[] = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const JOURNAUX_LIST: string[] = ['OD', 'ACH', 'VTE', 'BQ', 'CAI', 'SUB', 'DOT', 'AMO', 'RAN'];

const inputStyle: React.CSSProperties = { padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, minWidth: 120 };
const genBtnStyle: React.CSSProperties = { padding: '9px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-end' };
const exportBtnStyle: React.CSSProperties = { padding: '8px 16px', background: '#fff', color: '#D4A843', border: '1px solid #D4A843', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
const thStyle: React.CSSProperties = { padding: '10px 10px', fontSize: 13, fontWeight: 600, background: '#e8edf5', color: '#333', textAlign: 'left', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '9px 10px', borderBottom: '1px solid #eee', fontSize: 14 };

function FilterField({ label, required, children }: FilterFieldProps): React.JSX.Element {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function Journaux({ entiteId, exerciceId, exerciceAnnee, entiteName, onBack }: JournauxProps): React.JSX.Element {
  const [data, setData] = useState<JournalLine[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [generated, setGenerated] = useState<boolean>(false);

  const now = new Date();
  const [mois, setMois] = useState<number | string>(now.getMonth() + 1);
  const [dateDu, setDateDu] = useState<string>(`${exerciceAnnee}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [dateFin, setDateFin] = useState<string>(`${exerciceAnnee}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(exerciceAnnee, now.getMonth() + 1, 0).getDate()}`);
  const [journalFilter, setJournalFilter] = useState<string>('');

  const updateDatesFromMois = (m: number | string): void => {
    setMois(m);
    if (m) {
      const mNum = Number(m);
      const lastDay = new Date(exerciceAnnee, mNum, 0).getDate();
      setDateDu(`${exerciceAnnee}-${String(mNum).padStart(2, '0')}-01`);
      setDateFin(`${exerciceAnnee}-${String(mNum).padStart(2, '0')}-${lastDay}`);
    }
  };

  const loadData = useCallback(async (): Promise<void> => {
    if (!entiteId || !exerciceId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('statut', 'validee');
      if (dateDu) params.append('date_du', dateDu);
      if (dateFin) params.append('date_au', dateFin);
      if (journalFilter) params.append('journal', journalFilter);
      const qs = '?' + params.toString();
      const res = await fetch(`/api/ecritures/${entiteId}/${exerciceId}${qs}`);
      if (res.ok) {
        const ecritures: EcritureAPI[] = await res.json();
        const lines: JournalLine[] = [];
        ecritures.forEach(e => {
          (e.lignes || []).forEach(l => {
            lines.push({
              journal: e.journal,
              date: e.date_ecriture,
              numero: e.numero_piece,
              compte: l.numero_compte,
              tiers: l.tiers_nom || '',
              libelle: e.libelle || l.libelle_compte,
              debit: parseFloat(String(l.debit)) || 0,
              credit: parseFloat(String(l.credit)) || 0,
            });
          });
        });
        setData(lines);
        setGenerated(true);
      }
    } catch (_e) {
      // silently ignore
    }
    setLoading(false);
  }, [entiteId, exerciceId, dateDu, dateFin, journalFilter]);

  /* fmt importe depuis utils/formatters */

  const totalDebit = data.reduce((s, l) => s + l.debit, 0);
  const totalCredit = data.reduce((s, l) => s + l.credit, 0);

  const exportCSV = (): void => {
    let csv = 'Journal;Date;Numéro;Compte;Tiers;Libellé;Débit;Crédit\n';
    data.forEach(l => { csv += `${l.journal};${l.date};${l.numero};${l.compte};${l.tiers};${l.libelle};${l.debit};${l.credit}\n`; });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `journaux_${exerciceAnnee}.csv`; a.click();
  };

  return (
    <div className="compta-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D4A843', fontSize: 15 }}>
            <LuChevronLeft size={20} />
          </button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Journaux</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {generated && <button onClick={() => {}} style={exportBtnStyle}><LuFileText size={15} /> Exporter en PDF</button>}
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888' }}>&#10005;</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <FilterField label="Exercice *" required>
          <input type="text" value={exerciceAnnee} readOnly style={inputStyle} />
        </FilterField>
        <FilterField label="Mois">
          <select value={mois} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateDatesFromMois(parseInt(e.target.value))} style={inputStyle}>
            <option value="">Tous</option>
            {MOIS.slice(1).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </FilterField>
        <FilterField label="Date du *" required>
          <input type="date" value={dateDu} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateDu(e.target.value)} style={inputStyle} />
        </FilterField>
        <FilterField label="Date de fin *" required>
          <input type="date" value={dateFin} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFin(e.target.value)} style={inputStyle} />
        </FilterField>
        <FilterField label="Journal">
          <select value={journalFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setJournalFilter(e.target.value)} style={inputStyle}>
            <option value="">Sélectionner...</option>
            {JOURNAUX_LIST.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </FilterField>
        <button onClick={loadData} style={genBtnStyle}>Générer</button>
      </div>

      {generated && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={exportCSV} style={exportBtnStyle}><LuDownload size={15} /> Exporter</button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {['Journal', 'Date', 'Numéro', 'Compte', 'Tiers', 'Libellé', 'Date du document', 'Référence', 'Débit', 'Crédit'].map(h => (
                <th key={h} style={{ ...thStyle, textAlign: h === 'Débit' || h === 'Crédit' ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Chargement...</td></tr>}
            {!loading && generated && data.length === 0 && <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Aucun élément à afficher.</td></tr>}
            {!loading && data.map((l, i) => (
              <tr key={i}>
                <td style={tdStyle}>{l.journal}</td>
                <td style={tdStyle}>{l.date ? new Date(l.date).toLocaleDateString('fr-FR') : ''}</td>
                <td style={tdStyle}>{l.numero}</td>
                <td style={tdStyle}>{l.compte}</td>
                <td style={tdStyle}>{l.tiers}</td>
                <td style={{ ...tdStyle, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.libelle}</td>
                <td style={tdStyle}>{l.date ? new Date(l.date).toLocaleDateString('fr-FR') : ''}</td>
                <td style={tdStyle}>{l.numero}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(l.debit)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(l.credit)}</td>
              </tr>
            ))}
            {generated && data.length > 0 && (
              <tr style={{ background: '#1A3A5C' }}>
                <td colSpan={8} style={{ ...tdStyle, fontWeight: 700, color: '#fff' }}>TOTAL</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(totalDebit)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmt(totalCredit)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Echeancier({ entiteId, exerciceId, exerciceAnnee, onBack }: EcheancierProps): React.JSX.Element {
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
      const res = await fetch(`/api/ecritures/rapports/echeancier/${entiteId}/${exerciceId}${qs}`);
      if (res.ok) { setData(await res.json()); setGenerated(true); }
    } catch (_e) {
      // silently ignore
    }
    setLoading(false);
  }, [entiteId, exerciceId, dateDu, dateAu, typeTiers, statutFilter]);

  /* fmt importe depuis utils/formatters */

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
                  <span style={{
                    fontSize: 12, padding: '2px 10px', borderRadius: 10, fontWeight: 500,
                    background: l.montant_du > 0 ? '#fef2f2' : '#f0fdf4',
                    color: l.montant_du > 0 ? '#dc2626' : '#059669',
                  }}>
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

function BalanceAgee({ entiteId, exerciceId, exerciceAnnee, onBack }: BalanceAgeeProps): React.JSX.Element {
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
      const res = await fetch(`/api/ecritures/rapports/balance-agee/${entiteId}/${exerciceId}${typeTiers ? '?type_tiers=' + typeTiers : ''}`);
      if (res.ok) { setData(await res.json()); setGenerated(true); }
    } catch (_e) {
      // silently ignore
    }
    setLoading(false);
  }, [entiteId, exerciceId, typeTiers]);

  /* fmt importe depuis utils/formatters */

  // Compute aging based on custom delais
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

export { Journaux, Echeancier, BalanceAgee };
export default Journaux;
