// Table imprimable du Resultat Fiscal (I. Comptable / II. Reintegrations / III. Deductions / IV. Fiscal / V. Liquidation / VI. Net).

import React from 'react';
import { formatMontant, LigneReintegration, ResultatFiscalCalc } from './resultatFiscalData';

interface Props {
  calc: ResultatFiscalCalc;
  reintegrations: LigneReintegration[];
  deductions: LigneReintegration[];
  regimeFiscal: 'is' | 'iba';
}

const sectionStyle: React.CSSProperties = { background: '#1e3a5f', color: '#fff', fontWeight: 700, padding: '6px 8px', fontSize: '10px' };
const labelStyle: React.CSSProperties = { padding: '4px 8px', fontSize: '9px', borderBottom: '1px solid #ddd' };
const montantStyle: React.CSSProperties = { textAlign: 'right' as const, padding: '4px 8px', fontSize: '9px', borderBottom: '1px solid #ddd', fontFamily: 'monospace' };
const totalStyle: React.CSSProperties = { ...montantStyle, fontWeight: 700, background: '#f0f4f8', borderTop: '2px solid #1e3a5f' };

export function ResultatFiscalTable({ calc, reintegrations, deductions, regimeFiscal }: Props): React.JSX.Element {
  const c = calc;
  return (
    <table className="bilan-table" style={{ fontSize: '9px' }}>
      <thead>
        <tr>
          <th style={{ width: '55%' }}>LIBELLE</th>
          <th style={{ width: '15%', textAlign: 'right' }}>REF. CGI</th>
          <th style={{ width: '30%', textAlign: 'right' }}>MONTANT (FCFA)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td colSpan={3} style={sectionStyle}>I. RESULTAT COMPTABLE</td></tr>
        <tr><td style={labelStyle}>Produits d'exploitation</td><td style={montantStyle}>Cl. 7</td><td style={montantStyle}>{formatMontant(c.produitsExploitation)}</td></tr>
        <tr><td style={labelStyle}>Produits financiers</td><td style={montantStyle}>Cl. 77</td><td style={montantStyle}>{formatMontant(c.produitsFinanciers)}</td></tr>
        <tr><td style={labelStyle}>Produits HAO</td><td style={montantStyle}>Cl. 82,84,86,88</td><td style={montantStyle}>{formatMontant(c.produitsHAO)}</td></tr>
        <tr><td style={{ ...labelStyle, fontWeight: 700 }}>TOTAL PRODUITS (A)</td><td style={montantStyle}></td><td style={totalStyle}>{formatMontant(c.totalProduits)}</td></tr>

        <tr><td style={labelStyle}>Charges d'exploitation</td><td style={montantStyle}>Cl. 6</td><td style={montantStyle}>{formatMontant(c.chargesExploitation)}</td></tr>
        <tr><td style={labelStyle}>Charges financieres</td><td style={montantStyle}>Cl. 67</td><td style={montantStyle}>{formatMontant(c.chargesFinancieres)}</td></tr>
        <tr><td style={labelStyle}>Charges HAO</td><td style={montantStyle}>Cl. 81,83,85,87</td><td style={montantStyle}>{formatMontant(c.chargesHAO)}</td></tr>
        <tr><td style={{ ...labelStyle, fontWeight: 700 }}>TOTAL CHARGES (B)</td><td style={montantStyle}></td><td style={totalStyle}>{formatMontant(c.totalCharges)}</td></tr>

        <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '10px' }}>RESULTAT COMPTABLE (A - B)</td><td style={montantStyle}>Art. 6</td><td style={{ ...totalStyle, fontSize: '10px', color: c.resultatComptable >= 0 ? '#16a34a' : '#dc2626' }}>{formatMontant(c.resultatComptable)}</td></tr>

        <tr><td colSpan={3} style={sectionStyle}>II. REINTEGRATIONS FISCALES (charges non deductibles)</td></tr>
        {reintegrations.length === 0 && (
          <tr><td colSpan={3} style={{ ...labelStyle, fontStyle: 'italic', color: '#999' }}>Aucune reintegration</td></tr>
        )}
        {reintegrations.map(r => (
          <tr key={r.id}>
            <td style={labelStyle}>{r.libelle}</td>
            <td style={montantStyle}>{r.article}</td>
            <td style={montantStyle}>{formatMontant(r.montant)}</td>
          </tr>
        ))}
        <tr><td style={{ ...labelStyle, fontWeight: 700 }}>TOTAL REINTEGRATIONS (C)</td><td style={montantStyle}></td><td style={{ ...totalStyle, color: '#dc2626' }}>{formatMontant(c.totalReintegrations)}</td></tr>

        <tr><td colSpan={3} style={sectionStyle}>III. DEDUCTIONS FISCALES (produits non imposables)</td></tr>
        {deductions.length === 0 && (
          <tr><td colSpan={3} style={{ ...labelStyle, fontStyle: 'italic', color: '#999' }}>Aucune deduction</td></tr>
        )}
        {deductions.map(d => (
          <tr key={d.id}>
            <td style={labelStyle}>{d.libelle}</td>
            <td style={montantStyle}>{d.article}</td>
            <td style={montantStyle}>{formatMontant(d.montant)}</td>
          </tr>
        ))}
        <tr><td style={{ ...labelStyle, fontWeight: 700 }}>TOTAL DEDUCTIONS (D)</td><td style={montantStyle}></td><td style={{ ...totalStyle, color: '#16a34a' }}>{formatMontant(c.totalDeductions)}</td></tr>

        <tr><td colSpan={3} style={sectionStyle}>IV. RESULTAT FISCAL</td></tr>
        <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '10px' }}>RESULTAT FISCAL = (A - B) + C - D</td><td style={montantStyle}>{regimeFiscal === 'is' ? 'Art. 6-27' : 'Art. 94'}</td><td style={{ ...totalStyle, fontSize: '11px' }}>{formatMontant(c.resultatFiscal)}</td></tr>

        <tr><td colSpan={3} style={sectionStyle}>V. LIQUIDATION DE L'IMPOT — {regimeFiscal === 'is' ? 'IS' : 'IBA'}</td></tr>
        <tr><td style={labelStyle}>{regimeFiscal === 'is' ? 'IS' : 'IBA'} brut = Resultat fiscal x {(c.taux * 100).toFixed(0)}%</td><td style={montantStyle}>{regimeFiscal === 'is' ? 'Art. 10' : 'Art. 95'}</td><td style={montantStyle}>{formatMontant(c.impotBrut)}</td></tr>
        <tr><td style={labelStyle}>Minimum de perception = Total produits x {(c.tauxMin * 100).toFixed(1)}%</td><td style={montantStyle}>{regimeFiscal === 'is' ? 'Art. 86-C' : 'Art. 95'}</td><td style={montantStyle}>{formatMontant(c.minimumPerception)}</td></tr>
        <tr><td style={{ ...labelStyle, fontStyle: 'italic', color: c.minimumApplique ? '#f59e0b' : '#6b7280' }}>{c.minimumApplique ? 'Minimum de perception applique (superieur a l\'impot calcule)' : 'Impot calcule retenu (superieur au minimum)'}</td><td></td><td></td></tr>
        <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '11px' }}>{regimeFiscal === 'is' ? 'IS' : 'IBA'} RETENU (max des deux)</td><td style={montantStyle}></td><td style={{ ...totalStyle, fontSize: '11px', background: '#fef3c7' }}>{formatMontant(c.impotRetenu)}</td></tr>

        <tr><td colSpan={3} style={sectionStyle}>VI. RESULTAT NET APRES IMPOT</td></tr>
        <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '11px' }}>BENEFICE NET = Resultat comptable - Impot retenu</td><td style={montantStyle}></td><td style={{ ...totalStyle, fontSize: '11px', color: c.beneficeNet >= 0 ? '#16a34a' : '#dc2626' }}>{formatMontant(c.beneficeNet)}</td></tr>
      </tbody>
    </table>
  );
}
