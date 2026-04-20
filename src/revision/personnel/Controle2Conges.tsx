// Contrôle 2 : provision pour congés payés (compte 4281).

import React from 'react';
import { LuCheck, LuInfo, LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { fmt, fmtInput, parseInputValue, ProvisionCongesData } from '../revisionTypes';

interface Controle2Props {
  congesData: ProvisionCongesData;
  setCongesData: React.Dispatch<React.SetStateAction<ProvisionCongesData>>;
  setSaved: (v: boolean) => void;
  joursAcquis: number;
  joursOuvrablesMois: number;
  provisionConges: number;
  chargesSocialesConges: number;
  chargesFiscalesConges: number;
  totalProvisionConges: number;
  solde4281: number;
  ecartConges: number;
  isOpen: boolean;
  toggle: () => void;
}

export function Controle2Conges(p: Controle2Props): React.ReactElement {
  return (
    <div className="revision-control">
      <div className="revision-control-title" onClick={p.toggle} style={{ cursor: 'pointer' }}>
        {p.isOpen ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
        <span>Contrôle 2 — Provision pour congés payés</span>
        {p.congesData.masseSalariale > 0 && (Math.abs(p.ecartConges) < 0.5
          ? <span className="revision-badge ok"><LuCheck size={11} /> Conforme</span>
          : <span className="revision-badge ko"><LuInfo size={11} /> Écart détecté</span>)}
      </div>
      <div className="revision-ref">Comptes 4281 (charges à payer congés) — Provision = masse salariale x jours acquis / (jours ouvrables x 12) + charges patronales</div>

      {p.isOpen && (
        <>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 600 }}>
            <div className="revision-field">
              <label>Masse salariale brute annuelle</label>
              <input type="text" inputMode="numeric" className="revision-input"
                value={fmtInput(p.congesData.masseSalariale)}
                onChange={e => { p.setCongesData(prev => ({ ...prev, masseSalariale: parseInputValue(e.target.value) })); p.setSaved(false); }}
                placeholder="Saisir la masse salariale..." />
            </div>
            <div className="revision-field">
              <label>Jours de congés acquis / mois</label>
              <input type="text" inputMode="numeric" className="revision-input"
                value={p.congesData.joursCongesParMois || ''}
                onChange={e => { p.setCongesData(prev => ({ ...prev, joursCongesParMois: parseFloat(e.target.value) || 0 })); p.setSaved(false); }} />
            </div>
            <div className="revision-field">
              <label>Taux charges patronales sociales (%)</label>
              <input type="text" inputMode="numeric" className="revision-input"
                value={p.congesData.tauxChargesSociales || ''}
                onChange={e => { p.setCongesData(prev => ({ ...prev, tauxChargesSociales: parseFloat(e.target.value) || 0 })); p.setSaved(false); }} />
            </div>
            <div className="revision-field">
              <label>Taux charges patronales fiscales (%)</label>
              <input type="text" inputMode="numeric" className="revision-input"
                value={p.congesData.tauxChargesFiscales || ''}
                onChange={e => { p.setCongesData(prev => ({ ...prev, tauxChargesFiscales: parseFloat(e.target.value) || 0 })); p.setSaved(false); }} />
            </div>
          </div>

          {p.congesData.masseSalariale > 0 && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
              <table className="revision-table revision-table-small" style={{ maxWidth: 500 }}>
                <tbody>
                  <tr><td>Jours acquis (12 × {p.congesData.joursCongesParMois})</td><td className="num"><strong>{p.joursAcquis}</strong></td></tr>
                  <tr><td>Jours ouvrables / mois (fixe)</td><td className="num">{p.joursOuvrablesMois}</td></tr>
                  <tr><td>Provision congés (indemnités)</td><td className="num"><strong>{fmt(p.provisionConges)}</strong></td></tr>
                  <tr><td>Charges sociales patronales ({p.congesData.tauxChargesSociales}%)</td><td className="num">{fmt(p.chargesSocialesConges)}</td></tr>
                  <tr><td>Charges fiscales patronales ({p.congesData.tauxChargesFiscales}%)</td><td className="num">{fmt(p.chargesFiscalesConges)}</td></tr>
                  <tr style={{ borderTop: '2px solid #333' }}><td><strong>Total provision congés payés</strong></td><td className="num"><strong>{fmt(p.totalProvisionConges)}</strong></td></tr>
                  <tr><td>Solde 4281 en balance</td><td className="num"><strong>{fmt(p.solde4281)}</strong></td></tr>
                  <tr><td>Écart</td><td className={`num ${Math.abs(p.ecartConges) > 0.5 ? 'ecart-val' : 'ok-val'}`}><strong>{fmt(p.ecartConges)}</strong></td></tr>
                </tbody>
              </table>
              {Math.abs(p.ecartConges) < 0.5
                ? <span className="revision-badge ok" style={{ marginTop: 6, display: 'inline-block' }}>Conforme</span>
                : <span className="revision-badge ko" style={{ marginTop: 6, display: 'inline-block' }}>Écart — suggestion d'OD ci-dessous</span>
              }
            </div>
          )}
        </>
      )}
    </div>
  );
}
