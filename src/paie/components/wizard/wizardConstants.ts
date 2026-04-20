// Constantes et helpers du wizard d'etablissement (Congo).

import CONFIG_CONGO from '../../data/configCongo';
import type { EtablissementFormData } from '../wizardTypes';

export interface StepLabel {
  id: string;
  label: string;
  num: number;
}

export const STEP_LABELS: StepLabel[] = CONFIG_CONGO.steps.map((s, i) => ({
  id: s,
  label: s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
  num: i + 1,
}));

export const EMPTY_FORM: EtablissementFormData = {
  raison_sociale: '',
  nui: '',
  adresse: { numero: '', voie: '', complement: '', code_postal: '', ville: '' },
  banques: [],
  contacts: [],
  organismes: {},
  param_organismes: {},
  taux: {},
  parametres: {
    planning: CONFIG_CONGO.planningDefaults,
    paiement: { mode: 'Virement', jour: 'Dernier jour du mois' },
  },
  retraite: {},
  specificites: {},
};

export function mergeInitial(data?: EtablissementFormData): EtablissementFormData {
  if (!data) return EMPTY_FORM;
  return {
    ...EMPTY_FORM,
    ...data,
    adresse: { ...EMPTY_FORM.adresse, ...(data.adresse || {}) },
    banques: data.banques || [],
    contacts: data.contacts || [],
    organismes: data.organismes || {},
    param_organismes: data.param_organismes || {},
    taux: data.taux || {},
    parametres: {
      planning: { ...EMPTY_FORM.parametres.planning, ...(data.parametres?.planning || {}) },
      paiement: { ...EMPTY_FORM.parametres.paiement, ...(data.parametres?.paiement || {}) },
    },
    retraite: data.retraite || {},
    specificites: data.specificites || {},
  };
}
