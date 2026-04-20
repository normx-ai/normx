// Fiche R2 SYSCOHADA : caracteristiques entite (ZK-ZP), controle entite
// (ZQ-ZS), activites et repartition CA HT.

import React from 'react';

interface Props {
  pageRef: React.RefObject<HTMLDivElement | null>;
  entiteName: string;
  entiteNif: string;
  dateFin: Date | null;
  duree: number;
  caHT: number;
  p: (key: string) => string;
  fmtDateShort: (d: Date | null) => string;
  codeBoxes: (value: string, length: number) => React.JSX.Element;
  fmtMontant: (val: string) => string;
}

export function FicheR2({
  pageRef, entiteName, entiteNif, dateFin, duree, caHT,
  p, fmtDateShort, codeBoxes, fmtMontant,
}: Props): React.JSX.Element {
  const ca2 = parseFloat(p('activite_2_ca_ht')) || 0;
  const ca1 = caHT - ca2;
  const pct1 = caHT > 0 ? (ca1 / caHT * 100).toFixed(2) : '';
  const pct2 = caHT > 0 && ca2 > 0 ? (ca2 / caHT * 100).toFixed(2) : '';

  return (
    <div className="a4-page fi-page" ref={pageRef}>
      <div className="etat-header-officiel">
        <div className="etat-header-grid">
          <div className="etat-header-row">
            <span className="etat-header-label">Désignation entité :</span>
            <span className="etat-header-value">{entiteName || ''}</span>
            <span className="etat-header-label">Exercice clos le :</span>
            <span className="etat-header-value-right">{fmtDateShort(dateFin)}</span>
          </div>
          <div className="etat-header-row">
            <span className="etat-header-label">Numéro d'identification :</span>
            <span className="etat-header-value">{entiteNif || ''}</span>
            <span className="etat-header-label">Durée (en mois) :</span>
            <span className="etat-header-value-right">{duree}</span>
          </div>
        </div>
        <div className="etat-sub-titre" style={{ marginTop: 16 }}>Fiche R2</div>
      </div>

      <div className="fi-p2-grid">
        <div className="fi-p2-left">
          <table className="fi-ref-table">
            <tbody>
              <tr>
                <td className="fi-ref">ZK</td>
                <td className="fi-val">Forme juridique (1) :</td>
                <td className="fi-val">{codeBoxes(p('code_forme_juridique'), 4)}</td>
              </tr>
              <tr>
                <td className="fi-ref">ZL</td>
                <td className="fi-val">Régime fiscal (1) :</td>
                <td className="fi-val">{codeBoxes(p('code_regime_fiscal'), 4)}</td>
              </tr>
              <tr>
                <td className="fi-ref">ZM</td>
                <td className="fi-val">Pays du siège social (1) :</td>
                <td className="fi-val">{codeBoxes(p('code_pays_siege'), 4)}</td>
              </tr>
              <tr>
                <td className="fi-ref">ZN</td>
                <td className="fi-val">Nombre d'établissements dans le pays :</td>
                <td className="fi-val">{codeBoxes(p('nb_etablissement_pays'), 4)}</td>
              </tr>
              <tr>
                <td className="fi-ref">ZO</td>
                <td className="fi-val" style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>
                  Nombre d'établissements hors du pays pour<br />
                  lesquels une comptabilité distincte est tenue :
                </td>
                <td className="fi-val">{codeBoxes(p('nb_etablissement_hors'), 4)}</td>
              </tr>
              <tr>
                <td className="fi-ref">ZP</td>
                <td className="fi-val">Première année d'exercice dans le pays :</td>
                <td className="fi-val">{codeBoxes(p('premiere_annee_exercice'), 4)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="fi-p2-right">
          <div className="fi-controle-title">Contrôle de l'entité (cocher la case)</div>
          <table className="fi-controle-table">
            <tbody>
              <tr>
                <td className="fi-ref">ZQ</td>
                <td className="fi-val">Entité sous contrôle public</td>
                <td className="fi-val fi-check-cell">
                  <span className="fi-checkbox-box">{p('controle_entite') === 'public' ? '☑' : '☐'}</span>
                </td>
              </tr>
              <tr>
                <td className="fi-ref">ZQ</td>
                <td className="fi-val">Entité sous contrôle privé national</td>
                <td className="fi-val fi-check-cell">
                  <span className="fi-checkbox-box">{p('controle_entite') === 'prive_national' ? '☑' : '☐'}</span>
                </td>
              </tr>
              <tr>
                <td className="fi-ref">ZS</td>
                <td className="fi-val">Entité sous contrôle privé étranger</td>
                <td className="fi-val fi-check-cell">
                  <span className="fi-checkbox-box">{p('controle_entite') === 'prive_etranger' ? '☑' : '☐'}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="fi-activite-title">ACTIVITE DE L'ENTITE</div>

      <table className="fi-activite-table">
        <thead>
          <tr>
            <th style={{ width: '35%' }}>Désignation de l'activité (<sup>2</sup>)</th>
            <th style={{ width: '20%' }}>Code nomenclature<br />d'activité (<sup>1</sup>)</th>
            <th style={{ width: '25%' }}>Chiffre d'affaires HT<br />(CA HT)</th>
            <th style={{ width: '20%' }}>% activité<br />dans le CA<br />HT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{p('activite_principale') || p('activite_1_designation')}</td>
            <td className="fi-val-center">{p('activite_1_code') ? codeBoxes(p('activite_1_code'), 5) : ''}</td>
            <td className="fi-val-right">{fmtMontant(String(caHT || 0))}</td>
            <td className="fi-val-right">{pct1 ? pct1 + '%' : ''}</td>
          </tr>
          <tr>
            <td>{p('activite_2_designation')}</td>
            <td className="fi-val-center">{p('activite_2_code') ? codeBoxes(p('activite_2_code'), 5) : ''}</td>
            <td className="fi-val-right"></td>
            <td className="fi-val-right">{pct2 && parseFloat(pct2) > 0 ? pct2 + '%' : ''}</td>
          </tr>
          <tr>
            <td style={{ height: 28 }}></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>Divers</td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr className="fi-total-row">
            <td></td>
            <td style={{ fontWeight: 700, textAlign: 'center' }}>TOTAL</td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div className="fi-notes">
        <div className="fi-note-line"></div>
        <p>(<sup>1</sup>) NOTE 36</p>
        <p>(<sup>2</sup>) Lister de manière précise les activités dans l'ordre décroissant du C.A.HT, ou de la valeur ajoutée (V.A).</p>
      </div>
    </div>
  );
}
