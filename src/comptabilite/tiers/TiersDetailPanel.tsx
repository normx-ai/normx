// Fiche detail d'un tiers selectionne avec actions modifier / supprimer.

import React from 'react';
import { LuPenLine, LuTrash2, LuX } from 'react-icons/lu';
import { TiersItem, getTypeConfig } from './tiersTypes';

interface Props {
  tiers: TiersItem;
  onClose: () => void;
  onEdit: (t: TiersItem) => void;
  onDelete: (id: number) => void;
}

export function TiersDetailPanel({ tiers, onClose, onEdit, onDelete }: Props): React.JSX.Element {
  return (
    <div className="tiers-detail-panel">
      <div className="tiers-detail-header">
        <h3>{tiers.nom}</h3>
        <button className="overlay-close-btn" onClick={onClose}><LuX /></button>
      </div>
      <div className="tiers-detail-body">
        <div className="tiers-detail-row">
          <span className="tiers-detail-label">Type</span>
          <span>{getTypeConfig(tiers.type).label}</span>
        </div>
        <div className="tiers-detail-row">
          <span className="tiers-detail-label">Code</span>
          <span>{tiers.code_tiers || '—'}</span>
        </div>
        <div className="tiers-detail-row">
          <span className="tiers-detail-label">Compte comptable</span>
          <span>{tiers.compte_comptable || '—'}</span>
        </div>
        <div className="tiers-detail-row">
          <span className="tiers-detail-label">Telephone</span>
          <span>{tiers.telephone || '—'}</span>
        </div>
        <div className="tiers-detail-row">
          <span className="tiers-detail-label">Email</span>
          <span>{tiers.email || '—'}</span>
        </div>
        <div className="tiers-detail-row">
          <span className="tiers-detail-label">Adresse</span>
          <span>{tiers.adresse || '—'}</span>
        </div>
        {tiers.data?.contact_nom && (
          <div className="tiers-detail-row">
            <span className="tiers-detail-label">Contact</span>
            <span>{tiers.data.contact_nom}{tiers.data.contact_fonction ? ' — ' + tiers.data.contact_fonction : ''}</span>
          </div>
        )}
        {tiers.data?.notes && (
          <div className="tiers-detail-row">
            <span className="tiers-detail-label">Notes</span>
            <span>{tiers.data.notes}</span>
          </div>
        )}
        <div className="tiers-detail-actions">
          <button className="compta-action-btn" onClick={() => onEdit(tiers)}><LuPenLine /> Modifier</button>
          <button
            className="compta-action-btn"
            style={{ color: '#dc2626', borderColor: '#dc2626' }}
            onClick={() => onDelete(tiers.id)}
          ><LuTrash2 /> Supprimer</button>
        </div>
      </div>
    </div>
  );
}
