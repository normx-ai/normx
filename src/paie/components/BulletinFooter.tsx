import React from 'react';
import { formaterMontant } from '../utils/calculPaie';
import type { BulletinData } from './bulletinTypes';

interface BulletinFooterProps {
  bulletin: BulletinData;
  totalBrut: number;
  totalRetenues: number;
  totalPatronales: number;
  netImposable: number;
  netAPayer: number;
  nbJoursOuvres: number;
}

function BulletinFooter({
  bulletin: b,
  totalBrut,
  totalRetenues,
  totalPatronales,
  netImposable,
  netAPayer,
  nbJoursOuvres,
}: BulletinFooterProps): React.ReactElement {
  const fmt = (v: number | null | undefined): string => v != null ? formaterMontant(Math.round(v)) : '';

  const droitConges = b.droit_conges || 2.17;
  const congesPris = b.conges_pris || 0;
  const soldeConges = (droitConges - congesPris).toFixed(2);

  return (
    <>
      {/* CUMULS */}
      <div style={{ display: 'flex', gap: 0 }}>
        <table className="bulletin-cumuls" style={{ flex: 1 }}>
          <thead>
            <tr>
              <th>Cumuls</th>
              <th>Salaire brut</th>
              <th>Charges salariales</th>
              <th>Charges patronales</th>
              <th>Avantages en nature</th>
              <th>Net imposable</th>
              <th>Jours Trav.</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Période</td>
              <td>{fmt(totalBrut)}</td>
              <td>{fmt(totalRetenues)}</td>
              <td>{fmt(totalPatronales)}</td>
              <td>{fmt(b.avantages_nature || 0)}</td>
              <td>{fmt(netImposable)}</td>
              <td>{nbJoursOuvres ? `${nbJoursOuvres},00` : '0,00'}</td>
            </tr>
            <tr>
              <td>Année</td>
              <td>{fmt(b.cumul_brut || totalBrut)}</td>
              <td>{fmt(b.cumul_retenues || totalRetenues)}</td>
              <td>{fmt(b.cumul_patronales || totalPatronales)}</td>
              <td>{fmt(b.cumul_avantages || 0)}</td>
              <td>{fmt(b.cumul_net_imposable || netImposable)}</td>
              <td>{b.cumul_jours || (nbJoursOuvres ? `${nbJoursOuvres},00` : '0,00')}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ width: 200 }}>
          <div className="bulletin-net-label">NET A PAYER</div>
          <div className="bulletin-net-a-payer">{fmt(netAPayer)}</div>
        </div>
      </div>

      {/* PIED DE PAGE */}
      <div className="bulletin-footer">
        Dans votre intérêt et pour vous aider à faire valoir vos droits, conservez ce bulletin de paie sans limitation de durée.
      </div>

      <div className="bulletin-signatures">
        <div className="bulletin-signature-block">
          <h5>SIGNATURE DE L'EMPLOYEUR :</h5>
          <div style={{ height: 50 }}></div>
        </div>

        <div className="bulletin-conges-pointage">
          <div className="bulletin-conges">
            <h5>Congés Payés (Jrs)</h5>
            <div className="bulletin-conges-row"><span>Droit Acquis M :</span><span>{droitConges.toFixed(2).replace('.', ',')}</span></div>
            <div className="bulletin-conges-row"><span>Congés pris M :</span><span>{congesPris.toFixed(2).replace('.', ',')}</span></div>
            <div className="bulletin-conges-row"><span>Solde M :</span><span>{Number(soldeConges).toFixed(2).replace('.', ',')}</span></div>
          </div>
          <div className="bulletin-pointage">
            <h5>Pointage / Semaine(Jrs)</h5>
            {([1,2,3,4,5,6] as const).map(s => (
              <div className="bulletin-pointage-row" key={s}>
                <span>Semaine{s} :</span>
                <span>{b[`pointage_s${s}`] != null ? (b[`pointage_s${s}`] as number).toFixed(2).replace('.', ',') : '0,00'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bulletin-signature-block" style={{ textAlign: 'right' }}>
          <h5>SIGNATURE DE L'EMPLOYE :</h5>
          <div style={{ fontSize: 10, marginTop: 8 }}>Pour acquit, le :</div>
          <div style={{ height: 40 }}></div>
        </div>
      </div>
    </>
  );
}

export default BulletinFooter;
