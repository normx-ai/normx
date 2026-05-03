import React from 'react';
import { LuPlus, LuCheck, LuUndo, LuFileUp, LuArrowLeft, LuChevronRight } from 'react-icons/lu';
import { useReferentiel } from '../contexts/ReferentielContext';

export interface EcrituresHeaderProps {
  nbSelectedBrouillard: number;
  nbSelectedValidee: number;
  onValider: () => void;
  onDevalider: () => void;
  onBack: () => void;
  onOpenCreate: () => void;
  onOpenImport?: () => void;
}

function EcrituresHeader({
  nbSelectedBrouillard,
  nbSelectedValidee,
  onValider,
  onDevalider,
  onBack,
  onOpenCreate,
  onOpenImport,
}: EcrituresHeaderProps): React.JSX.Element {
  const { label: planLabel } = useReferentiel();

  return (
    <>
      <nav className="saisie-breadcrumb" aria-label="Fil d'Ariane">
        <button type="button" className="saisie-breadcrumb-link" onClick={onBack}>Comptabilité</button>
        <LuChevronRight className="saisie-breadcrumb-sep" />
        <span className="saisie-breadcrumb-link">Saisie</span>
        <LuChevronRight className="saisie-breadcrumb-sep" />
        <span className="saisie-breadcrumb-current">Écritures comptables</span>
      </nav>

      <div className="compta-page-header">
        <div>
          <h1 className="compta-page-title">Saisie des écritures</h1>
          <p className="compta-page-subtitle">Saisissez les écritures comptables selon le plan {planLabel}</p>
        </div>
        <div className="compta-header-actions">
          {nbSelectedBrouillard > 0 && (
            <button className="compta-action-btn success" onClick={onValider}>
              <LuCheck /> Valider ({nbSelectedBrouillard})
            </button>
          )}
          {nbSelectedValidee > 0 && (
            <button className="compta-action-btn warning" onClick={onDevalider}>
              <LuUndo /> Dévalider ({nbSelectedValidee})
            </button>
          )}
          <button className="compta-action-btn" onClick={onBack}>
            <LuArrowLeft /> Retour
          </button>
          {onOpenImport && (
            <button className="compta-action-btn" onClick={onOpenImport}>
              <LuFileUp /> Importer
            </button>
          )}
          <button className="compta-action-btn primary" onClick={onOpenCreate}>
            <LuPlus /> Créer une écriture
          </button>
        </div>
      </div>
    </>
  );
}

export default EcrituresHeader;
