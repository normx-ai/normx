/**
 * Modal d'apercu PDF reutilisable pour toutes les Notes
 * Remplace les ~15 lignes dupliquees dans 47+ fichiers
 */

import React from 'react';
import { LuX, LuPrinter, LuDownload } from 'react-icons/lu';

interface PDFPreviewModalProps {
  previewUrl: string;
  title: string;
  onClose: () => void;
  onDownload: () => void;
  onPrint: () => void;
}

export default function PDFPreviewModal({ previewUrl, title, onClose, onDownload, onPrint }: PDFPreviewModalProps): React.JSX.Element {
  return (
    <div className="etat-preview-overlay" onClick={onClose}>
      <div className="etat-preview-modal" onClick={e => e.stopPropagation()}>
        <div className="etat-preview-header">
          <span>{title}</span>
          <div className="etat-preview-actions">
            <button onClick={onPrint} title="Imprimer"><LuPrinter size={18} /></button>
            <button onClick={onDownload} title="Telecharger"><LuDownload size={18} /></button>
            <button onClick={onClose}><LuX size={18} /></button>
          </div>
        </div>
        <iframe src={previewUrl} className="etat-preview-iframe" title={title} />
      </div>
    </div>
  );
}
