import React from 'react';
import { LuTriangleAlert, LuTrash2, LuArchive } from 'react-icons/lu';
import './ConfirmModal.css';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'archive' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ open, title, message, confirmLabel, cancelLabel = 'Annuler', variant = 'danger', onConfirm, onCancel }: ConfirmModalProps): React.ReactElement | null {
  if (!open) return null;

  const icon = variant === 'archive' ? <LuArchive size={28} /> : variant === 'warning' ? <LuTriangleAlert size={28} /> : <LuTrash2 size={28} />;
  const defaultConfirmLabel = variant === 'archive' ? 'Archiver' : 'Supprimer';
  const label = confirmLabel || defaultConfirmLabel;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        <div className={`confirm-icon confirm-icon-${variant}`}>{icon}</div>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn-cancel" onClick={onCancel}>{cancelLabel}</button>
          <button className={`confirm-btn-action confirm-btn-${variant}`} onClick={onConfirm}>{label}</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
