// Types + constantes + styles partages entre Journaux / Echeancier / BalanceAgee.

import React from 'react';

export const MOIS: string[] = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
export const JOURNAUX_LIST: string[] = ['OD', 'ACH', 'VTE', 'BQ', 'CAI', 'SUB', 'DOT', 'AMO', 'RAN'];

export const inputStyle: React.CSSProperties = { padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, minWidth: 120 };
export const genBtnStyle: React.CSSProperties = { padding: '9px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-end' };
export const exportBtnStyle: React.CSSProperties = { padding: '8px 16px', background: '#fff', color: '#D4A843', border: '1px solid #D4A843', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 };
export const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
export const thStyle: React.CSSProperties = { padding: '10px 10px', fontSize: 13, fontWeight: 600, background: '#e8edf5', color: '#333', textAlign: 'left', whiteSpace: 'nowrap' };
export const tdStyle: React.CSSProperties = { padding: '9px 10px', borderBottom: '1px solid #eee', fontSize: 14 };

export interface JournalLine {
  journal: string;
  date: string;
  numero: string;
  compte: string;
  tiers: string;
  libelle: string;
  debit: number;
  credit: number;
}

export interface EcritureAPI {
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

export interface EcheancierRow {
  date_echeance: string;
  tiers_nom: string;
  numero_piece: string;
  montant: number;
  montant_paye: number;
  montant_du: number;
  mode_paiement: string;
}

export interface BalanceAgeeRow {
  tiers_id: number;
  tiers_nom: string;
  code_tiers: string;
  tiers_type: string;
  date_ecriture: string;
  debit: number | string;
  credit: number | string;
}

export interface TiersAging {
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
