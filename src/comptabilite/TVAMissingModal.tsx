import React from 'react';
import { LuX } from 'react-icons/lu';

interface TVAMissingModalProps {
  eNif: string;
  eAdresse: string;
  onClose: () => void;
  onGoToParametres?: () => void;
}

function TVAMissingModal({ eNif, eAdresse, onClose, onGoToParametres }: TVAMissingModalProps): React.ReactElement {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: '24px 28px', maxWidth: 460, width: '90%', boxShadow: '0 8px 30px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>Impossible de gérer la déclaration de TVA</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <LuX size={18} color="#888" />
          </button>
        </div>
        <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 14 }}>
          Ajoutez les informations suivantes dans les paramètres de votre entité pour gérer votre déclaration de TVA :
        </p>
        <ul style={{ fontSize: 14, color: '#333', marginBottom: 20, paddingLeft: 20 }}>
          {!eNif && <li style={{ marginBottom: 4 }}>NIF (Numéro d&apos;Identification Fiscale)</li>}
          {!eAdresse && <li style={{ marginBottom: 4 }}>Adresse complète</li>}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => { onClose(); if (onGoToParametres) onGoToParametres(); }}
            style={{
              padding: '10px 20px', border: 'none', borderRadius: 4, background: '#D4A843',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Ajouter des informations
          </button>
        </div>
      </div>
    </div>
  );
}

export default TVAMissingModal;
