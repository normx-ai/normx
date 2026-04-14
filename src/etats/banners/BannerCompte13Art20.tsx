import React from 'react';
import { LuTriangleAlert, LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { BalanceLigne } from '../../types';
import { formatMontant } from '../ImportBalance.parsers';

interface BalanceLigneWithMeta extends BalanceLigne {
  id: number;
}

export interface Compte13Anomaly {
  net13: number;
  lignes13: BalanceLigneWithMeta[];
  ligneReportCreditor: BalanceLigneWithMeta | null;
  ligneReportDebitor: BalanceLigneWithMeta | null;
  isProfit: boolean;
}

// Hook : detecte un residuel dans le compte 13 alors que les classes 6-8
// sont encore mouvementees. Ce cas viole l'Article 20 AUDCIF qui impose que
// toute correction d'erreur d'exercice anterieur soit ajustee contre le
// compte 12 Report a nouveau, et non laissee dans le compte 13 qui doit
// contenir exclusivement le resultat de l'exercice courant.
export function useCompte13Anomaly(currentLignes: BalanceLigneWithMeta[]): Compte13Anomaly | null {
  return React.useMemo(() => {
    if (currentLignes.length === 0) return null;
    let net13 = 0;
    const lignes13: BalanceLigneWithMeta[] = [];
    let hasClass6to8Activity = false;
    let ligneReportCreditor: BalanceLigneWithMeta | null = null;
    let ligneReportDebitor: BalanceLigneWithMeta | null = null;
    for (const l of currentLignes) {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur)) || 0;
      if (num.startsWith('13')) {
        net13 += sc - sd;
        if (Math.abs(sd) > 0.5 || Math.abs(sc) > 0.5) lignes13.push(l);
      } else if (num.startsWith('6') || num.startsWith('7') || num.startsWith('8')) {
        if (sd > 0.5 || sc > 0.5) hasClass6to8Activity = true;
      } else if (num.startsWith('121') && !ligneReportCreditor) {
        ligneReportCreditor = l;
      } else if (num.startsWith('129') && !ligneReportDebitor) {
        ligneReportDebitor = l;
      }
    }
    if (Math.abs(net13) < 0.5) return null;
    if (!hasClass6to8Activity) return null;
    return {
      net13,
      lignes13,
      ligneReportCreditor,
      ligneReportDebitor,
      isProfit: net13 > 0,
    };
  }, [currentLignes]);
}

interface Props {
  anomaly: Compte13Anomaly;
  open: boolean;
  onToggle: () => void;
  onApply: () => void | Promise<void>;
}

export default function BannerCompte13Art20({ anomaly, open, onToggle, onApply }: Props): React.JSX.Element {
  const cibleDispo = anomaly.isProfit ? anomaly.ligneReportCreditor : anomaly.ligneReportDebitor;
  return (
    <div className="ib-analyse-banner has-warnings" style={{ borderColor: '#f59e0b', background: '#fffbeb' }}>
      <div className="ib-analyse-header" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <span className="ib-anomaly-count" style={{ color: '#b45309' }}>
          <LuTriangleAlert size={16} /> Compte 13 avec résiduel de {formatMontant(Math.abs(anomaly.net13))} FCFA — non conforme à l'Article 20 AUDCIF
        </span>
        <span style={{ fontSize: 12 }}>{open ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />} {open ? 'Masquer' : 'Détail'}</span>
      </div>
      {open && (
        <div className="ib-analyse-detail">
          <p style={{ fontSize: 12, color: '#78350f', margin: '4px 0 10px', lineHeight: 1.5 }}>
            Le compte 13 (Résultat net de l'exercice) présente un solde non nul alors que les classes 6-8 sont encore mouvementées, ce qui indique un résiduel d'exercices antérieurs. L'<strong>Article 20 AUDCIF</strong> dispose que « la correction d'une erreur significative commise au cours d'un exercice antérieur doit être opérée par ajustement du compte report à nouveau ». Le solde résiduel doit donc être transféré vers le compte {anomaly.isProfit ? '121 Report à nouveau créditeur' : '129 Report à nouveau débiteur'}.
          </p>
          <table className="ib-analyse-table">
            <thead><tr><th>Compte</th><th>Libellé</th><th className="num">SD</th><th className="num">SC</th><th className="num">Net</th></tr></thead>
            <tbody>
              {anomaly.lignes13.map(l => {
                const sd = parseFloat(String(l.solde_debiteur)) || 0;
                const sc = parseFloat(String(l.solde_crediteur)) || 0;
                return (
                  <tr key={l.id}>
                    <td className="compte-anomalie">{l.numero_compte}</td>
                    <td>{l.libelle_compte}</td>
                    <td className="num">{formatMontant(sd)}</td>
                    <td className="num">{formatMontant(sc)}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{formatMontant(sc - sd)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, padding: '8px 12px', background: '#fef3c7', borderRadius: 4 }}>
            <div style={{ fontSize: 12, color: '#78350f', flex: 1 }}>
              <strong>Action proposée :</strong> ajustement non destructif via la colonne révision. Neutraliser le compte 13 (net → 0) et reporter {formatMontant(Math.abs(anomaly.net13))} FCFA vers le compte {anomaly.isProfit ? '121' : '129'}. Les valeurs originales importées sont conservées.
            </div>
            <button
              className="ib-correct-btn"
              style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
              onClick={onApply}
              disabled={!cibleDispo}
            >
              Appliquer l'ajustement Art. 20
            </button>
          </div>
          {!cibleDispo && (
            <p style={{ fontSize: 11, color: '#b91c1c', marginTop: 6 }}>
              ⚠ Compte {anomaly.isProfit ? '121' : '129'} introuvable dans la balance. L'ajustement ne peut pas être appliqué automatiquement — corrigez la donnée source.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
