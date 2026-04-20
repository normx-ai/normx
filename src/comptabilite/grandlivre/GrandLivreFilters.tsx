// Barre de filtres du Grand Livre : exercice, mois, dates, comptes, journal, toggles + bouton Generer.

import React from 'react';
import type { CompteComptable } from '../../types';
import { MOIS } from '../../utils/formatters';
import { JOURNAUX_LIST, genBtnStyle, inputStyle } from './grandLivreData';

interface FilterFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

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

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
}

function Toggle({ label, value, onChange }: ToggleProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
          border: '1px solid #ddd', borderRadius: 20, background: value ? '#059669' : '#fff',
          color: value ? '#fff' : '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: 'fit-content',
        }}
      >{value ? 'ON' : 'OFF'}</button>
    </div>
  );
}

interface Props {
  exerciceAnnee: number;
  mois: number | string;
  dateDu: string;
  dateAu: string;
  compteDe: string;
  compteA: string;
  journalFilter: string;
  ecrituresLettrees: boolean;
  reportNouveau: boolean;
  comptesOptions: CompteComptable[];
  updateDatesFromMois: (m: number | string) => void;
  setDateDu: (v: string) => void;
  setDateAu: (v: string) => void;
  setCompteDe: (v: string) => void;
  setCompteA: (v: string) => void;
  setJournalFilter: (v: string) => void;
  setEcrituresLettrees: (v: boolean) => void;
  setReportNouveau: (v: boolean) => void;
  onGenerate: () => void;
}

export function GrandLivreFilters(p: Props): React.JSX.Element {
  return (
    <>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
        <FilterField label="Exercice" required>
          <input type="text" value={p.exerciceAnnee} readOnly style={{ ...inputStyle, background: '#f5f5f5' }} />
        </FilterField>
        <FilterField label="Mois">
          <select value={p.mois} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => p.updateDatesFromMois(parseInt(e.target.value))} style={inputStyle}>
            <option value="">Tous</option>
            {MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </FilterField>
        <FilterField label="Date du" required>
          <input type="date" value={p.dateDu} onChange={(e: React.ChangeEvent<HTMLInputElement>) => p.setDateDu(e.target.value)} style={inputStyle} />
        </FilterField>
        <FilterField label="au" required>
          <input type="date" value={p.dateAu} onChange={(e: React.ChangeEvent<HTMLInputElement>) => p.setDateAu(e.target.value)} style={inputStyle} />
        </FilterField>
        <FilterField label="Compte de">
          <select value={p.compteDe} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => p.setCompteDe(e.target.value)} style={inputStyle}>
            <option value="">Sélectionner...</option>
            {p.comptesOptions.map(c => <option key={c.numero} value={c.numero}>{c.numero} - {c.libelle}</option>)}
          </select>
        </FilterField>
        <FilterField label="à">
          <select value={p.compteA} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => p.setCompteA(e.target.value)} style={inputStyle}>
            <option value="">Sélectionner...</option>
            {p.comptesOptions.map(c => <option key={c.numero} value={c.numero}>{c.numero} - {c.libelle}</option>)}
          </select>
        </FilterField>
        <FilterField label="Journal">
          <select value={p.journalFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => p.setJournalFilter(e.target.value)} style={inputStyle}>
            <option value="">Sélectionner...</option>
            {JOURNAUX_LIST.map(j => <option key={j.code} value={j.code}>{j.code} - {j.intitule}</option>)}
          </select>
        </FilterField>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 20 }}>
        <Toggle label="Écritures lettrées incluses" value={p.ecrituresLettrees} onChange={p.setEcrituresLettrees} />
        <Toggle label="Inclure les lignes d'écritures de report à nouveau temporaire." value={p.reportNouveau} onChange={p.setReportNouveau} />
        <button onClick={p.onGenerate} style={genBtnStyle}>Générer</button>
      </div>
    </>
  );
}
