/**
 * Calcul des heures supplementaires par convention - Congo-Brazzaville
 * Les taux sont definis par convention collective dans conventionsRubriques.ts
 */
import type { HeureSupConvention } from '../types/paie.types';
import { CONVENTIONS_RUBRIQUES } from './conventionsRubriques';

export interface HeuresSupInput {
  salaireHoraire: number;
  heuresNormales: number;
  heuresTravaillees: number;
  conventionCode: string;
  heuresNuit: number;
  heuresDimancheFerie: number;
}

export interface HeuresSupDetail {
  label: string;
  heures: number;
  taux: number;
  montant: number;
}

export interface HeuresSupResult {
  totalHeuresSup: number;
  montantTotal: number;
  detail: HeuresSupDetail[];
}

function getTranches(conventionCode: string): HeureSupConvention[] {
  const convention = CONVENTIONS_RUBRIQUES[conventionCode];
  if (convention && convention.heuresSupp.length > 0) {
    return convention.heuresSupp;
  }
  // Convention generale par defaut
  return CONVENTIONS_RUBRIQUES[''].heuresSupp;
}

export function calculerHeuresSupplementaires(input: HeuresSupInput): HeuresSupResult {
  const { salaireHoraire, heuresNormales, heuresTravaillees, conventionCode, heuresNuit, heuresDimancheFerie } = input;
  const tranches = getTranches(conventionCode);
  const detail: HeuresSupDetail[] = [];

  // Heures sup normales (jour)
  const heuresSupJour = Math.max(0, heuresTravaillees - heuresNormales);
  let heuresRestantes = heuresSupJour;

  // Tranches horaires (celles avec de/a, pas de type special)
  const tranchesHoraires = tranches.filter(t => t.de !== undefined && t.a !== undefined);

  for (const tranche of tranchesHoraires) {
    if (heuresRestantes <= 0) break;
    const de = (tranche.de ?? 0) - heuresNormales;
    const a = (tranche.a ?? 999) - heuresNormales;
    const debutTranche = Math.max(0, de);
    const finTranche = a;
    const largeur = finTranche - debutTranche;

    if (largeur <= 0) continue;

    const heuresDansTranche = Math.min(heuresRestantes, largeur);
    if (heuresDansTranche > 0) {
      const montant = Math.round(salaireHoraire * heuresDansTranche * tranche.taux / 100);
      detail.push({
        label: tranche.label,
        heures: heuresDansTranche,
        taux: tranche.taux,
        montant,
      });
      heuresRestantes -= heuresDansTranche;
    }
  }

  // Heures de nuit
  if (heuresNuit > 0) {
    const trancheNuit = tranches.find(t => t.type === 'nuit');
    const tauxNuit = trancheNuit ? trancheNuit.taux : 50;
    const labelNuit = trancheNuit ? trancheNuit.label : '+50% (nuit)';
    const montant = Math.round(salaireHoraire * heuresNuit * tauxNuit / 100);
    detail.push({
      label: labelNuit,
      heures: heuresNuit,
      taux: tauxNuit,
      montant,
    });
  }

  // Heures dimanche/ferie
  if (heuresDimancheFerie > 0) {
    const trancheDimFerie = tranches.find(t => t.type === 'dimanche_ferie');
    const tauxDF = trancheDimFerie ? trancheDimFerie.taux : 100;
    const labelDF = trancheDimFerie ? trancheDimFerie.label : '+100% (dim/feries)';
    const montant = Math.round(salaireHoraire * heuresDimancheFerie * tauxDF / 100);
    detail.push({
      label: labelDF,
      heures: heuresDimancheFerie,
      taux: tauxDF,
      montant,
    });
  }

  const montantTotal = detail.reduce((s, d) => s + d.montant, 0);
  const totalHeuresSup = detail.reduce((s, d) => s + d.heures, 0);

  return { totalHeuresSup, montantTotal, detail };
}
