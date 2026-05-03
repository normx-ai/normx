import React from 'react';
import { LuFileText, LuPlus, LuFileUp, LuReceipt, LuShoppingCart, LuLandmark, LuFilterX } from 'react-icons/lu';

export interface EcrituresEmptyProps {
  onOpenCreate: () => void;
  onOpenImport?: () => void;
  onShortcut: (journal: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

interface ShortcutDef {
  journal: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

function EcrituresEmpty({ onOpenCreate, onOpenImport, onShortcut, hasActiveFilters, onClearFilters }: EcrituresEmptyProps): React.JSX.Element {
  if (hasActiveFilters) {
    return (
      <div className="saisie-empty-rich">
        <div className="saisie-empty-illu">
          <LuFilterX size={36} />
        </div>
        <h2 className="saisie-empty-title">Aucune écriture pour ces filtres</h2>
        <p className="saisie-empty-desc">
          Aucun résultat ne correspond aux filtres actifs (journal, statut, période ou recherche). Effacez-les pour voir toutes les écritures de l'exercice.
        </p>
        <div className="saisie-empty-actions">
          <button type="button" className="compta-action-btn primary" onClick={onClearFilters}>
            <LuFilterX /> Effacer les filtres
          </button>
        </div>
      </div>
    );
  }

  const shortcuts: ShortcutDef[] = [
    { journal: 'VTE', title: 'Facture de vente', desc: 'Saisie au journal VTE avec TVA', icon: <LuReceipt size={18} /> },
    { journal: 'ACH', title: "Facture d'achat", desc: 'Saisie au journal ACH', icon: <LuShoppingCart size={18} /> },
    { journal: 'BQ', title: 'Écriture de banque', desc: 'Mouvement bancaire / rapprochement', icon: <LuLandmark size={18} /> },
  ];

  return (
    <div className="saisie-empty-rich">
      <div className="saisie-empty-illu">
        <LuFileText size={36} />
      </div>
      <h2 className="saisie-empty-title">Aucune écriture pour cet exercice</h2>
      <p className="saisie-empty-desc">
        Commencez par créer votre première écriture, importer un fichier FEC ou utiliser un raccourci d'opération courante.
      </p>
      <div className="saisie-empty-actions">
        <button type="button" className="compta-action-btn primary" onClick={onOpenCreate}>
          <LuPlus /> Créer une écriture
        </button>
        {onOpenImport && (
          <button type="button" className="compta-action-btn" onClick={onOpenImport}>
            <LuFileUp /> Importer FEC
          </button>
        )}
      </div>

      <div className="saisie-empty-shortcuts">
        <div className="saisie-shortcuts-label">Démarrage rapide</div>
        <div className="saisie-shortcuts-grid">
          {shortcuts.map(s => (
            <button
              key={s.journal}
              type="button"
              className="saisie-shortcut-card"
              onClick={() => onShortcut(s.journal)}
            >
              <div className="saisie-shortcut-icon">{s.icon}</div>
              <div className="saisie-shortcut-content">
                <div className="saisie-shortcut-title">{s.title}</div>
                <div className="saisie-shortcut-desc">{s.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EcrituresEmpty;
