import React from 'react';
import type { SalarieInfo, EtablissementInfo } from './bulletinTypes';
import { MOIS_NOMS_BULLETIN } from './bulletinTypes';

interface BulletinHeaderProps {
  salarie: SalarieInfo;
  etablissement: EtablissementInfo;
  mois: number;
  annee: number;
  periodeDebut: string;
  periodeFin: string;
}

function BulletinHeader({
  salarie,
  etablissement: etab,
  mois,
  annee,
  periodeDebut,
  periodeFin,
}: BulletinHeaderProps): React.ReactElement {
  const info = salarie;
  const nomMois = MOIS_NOMS_BULLETIN[mois] || '';

  return (
    <>
      {/* EN-TETE */}
      <div className="bulletin-header">
        <div className="bulletin-entreprise">
          <div className="bulletin-entreprise-nom">{etab.raison_sociale || etab.nom || 'Entreprise'}</div>
          <div>{etab.adresse || ''}</div>
          <div>{etab.ville ? `${etab.ville} - République du Congo` : 'République du Congo'}</div>
          {etab.rccm && <div>R.C.C.M : {etab.rccm}</div>}
          {etab.nui && <div>N° NIU : {etab.nui}</div>}
          {etab.telephone && <div>Tél : {etab.telephone}</div>}
        </div>
        <div className="bulletin-titre-wrapper">
          <div className="bulletin-titre">BULLETIN DE PAIE</div>
          <div className="bulletin-periode-titre">{nomMois} {annee}</div>
        </div>
        <div style={{ width: 140 }}></div>
      </div>

      <hr className="bulletin-hr" />

      {/* INFOS SALARIE */}
      <div className="bulletin-infos">
        <div className="bulletin-infos-row">
          <div className="bulletin-infos-cell large">
            <span className="bulletin-infos-label">Nom et Prénom :</span>
            <span className="bulletin-infos-value">{info.civilite || ''} {info.nom || ''} {info.prenom || ''}</span>
          </div>
          <div className="bulletin-infos-cell large">
            <span className="bulletin-infos-label">Période : du</span>
            <span className="bulletin-infos-value">{periodeDebut} au {periodeFin}</span>
          </div>
        </div>
        <div className="bulletin-infos-row">
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">Matricule :</span>
            <span className="bulletin-infos-value">{info.matricule || '-'}</span>
          </div>
          <div className="bulletin-infos-cell large">
            <span className="bulletin-infos-label">Établissement :</span>
            <span className="bulletin-infos-value">{etab.nom || etab.raison_sociale || '-'}</span>
          </div>
        </div>
        <div className="bulletin-infos-row">
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">N° CNSS :</span>
            <span className="bulletin-infos-value">{info.numero_cnss || '-'}</span>
          </div>
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">N° NIU :</span>
            <span className="bulletin-infos-value">{info.nui || etab.nui || '-'}</span>
          </div>
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">Emploi :</span>
            <span className="bulletin-infos-value">{info.emploi || info.poste || '-'}</span>
          </div>
        </div>
        <div className="bulletin-infos-row">
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">Sit. Matrimoniale :</span>
            <span className="bulletin-infos-value">{info.situation_matrimoniale || '-'}</span>
          </div>
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">Affectation :</span>
            <span className="bulletin-infos-value">{info.affectation || info.service || '-'}</span>
          </div>
        </div>
        <div className="bulletin-infos-row">
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">Enfants ITS :</span>
            <span className="bulletin-infos-value">{info.enfants_its ?? info.nombre_enfants ?? '-'}</span>
          </div>
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">Parts Fiscales :</span>
            <span className="bulletin-infos-value">{info.parts_fiscales ? Number(info.parts_fiscales).toFixed(2).replace('.', ',') : '-'}</span>
          </div>
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">Date Embauche :</span>
            <span className="bulletin-infos-value">{info.date_embauche || '-'}</span>
          </div>
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">Nature du contrat :</span>
            <span className="bulletin-infos-value">{info.type_contrat || '-'}</span>
          </div>
        </div>
        <div className="bulletin-infos-row">
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">Ancienneté :</span>
            <span className="bulletin-infos-value">{info.anciennete || '0 an(s) et 0 mois'}</span>
          </div>
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">Conv. Collect. :</span>
            <span className="bulletin-infos-value">{info.convention_collective || '-'}</span>
          </div>
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">Catégorie :</span>
            <span className="bulletin-infos-value">{info.categorie || '-'}</span>
          </div>
        </div>
        <div className="bulletin-infos-row">
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">Mode de Paiement :</span>
            <span className="bulletin-infos-value">{info.mode_paiement || 'Virement'}</span>
          </div>
          <div className="bulletin-infos-cell large">
            <span className="bulletin-infos-label">RIB :</span>
            <span className="bulletin-infos-value">{info.rib || '-'}</span>
          </div>
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">Devise :</span>
            <span className="bulletin-infos-value">XAF</span>
          </div>
          <div className="bulletin-infos-cell">
            <span className="bulletin-infos-label">Date Règlement :</span>
            <span className="bulletin-infos-value">{periodeFin}</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default BulletinHeader;
