// Types, constantes, styles et calculs groupes du Grand Livre.

import React from 'react';
import type { JournalType } from '../../types';

export interface MouvementAPI {
  numero_compte: string;
  libelle_compte: string;
  date_ecriture: string;
  numero_piece: string;
  journal: string;
  tiers_nom: string;
  libelle_ecriture: string;
  date_document: string;
  reference: string;
  lettrage: string;
  solde_anterieur: number;
  debit: number | string;
  credit: number | string;
}

export interface CompteData {
  libelle: string;
  mouvements: MouvementAPI[];
  totalDebit: number;
  totalCredit: number;
}

export interface TableRow {
  compte: string;
  date: string;
  numero: string;
  journal: string;
  tiers: string;
  libelle: string;
  dateDocument: string;
  reference: string;
  lettrage: string;
  soldeAnterieur: number;
  debit: number;
  credit: number;
  solde: number;
}

export const JOURNAUX_LIST: JournalType[] = [
  { code: 'OD', intitule: 'Opérations diverses' },
  { code: 'ACH', intitule: 'Achats' },
  { code: 'VTE', intitule: 'Ventes' },
  { code: 'BQ', intitule: 'Banque' },
  { code: 'CAI', intitule: 'Caisse' },
  { code: 'SUB', intitule: 'Subventions' },
  { code: 'DOT', intitule: 'Dotations' },
  { code: 'AMO', intitule: 'Amortissements' },
  { code: 'RAN', intitule: 'Report à nouveau' },
];

export const inputStyle: React.CSSProperties = { padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, minWidth: 120 };
export const genBtnStyle: React.CSSProperties = { padding: '9px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-end' };
export const exportBtnStyle: React.CSSProperties = { padding: '8px 16px', background: '#fff', color: '#D4A843', border: '1px solid #D4A843', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 };
export const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
export const thStyle: React.CSSProperties = { padding: '10px 10px', fontSize: 13, fontWeight: 600, background: '#e8edf5', color: '#333', textAlign: 'left', whiteSpace: 'nowrap' };
export const tdStyle: React.CSSProperties = { padding: '9px 10px', borderBottom: '1px solid #eee', fontSize: 14 };

export function fmtPdf(val: string | number): string {
  const n = parseFloat(String(val));
  if (!n) return '';
  return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function groupByCompte(mouvements: MouvementAPI[]): Record<string, CompteData> {
  const comptes: Record<string, CompteData> = {};
  for (const m of mouvements) {
    if (!comptes[m.numero_compte]) {
      comptes[m.numero_compte] = { libelle: m.libelle_compte, mouvements: [], totalDebit: 0, totalCredit: 0 };
    }
    const d = parseFloat(String(m.debit)) || 0;
    const c = parseFloat(String(m.credit)) || 0;
    comptes[m.numero_compte].mouvements.push(m);
    comptes[m.numero_compte].totalDebit += d;
    comptes[m.numero_compte].totalCredit += c;
  }
  return comptes;
}

export function buildTableRows(comptes: Record<string, CompteData>): TableRow[] {
  const rows: TableRow[] = [];
  for (const [num, cdata] of Object.entries(comptes)) {
    let soldeCumul = 0;
    for (const m of cdata.mouvements) {
      const d = parseFloat(String(m.debit)) || 0;
      const c = parseFloat(String(m.credit)) || 0;
      soldeCumul += d - c;
      rows.push({
        compte: num,
        date: m.date_ecriture,
        numero: m.numero_piece || '',
        journal: m.journal || '',
        tiers: m.tiers_nom || '',
        libelle: m.libelle_ecriture || '',
        dateDocument: m.date_document || '',
        reference: m.reference || '',
        lettrage: m.lettrage || '',
        soldeAnterieur: m.solde_anterieur || 0,
        debit: d,
        credit: c,
        solde: soldeCumul,
      });
    }
  }
  return rows;
}
