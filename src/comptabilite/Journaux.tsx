import { clientFetch } from '../lib/api';
import React, { useState, useCallback } from 'react';
import { LuChevronLeft, LuDownload, LuFileText } from 'react-icons/lu';
import { fmt } from '../utils/formatters';
import './Comptabilite.css';
import { FilterField } from './journaux/FilterField';
import {
  EcritureAPI,
  JOURNAUX_LIST,
  JournalLine,
  MOIS,
  exportBtnStyle,
  genBtnStyle,
  inputStyle,
  tableStyle,
  tdStyle,
  thStyle,
} from './journaux/journauxShared';
import { Echeancier } from './journaux/Echeancier';
import { BalanceAgee } from './journaux/BalanceAgee';

interface JournauxProps {
  entiteId: number;
  exerciceId: number;
  exerciceAnnee: number;
  entiteName?: string;
  onBack: () => void;
}

function Journaux({ entiteId, exerciceId, exerciceAnnee, entiteName, onBack }: JournauxProps): React.JSX.Element {
  void entiteName;
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
      const res = await clientFetch(`/api/ecritures/${entiteId}/${exerciceId}${qs}`);
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

export { Journaux, Echeancier, BalanceAgee };
export default Journaux;
