import React from 'react';
import { LuCheck, LuX } from 'react-icons/lu';
import { fmt } from './revisionTypes';

interface ControleReserveLegaleProps {
  resultatN1: number;
  pertesAnterieures: number;
  baseReserve: number;
  dixPourcent: number;
  capitalSocial: number;
  plafondReserve: number;
  reserveN1: number;
  dotationObligatoire: number;
  reserveRecalculee: number;
  reserveBalance: number;
  ecartReserve: number;
  plafondAtteint: boolean;
  exerciceAnnee: number;
}

function ControleReserveLegale(props: ControleReserveLegaleProps): React.ReactElement {
  const {
    resultatN1, pertesAnterieures, baseReserve, dixPourcent,
    capitalSocial, plafondReserve, reserveN1, dotationObligatoire,
    reserveRecalculee, reserveBalance, ecartReserve, plafondAtteint,
    exerciceAnnee,
  } = props;

  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 2 : Reperformance réserve légale</span>
        <span className={`revision-badge ${Math.abs(ecartReserve) < 0.5 ? 'ok' : 'ko'}`}>
          {Math.abs(ecartReserve) < 0.5 ? <><LuCheck size={12} /> OK</> : <><LuX size={12} /> Écart</>}
        </span>
      </div>

      <table className="revision-table revision-table-small">
        <tbody>
          <tr>
            <td>Résultat N-1</td>
            <td className="num">{resultatN1.toLocaleString('fr-FR')}</td>
          </tr>
          <tr>
            <td>Pertes antérieures (report à nouveau débiteur)</td>
            <td className="num">{pertesAnterieures > 0 ? `(${pertesAnterieures.toLocaleString('fr-FR')})` : pertesAnterieures.toLocaleString('fr-FR')}</td>
          </tr>
          <tr className="subtotal-row">
            <td>Base de calcul (bénéfice − pertes antérieures)</td>
            <td className="num computed">{baseReserve.toLocaleString('fr-FR')}</td>
          </tr>
          <tr>
            <td>10% de la base (dotation minimale)</td>
            <td className="num computed">{dixPourcent.toLocaleString('fr-FR')}</td>
          </tr>
          <tr>
            <td>Capital social</td>
            <td className="num">{capitalSocial.toLocaleString('fr-FR')}</td>
          </tr>
          <tr>
            <td>Plafond réserve légale (1/5 du capital)</td>
            <td className="num computed">{plafondReserve.toLocaleString('fr-FR')}</td>
          </tr>
          <tr>
            <td>Réserve légale au 31/12/{exerciceAnnee - 1}</td>
            <td className="num">{reserveN1.toLocaleString('fr-FR')}</td>
          </tr>
          {plafondAtteint && (
            <tr>
              <td colSpan={2} style={{ color: '#16a34a', fontStyle: 'italic', fontSize: '11.5px' }}>
                Plafond atteint — dotation non obligatoire
              </td>
            </tr>
          )}
          <tr>
            <td>Dotation obligatoire</td>
            <td className="num computed">{dotationObligatoire.toLocaleString('fr-FR')}</td>
          </tr>
          <tr className="subtotal-row">
            <td>Réserve légale recalculée au 31/12/{exerciceAnnee} (A)</td>
            <td className="num computed"><strong>{reserveRecalculee.toLocaleString('fr-FR')}</strong></td>
          </tr>
          <tr>
            <td>Balance générale (B)</td>
            <td className="num">{reserveBalance.toLocaleString('fr-FR')}</td>
          </tr>
          <tr className={Math.abs(ecartReserve) > 0.5 ? 'ecart-row' : ''}>
            <td>Écart (B - A)</td>
            <td className={`num ${Math.abs(ecartReserve) > 0.5 ? 'ecart-val' : 'ok-val'}`}>
              <strong>{fmt(ecartReserve)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="revision-control-footer">
        <span className="revision-ref">Cf. Article 346 Acte Uniforme OHADA — Droit des sociétés commerciales</span>
      </div>
    </div>
  );
}

export default ControleReserveLegale;
