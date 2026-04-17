import { clientFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { LuFileCheck, LuFilter, LuCheck, LuShieldCheck } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { fmt } from './revisionTypes';
import './RevisionComptes.css';

interface BalanceReviseeProps {
  entiteId: number;
  exerciceId: number;
  exerciceAnnee: number;
}

interface LigneRevisee {
  numero_compte: string;
  libelle_compte: string;
  si_debit: number;
  si_credit: number;
  mvt_debit: number;
  mvt_credit: number;
  sf_debit: number;
  sf_credit: number;
  od_debit: number;
  od_credit: number;
  sf_debit_revise: number;
  sf_credit_revise: number;
  modifie: boolean;
}

function BalanceRevisee({ entiteId, exerciceId, exerciceAnnee }: BalanceReviseeProps): React.ReactElement {
  const [lignes, setLignes] = useState<LigneRevisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<'tous' | 'modifies'>('tous');
  const [statut, setStatut] = useState<string>('brut');
  const [balanceId, setBalanceId] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (!entiteId || !exerciceId) return;
    setLoading(true);

    Promise.all([
      clientFetch(`/api/balance/${entiteId}/${exerciceId}/N`).then(r => r.json()),
      clientFetch(`/api/revision/${entiteId}/${exerciceId}/all-od`).then(r => r.ok ? r.json() : { odEcritures: [] }),
    ]).then(([balData, odData]) => {
      const balanceN: BalanceLigne[] = balData.lignes || [];
      if (balData.balance?.statut) setStatut(balData.balance.statut);
      if (balData.balance?.id) setBalanceId(balData.balance.id);

      // Calculer impacts OD par compte
      const impacts: Record<string, { debit: number; credit: number }> = {};
      for (const od of (odData.odEcritures || [])) {
        const montant = od.montant || 0;
        if (montant === 0) continue;
        if (od.compteDebit && od.compteDebit !== '______') {
          if (!impacts[od.compteDebit]) impacts[od.compteDebit] = { debit: 0, credit: 0 };
          impacts[od.compteDebit].debit += montant;
        }
        if (od.compteCredit && od.compteCredit !== '______') {
          if (!impacts[od.compteCredit]) impacts[od.compteCredit] = { debit: 0, credit: 0 };
          impacts[od.compteCredit].credit += montant;
        }
      }

      const result: LigneRevisee[] = balanceN.map(bl => {
        const siD = parseFloat(String(bl.si_debit)) || 0;
        const siC = parseFloat(String(bl.si_credit)) || 0;
        const mvtD = parseFloat(String(bl.debit)) || 0;
        const mvtC = parseFloat(String(bl.credit)) || 0;
        const sfD = parseFloat(String(bl.solde_debiteur)) || 0;
        const sfC = parseFloat(String(bl.solde_crediteur)) || 0;

        const impact = impacts[bl.numero_compte];
        const odD = impact?.debit || 0;
        const odC = impact?.credit || 0;
        const hasOd = Math.abs(odD) > 0.5 || Math.abs(odC) > 0.5;

        // SF révisé : solde net = (SC - SD) + crédits OD - débits OD
        let sfDRev = sfD;
        let sfCRev = sfC;
        if (hasOd) {
          const soldeNet = (sfC - sfD) + odC - odD;
          sfDRev = soldeNet < 0 ? Math.abs(soldeNet) : 0;
          sfCRev = soldeNet >= 0 ? soldeNet : 0;
        }

        return {
          numero_compte: bl.numero_compte,
          libelle_compte: bl.libelle_compte,
          si_debit: siD,
          si_credit: siC,
          mvt_debit: mvtD + odD,
          mvt_credit: mvtC + odC,
          sf_debit: sfD,
          sf_credit: sfC,
          od_debit: odD,
          od_credit: odC,
          sf_debit_revise: sfDRev,
          sf_credit_revise: sfCRev,
          modifie: hasOd,
        };
      });

      setLignes(result);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [entiteId, exerciceId]);

  const handleValidate = async () => {
    if (!balanceId) return;
    setValidating(true);
    try {
      const res = await clientFetch(`/api/balance/statut/${balanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'valide' }),
      });
      if (res.ok) setStatut('valide');
    } catch { /* ignore */ }
    setValidating(false);
  };

  if (loading) {
    return <div className="revision-comptes"><div className="revision-loading">Chargement de la balance révisée...</div></div>;
  }

  const lignesFiltrees = filtre === 'modifies' ? lignes.filter(l => l.modifie) : lignes;
  const nbModifies = lignes.filter(l => l.modifie).length;

  const total = (field: keyof LigneRevisee) => lignes.reduce((s, l) => s + (l[field] as number), 0);

  return (
    <div className="revision-comptes">
      <div className="revision-section-header">
        <h2 style={{ fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <LuFileCheck size={20} /> Balance générale révisée — Exercice {exerciceAnnee}
          {statut === 'valide' && <span className="revision-badge ok"><LuCheck size={12} /> Validée</span>}
        </h2>
        {statut !== 'valide' && balanceId && (
          <button className="revision-save-btn" onClick={handleValidate} disabled={validating}>
            <LuShieldCheck size={14} /> {validating ? 'Validation...' : 'Valider la balance'}
          </button>
        )}
      </div>

      <div className="revision-balance-filtres" style={{ marginBottom: 16 }}>
        <button className={`revision-tab ${filtre === 'tous' ? 'active' : ''}`} onClick={() => setFiltre('tous')}>
          Tous les comptes ({lignes.length})
        </button>
        <button className={`revision-tab ${filtre === 'modifies' ? 'active' : ''}`} onClick={() => setFiltre('modifies')}>
          <LuFilter size={12} /> Comptes modifiés ({nbModifies})
        </button>
      </div>

      <div className="revision-table-wrapper">
        <table className="revision-table">
          <thead>
            <tr>
              <th rowSpan={2}>Compte</th>
              <th rowSpan={2}>Libellé</th>
              <th colSpan={2} style={{ textAlign: 'center', background: '#f8f9fa' }}>Solde initial</th>
              <th colSpan={2} style={{ textAlign: 'center', background: '#f8f9fa' }}>Mouvements (+ OD)</th>
              <th colSpan={2} style={{ textAlign: 'center', background: '#f0fdf4', color: '#166534' }}>Solde final révisé</th>
            </tr>
            <tr>
              <th className="num">Débit</th>
              <th className="num">Crédit</th>
              <th className="num">Débit</th>
              <th className="num">Crédit</th>
              <th className="num" style={{ background: '#f0fdf4', color: '#166534' }}>Débit</th>
              <th className="num" style={{ background: '#f0fdf4', color: '#166534' }}>Crédit</th>
            </tr>
          </thead>
          <tbody>
            {lignesFiltrees.map(l => (
              <tr key={l.numero_compte} className={l.modifie ? 'revision-modified-row' : ''}>
                <td className="compte">{l.numero_compte}</td>
                <td>{l.libelle_compte}</td>
                <td className="num">{fmt(l.si_debit)}</td>
                <td className="num">{fmt(l.si_credit)}</td>
                <td className={`num ${l.modifie ? 'od-val' : ''}`}>{fmt(l.mvt_debit)}</td>
                <td className={`num ${l.modifie ? 'od-val' : ''}`}>{fmt(l.mvt_credit)}</td>
                <td className="num revised-val">{fmt(l.sf_debit_revise)}</td>
                <td className="num revised-val">{fmt(l.sf_credit_revise)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}><strong>TOTAUX</strong></td>
              <td className="num"><strong>{fmt(total('si_debit'))}</strong></td>
              <td className="num"><strong>{fmt(total('si_credit'))}</strong></td>
              <td className="num"><strong>{fmt(total('mvt_debit'))}</strong></td>
              <td className="num"><strong>{fmt(total('mvt_credit'))}</strong></td>
              <td className="num revised-val"><strong>{fmt(total('sf_debit_revise'))}</strong></td>
              <td className="num revised-val"><strong>{fmt(total('sf_credit_revise'))}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default BalanceRevisee;
