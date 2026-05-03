import { useMemo } from 'react';
import type {
  TableauBordData, DashboardKpis, EvolutionPoint, DashboardRatios, Echeance,
} from './types';

const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const MOIS_BADGES = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEP', 'OCT', 'NOV', 'DÉC'];

const fmtBadgeDate = (d: Date): { day: string; month: string } => ({
  day: String(d.getDate()).padStart(2, '0'),
  month: MOIS_BADGES[d.getMonth()],
});

const daysBetween = (a: Date, b: Date): number =>
  Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));

function buildEcheances(): Echeance[] {
  const today = new Date();
  const result: Echeance[] = [];

  // TVA et ITS : 15 du mois suivant
  const nextMonth15 = new Date(today.getFullYear(), today.getMonth() + (today.getDate() > 15 ? 1 : 0), 15);
  if (nextMonth15 < today) nextMonth15.setMonth(nextMonth15.getMonth() + 1);
  const tvaInfo = fmtBadgeDate(nextMonth15);
  const tvaDays = daysBetween(today, nextMonth15);
  result.push({ ...tvaInfo, title: 'TVA — Déclaration mensuelle', desc: 'Régime normal Congo · CGI Art. 350', daysLeft: tvaDays });
  result.push({ ...tvaInfo, title: 'ITS — Impôt sur les salaires', desc: 'Retenue à la source mensuelle', daysLeft: tvaDays });

  // IS : acomptes 15/03, 15/06, 15/09, 15/12
  const acomptesIS = [2, 5, 8, 11].map(m => new Date(today.getFullYear(), m, 15));
  const nextIS = acomptesIS.find(d => d > today);
  if (nextIS) {
    const isInfo = fmtBadgeDate(nextIS);
    const trim = ['1er', '2ème', '3ème', '4ème'][acomptesIS.indexOf(nextIS)];
    result.push({ ...isInfo, title: `IS — ${trim} acompte`, desc: 'Impôt sur les sociétés', daysLeft: daysBetween(today, nextIS) });
  }

  // CNSS : 20 du mois
  const nextCnss = new Date(today.getFullYear(), today.getMonth() + (today.getDate() > 20 ? 1 : 0), 20);
  result.push({
    ...fmtBadgeDate(nextCnss),
    title: 'CNSS — Cotisations sociales',
    desc: 'Caisse Nationale Sécurité Sociale',
    daysLeft: daysBetween(today, nextCnss),
  });

  return result.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 4);
}

export interface UseDashboardComputedResult {
  kpis: DashboardKpis | null;
  evolution: EvolutionPoint[];
  ratios: DashboardRatios | null;
  echeances: Echeance[];
}

export function useDashboardComputed(tableauBord: TableauBordData | undefined): UseDashboardComputedResult {
  const kpis = useMemo<DashboardKpis | null>(() => {
    if (!tableauBord) return null;
    const { classes, mensuel, tresorerie } = tableauBord;
    const ca = mensuel.reduce((s, m) => s + (m.produits || 0), 0);
    const charges = mensuel.reduce((s, m) => s + (m.charges || 0), 0);
    const resultat = ca - charges;
    const tresoNet = tresorerie.debit - tresorerie.credit;
    const cls3 = classes.find(c => c.classe === '3');
    const cls4 = classes.find(c => c.classe === '4');
    const stocks = cls3 ? Math.max(0, cls3.debit - cls3.credit) : 0;
    const creances = cls4 ? Math.max(0, cls4.debit - cls4.credit) : 0;
    const dettes = cls4 ? Math.max(0, cls4.credit - cls4.debit) : 0;
    const bfr = stocks + creances - dettes;
    const dso = ca > 0 ? Math.round((creances * 365) / ca) : 0;
    return { ca, charges, resultat, tresoNet, bfr, dso, marge: ca > 0 ? (resultat / ca) * 100 : 0 };
  }, [tableauBord]);

  const evolution = useMemo<EvolutionPoint[]>(() => {
    if (!tableauBord?.mensuel) return [];
    const map = new Map<number, { produits: number; charges: number }>();
    for (const m of tableauBord.mensuel) map.set(m.mois, { produits: m.produits, charges: m.charges });
    let cumul = 0;
    return MOIS_COURTS.map((mois, idx) => {
      const m = map.get(idx + 1);
      cumul += m?.produits || 0;
      return {
        mois,
        ca: m?.produits || 0,
        charges: m?.charges || 0,
        resultat: (m?.produits || 0) - (m?.charges || 0),
        cumulCa: cumul,
      };
    });
  }, [tableauBord]);

  const ratios = useMemo<DashboardRatios | null>(() => {
    if (!tableauBord || !kpis) return null;
    const { classes } = tableauBord;
    const cls1 = classes.find(c => c.classe === '1');
    const cls3 = classes.find(c => c.classe === '3');
    const cls4 = classes.find(c => c.classe === '4');
    const cls5 = classes.find(c => c.classe === '5');
    const capitauxPropres = cls1 ? Math.max(0, cls1.credit - cls1.debit) : 0;
    const dettesCT = cls4 ? Math.max(0, cls4.credit - cls4.debit) : 0;
    const stocks = cls3 ? Math.max(0, cls3.debit - cls3.credit) : 0;
    const creances = cls4 ? Math.max(0, cls4.debit - cls4.credit) : 0;
    const treso = cls5 ? Math.max(0, cls5.debit - cls5.credit) : 0;
    const totalActif = capitauxPropres + dettesCT;
    const liquidite = dettesCT > 0 ? (stocks + creances + treso) / dettesCT : 0;
    const autonomie = totalActif > 0 ? (capitauxPropres / totalActif) * 100 : 0;
    return { liquidite, autonomie, dso: kpis.dso, marge: kpis.marge };
  }, [tableauBord, kpis]);

  const echeances = useMemo<Echeance[]>(() => buildEcheances(), []);

  return { kpis, evolution, ratios, echeances };
}
