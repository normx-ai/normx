import React from 'react';
import './BulletinPaie.css';
import type { BulletinData, SalarieInfo, EtablissementInfo } from './bulletinTypes';
import {
  genererVariablesMois,
  buildLignesGains,
  buildLignesCotisations,
  buildLignesIndemnites,
} from './bulletinTypes';
import BulletinHeader from './BulletinHeader';
import BulletinLignes from './BulletinLignes';
import BulletinFooter from './BulletinFooter';

interface BulletinPaieProps {
  salarie: SalarieInfo | null;
  etablissement: EtablissementInfo | null;
  bulletin: BulletinData | null;
  mois: number;
  annee: number;
  onBack?: () => void;
}

function BulletinPaie({ salarie, etablissement, bulletin, mois, annee, onBack }: BulletinPaieProps): React.ReactElement {
  if (!salarie || !bulletin) {
    return (
      <div className="bulletin-container">
        <p>Aucun bulletin a afficher. Selectionnez un salarie et lancez le calcul.</p>
      </div>
    );
  }

  const etab: EtablissementInfo = etablissement || {};
  const b = bulletin;

  const periodeDebut = `01/${String(mois).padStart(2, '0')}/${annee}`;
  const dernierJour = new Date(annee, mois, 0).getDate();
  const periodeFin = `${dernierJour}/${String(mois).padStart(2, '0')}/${annee}`;

  const variables = genererVariablesMois(mois, annee);
  const nbJoursOuvres = variables.length;

  const lignesGains = buildLignesGains(b, nbJoursOuvres);
  const totalBrut = b.brut || lignesGains.reduce((s, l) => s + (l.montant || 0), 0);

  const lignesCotisations = buildLignesCotisations(b, totalBrut);
  const totalRetenues = b.total_retenues || lignesCotisations.reduce((s, l) => s + (l.deduction || 0), 0);
  const totalPatronales = b.total_patronales || lignesCotisations.reduce((s, l) => s + (l.patronale || 0), 0);

  const lignesIndemnites = buildLignesIndemnites(b, nbJoursOuvres);
  const totalGains = b.total_gains || (totalBrut + lignesIndemnites.reduce((s, l) => s + (l.montant || 0), 0));
  const netAPayer = b.net_a_payer || (totalGains - totalRetenues);
  const netImposable = b.net_imposable || (totalBrut - (b.cnss_salariale || 0));

  return (
    <div className="bulletin-container">
      <div className="bulletin-actions">
        {onBack && <button className="btn-bulletin btn-bulletin-back" onClick={onBack}>← Retour</button>}
        <button className="btn-bulletin btn-bulletin-print" onClick={() => window.print()}>🖨 Imprimer</button>
      </div>

      <div className="bulletin-page">
        <BulletinHeader
          salarie={salarie}
          etablissement={etab}
          mois={mois}
          annee={annee}
          periodeDebut={periodeDebut}
          periodeFin={periodeFin}
        />

        <BulletinLignes
          lignesGains={lignesGains}
          lignesCotisations={lignesCotisations}
          lignesIndemnites={lignesIndemnites}
          variables={variables}
          totalBrut={totalBrut}
          totalRetenues={totalRetenues}
          totalPatronales={totalPatronales}
          totalGains={totalGains}
        />

        <BulletinFooter
          bulletin={b}
          totalBrut={totalBrut}
          totalRetenues={totalRetenues}
          totalPatronales={totalPatronales}
          netImposable={netImposable}
          netAPayer={netAPayer}
          nbJoursOuvres={nbJoursOuvres}
        />
      </div>
    </div>
  );
}

export default BulletinPaie;
