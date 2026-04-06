import React from 'react';
import { LuX } from 'react-icons/lu';

interface TVAFilePanelProps {
  entiteName: string;
  entiteSigle: string;
  entiteNif: string;
  entiteAdresse: string;
  onClose: () => void;
}

function TVAFilePanel({ entiteName, entiteSigle, entiteNif, entiteAdresse, onClose }: TVAFilePanelProps): React.ReactElement {
  return (
    <div style={{ width: 320, borderLeft: '1px solid #e2e5ea', background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e5ea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Fichiers</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          <LuX size={16} color="#888" />
        </button>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{
          border: '2px dashed #ccc', borderRadius: 8, padding: '30px 16px', textAlign: 'center',
          color: '#888', fontSize: 13, cursor: 'pointer', background: '#fafafa',
        }}>
          <span>Glisser, déposer un fichier ici ou <span style={{ color: '#D4A843', textDecoration: 'underline' }}>explorer</span></span>
        </div>
      </div>
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Espace de stockage</div>
        <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, overflow: 'hidden' }}>
          <div style={{ background: '#D4A843', height: '100%', width: '5%', borderRadius: 4 }} />
        </div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>0 Mo / 100 Mo utilisés</div>
      </div>
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>Infos société</div>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
          <div><strong>Nom :</strong> {entiteName || '\u2014'}</div>
          <div><strong>Sigle :</strong> {entiteSigle || '\u2014'}</div>
          <div><strong>NIF :</strong> {entiteNif || '\u2014'}</div>
          <div><strong>Adresse :</strong> {entiteAdresse || '\u2014'}</div>
        </div>
      </div>
    </div>
  );
}

export default TVAFilePanel;
