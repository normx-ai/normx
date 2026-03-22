import React, { useMemo } from 'react';
import { LuAlertTriangle, LuCheckCircle, LuXCircle, LuInfo } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { detectAnomalies, getSoldeAttendu, getLibelleSoldeAttendu } from '../etats/anomaliesComptes';
import type { AnomalieCompte } from '../etats/anomaliesComptes';

interface AlertesCompteProps {
  /** Lignes de la balance pour cette section */
  lignes: BalanceLigne[];
  /** Titre de la section */
  titre: string;
}

interface CompteAlerte {
  numero: string;
  libelle: string;
  sd: number;
  sc: number;
  sensAttendu: string;
  anomalies: AnomalieCompte[];
}

// Règles d'exclusion OHADA — comptes souvent mal imputés
interface ExclusionRule {
  prefix: string;
  condition: 'debiteur' | 'crediteur' | 'tout';
  message: string;
  compteCorrect: string;
}

const EXCLUSION_RULES: ExclusionRule[] = [
  // Classe 1
  { prefix: '109', condition: 'crediteur', message: 'Le compte 109 ne devrait pas avoir un solde créditeur — vérifier si c\'est un apport et non une dette', compteCorrect: '101' },

  // Classe 2
  { prefix: '20', condition: 'tout', message: 'Les charges immobilisées (20x) sont des actifs fictifs — vérifier si les frais d\'établissement sont amortis sur 2-5 ans max', compteCorrect: '' },

  // Classe 4
  { prefix: '408', condition: 'debiteur', message: 'Le compte 408 (Factures non parvenues) ne devrait pas être débiteur — c\'est une dette envers le fournisseur', compteCorrect: '409' },
  { prefix: '418', condition: 'crediteur', message: 'Le compte 418 (Produits à recevoir) ne devrait pas être créditeur — c\'est une créance sur le client', compteCorrect: '419' },
  { prefix: '471', condition: 'tout', message: 'Le compte 471 (Comptes d\'attente) doit être soldé à la clôture de l\'exercice — reclasser dans les comptes appropriés', compteCorrect: '' },
  { prefix: '476', condition: 'crediteur', message: 'Le compte 476 (Charges constatées d\'avance) ne devrait pas être créditeur — c\'est un actif', compteCorrect: '477' },
  { prefix: '477', condition: 'debiteur', message: 'Le compte 477 (Produits constatés d\'avance) ne devrait pas être débiteur — c\'est un passif', compteCorrect: '476' },

  // Classe 5
  { prefix: '57', condition: 'crediteur', message: 'Le compte caisse (57x) ne peut PAS avoir un solde créditeur — présomption d\'irrégularité comptable', compteCorrect: '' },
  { prefix: '585', condition: 'tout', message: 'Le compte 585 (Virements de fonds) doit être soldé à la clôture', compteCorrect: '' },
  { prefix: '588', condition: 'tout', message: 'Le compte 588 (Autres virements internes) doit être soldé à la clôture', compteCorrect: '' },

  // Classe 6 — charges dans le mauvais compte
  { prefix: '6413', condition: 'tout', message: 'Vérifier que les taxes sur salaires (6413) ne sont pas confondues avec les charges de personnel (66)', compteCorrect: '66' },

  // Classe 8
  { prefix: '89', condition: 'crediteur', message: 'Le compte 89 (Impôts sur le résultat) ne devrait pas être créditeur — vérifier si c\'est un dégrèvement (899)', compteCorrect: '899' },
];

function AlertesCompte({ lignes, titre }: AlertesCompteProps): React.ReactElement | null {
  const alertes = useMemo<CompteAlerte[]>(() => {
    const result: CompteAlerte[] = [];
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      if (!num || num.length <= 2) continue;
      const anomalies = detectAnomalies(l);
      if (anomalies.length > 0) {
        const sd = parseFloat(String(l.solde_debiteur)) || 0;
        const sc = parseFloat(String(l.solde_crediteur)) || 0;
        const sa = getSoldeAttendu(num);
        result.push({
          numero: num,
          libelle: l.libelle_compte || '',
          sd, sc,
          sensAttendu: sa,
          anomalies,
        });
      }
    }
    return result;
  }, [lignes]);

  // Vérifier les règles d'exclusion
  const exclusions = useMemo(() => {
    const result: { numero: string; libelle: string; message: string; compteCorrect: string }[] = [];
    for (const l of lignes) {
      const num = (l.numero_compte || '').trim();
      if (!num) continue;
      const sd = parseFloat(String(l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur)) || 0;
      if (sd < 0.5 && sc < 0.5) continue;

      for (const rule of EXCLUSION_RULES) {
        if (!num.startsWith(rule.prefix)) continue;
        const match =
          rule.condition === 'tout' ||
          (rule.condition === 'debiteur' && sd > 0.5 && sc < 0.5) ||
          (rule.condition === 'crediteur' && sc > 0.5 && sd < 0.5);
        if (match) {
          result.push({
            numero: num,
            libelle: l.libelle_compte || '',
            message: rule.message,
            compteCorrect: rule.compteCorrect,
          });
        }
        break;
      }
    }
    return result;
  }, [lignes]);

  // Vérifier comptes d'attente et virements internes non soldés
  const comptesAttente = useMemo(() => {
    return lignes.filter(l => {
      const num = (l.numero_compte || '').trim();
      const sd = parseFloat(String(l.solde_debiteur)) || 0;
      const sc = parseFloat(String(l.solde_crediteur)) || 0;
      return (num.startsWith('471') || num.startsWith('585') || num.startsWith('588')) && (sd > 0.5 || sc > 0.5);
    });
  }, [lignes]);

  const totalProblemes = alertes.length + exclusions.length;
  if (totalProblemes === 0) {
    return (
      <div style={{ margin: '8px 0', padding: '8px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#166534' }}>
        <LuCheckCircle size={14} />
        <span>Aucune anomalie de sens détectée sur les comptes {titre.toLowerCase()}</span>
      </div>
    );
  }

  return (
    <div style={{ margin: '8px 0' }}>
      {/* Anomalies de sens */}
      {alertes.length > 0 && (
        <div style={{ marginBottom: 8, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13, color: '#991b1b', marginBottom: 8 }}>
            <LuXCircle size={14} />
            {alertes.length} compte{alertes.length > 1 ? 's' : ''} avec solde inversé
          </div>
          {alertes.map(a => (
            <div key={a.numero} style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 4, paddingLeft: 22 }}>
              <strong>{a.numero}</strong> {a.libelle} — {a.anomalies.map(x => x.message).join(' ; ')}
              <span style={{ color: '#9ca3af', marginLeft: 8 }}>(sens attendu : {getLibelleSoldeAttendu(a.sensAttendu as 'debiteur' | 'crediteur' | 'les_deux')})</span>
            </div>
          ))}
        </div>
      )}

      {/* Exclusions / mauvaises imputations */}
      {exclusions.length > 0 && (
        <div style={{ marginBottom: 8, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13, color: '#92400e', marginBottom: 8 }}>
            <LuAlertTriangle size={14} />
            {exclusions.length} point{exclusions.length > 1 ? 's' : ''} d'attention (exclusions OHADA)
          </div>
          {exclusions.map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: '#78350f', marginBottom: 4, paddingLeft: 22 }}>
              <strong>{e.numero}</strong> {e.libelle} — {e.message}
              {e.compteCorrect && <span style={{ color: '#6b7280' }}> → utiliser {e.compteCorrect}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AlertesCompte;
