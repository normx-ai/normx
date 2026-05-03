import React, { useState } from 'react';
import { LuSparkles } from 'react-icons/lu';
import type { SaisieJournalProps } from './SaisieJournal.types';
import { useEcrituresData } from './hooks/useEcrituresData';
import { useEcrituresFilters } from './hooks/useEcrituresFilters';
import { useEcritureForm } from './hooks/useEcritureForm';
import { useEcrituresActions } from './hooks/useEcrituresActions';
import EcrituresHeader from './EcrituresHeader';
import EcrituresStatsBar from './EcrituresStatsBar';
import EcrituresFilters from './EcrituresFilters';
import EcrituresList from './EcrituresList';
import SaisieOverlay from './SaisieOverlay';
import ImportDocumentModal from './ImportDocumentModal';
import './Comptabilite.css';

function SaisieJournal({
  entiteId, exerciceId, exerciceAnnee, exerciceDateDebut, exerciceDateFin, onBack,
}: SaisieJournalProps): React.JSX.Element {
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  const filters = useEcrituresFilters(exerciceAnnee);

  const { ecritures, planComptable, tiersList, stats, invalidate } =
    useEcrituresData(entiteId, exerciceId, filters.ecrituresFilters);

  const form = useEcritureForm({ exerciceAnnee, exerciceDateDebut, exerciceDateFin, planComptable });

  const actions = useEcrituresActions({ entiteId, exerciceId, ecritures, form, invalidate });

  const countAll = ecritures.length;
  const countBrouillard = ecritures.filter(e => e.statut !== 'validee').length;
  const countValidee = ecritures.length - countBrouillard;

  return (
    <div className="compta-wrapper">
      <EcrituresHeader
        nbSelectedBrouillard={actions.nbSelectedBrouillard}
        nbSelectedValidee={actions.nbSelectedValidee}
        onValider={actions.validerSelection}
        onDevalider={actions.devaliderSelection}
        onBack={onBack}
        onOpenCreate={form.openCreate}
        onOpenImport={() => setShowImportModal(true)}
      />

      <EcrituresStatsBar ecritures={ecritures} stats={stats} />

      <EcrituresFilters
        filterJournal={filters.filterJournal} setFilterJournal={filters.setFilterJournal}
        filterStatut={filters.filterStatut} setFilterStatut={filters.setFilterStatut}
        filterMois={filters.filterMois} setFilterMois={filters.setFilterMois}
        filterDateDu={filters.filterDateDu} setFilterDateDu={filters.setFilterDateDu}
        filterDateAu={filters.filterDateAu} setFilterDateAu={filters.setFilterDateAu}
        exerciceDateDebut={exerciceDateDebut} exerciceDateFin={exerciceDateFin}
      />

      <EcrituresList
        ecritures={ecritures}
        selectedIds={actions.selectedIds}
        onToggleSelect={actions.toggleSelect}
        onToggleSelectAll={actions.toggleSelectAll}
        onEdit={form.openEdit}
        onDelete={actions.deleteEcriture}
        searchTerm={filters.searchTerm} setSearchTerm={filters.setSearchTerm}
        activeTab={filters.activeTab} setActiveTab={filters.setActiveTab}
        countAll={countAll} countBrouillard={countBrouillard} countValidee={countValidee}
        onOpenCreate={form.openCreate}
        onOpenImport={() => setShowImportModal(true)}
        onShortcut={form.openShortcut}
      />

      <aside className="saisie-help-banner">
        <div className="saisie-help-icon"><LuSparkles size={16} /></div>
        <div className="saisie-help-content">
          <div className="saisie-help-title">Saisie assistée par NORMX IA</div>
          <div className="saisie-help-desc">
            Importez vos factures PDF ou photos : l'OCR extrait automatiquement le tiers,
            le compte, le montant HT et la TVA. Vérification d'équilibre débit/crédit en temps réel.
          </div>
        </div>
      </aside>

      {showImportModal && (
        <ImportDocumentModal
          entiteId={entiteId}
          exerciceId={exerciceId}
          onClose={() => setShowImportModal(false)}
          onImport={form.openFromImport}
        />
      )}

      {form.showOverlay && (
        <SaisieOverlay
          editingId={form.editingId}
          journal={form.journal} setJournal={form.setJournal}
          showJournalDropdown={form.showJournalDropdown} setShowJournalDropdown={form.setShowJournalDropdown}
          dateEcriture={form.dateEcriture} setDateEcriture={form.setDateEcriture}
          numeroPiece={form.numeroPiece} setNumeroPiece={form.setNumeroPiece}
          libelle={form.libelle} setLibelle={form.setLibelle}
          lignes={form.lignes}
          planComptable={planComptable} tiersList={tiersList}
          exerciceAnnee={exerciceAnnee}
          exerciceDateDebut={exerciceDateDebut} exerciceDateFin={exerciceDateFin}
          saving={form.saving}
          onSave={actions.saveEcriture}
          onClose={form.closeOverlay}
          onUpdateLigne={form.updateLigne}
          onSelectCompte={form.selectCompte}
          onCompteBlur={form.handleCompteBlur}
          onAddLigne={form.addLigne}
          onRemoveLigne={form.removeLigne}
          onEquilibrer={form.equilibrer}
        />
      )}
    </div>
  );
}

export default SaisieJournal;
