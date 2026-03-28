import React from 'react';

interface SalarieInfo {
  prenom: string;
  nom: string;
  code: string;
}

interface AssistantDeclarationsProps {
  salarie: SalarieInfo;
  onClose: () => void;
}

function AssistantDeclarations({ salarie, onClose }: AssistantDeclarationsProps) {
  return (
    <div className="wizard-overlay">
      <div className="mini-modal">
        <h4>Salarié créé avec succès</h4>
        <p style={{ fontSize: 13, color: '#374151', marginBottom: 16 }}>
          Le salarié <strong>{salarie.prenom} {salarie.nom}</strong> (code: {salarie.code}) a été ajouté.
        </p>
        <div className="wizard-alert info">
          <span>Pensez à vérifier les déclarations CNSS et CAMU pour ce salarié.</span>
        </div>
        <div className="mini-modal-actions">
          <button className="btn-mini-save" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

export default AssistantDeclarations;
