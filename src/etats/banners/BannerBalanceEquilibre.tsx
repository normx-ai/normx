import React from 'react';
import { LuTriangleAlert, LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { BalanceLigne } from '../../types';
import { formatMontant } from '../ImportBalance.parsers';

interface BalanceLigneWithMeta extends BalanceLigne {
  id: number;
}

export interface EquilibreEcarts {
  totalSID: number;
  totalSIC: number;
  totalDebit: number;
  totalCredit: number;
  totalSD: number;
  totalSC: number;
  ecartSI: number;
  ecartMvt: number;
  ecartSolde: number;
  hasSIError: boolean;
  hasMvtError: boolean;
  hasSoldeError: boolean;
  hasAnyError: boolean;
}

// Hook : calcule les écarts sur les 3 colonnes (SI, mouvements, solde final).
// Une balance peut avoir le solde final équilibré alors que SI et mouvements
// sont désequilibrés par compensation, ce qui reste un défaut de données.
export function useEquilibreEcarts(currentLignes: BalanceLigneWithMeta[]): EquilibreEcarts | null {
  return React.useMemo(() => {
    if (currentLignes.length === 0) return null;
    const totalSID = currentLignes.reduce((s, l) => s + (parseFloat(String(l.si_debit)) || 0), 0);
    const totalSIC = currentLignes.reduce((s, l) => s + (parseFloat(String(l.si_credit)) || 0), 0);
    const totalDebit = currentLignes.reduce((s, l) => s + (parseFloat(String(l.debit)) || 0), 0);
    const totalCredit = currentLignes.reduce((s, l) => s + (parseFloat(String(l.credit)) || 0), 0);
    const totalSD = currentLignes.reduce((s, l) => s + (parseFloat(String(l.solde_debiteur)) || 0), 0);
    const totalSC = currentLignes.reduce((s, l) => s + (parseFloat(String(l.solde_crediteur)) || 0), 0);
    const ecartSI = totalSID - totalSIC;
    const ecartMvt = totalDebit - totalCredit;
    const ecartSolde = totalSD - totalSC;
    const EPS = 0.5;
    return {
      totalSID, totalSIC, totalDebit, totalCredit, totalSD, totalSC,
      ecartSI, ecartMvt, ecartSolde,
      hasSIError: Math.abs(ecartSI) > EPS,
      hasMvtError: Math.abs(ecartMvt) > EPS,
      hasSoldeError: Math.abs(ecartSolde) > EPS,
      hasAnyError: Math.abs(ecartSI) > EPS || Math.abs(ecartMvt) > EPS || Math.abs(ecartSolde) > EPS,
    };
  }, [currentLignes]);
}

interface Props {
  ecarts: EquilibreEcarts;
  open: boolean;
  onToggle: () => void;
}

export default function BannerBalanceEquilibre({ ecarts, open, onToggle }: Props): React.JSX.Element {
  return (
    <div className="ib-analyse-banner has-warnings" style={{ borderColor: '#dc2626', background: '#fef2f2' }}>
      <div className="ib-analyse-header" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <span className="ib-anomaly-count" style={{ color: '#dc2626' }}>
          <LuTriangleAlert size={16} /> Balance déséquilibrée —
          {ecarts.hasSIError && ` SI (écart ${formatMontant(ecarts.ecartSI)})`}
          {ecarts.hasMvtError && `${ecarts.hasSIError ? ',' : ''} mouvements (écart ${formatMontant(ecarts.ecartMvt)})`}
          {ecarts.hasSoldeError && `${ecarts.hasSIError || ecarts.hasMvtError ? ',' : ''} solde final (écart ${formatMontant(ecarts.ecartSolde)})`}
        </span>
        <span style={{ fontSize: 12 }}>{open ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />} {open ? 'Masquer' : 'Détail'}</span>
      </div>
      {open && (
        <div className="ib-analyse-detail">
          <p style={{ fontSize: 12, color: '#991b1b', margin: '4px 0 8px', lineHeight: 1.4 }}>
            Les totaux débit et crédit doivent être égaux sur chaque section (situation initiale, mouvements, solde final). Un écart indique soit une erreur dans le fichier source, soit un décalage de colonnes lors de l'import. Une compensation entre SI et mouvements peut masquer l'erreur dans le solde final — il faut corriger la ligne fautive.
          </p>
          <table className="ib-analyse-table">
            <thead><tr><th>Section</th><th className="num">Total débit</th><th className="num">Total crédit</th><th className="num">Écart (D − C)</th><th>Statut</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Situation initiale</strong></td>
                <td className="num">{formatMontant(ecarts.totalSID)}</td>
                <td className="num">{formatMontant(ecarts.totalSIC)}</td>
                <td className="num" style={{ color: ecarts.hasSIError ? '#dc2626' : '#059669', fontWeight: 700 }}>{formatMontant(ecarts.ecartSI)}</td>
                <td style={{ textAlign: 'center', color: ecarts.hasSIError ? '#dc2626' : '#059669', fontWeight: 700 }}>{ecarts.hasSIError ? '✗' : '✓'}</td>
              </tr>
              <tr>
                <td><strong>Mouvements</strong></td>
                <td className="num">{formatMontant(ecarts.totalDebit)}</td>
                <td className="num">{formatMontant(ecarts.totalCredit)}</td>
                <td className="num" style={{ color: ecarts.hasMvtError ? '#dc2626' : '#059669', fontWeight: 700 }}>{formatMontant(ecarts.ecartMvt)}</td>
                <td style={{ textAlign: 'center', color: ecarts.hasMvtError ? '#dc2626' : '#059669', fontWeight: 700 }}>{ecarts.hasMvtError ? '✗' : '✓'}</td>
              </tr>
              <tr>
                <td><strong>Solde final</strong></td>
                <td className="num">{formatMontant(ecarts.totalSD)}</td>
                <td className="num">{formatMontant(ecarts.totalSC)}</td>
                <td className="num" style={{ color: ecarts.hasSoldeError ? '#dc2626' : '#059669', fontWeight: 700 }}>{formatMontant(ecarts.ecartSolde)}</td>
                <td style={{ textAlign: 'center', color: ecarts.hasSoldeError ? '#dc2626' : '#059669', fontWeight: 700 }}>{ecarts.hasSoldeError ? '✗' : '✓'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
