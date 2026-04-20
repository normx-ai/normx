// Fiche R1 SYSCOHADA : identification de l'entite (ZA-ZI) + contact,
// comptable, visa/AG, signataire, banques.
// Composant de presentation pure : recoit toutes les donnees resolues.

import React from 'react';

interface Props {
  pageRef: React.RefObject<HTMLDivElement | null>;
  entiteName: string;
  entiteSigle: string;
  entiteAdresse: string;
  entiteNif: string;
  dateDebut: Date | null;
  dateFin: Date | null;
  duree: number;
  prevDateFin: string;
  prevDuree: string;
  p: (key: string) => string;
  fmtDate: (d: Date | null) => string;
  fmtDateShort: (d: Date | null) => string;
}

export function FicheR1({
  pageRef, entiteName, entiteSigle, entiteAdresse, entiteNif,
  dateDebut, dateFin, duree, prevDateFin, prevDuree,
  p, fmtDate, fmtDateShort,
}: Props): React.JSX.Element {
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
        <div className="etat-sub-titre">Fiche R1</div>
      </div>

      <table className="fi-ref-table">
        <colgroup>
          <col style={{ width: '4%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '18%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td className="fi-ref">ZA</td>
            <td className="fi-val" style={{ whiteSpace: 'nowrap' }}>EXERCICE COMPTABLE :</td>
            <td className="fi-val" style={{ textAlign: 'right' }}>DU :</td>
            <td className="fi-val" style={{ textAlign: 'center' }}>{fmtDate(dateDebut)}</td>
            <td className="fi-val" style={{ textAlign: 'right' }}>AU :</td>
            <td className="fi-val" colSpan={2} style={{ textAlign: 'center' }}>{fmtDate(dateFin)}</td>
          </tr>

          <tr>
            <td className="fi-ref">ZB</td>
            <td className="fi-val" colSpan={2}>DATE D'ARRETE EFFECTIF DES COMPTES :</td>
            <td className="fi-val" colSpan={4}>{p('date_arrete_comptes') ? fmtDate(new Date(p('date_arrete_comptes'))) : ''}</td>
          </tr>

          <tr>
            <td className="fi-ref">ZC</td>
            <td className="fi-val" colSpan={2}>EXERCICE PRECEDENT CLOS LE :</td>
            <td className="fi-val" style={{ textAlign: 'center' }}>{prevDateFin}</td>
            <td className="fi-val" colSpan={2} style={{ whiteSpace: 'nowrap' }}>DUREE EXERCICE PRECEDENT EN MOIS :</td>
            <td className="fi-val" style={{ textAlign: 'center' }}>{prevDuree}</td>
          </tr>

          <tr>
            <td className="fi-ref">ZD</td>
            <td className="fi-val" style={{ textAlign: 'center' }}>{p('greffe')}</td>
            <td className="fi-val" colSpan={2} style={{ textAlign: 'center' }}>{p('num_registre')}</td>
            <td className="fi-val" colSpan={3} style={{ textAlign: 'center' }}>{p('num_repertoire')}</td>
          </tr>
          <tr className="fi-label-row">
            <td></td>
            <td className="fi-sub-label" style={{ textAlign: 'center' }}>Greffe</td>
            <td className="fi-sub-label" colSpan={2} style={{ textAlign: 'center' }}>N° Registre du Commerce</td>
            <td className="fi-sub-label" colSpan={3} style={{ textAlign: 'center' }}>N° registre des entités</td>
          </tr>

          <tr>
            <td className="fi-ref">ZE</td>
            <td className="fi-val" style={{ textAlign: 'center' }}>{p('num_cnss')}</td>
            <td className="fi-val" colSpan={2} style={{ textAlign: 'center' }}>{p('code_importateur')}</td>
            <td className="fi-val" colSpan={3} style={{ textAlign: 'center' }}>{p('code_activite_principale')}</td>
          </tr>
          <tr className="fi-label-row">
            <td></td>
            <td className="fi-sub-label" style={{ textAlign: 'center' }}>N° de caisse sociale</td>
            <td className="fi-sub-label" colSpan={2} style={{ textAlign: 'center' }}>N° Code Importateur</td>
            <td className="fi-sub-label" colSpan={3} style={{ textAlign: 'center' }}>Code activité principale</td>
          </tr>

          <tr>
            <td className="fi-ref">ZF</td>
            <td className="fi-val" colSpan={4} style={{ textAlign: 'center' }}>{entiteName}</td>
            <td className="fi-val" colSpan={2} style={{ textAlign: 'center' }}>{entiteSigle}</td>
          </tr>
          <tr className="fi-label-row">
            <td></td>
            <td className="fi-sub-label" colSpan={4} style={{ textAlign: 'center' }}>Désignation de l'entité</td>
            <td className="fi-sub-label" colSpan={2} style={{ textAlign: 'center' }}>Sigle</td>
          </tr>

          <tr>
            <td className="fi-ref">ZG</td>
            <td className="fi-val" style={{ textAlign: 'center' }}>{p('telephone')}</td>
            <td className="fi-val" style={{ textAlign: 'center' }}>{p('email')}</td>
            <td className="fi-val" style={{ textAlign: 'center' }}>{p('code_postal')}</td>
            <td className="fi-val" style={{ textAlign: 'center' }}>{p('boite_postale')}</td>
            <td className="fi-val" colSpan={2} style={{ textAlign: 'center' }}>{p('ville')}</td>
          </tr>
          <tr className="fi-label-row">
            <td></td>
            <td className="fi-sub-label" style={{ textAlign: 'center' }}>N° de téléphone</td>
            <td className="fi-sub-label" style={{ textAlign: 'center' }}>email</td>
            <td className="fi-sub-label" style={{ textAlign: 'center' }}>Code</td>
            <td className="fi-sub-label" style={{ textAlign: 'center' }}>Boîte postale</td>
            <td className="fi-sub-label" colSpan={2} style={{ textAlign: 'center' }}>Ville</td>
          </tr>

          <tr>
            <td className="fi-ref">ZH</td>
            <td className="fi-val" colSpan={6} style={{ textAlign: 'center' }}>{entiteAdresse}</td>
          </tr>
          <tr className="fi-label-row">
            <td></td>
            <td className="fi-sub-label" colSpan={6} style={{ textAlign: 'center' }}>Adresse géographique complète (Immeuble, rue, quartier, ville, pays)</td>
          </tr>

          <tr>
            <td className="fi-ref">ZI</td>
            <td className="fi-val" colSpan={6} style={{ textAlign: 'center' }}>{p('activite_principale')}</td>
          </tr>
          <tr className="fi-label-row">
            <td></td>
            <td className="fi-sub-label" colSpan={6} style={{ textAlign: 'center' }}>Désignation précise de l'activité principale exercée par l'entité</td>
          </tr>
        </tbody>
      </table>

      <div className="fi-text-block">
        <div className="fi-text-value" style={{ textAlign: 'center' }}>{p('personne_contact')}</div>
        <div className="fi-sub-label-indent" style={{ textAlign: 'center' }}>Nom, adresse et qualité de la personne à contacter en cas de demande d'informations complémentaires</div>
      </div>

      <div className="fi-text-block">
        <div className="fi-text-value" style={{ textAlign: 'center' }}>
          {[p('professionnel_ef_nom'), p('professionnel_ef_adresse'), p('professionnel_ef_tel')].filter(Boolean).join(' ')}
        </div>
        <div className="fi-sub-label-indent" style={{ textAlign: 'center' }}>
          Nom du professionnel salarié de l'entité ou<br />
          nom, adresse et téléphone du cabinet comptable ou du professionnel <strong>INSCRIT A L'ORDRE NATIONAL<br />
          DES EXPERTS COMPTABLES ET DES COMPTABLES AGREES</strong> ayant établi les états financiers
        </div>
      </div>

      <div className="fi-visa-ag-block">
        <div className="fi-visa-left">
          <div className="fi-visa-line-sep"></div>
          <div className="fi-text-value" style={{ textAlign: 'center', padding: '6px 0' }}>{p('visa_expert')}</div>
          <div className="fi-sub-label" style={{ textAlign: 'center' }}>Visa de l'Expert comptable ou du Comptable agréé</div>
        </div>
        <div className="fi-ag-right">
          <div className="fi-ag-checkboxes">
            <span className="fi-ag-option">
              <span className="fi-checkbox-box">☐</span>
              <span>Non</span>
            </span>
            <span className="fi-ag-option">
              <span className="fi-checkbox-box">{p('ag_approuve').toLowerCase() === 'non' ? '☑' : '☐'}</span>
              <span>Non</span>
            </span>
            <span className="fi-ag-option">
              <span className="fi-checkbox-box">{p('ag_approuve').toLowerCase() === 'oui' ? '☑' : '☐'}</span>
              <span>Oui</span>
            </span>
          </div>
          <div className="fi-sub-label" style={{ textAlign: 'right', marginTop: 4 }}>Etats financiers approuvés par l'Assemblée<br />Générale (cocher la case)</div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}></div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 0, alignItems: 'stretch' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ textAlign: 'center', padding: 8, border: '0.5px solid #000' }}>{p('signataire_nom')}</div>
          <div style={{ textAlign: 'center', fontSize: 9, fontStyle: 'italic', color: '#555', padding: '2px 6px' }}>Nom du signataire des états financiers</div>
          <div style={{ textAlign: 'center', padding: 8, border: '0.5px solid #000' }}>{p('signataire_qualite')}</div>
          <div style={{ textAlign: 'center', fontSize: 9, fontStyle: 'italic', color: '#555', padding: '2px 6px' }}>Qualité du signataire des états financiers</div>
          <div style={{ textAlign: 'center', padding: 8, border: '0.5px solid #000' }}>{p('date_signature')}</div>
          <div style={{ textAlign: 'center', fontSize: 9, fontStyle: 'italic', color: '#555', padding: '2px 6px' }}>Date de signature</div>
          <div style={{ flex: 1, border: '0.5px solid #000', minHeight: 60 }}></div>
        </div>

        <div style={{ flex: 1, border: '0.5px solid #000', display: 'flex', flexDirection: 'column' }}>
          <div style={{ textAlign: 'center', fontWeight: 600, padding: 8, borderBottom: '0.5px solid #000' }}>Domiciliations bancaires :</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', flex: 1 }}>
            <colgroup>
              <col style={{ width: '50%' }} />
              <col style={{ width: '50%' }} />
            </colgroup>
            <tbody>
              <tr>
                <td style={{ textAlign: 'center', fontSize: 9, fontStyle: 'italic', color: '#555', padding: '1px 4px', borderRight: '0.5px solid #000' }}>Banque</td>
                <td style={{ textAlign: 'center', fontSize: 9, fontStyle: 'italic', color: '#555', padding: '1px 4px' }}>Numéro de compte</td>
              </tr>
              {[1, 2, 3, 4, 5].map((i) => {
                const keyBanque = i === 1 ? 'banque' : `banque_${i}`;
                const keyCompte = i === 1 ? 'numero_compte' : `numero_compte_${i}`;
                return (
                  <tr key={i}>
                    <td style={{ textAlign: 'center', padding: '4px 4px', borderTop: '0.5px solid #000', borderRight: '0.5px solid #000' }}>{p(keyBanque)}</td>
                    <td style={{ textAlign: 'center', padding: '4px 4px', borderTop: '0.5px solid #000' }}>{p(keyCompte)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
