/**
 * Alerte "CA > seuil SMT" : si le type d'activite est SMT et que le CA
 * (comptes 70x/71x de la balance) depasse 30M FCFA, on propose la bascule
 * vers SYSCOHADA. Encapsule le hook + la banniere UI.
 */

import React, { useState, useEffect } from 'react';
import { LuTriangleAlert, LuArrowUpRight } from 'react-icons/lu';
import { clientFetch } from '../lib/api';
import type { TypeActivite, Offre } from '../types';

interface SmtAlertState { show: boolean; ca: number; seuil: number; }

export function useSmtAlert(
  typeActivite: TypeActivite,
  entiteId: number,
  exerciceId: number | null,
  offre: Offre,
): SmtAlertState | null {
  const [alert, setAlert] = useState<SmtAlertState | null>(null);

  useEffect(() => {
    if (typeActivite !== 'smt' || !entiteId || !exerciceId) { setAlert(null); return; }

    const fetchCA = async () => {
      try {
        let lignes: { numero_compte: string; solde_crediteur?: number; solde_crediteur_revise?: number; solde_debiteur?: number; solde_debiteur_revise?: number }[] = [];
        if (offre === 'comptabilite') {
          const res = await clientFetch(`/api/ecritures/balance/${entiteId}/${exerciceId}`);
          const data = await res.json();
          lignes = data.lignes || [];
        } else {
          const res = await clientFetch(`/api/balance/${entiteId}/${exerciceId}/N`);
          const data = await res.json();
          lignes = data.lignes || [];
        }
        let ca = 0;
        lignes.forEach((l) => {
          const num = (l.numero_compte || '').trim();
          if (num.startsWith('70') || num.startsWith('71')) {
            const sc = parseFloat(String(l.solde_crediteur_revise ?? l.solde_crediteur)) || 0;
            const sd = parseFloat(String(l.solde_debiteur_revise ?? l.solde_debiteur)) || 0;
            ca += sc - sd;
          }
        });
        // Seuils OHADA : negoce 60M, artisanal 40M, services 30M — on prend 30M
        // comme alerte generale et 60M comme seuil max.
        const seuilMin = 30_000_000;
        const seuilMax = 60_000_000;
        if (ca > seuilMin) {
          setAlert({ show: true, ca: Math.round(ca), seuil: ca > seuilMax ? seuilMax : seuilMin });
        } else {
          setAlert(null);
        }
      } catch { setAlert(null); }
    };
    fetchCA();
  }, [typeActivite, entiteId, exerciceId, offre]);

  return alert;
}

interface SmtAlertBannerProps {
  alert: SmtAlertState;
  onOpenParametres: () => void;
}

export function SmtAlertBanner({ alert, onOpenParametres }: SmtAlertBannerProps): React.ReactElement {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !alert.show) return <></>;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FEF3CD 0%, #FFF8E1 100%)',
      border: '1px solid #F0C674',
      borderRadius: 10,
      padding: '16px 20px',
      margin: '0 24px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
      boxShadow: '0 2px 8px rgba(212,168,67,0.15)',
    }}>
      <LuTriangleAlert size={24} style={{ color: '#D4A843', flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#8B6914', marginBottom: 4 }}>
          Chiffre d'affaires au-dessus du seuil SMT
        </div>
        <p style={{ fontSize: 13, color: '#6B5317', margin: '0 0 8px', lineHeight: 1.5 }}>
          Votre CA de l'exercice en cours est de <strong>{Math.round(alert.ca).toLocaleString('fr-FR')} FCFA</strong>,
          ce qui dépasse le seuil de <strong>{alert.seuil.toLocaleString('fr-FR')} FCFA</strong>.
          Selon l'Acte uniforme OHADA (art. 13), si ce dépassement se confirme sur deux exercices consécutifs,
          vous devez basculer vers le <strong>système normal SYSCOHADA</strong>.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onOpenParametres}
            style={{
              background: '#D4A843', color: '#fff', border: 'none', borderRadius: 6,
              padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <LuArrowUpRight size={14} /> Basculer vers SYSCOHADA
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'transparent', color: '#8B6914', border: '1px solid #D4A843', borderRadius: 6,
              padding: '6px 14px', fontSize: 12, cursor: 'pointer',
            }}
          >
            Rappeler plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
