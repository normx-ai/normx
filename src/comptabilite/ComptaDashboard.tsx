/**
 * Tableau de bord Comptabilite — Dashboard de l'accueil compta.
 * Connecte aux endpoints existants /api/ecritures/rapports/tableau-bord,
 * /api/ecritures/balance-tiers et /api/ecritures liste pour activite.
 *
 * KPIs : CA, Resultat net, Tresorerie, BFR
 * Graphes : evolution mensuelle CA/charges, repartition tresorerie
 * Panels : top clients, activite recente, ratios, echeances fiscales
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, AreaChart,
} from 'recharts';
import {
  LuTrendingUp, LuTrendingDown, LuWallet, LuPiggyBank, LuChartBar,
  LuPenLine, LuFileText, LuArrowLeftRight,
} from 'react-icons/lu';
import { clientFetch } from '../lib/api';
import { api } from '../lib/apiEndpoints';
import './ComptaDashboard.css';

interface Props {
  entiteName: string;
  entiteId: number;
  exerciceId: number | null;
  exerciceAnnee: number;
  userName: string;
  openTab: (id: string) => void;
}

interface TableauBordData {
  classes: { classe: string; debit: number; credit: number }[];
  mensuel: { mois: number; produits: number; charges: number }[];
  tresorerie: { debit: number; credit: number };
}

interface BalanceTiersRow {
  tiers_id: number;
  tiers_nom: string;
  tiers_code?: string;
  type: string;
  debit: number;
  credit: number;
}

interface EcritureRow {
  id: number;
  date_ecriture: string;
  numero_piece: string | null;
  libelle: string | null;
  journal_code: string | null;
  total_debit: number;
  total_credit: number;
}

const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function fmtMontant(v: number, opts?: { decimals?: number; abbreviate?: boolean }): string {
  const decimals = opts?.decimals ?? 0;
  if (opts?.abbreviate) {
    const abs = Math.abs(v);
    if (abs >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace('.', ',') + ' Md';
    if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.', ',') + ' M';
    if (abs >= 1_000) return (v / 1_000).toFixed(0) + ' k';
    return Math.round(v).toString();
  }
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);
}

function ComptaDashboard({ entiteName, entiteId, exerciceId, exerciceAnnee, userName, openTab }: Props): React.ReactElement {
  const enabled = !!entiteId && !!exerciceId;

  const { data: tableauBord, isLoading: tbLoading } = useQuery<TableauBordData>({
    queryKey: ['compta-dashboard-tb', entiteId, exerciceId],
    queryFn: async () => {
      const r = await clientFetch(api.ecritures.rapports.tableauBord(entiteId, exerciceId as number));
      if (!r.ok) throw new Error('Erreur tableau de bord');
      return r.json();
    },
    enabled,
    staleTime: 60_000,
  });

  const { data: clientsTiers = [] } = useQuery<BalanceTiersRow[]>({
    queryKey: ['compta-dashboard-clients', entiteId, exerciceId],
    queryFn: async () => {
      const r = await clientFetch(api.ecritures.balanceTiers(entiteId, exerciceId as number, { type: 'client' }));
      if (!r.ok) throw new Error('Erreur tiers clients');
      return r.json();
    },
    enabled,
    staleTime: 60_000,
  });

  const { data: ecrituresRecentes = [] } = useQuery<EcritureRow[]>({
    queryKey: ['compta-dashboard-ecritures', entiteId, exerciceId],
    queryFn: async () => {
      const r = await clientFetch(api.ecritures.list(entiteId, exerciceId as number, { limit: 5, order: 'desc' }));
      if (!r.ok) throw new Error('Erreur ecritures');
      const data = await r.json();
      return Array.isArray(data) ? data : (data.rows || []);
    },
    enabled,
    staleTime: 30_000,
  });

  const kpis = useMemo(() => {
    if (!tableauBord) return null;
    const { classes, mensuel, tresorerie } = tableauBord;

    const ca = mensuel.reduce((s, m) => s + (m.produits || 0), 0);
    const charges = mensuel.reduce((s, m) => s + (m.charges || 0), 0);
    const resultat = ca - charges;
    const tresoNet = tresorerie.debit - tresorerie.credit;

    // BFR = (creances + stocks) - dettes circulantes (approx classe 4 actif - passif)
    const cls3 = classes.find(c => c.classe === '3');
    const cls4 = classes.find(c => c.classe === '4');
    const stocks = cls3 ? Math.max(0, cls3.debit - cls3.credit) : 0;
    const creances = cls4 ? Math.max(0, cls4.debit - cls4.credit) : 0;
    const dettes = cls4 ? Math.max(0, cls4.credit - cls4.debit) : 0;
    const bfr = stocks + creances - dettes;
    const dso = ca > 0 ? Math.round((creances * 365) / ca) : 0;

    return { ca, charges, resultat, tresoNet, bfr, dso, marge: ca > 0 ? (resultat / ca) * 100 : 0 };
  }, [tableauBord]);

  const evolution = useMemo(() => {
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

  const ratios = useMemo(() => {
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

  const echeances = useMemo(() => {
    const today = new Date();
    const result: { day: string; month: string; title: string; desc: string; daysLeft: number }[] = [];
    const fmt = (d: Date) => ({
      day: String(d.getDate()).padStart(2, '0'),
      month: ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEP', 'OCT', 'NOV', 'DÉC'][d.getMonth()],
    });
    const daysBetween = (a: Date, b: Date) => Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));

    // TVA et ITS : 15 du mois suivant
    const nextMonth15 = new Date(today.getFullYear(), today.getMonth() + (today.getDate() > 15 ? 1 : 0), 15);
    if (nextMonth15 < today) nextMonth15.setMonth(nextMonth15.getMonth() + 1);
    const tvaInfo = fmt(nextMonth15);
    result.push({
      ...tvaInfo,
      title: 'TVA — Déclaration mensuelle',
      desc: 'Régime normal Congo · CGI Art. 350',
      daysLeft: daysBetween(today, nextMonth15),
    });
    result.push({
      ...tvaInfo,
      title: 'ITS — Impôt sur les salaires',
      desc: 'Retenue à la source mensuelle',
      daysLeft: daysBetween(today, nextMonth15),
    });

    // IS : acomptes 15/03, 15/06, 15/09, 15/12
    const acomptesIS = [2, 5, 8, 11].map(m => new Date(today.getFullYear(), m, 15));
    const nextIS = acomptesIS.find(d => d > today);
    if (nextIS) {
      const isInfo = fmt(nextIS);
      const trim = ['1er', '2ème', '3ème', '4ème'][acomptesIS.indexOf(nextIS)];
      result.push({
        ...isInfo,
        title: `IS — ${trim} acompte`,
        desc: 'Impôt sur les sociétés',
        daysLeft: daysBetween(today, nextIS),
      });
    }

    // CNSS : 20 du mois
    const nextCnss = new Date(today.getFullYear(), today.getMonth() + (today.getDate() > 20 ? 1 : 0), 20);
    const cnssInfo = fmt(nextCnss);
    result.push({
      ...cnssInfo,
      title: 'CNSS — Cotisations sociales',
      desc: 'Caisse Nationale Sécurité Sociale',
      daysLeft: daysBetween(today, nextCnss),
    });

    return result.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 4);
  }, []);

  if (!exerciceId) {
    return (
      <div className="cd-root">
        <div className="cd-empty">Sélectionnez un exercice pour afficher le tableau de bord.</div>
      </div>
    );
  }

  if (tbLoading || !kpis) {
    return (
      <div className="cd-root">
        <div className="cd-empty">Chargement du tableau de bord...</div>
      </div>
    );
  }

  return (
    <div className="cd-root">
      <div className="cd-header">
        <div className="cd-welcome">
          <h1>Bienvenue, <span>{userName.split(' ')[0]}</span></h1>
          <div className="cd-meta">
            <span>{entiteName} · SYSCOHADA</span>
            <span className="cd-pill">Exercice {exerciceAnnee}</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="cd-kpis">
        <KpiCard
          featured
          label="Chiffre d'affaires"
          value={kpis.ca}
          icon={<LuTrendingUp size={16} />}
          spark={evolution.map(e => ({ x: e.mois, y: e.cumulCa }))}
          color="#D4A843"
        />
        <KpiCard
          label="Résultat net"
          value={kpis.resultat}
          icon={<LuChartBar size={16} />}
          trend={`marge ${kpis.marge.toFixed(1).replace('.', ',')} %`}
          trendUp={kpis.resultat > 0}
          spark={evolution.map(e => ({ x: e.mois, y: e.resultat }))}
          color="#16a34a"
        />
        <KpiCard
          label="Trésorerie"
          value={kpis.tresoNet}
          icon={<LuWallet size={16} />}
          trendUp={kpis.tresoNet > 0}
          spark={evolution.map(e => ({ x: e.mois, y: e.cumulCa - e.charges }))}
          color="#2563eb"
        />
        <KpiCard
          label="BFR"
          value={kpis.bfr}
          icon={<LuPiggyBank size={16} />}
          trend={`DSO ${kpis.dso} j`}
          trendUp={kpis.dso < 60}
          spark={evolution.map(e => ({ x: e.mois, y: e.ca - e.charges }))}
          color="#ea580c"
        />
      </div>

      {/* Quick actions */}
      <div className="cd-quick">
        <button type="button" className="cd-qa" onClick={() => openTab('journal')}>
          <span className="cd-qa-icon"><LuPenLine size={18} /></span>
          <span><span className="cd-qa-title">Saisir une écriture</span><span className="cd-qa-sub">Journal · Tiers · OD</span></span>
        </button>
        <button type="button" className="cd-qa" onClick={() => openTab('lettrage')}>
          <span className="cd-qa-icon"><LuArrowLeftRight size={18} /></span>
          <span><span className="cd-qa-title">Lettrage</span><span className="cd-qa-sub">Apparier facture / paiement</span></span>
        </button>
        <button type="button" className="cd-qa" onClick={() => openTab('balance')}>
          <span className="cd-qa-icon"><LuChartBar size={18} /></span>
          <span><span className="cd-qa-title">Balance générale</span><span className="cd-qa-sub">Tous comptes</span></span>
        </button>
        <button type="button" className="cd-qa" onClick={() => openTab('liasse_complete_sys')}>
          <span className="cd-qa-icon"><LuFileText size={18} /></span>
          <span><span className="cd-qa-title">Générer la liasse</span><span className="cd-qa-sub">SYSCOHADA · 36 notes</span></span>
        </button>
      </div>

      {/* Main grid */}
      <div className="cd-grid-2">
        <div className="cd-panel">
          <div className="cd-panel-head">
            <div>
              <div className="cd-panel-title">Évolution mensuelle</div>
              <div className="cd-panel-sub">Produits vs charges (cumul mensuel)</div>
            </div>
          </div>
          <div className="cd-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolution}>
                <defs>
                  <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F2A42" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#0F2A42" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f3f6" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#6b7785' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7785' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtMontant(v, { abbreviate: true })} />
                <Tooltip
                  contentStyle={{ background: '#0F2A42', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12 }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(v) => [fmtMontant(Number(v)) + " FCFA", ""]}
                />
                <Area type="monotone" dataKey="ca" stroke="#0F2A42" strokeWidth={2.5} fill="url(#caGrad)" name="Produits" />
                <Line type="monotone" dataKey="charges" stroke="#dc2626" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Charges" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cd-panel">
          <div className="cd-panel-head">
            <div>
              <div className="cd-panel-title">Trésorerie</div>
              <div className="cd-panel-sub">Position consolidée 5xx</div>
            </div>
          </div>
          <div className="cd-treso-summary">
            <div>
              <div className="cd-treso-label">Encaissements</div>
              <div className="cd-treso-value">{fmtMontant(tableauBord?.tresorerie.debit || 0, { abbreviate: true })}</div>
              <div className="cd-treso-sub">Cumul exercice</div>
            </div>
            <div>
              <div className="cd-treso-label">Décaissements</div>
              <div className="cd-treso-value">{fmtMontant(tableauBord?.tresorerie.credit || 0, { abbreviate: true })}</div>
              <div className="cd-treso-sub">Cumul exercice</div>
            </div>
            <div>
              <div className="cd-treso-label">Solde net</div>
              <div className="cd-treso-value" style={{ color: kpis.tresoNet >= 0 ? '#16a34a' : '#dc2626' }}>
                {kpis.tresoNet >= 0 ? '+' : ''}{fmtMontant(kpis.tresoNet, { abbreviate: true })}
              </div>
              <div className="cd-treso-sub">FCFA</div>
            </div>
          </div>
          <div className="cd-chart-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolution}>
                <CartesianGrid stroke="#f1f3f6" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 10, fill: '#6b7785' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7785' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtMontant(v, { abbreviate: true })} />
                <Tooltip contentStyle={{ background: '#0F2A42', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11 }} formatter={(v) => [fmtMontant(Number(v)) + " FCFA", ""]} />
                <Bar dataKey="ca" fill="#D4A843" radius={[3, 3, 0, 0]} name="Produits" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom : Ratios + Top clients + Échéances */}
      <div className="cd-grid-3">
        <div className="cd-panel">
          <div className="cd-panel-head">
            <div>
              <div className="cd-panel-title">Ratios financiers</div>
              <div className="cd-panel-sub">Calculés depuis la balance</div>
            </div>
          </div>
          {ratios && (
            <div className="cd-ratios">
              <RatioCard label="Liquidité générale" value={ratios.liquidite.toFixed(2).replace('.', ',')} status={ratios.liquidite >= 1.5 ? 'good' : ratios.liquidite >= 1 ? 'warn' : 'bad'} statusText={ratios.liquidite >= 1.5 ? 'Saine · cible > 1,5' : ratios.liquidite >= 1 ? 'À surveiller' : 'Insuffisante'} fillPct={Math.min(100, (ratios.liquidite / 3) * 100)} />
              <RatioCard label="Autonomie financière" value={ratios.autonomie.toFixed(1).replace('.', ',') + ' %'} status={ratios.autonomie >= 30 ? 'good' : ratios.autonomie >= 20 ? 'warn' : 'bad'} statusText={ratios.autonomie >= 30 ? 'Bon · cible > 30 %' : 'Faible'} fillPct={Math.min(100, ratios.autonomie * 1.5)} />
              <RatioCard label="Délai client (DSO)" value={ratios.dso + ' j'} status={ratios.dso < 60 ? 'good' : ratios.dso < 90 ? 'warn' : 'bad'} statusText={ratios.dso < 60 ? 'Bon · cible < 60 j' : 'À surveiller'} fillPct={Math.min(100, (ratios.dso / 120) * 100)} />
              <RatioCard label="Marge nette" value={ratios.marge.toFixed(1).replace('.', ',') + ' %'} status={ratios.marge >= 5 ? 'good' : ratios.marge >= 0 ? 'warn' : 'bad'} statusText={ratios.marge >= 5 ? 'Solide' : ratios.marge >= 0 ? 'Faible' : 'Déficit'} fillPct={Math.min(100, Math.max(0, ratios.marge * 5))} />
            </div>
          )}
        </div>

        <div className="cd-panel">
          <div className="cd-panel-head">
            <div>
              <div className="cd-panel-title">Top clients par encours</div>
              <div className="cd-panel-sub">Comptes 411 — solde débiteur</div>
            </div>
          </div>
          {clientsTiers.length === 0 ? (
            <div className="cd-empty">Aucun encours client.</div>
          ) : (
            <table className="cd-table">
              <thead>
                <tr><th>Tiers</th><th className="cd-right">Encours</th></tr>
              </thead>
              <tbody>
                {[...clientsTiers]
                  .map(t => ({ ...t, encours: (t.debit || 0) - (t.credit || 0) }))
                  .filter(t => t.encours > 0)
                  .sort((a, b) => b.encours - a.encours)
                  .slice(0, 5)
                  .map(t => (
                    <tr key={t.tiers_id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.tiers_nom}</div>
                        <div style={{ fontSize: 11, color: '#6b7785' }}>{t.tiers_code || ''}</div>
                      </td>
                      <td className="cd-right">{fmtMontant(t.encours, { abbreviate: true })}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="cd-panel">
          <div className="cd-panel-head">
            <div>
              <div className="cd-panel-title">Échéances fiscales</div>
              <div className="cd-panel-sub">CGI Congo · 60 prochains jours</div>
            </div>
          </div>
          {echeances.map((e, i) => (
            <div key={i} className="cd-deadline">
              <div className="cd-deadline-date">
                <div className="cd-deadline-day">{e.day}</div>
                <div className="cd-deadline-month">{e.month}</div>
              </div>
              <div className="cd-deadline-content">
                <div className="cd-deadline-title">{e.title}</div>
                <div className="cd-deadline-desc">{e.desc}</div>
                <div style={{ marginTop: 4 }}>
                  <span className={`cd-badge ${e.daysLeft <= 7 ? 'cd-badge-danger' : e.daysLeft <= 30 ? 'cd-badge-warn' : 'cd-badge-info'}`}>
                    Dans {e.daysLeft} j
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activité récente */}
      <div className="cd-panel" style={{ marginTop: 16 }}>
        <div className="cd-panel-head">
          <div>
            <div className="cd-panel-title">Activité récente</div>
            <div className="cd-panel-sub">5 dernières écritures validées</div>
          </div>
          <button type="button" className="cd-qa" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => openTab('journaux')}>
            <span className="cd-qa-title" style={{ fontSize: 12 }}>Tout voir</span>
          </button>
        </div>
        {ecrituresRecentes.length === 0 ? (
          <div className="cd-empty">Aucune écriture pour cet exercice.</div>
        ) : (
          <table className="cd-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Pièce</th>
                <th>Journal</th>
                <th>Libellé</th>
                <th className="cd-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {ecrituresRecentes.slice(0, 5).map(e => (
                <tr key={e.id}>
                  <td>{new Date(e.date_ecriture).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</td>
                  <td>{e.numero_piece || '—'}</td>
                  <td>{e.journal_code || '—'}</td>
                  <td>{e.libelle || ''}</td>
                  <td className="cd-right">{fmtMontant(e.total_debit || 0, { abbreviate: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

interface KpiCardProps {
  featured?: boolean;
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  spark?: { x: string; y: number }[];
  color: string;
}

function KpiCard({ featured, label, value, icon, trend, trendUp, spark, color }: KpiCardProps): React.ReactElement {
  const positive = value >= 0;
  return (
    <div className={`cd-kpi${featured ? ' featured' : ''}`}>
      <div className="cd-kpi-head">
        <div className="cd-kpi-label">{label}</div>
        <div className="cd-kpi-icon">{icon}</div>
      </div>
      <div className="cd-kpi-value">
        {fmtMontant(value, { abbreviate: true })}
        <span className="cd-kpi-unit">FCFA</span>
      </div>
      {trend && (
        <div className={`cd-kpi-trend ${trendUp ? 'cd-up' : 'cd-down'}`}>
          {trendUp ? <LuTrendingUp size={12} /> : <LuTrendingDown size={12} />}
          {trend}
        </div>
      )}
      {!trend && (
        <div className={`cd-kpi-trend ${positive ? 'cd-up' : 'cd-down'}`}>
          {positive ? <LuTrendingUp size={12} /> : <LuTrendingDown size={12} />}
          {positive ? 'Positif' : 'Négatif'}
        </div>
      )}
      {spark && spark.length > 0 && (
        <div className="cd-spark">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark}>
              <Line type="monotone" dataKey="y" stroke={color} strokeWidth={1.8} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

interface RatioCardProps {
  label: string;
  value: string;
  status: 'good' | 'warn' | 'bad';
  statusText: string;
  fillPct: number;
}

function RatioCard({ label, value, status, statusText, fillPct }: RatioCardProps): React.ReactElement {
  const color = status === 'good' ? '#16a34a' : status === 'warn' ? '#ea580c' : '#dc2626';
  return (
    <div className="cd-ratio">
      <div className="cd-ratio-label">{label}</div>
      <div className="cd-ratio-value">{value}</div>
      <div className="cd-ratio-status" style={{ color }}>{statusText}</div>
      <div className="cd-ratio-bar">
        <div className={`cd-ratio-bar-fill ${status}`} style={{ width: `${fillPct}%` }} />
      </div>
    </div>
  );
}

export default ComptaDashboard;
