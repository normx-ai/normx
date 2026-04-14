import React from 'react';
import { LuBuilding2, LuUsers, LuCreditCard, LuChartBar, LuSettings } from 'react-icons/lu';
import { Entite } from '../types';

interface CabinetPanelProps {
  cabinet: Entite | undefined;
  clientsCount: number;
}

export default function CabinetPanel({ cabinet, clientsCount }: CabinetPanelProps): React.ReactElement {
  if (!cabinet) {
    return (
      <div className="cabinet-panel">
        <div className="cabinet-panel-empty">Aucun cabinet configuré.</div>
      </div>
    );
  }

  return (
    <div className="cabinet-panel">
      <header className="cabinet-panel-header">
        <div className="cabinet-panel-icon"><LuBuilding2 size={28} /></div>
        <div>
          <h2 className="cabinet-panel-title">{cabinet.nom}</h2>
          <p className="cabinet-panel-subtitle">Gestion du cabinet</p>
        </div>
      </header>

      <section className="cabinet-panel-section">
        <h3 className="cabinet-panel-section-title">Informations</h3>
        <div className="cabinet-panel-grid">
          <div className="cabinet-panel-field">
            <span className="cabinet-panel-label">Nom</span>
            <span className="cabinet-panel-value">{cabinet.nom}</span>
          </div>
          {cabinet.sigle && (
            <div className="cabinet-panel-field">
              <span className="cabinet-panel-label">Sigle</span>
              <span className="cabinet-panel-value">{cabinet.sigle}</span>
            </div>
          )}
          {cabinet.nif && (
            <div className="cabinet-panel-field">
              <span className="cabinet-panel-label">NIF</span>
              <span className="cabinet-panel-value">{cabinet.nif}</span>
            </div>
          )}
          {cabinet.adresse && (
            <div className="cabinet-panel-field">
              <span className="cabinet-panel-label">Adresse</span>
              <span className="cabinet-panel-value">{cabinet.adresse}</span>
            </div>
          )}
          {cabinet.telephone && (
            <div className="cabinet-panel-field">
              <span className="cabinet-panel-label">Téléphone</span>
              <span className="cabinet-panel-value">{cabinet.telephone}</span>
            </div>
          )}
          {cabinet.email && (
            <div className="cabinet-panel-field">
              <span className="cabinet-panel-label">Email</span>
              <span className="cabinet-panel-value">{cabinet.email}</span>
            </div>
          )}
          <div className="cabinet-panel-field">
            <span className="cabinet-panel-label">Dossiers gérés</span>
            <span className="cabinet-panel-value">{clientsCount}</span>
          </div>
        </div>
      </section>

      <section className="cabinet-panel-section">
        <h3 className="cabinet-panel-section-title">Gestion</h3>
        <div className="cabinet-panel-cards">
          <div className="cabinet-panel-card disabled">
            <LuUsers size={20} />
            <div>
              <strong>Équipe</strong>
              <small>Bientôt disponible</small>
            </div>
          </div>
          <div className="cabinet-panel-card disabled">
            <LuCreditCard size={20} />
            <div>
              <strong>Abonnement</strong>
              <small>Bientôt disponible</small>
            </div>
          </div>
          <div className="cabinet-panel-card disabled">
            <LuChartBar size={20} />
            <div>
              <strong>Statistiques</strong>
              <small>Bientôt disponible</small>
            </div>
          </div>
          <div className="cabinet-panel-card disabled">
            <LuSettings size={20} />
            <div>
              <strong>Paramètres</strong>
              <small>Bientôt disponible</small>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
