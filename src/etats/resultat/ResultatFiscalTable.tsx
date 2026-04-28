// Table imprimable du Résultat Fiscal — Formulaire IS-2 (DGI Congo).
// Sections I → VII conformes au formulaire officiel + VIII liquidation IS / IX résultat net.

import React from 'react';
import { formatMontant, LigneARD, LigneDeficit, LigneReintegration, ResultatFiscalCalc } from './resultatFiscalData';

interface Props {
  calc: ResultatFiscalCalc;
  reintegrations: LigneReintegration[];
  deductions: LigneReintegration[];
  deficits: LigneDeficit[];
  ard: LigneARD;
  regimeFiscal: 'is' | 'iba';
}

const sectionStyle: React.CSSProperties = { background: '#1e3a5f', color: '#fff', fontWeight: 700, padding: '6px 8px', fontSize: '10px' };
const labelStyle: React.CSSProperties = { padding: '4px 8px', fontSize: '9px', borderBottom: '1px solid #ddd' };
const montantStyle: React.CSSProperties = { textAlign: 'right' as const, padding: '4px 8px', fontSize: '9px', borderBottom: '1px solid #ddd', fontFamily: 'monospace' };
const totalStyle: React.CSSProperties = { ...montantStyle, fontWeight: 700, background: '#f0f4f8', borderTop: '2px solid #1e3a5f' };

export function ResultatFiscalTable({ calc, reintegrations, deductions, deficits, ard, regimeFiscal }: Props): React.JSX.Element {
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
        {/* I. RESULTAT NET COMPTABLE */}
        <tr><td colSpan={3} style={sectionStyle}>I. RÉSULTAT NET COMPTABLE DE L&apos;EXERCICE</td></tr>
        <tr><td style={labelStyle}>Produits d&apos;exploitation</td><td style={montantStyle}>Cl. 7</td><td style={montantStyle}>{formatMontant(c.produitsExploitation)}</td></tr>
        <tr><td style={labelStyle}>Produits financiers</td><td style={montantStyle}>Cl. 77</td><td style={montantStyle}>{formatMontant(c.produitsFinanciers)}</td></tr>
        <tr><td style={labelStyle}>Produits HAO</td><td style={montantStyle}>Cl. 82,84,86,88</td><td style={montantStyle}>{formatMontant(c.produitsHAO)}</td></tr>
        <tr><td style={{ ...labelStyle, fontWeight: 700 }}>TOTAL PRODUITS (A)</td><td style={montantStyle}></td><td style={totalStyle}>{formatMontant(c.totalProduits)}</td></tr>
        <tr><td style={labelStyle}>Charges d&apos;exploitation</td><td style={montantStyle}>Cl. 6</td><td style={montantStyle}>{formatMontant(c.chargesExploitation)}</td></tr>
        <tr><td style={labelStyle}>Charges financières</td><td style={montantStyle}>Cl. 67</td><td style={montantStyle}>{formatMontant(c.chargesFinancieres)}</td></tr>
        <tr><td style={labelStyle}>Charges HAO</td><td style={montantStyle}>Cl. 81,83,85,87</td><td style={montantStyle}>{formatMontant(c.chargesHAO)}</td></tr>
        <tr><td style={{ ...labelStyle, fontWeight: 700 }}>TOTAL CHARGES (B)</td><td style={montantStyle}></td><td style={totalStyle}>{formatMontant(c.totalCharges)}</td></tr>
        <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '10px' }}>RÉSULTAT COMPTABLE (compte 85)</td><td style={montantStyle}>Art. 6</td><td style={{ ...totalStyle, fontSize: '10px', color: c.resultatComptable >= 0 ? '#16a34a' : '#dc2626' }}>{formatMontant(c.resultatComptable)}</td></tr>

        {/* II. REINTEGRATIONS */}
        <tr><td colSpan={3} style={sectionStyle}>II. RÉINTÉGRATIONS DES CHARGES NON DÉDUCTIBLES</td></tr>
        {reintegrations.length === 0 && (
          <tr><td colSpan={3} style={{ ...labelStyle, fontStyle: 'italic', color: '#999' }}>Aucune réintégration</td></tr>
        )}
        {reintegrations.map((r, i) => (
          <tr key={r.id}>
            <td style={labelStyle}>{i + 1}. {r.libelle}</td>
            <td style={montantStyle}>{r.article}</td>
            <td style={montantStyle}>{formatMontant(r.montant)}</td>
          </tr>
        ))}
        <tr><td style={{ ...labelStyle, fontWeight: 700 }}>TOTAL DES RÉINTÉGRATIONS (C)</td><td style={montantStyle}></td><td style={{ ...totalStyle, color: '#dc2626' }}>{formatMontant(c.totalReintegrations)}</td></tr>

        {/* III. DEDUCTIONS */}
        <tr><td colSpan={3} style={sectionStyle}>III. DÉDUCTIONS DE CHARGES OU PRODUITS FISCALEMENT DÉDUCTIBLES</td></tr>
        {deductions.length === 0 && (
          <tr><td colSpan={3} style={{ ...labelStyle, fontStyle: 'italic', color: '#999' }}>Aucune déduction</td></tr>
        )}
        {deductions.map((d, i) => (
          <tr key={d.id}>
            <td style={labelStyle}>{i + 1}. {d.libelle}</td>
            <td style={montantStyle}>{d.article}</td>
            <td style={montantStyle}>{formatMontant(d.montant)}</td>
          </tr>
        ))}
        <tr><td style={{ ...labelStyle, fontWeight: 700 }}>TOTAL DES DÉDUCTIONS (D)</td><td style={montantStyle}></td><td style={{ ...totalStyle, color: '#16a34a' }}>{formatMontant(c.totalDeductions)}</td></tr>

        {/* IV. RESULTAT FISCAL */}
        <tr><td colSpan={3} style={sectionStyle}>IV. RÉSULTAT NET FISCAL DE L&apos;EXERCICE</td></tr>
        <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '10px' }}>RÉSULTAT FISCAL = (A − B) + C − D</td><td style={montantStyle}>{regimeFiscal === 'is' ? 'Art. 6-27' : 'Art. 94'}</td><td style={{ ...totalStyle, fontSize: '11px' }}>{formatMontant(c.resultatFiscal)}</td></tr>

        {/* V. REPORTS DEFICITAIRES */}
        <tr><td colSpan={3} style={sectionStyle}>V. REPORTS DÉFICITAIRES</td></tr>
        {deficits.map(d => (
          <tr key={d.id}>
            <td style={labelStyle}>Déficit {d.annee_origine} — reportable {formatMontant(d.montant_reportable)} FCFA</td>
            <td style={montantStyle}>Art. 15-bis</td>
            <td style={montantStyle}>{formatMontant(d.montant_impute)}</td>
          </tr>
        ))}
        <tr><td style={{ ...labelStyle, fontWeight: 700 }}>TOTAL DÉFICITS IMPUTÉS</td><td style={montantStyle}></td><td style={{ ...totalStyle, color: '#7c3aed' }}>{formatMontant(c.totalDeficitsImputes)}</td></tr>

        {/* VI. RESULTAT FISCAL DEFINITIF */}
        <tr><td colSpan={3} style={sectionStyle}>VI. RÉSULTAT NET FISCAL DÉFINITIF</td></tr>
        <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '10px' }}>RÉSULTAT FISCAL DÉFINITIF = IV − V (plancher 0)</td><td style={montantStyle}></td><td style={{ ...totalStyle, fontSize: '11px', color: c.resultatFiscalDefinitif >= 0 ? '#16a34a' : '#dc2626' }}>{formatMontant(c.resultatFiscalDefinitif)}</td></tr>

        {/* VII. ARD */}
        <tr><td colSpan={3} style={sectionStyle}>VII. AMORTISSEMENTS RÉPUTÉS DIFFÉRÉS (ARD)</td></tr>
        <tr><td style={labelStyle}>Solde des ARD en début d&apos;exercice</td><td style={montantStyle}></td><td style={montantStyle}>{formatMontant(ard.solde_debut)}</td></tr>
        <tr><td style={labelStyle}>ARD de l&apos;exercice</td><td style={montantStyle}></td><td style={montantStyle}>{formatMontant(ard.ard_exercice)}</td></tr>
        <tr><td style={labelStyle}>ARD utilisés dans l&apos;exercice</td><td style={montantStyle}></td><td style={montantStyle}>{formatMontant(ard.ard_utilises)}</td></tr>
        <tr><td style={{ ...labelStyle, fontWeight: 700 }}>Solde des ARD en fin d&apos;exercice</td><td style={montantStyle}></td><td style={{ ...totalStyle, color: '#0891b2' }}>{formatMontant(c.ardSoldeFin)}</td></tr>

        {/* VIII. LIQUIDATION IS/IBA */}
        <tr><td colSpan={3} style={sectionStyle}>VIII. LIQUIDATION DE L&apos;IMPÔT — {regimeFiscal === 'is' ? 'IS' : 'IBA'}</td></tr>
        <tr><td style={labelStyle}>{regimeFiscal === 'is' ? 'IS' : 'IBA'} brut = Résultat fiscal définitif × {(c.taux * 100).toFixed(0)}%</td><td style={montantStyle}>{regimeFiscal === 'is' ? 'Art. 10' : 'Art. 95'}</td><td style={montantStyle}>{formatMontant(c.impotBrut)}</td></tr>
        <tr><td style={labelStyle}>Minimum de perception = Total produits × {(c.tauxMin * 100).toFixed(1)}%</td><td style={montantStyle}>{regimeFiscal === 'is' ? 'Art. 86-C' : 'Art. 95'}</td><td style={montantStyle}>{formatMontant(c.minimumPerception)}</td></tr>
        <tr><td style={{ ...labelStyle, fontStyle: 'italic', color: c.minimumApplique ? '#f59e0b' : '#6b7280' }}>{c.minimumApplique ? 'Minimum de perception appliqué (supérieur à l\'impôt calculé)' : 'Impôt calculé retenu (supérieur au minimum)'}</td><td></td><td></td></tr>
        <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '11px' }}>{regimeFiscal === 'is' ? 'IS' : 'IBA'} RETENU (max des deux)</td><td style={montantStyle}></td><td style={{ ...totalStyle, fontSize: '11px', background: '#fef3c7' }}>{formatMontant(c.impotRetenu)}</td></tr>

        {/* IX. RESULTAT NET APRES IMPOT */}
        <tr><td colSpan={3} style={sectionStyle}>IX. RÉSULTAT NET APRÈS IMPÔT</td></tr>
        <tr><td style={{ ...labelStyle, fontWeight: 700, fontSize: '11px' }}>BÉNÉFICE NET = Résultat comptable − Impôt retenu</td><td style={montantStyle}></td><td style={{ ...totalStyle, fontSize: '11px', color: c.beneficeNet >= 0 ? '#16a34a' : '#dc2626' }}>{formatMontant(c.beneficeNet)}</td></tr>
      </tbody>
    </table>
  );
}
