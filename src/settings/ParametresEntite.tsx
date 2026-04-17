import { clientFetch } from '../lib/api';
import React, { useState, useEffect, useCallback } from 'react';
import { ParametresSection, ParametresField } from '../types';

interface EntiteResponse {
  nom: string;
  sigle: string;
  adresse: string;
  nif: string;
  data: Record<string, string> | null;
}

interface SaveErrorResponse {
  error: string;
}

interface ParametresEntiteProps {
  entiteId: number;
  onUpdate?: (data: Record<string, string>) => void;
}

const SECTIONS: ParametresSection[] = [
  {
    title: 'Identification de l\'entité',
    fields: [
      { key: 'nom', label: 'Désignation de l\'entité', col: true },
      { key: 'sigle', label: 'Sigle usuel', col: true },
      { key: 'adresse', label: 'Adresse complète' },
      { key: 'nif', label: 'N° d\'identification' },
      { key: 'num_registre', label: 'N° Registre du Commerce' },
      { key: 'num_repertoire', label: 'N° registre des entités' },
      { key: 'num_cnss', label: 'N° CNSS' },
      { key: 'code_importateur', label: 'Code importateur' },
      { key: 'code_activite_principale', label: 'Code activité principale' },
      { key: 'greffe', label: 'Greffe' },
    ]
  },
  {
    title: 'Exercice comptable',
    fields: [
      { key: 'date_depot', label: 'Date de dépôt', type: 'date' },
      { key: 'date_arrete_comptes', label: 'Date d\'arrêté des comptes', type: 'date' },
      { key: 'exercice_precedent_clos', label: 'Exercice précédent clos le', type: 'date' },
      { key: 'duree_exo_precedent', label: 'Durée exo précédent (en mois)', type: 'number' },
    ]
  },
  {
    title: 'Coordonnées',
    fields: [
      { key: 'telephone', label: 'N° de téléphone' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'code_postal', label: 'Code' },
      { key: 'boite_postale', label: 'Boite postale' },
      { key: 'ville', label: 'Ville' },
    ]
  },
  {
    title: 'Activité',
    fields: [
      { key: 'activite_principale', label: 'Désignation précise de l\'activité principale exercée par l\'entreprise', wide: true },
    ]
  },
  {
    title: 'Contacts et responsables',
    fields: [
      { key: 'personne_contact', label: 'Personne à contacter (Noms, Adresse & Qualité)', wide: true },
      { key: 'professionnel_ef_nom', label: 'Nom du professionnel ayant établi les états financiers' },
      { key: 'professionnel_ef_adresse', label: 'Adresse du professionnel' },
      { key: 'professionnel_ef_tel', label: 'Téléphone du professionnel' },
      { key: 'visa_expert', label: 'Visa de l\'Expert comptable ou du Comptable agréé', wide: true },
      { key: 'signataire_nom', label: 'Nom du signataire des états financiers' },
      { key: 'signataire_qualite', label: 'Qualité du signataire des états financiers' },
      { key: 'date_signature', label: 'Date de signature', type: 'date' },
      { key: 'ag_approuve', label: 'Etats financiers approuvés par l\'AG', placeholder: 'Oui / Non' },
    ]
  },
  {
    title: 'Informations bancaires',
    fields: [
      { key: 'banque', label: 'Banque 1' },
      { key: 'numero_compte', label: 'Numéro de compte 1' },
      { key: 'banque_2', label: 'Banque 2' },
      { key: 'numero_compte_2', label: 'Numéro de compte 2' },
      { key: 'banque_3', label: 'Banque 3' },
      { key: 'numero_compte_3', label: 'Numéro de compte 3' },
      { key: 'banque_4', label: 'Banque 4' },
      { key: 'numero_compte_4', label: 'Numéro de compte 4' },
      { key: 'banque_5', label: 'Banque 5' },
      { key: 'numero_compte_5', label: 'Numéro de compte 5' },
    ]
  },
  {
    title: 'Informations juridiques et fiscales',
    fields: [
      { key: 'forme_juridique', label: 'Forme juridique', placeholder: 'Ex: SA, SARL, Association...' },
      { key: 'code_forme_juridique', label: 'Code forme juridique (DSF)', placeholder: 'Ex: 01' },
      { key: 'regime_fiscal', label: 'Régime fiscal', placeholder: 'Ex: Réel, Simplifié...' },
      { key: 'code_regime_fiscal', label: 'Code régime fiscal (DSF)', placeholder: 'Ex: 01' },
      { key: 'pays_siege', label: 'Pays du siège social' },
      { key: 'code_pays_siege', label: 'Code pays (DSF)', placeholder: 'Ex: 07' },
      { key: 'nb_etablissement_pays', label: 'Nbre d\'établissement dans le pays', type: 'number' },
      { key: 'nb_etablissement_hors', label: 'Nbre d\'établissement hors du pays', type: 'number' },
      { key: 'premiere_annee_exercice', label: 'Première année d\'exercice dans le pays', placeholder: 'Ex: 1945' },
      { key: 'controle_entite', label: 'Contrôle de l\'entité', placeholder: 'public / prive_national / prive_etranger' },
    ]
  },
  {
    title: 'Activité de l\'entité (DSF)',
    fields: [
      { key: 'activite_1_designation', label: 'Activité 1 — Désignation', wide: true },
      { key: 'activite_1_code', label: 'Code nomenclature', placeholder: 'Ex: C3100' },
      { key: 'activite_1_ca_ht', label: 'Chiffre d\'affaires HT', type: 'number' },
      { key: 'activite_1_pct', label: '% activité dans le CA HT', placeholder: 'Ex: 100' },
      { key: 'activite_2_designation', label: 'Activité 2 — Désignation', wide: true },
      { key: 'activite_2_code', label: 'Code nomenclature' },
      { key: 'activite_2_ca_ht', label: 'Chiffre d\'affaires HT', type: 'number' },
      { key: 'activite_2_pct', label: '% activité dans le CA HT' },
      { key: 'activite_divers_ca_ht', label: 'Divers — CA HT', type: 'number' },
    ]
  },
  {
    title: 'Dirigeants',
    fields: [
      { key: 'dirigeant_1_nom', label: 'Dirigeant 1 — Nom' },
      { key: 'dirigeant_1_prenoms', label: 'Prénoms' },
      { key: 'dirigeant_1_qualite', label: 'Qualité', placeholder: 'Ex: PCA, DG, Gérant...' },
      { key: 'dirigeant_1_nif', label: 'N° identification fiscale' },
      { key: 'dirigeant_1_adresse', label: 'Adresse (BP, ville, pays)' },
      { key: 'dirigeant_2_nom', label: 'Dirigeant 2 — Nom' },
      { key: 'dirigeant_2_prenoms', label: 'Prénoms' },
      { key: 'dirigeant_2_qualite', label: 'Qualité' },
      { key: 'dirigeant_2_nif', label: 'N° identification fiscale' },
      { key: 'dirigeant_2_adresse', label: 'Adresse (BP, ville, pays)' },
      { key: 'dirigeant_3_nom', label: 'Dirigeant 3 — Nom' },
      { key: 'dirigeant_3_prenoms', label: 'Prénoms' },
      { key: 'dirigeant_3_qualite', label: 'Qualité' },
      { key: 'dirigeant_3_nif', label: 'N° identification fiscale' },
      { key: 'dirigeant_3_adresse', label: 'Adresse (BP, ville, pays)' },
      { key: 'dirigeant_4_nom', label: 'Dirigeant 4 — Nom' },
      { key: 'dirigeant_4_prenoms', label: 'Prénoms' },
      { key: 'dirigeant_4_qualite', label: 'Qualité' },
      { key: 'dirigeant_4_nif', label: 'N° identification fiscale' },
      { key: 'dirigeant_4_adresse', label: 'Adresse (BP, ville, pays)' },
      { key: 'dirigeant_5_nom', label: 'Dirigeant 5 — Nom' },
      { key: 'dirigeant_5_prenoms', label: 'Prénoms' },
      { key: 'dirigeant_5_qualite', label: 'Qualité' },
      { key: 'dirigeant_5_nif', label: 'N° identification fiscale' },
      { key: 'dirigeant_5_adresse', label: 'Adresse (BP, ville, pays)' },
    ]
  },
  {
    title: 'Membres du Conseil d\'Administration',
    fields: [
      { key: 'membre_ca_1_nom', label: 'Membre 1 — Nom' },
      { key: 'membre_ca_1_prenoms', label: 'Prénoms' },
      { key: 'membre_ca_1_qualite', label: 'Qualité' },
      { key: 'membre_ca_1_adresse', label: 'Adresse (BP, ville, pays)' },
      { key: 'membre_ca_2_nom', label: 'Membre 2 — Nom' },
      { key: 'membre_ca_2_prenoms', label: 'Prénoms' },
      { key: 'membre_ca_2_qualite', label: 'Qualité' },
      { key: 'membre_ca_2_adresse', label: 'Adresse (BP, ville, pays)' },
      { key: 'membre_ca_3_nom', label: 'Membre 3 — Nom' },
      { key: 'membre_ca_3_prenoms', label: 'Prénoms' },
      { key: 'membre_ca_3_qualite', label: 'Qualité' },
      { key: 'membre_ca_3_adresse', label: 'Adresse (BP, ville, pays)' },
      { key: 'membre_ca_4_nom', label: 'Membre 4 — Nom' },
      { key: 'membre_ca_4_prenoms', label: 'Prénoms' },
      { key: 'membre_ca_4_qualite', label: 'Qualité' },
      { key: 'membre_ca_4_adresse', label: 'Adresse (BP, ville, pays)' },
      { key: 'membre_ca_5_nom', label: 'Membre 5 — Nom' },
      { key: 'membre_ca_5_prenoms', label: 'Prénoms' },
      { key: 'membre_ca_5_qualite', label: 'Qualité' },
      { key: 'membre_ca_5_adresse', label: 'Adresse (BP, ville, pays)' },
    ]
  },
];

// Fields stored as top-level columns in entites table
const TOP_LEVEL_KEYS: string[] = ['nom', 'sigle', 'adresse', 'nif'];

function ParametresEntite({ entiteId, onUpdate }: ParametresEntiteProps): React.ReactElement | null {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  const loadEntite = useCallback(async (): Promise<void> => {
    if (!entiteId) return;
    setLoading(true);
    try {
      const res: Response = await clientFetch(`/api/entites/${entiteId}`);
      if (res.ok) {
        const entite: EntiteResponse = await res.json();
        // Merge top-level fields and JSONB data
        const merged: Record<string, string> = {
          nom: entite.nom || '',
          sigle: entite.sigle || '',
          adresse: entite.adresse || '',
          nif: entite.nif || '',
          ...(entite.data || {}),
        };
        setFormData(merged);
      }
    } catch (_e) { /* network error */ }
    setLoading(false);
  }, [entiteId]);

  useEffect(() => { loadEntite(); }, [loadEntite]);

  const handleChange = (key: string, value: string): void => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      // Separate top-level fields from data
      const topLevel: Record<string, string> = {};
      const data: Record<string, string> = {};
      Object.entries(formData).forEach(([k, v]) => {
        if (TOP_LEVEL_KEYS.includes(k)) topLevel[k] = v;
        else data[k] = v;
      });

      const res: Response = await clientFetch(`/api/entites/${entiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...topLevel, data }),
      });
      if (res.ok) {
        setSaved(true);
        if (onUpdate) onUpdate(formData);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const err: SaveErrorResponse = await res.json();
        alert(err.error || 'Erreur lors de la sauvegarde.');
      }
    } catch (_e) { alert('Erreur réseau.'); }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Chargement...</div>;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>Paramètres de l'entité</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888' }}>Base de données — Informations pour la DSF et les états financiers</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 28px', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            background: saved ? '#059669' : '#D4A843', color: '#fff',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>

      {/* Sections */}
      {SECTIONS.map((section: ParametresSection, si: number) => (
        <div key={si} style={{ marginBottom: 24, background: '#fff', border: '1px solid #e2e5ea', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{
            background: '#1A3A5C', color: '#fff', padding: '12px 18px',
            fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            {section.title}
          </div>
          <div style={{ padding: '18px 18px 10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px 24px' }}>
              {section.fields.map((field: ParametresField) => (
                <div key={field.key} style={{ gridColumn: field.wide ? 'span 2' : 'auto' }}>
                  <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 5, fontWeight: 500 }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type || 'text'}
                    value={formData[field.key] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder || ''}
                    style={{
                      width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 4,
                      fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box',
                      background: '#fafbfc',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Bottom save */}
      <div style={{ textAlign: 'right', paddingBottom: 40 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 28px', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            background: saved ? '#059669' : '#D4A843', color: '#fff',
          }}
        >
          {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  );
}

export default ParametresEntite;
