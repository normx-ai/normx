import React from 'react';
import { LuCheck, LuX } from 'react-icons/lu';
import { fmt } from './revisionTypes';

interface ControleNiveauKPProps {
  capitalSocial: number;
  moitieCapital: number;
  totalBalance: number;
}

function ControleNiveauKP({ capitalSocial, moitieCapital, totalBalance }: ControleNiveauKPProps): React.ReactElement {
  return (
    <div className="revision-control">
      <div className="revision-control-title">
        <span>Contrôle 3 : Niveau des capitaux propres</span>
        <span className={`revision-badge ${totalBalance >= moitieCapital ? 'ok' : 'ko'}`}>
          {totalBalance >= moitieCapital
            ? <><LuCheck size={12} /> OK — Niveau correct</>
            : <><LuX size={12} /> Alerte — KP inférieurs à la moitié du capital</>
          }
        </span>
      </div>

      <table className="revision-table revision-table-small">
        <tbody>
          <tr>
            <td>Capital social</td>
            <td className="num">{fmt(capitalSocial)}</td>
          </tr>
          <tr>
            <td>Moitié du capital social</td>
            <td className="num computed">{fmt(moitieCapital)}</td>
          </tr>
          <tr className="subtotal-row">
            <td>Total des capitaux propres</td>
            <td className="num"><strong>{fmt(totalBalance)}</strong></td>
          </tr>
        </tbody>
      </table>
      <div className="revision-control-footer">
        <span className="revision-ref">Cf. Art 664 Acte Uniforme OHADA sur le droit des sociétés</span>
      </div>
    </div>
  );
}

export default ControleNiveauKP;
