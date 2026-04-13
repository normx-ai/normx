import React from 'react';
import { LuBuilding2, LuExternalLink, LuPenLine, LuTrash2 } from 'react-icons/lu';
import { Entite, NormxModule, TypeActivite } from '../../types';
import { MODULE_LABELS } from './ClientFormModal';

interface ClientsTableProps {
  entites: Entite[];
  currentEntiteId: number;
  onSelectEntite: (ent: Entite) => void;
  onOpenModule: (ent: Entite, mod: NormxModule) => void;
  onEdit: (ent: Entite) => void;
  onDelete: (id: number, nom: string, slug?: string) => void;
}

function getTypeLabel(t: TypeActivite): string {
  switch (t) {
    case 'entreprise': return 'Entreprise';
    case 'association': return 'Association';
    case 'ordre_professionnel': return 'Ordre professionnel';
    case 'projet_developpement': return 'Projet';
    case 'smt': return 'Entreprise (SMT)';
    default: return t;
  }
}

function ClientsTable({ entites, currentEntiteId, onSelectEntite, onOpenModule, onEdit, onDelete }: ClientsTableProps): React.ReactElement {
  return (
    <div className="gc-table-wrap">
      <table className="gc-table">
        <thead>
          <tr>
            <th></th>
            <th>Nom</th>
            <th>Type d'entité</th>
            <th>Modules</th>
            <th>Téléphone</th>
            <th>E-mail</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {entites.length === 0 && (
            <tr><td colSpan={7} className="gc-empty">Aucun client trouvé.</td></tr>
          )}
          {entites.map((ent) => (
            <tr key={ent.id} className={ent.id === currentEntiteId ? 'gc-row-active' : ''}>
              <td className="gc-icon-cell"><LuBuilding2 size={18} /></td>
              <td>
                <button className="gc-name-link" onClick={() => onSelectEntite(ent)}>
                  {ent.nom}
                </button>
                {ent.sigle && <span className="gc-sigle">{ent.sigle}</span>}
              </td>
              <td>
                <span className={`gc-type-badge ${ent.type_activite}`}>{getTypeLabel(ent.type_activite)}</span>
              </td>
              <td>
                <div className="gc-modules">
                  {(ent.modules || []).map((mod) => {
                    const info = MODULE_LABELS[mod];
                    if (!info) return null;
                    const ModIcon = info.icon;
                    return (
                      <button
                        key={mod}
                        className="gc-module-tag"
                        style={{ borderColor: info.color, color: info.color }}
                        onClick={() => onOpenModule(ent, mod as NormxModule)}
                        title={`Ouvrir ${info.label}`}
                      >
                        <ModIcon size={12} /> {info.label}
                      </button>
                    );
                  })}
                </div>
              </td>
              <td className="gc-cell-light">{ent.telephone || '-'}</td>
              <td className="gc-cell-light">{ent.email || '-'}</td>
              <td>
                <div className="gc-actions">
                  <button className="gc-action-btn" title="Ouvrir" onClick={() => onSelectEntite(ent)}>
                    <LuExternalLink size={15} />
                  </button>
                  <button className="gc-action-btn" title="Modifier" onClick={() => onEdit(ent)}>
                    <LuPenLine size={15} />
                  </button>
                  <button className="gc-action-btn gc-action-danger" title="Désactiver" onClick={() => onDelete(ent.id, ent.nom, ent.slug)}>
                    <LuTrash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ClientsTable;
