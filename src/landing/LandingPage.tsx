import React from 'react';

const PRIMARY = '#D4A843';
const DARK = '#1A3A5C';
const TEXT_SEC = '#6b7280';
const GREEN = '#059669';
const BG_WARM = '#faf8f5';

interface FeatureProps {
  reverse?: boolean;
  label: string;
  labelColor: string;
  title: string;
  description: string;
  checks: string[];
  mockupTitle: string;
  mockupLines: string[];
}

function FeatureSection({ reverse, label, labelColor, title, description, checks, mockupTitle, mockupLines }: FeatureProps) {
  return (
    <div style={{ display: 'flex', flexDirection: reverse ? 'row-reverse' : 'row', gap: 60, padding: '48px 24px', maxWidth: 1100, margin: '0 auto', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: labelColor, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{label}</div>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: DARK, lineHeight: 1.2, marginBottom: 16, whiteSpace: 'pre-line' }}>{title}</h2>
        <p style={{ fontSize: 15, color: TEXT_SEC, lineHeight: 1.6, marginBottom: 24 }}>{description}</p>
        {checks.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <span style={{ color: GREEN, fontSize: 18 }}>✓</span>
            <span style={{ fontSize: 15, color: DARK }}>{c}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ height: 36, background: '#f3f4f6', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: '#ef4444', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: 5, background: '#f59e0b', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: 5, background: '#22c55e', display: 'inline-block' }} />
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 16 }}>{mockupTitle}</div>
            {mockupLines.map((line, i) => {
              const [left, right] = line.split('|');
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
                  <span style={{ color: TEXT_SEC }}>{left}</span>
                  <span style={{ color: DARK, fontWeight: 700 }}>{right || ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface LandingPageProps {
  onLogin: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const STATS = [
    { value: '37', label: 'Notes annexes' },
    { value: 'SYSCOHADA', label: 'Référentiel' },
    { value: '6+', label: 'Conventions paie' },
    { value: 'IA', label: 'Assistant comptable' },
  ];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: DARK }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64, padding: '0 24px', maxWidth: 1200, margin: '0 auto', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: DARK }}>N</div>
          <span style={{ fontSize: 22, fontWeight: 800, color: DARK }}>NORMX <span style={{ color: PRIMARY }}>Compta</span></span>
        </div>
        <button onClick={onLogin} style={{ padding: '9px 22px', borderRadius: 8, background: DARK, color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Connexion</button>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '100px 24px 60px', background: BG_WARM }}>
        <div style={{ display: 'inline-block', background: 'rgba(212,168,67,0.1)', borderRadius: 100, padding: '8px 20px', marginBottom: 32 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: PRIMARY, letterSpacing: 0.5 }}>Comptabilité, Paie & États financiers</span>
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 900, color: DARK, lineHeight: 1.15, marginBottom: 20, letterSpacing: -0.5 }}>
          Votre comptabilité<br /><span style={{ color: PRIMARY }}>OHADA conforme</span> en un clic
        </h1>
        <p style={{ fontSize: 18, color: TEXT_SEC, maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.7 }}>
          Saisie d'écritures, états financiers SYSCOHADA et SYCEBNL, paie CGI 2026, assistant IA — tout dans une seule plateforme.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 48, flexWrap: 'wrap' }}>
          <button onClick={onLogin} style={{ padding: '16px 32px', borderRadius: 10, background: PRIMARY, color: DARK, border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Se connecter →</button>
          <button onClick={onLogin} style={{ padding: '14px 32px', borderRadius: 10, background: '#fff', color: DARK, border: '1.5px solid rgba(0,0,0,0.1)', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Créer un compte</button>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', background: DARK, borderRadius: 16, padding: '24px 48px', maxWidth: 800, margin: '0 auto', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: PRIMARY }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 1 — Comptabilité */}
      <div style={{ background: '#fff' }}>
        <FeatureSection
          label="COMPTABILITÉ OHADA" labelColor={PRIMARY}
          title={"Saisissez vos écritures,\ngénérez vos états"}
          description="Plan comptable SYSCOHADA (1 409 comptes), saisie multi-journaux, grand livre, balance, lettrage, déclaration TVA."
          checks={['Saisie d\'écritures multi-journaux (OD, ACH, VTE, BQ, CAI)', 'Grand livre, balance générale, balance des tiers', 'Lettrage automatique des comptes', 'Déclaration TVA mensuelle']}
          mockupTitle="Saisie Journal — OD" mockupLines={['Date|15/03/2026', 'Compte débit|411000 — Clients', 'Compte crédit|701000 — Ventes', 'Montant|2 500 000 FCFA', 'Libellé|Facture client ALPHA', 'Statut|Validée']}
        />
      </div>

      {/* Section 2 — États financiers */}
      <div style={{ background: BG_WARM }}>
        <FeatureSection reverse
          label="ÉTATS FINANCIERS" labelColor="#2563eb"
          title={"Bilan, compte de résultat,\nTFT et liasse complète"}
          description="États financiers SYSCOHADA et SYCEBNL conformes, 37 notes annexes, résultat fiscal IS/IBA, export PDF professionnel."
          checks={['Bilan actif/passif avec correspondances automatiques', 'Compte de résultat conforme SYSCOHADA', 'TFT méthode directe (SYCEBNL) et indirecte (SYSCOHADA)', 'Résultat fiscal IS/IBA avec réintégrations CGI 2026']}
          mockupTitle="Bilan Actif — SYSCOHADA" mockupLines={['Immobilisations incorporelles|12 500 000', 'Immobilisations corporelles|45 000 000', 'Actif circulant|18 700 000', 'Trésorerie actif|8 300 000', 'TOTAL ACTIF|84 500 000']}
        />
      </div>

      {/* Section 3 — Paie */}
      <div style={{ background: '#fff' }}>
        <FeatureSection
          label="PAIE CGI 2026" labelColor="#7c3aed"
          title={"Bulletins de paie\nconformes au Congo"}
          description="Moteur de calcul ITS, CNSS, CAMU, TUS, TOL complet. 6+ conventions collectives du Congo."
          checks={['Bulletins de paie conformes CGI 2026', '6 conventions collectives (Générale, Pétrole, BTP, Commerce, BAM, Hôtellerie)', 'Déclarations CNSS, DAS, Nominative', 'Livre de paie et états de contrôle']}
          mockupTitle="Bulletin de paie — Mars 2026" mockupLines={['Salaire de base|450 000 FCFA', 'CNSS salariale (4%)|18 000 FCFA', 'ITS|32 500 FCFA', 'Net à payer|385 200 FCFA', 'Coût employeur|548 000 FCFA']}
        />
      </div>

      {/* Section 4 — Assistant IA */}
      <div style={{ background: BG_WARM }}>
        <FeatureSection reverse
          label="ASSISTANT IA COMPTABLE" labelColor="#d97706"
          title={"Posez vos questions\nsur la comptabilité OHADA"}
          description="4 agents spécialisés (SYSCOHADA, SYCEBNL, SMT, Révision) formés sur le référentiel OHADA complet."
          checks={['Réponses sourcées avec références OHADA', 'Base de connaissances SYSCOHADA et SYCEBNL complète', 'Recherche vectorielle Qdrant', 'Disponible 24h/24']}
          mockupTitle="Assistant IA — SYSCOHADA" mockupLines={['Question|Comment amortir un véhicule ?', 'Réponse|Linéaire 25-33% (§809)', 'Durée|3 à 4 ans', 'Compte débit|681 Dotations', 'Compte crédit|2845 Amort. transport']}
        />
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff' }}>
        <div style={{ background: BG_WARM, border: '1px solid rgba(0,0,0,0.06)', borderRadius: 20, padding: 48, maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Prêt à simplifier votre comptabilité ?</h2>
          <p style={{ color: TEXT_SEC, fontSize: 16, marginBottom: 28 }}>Comptabilité OHADA, paie CGI 2026 et états financiers — tout réuni.</p>
          <button onClick={onLogin} style={{ padding: '16px 32px', borderRadius: 10, background: PRIMARY, color: DARK, border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Se connecter →</button>
          <p style={{ marginTop: 16, fontSize: 13, color: '#9ca3af' }}>Connexion sécurisée via NORMX AI</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '32px 24px', textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: TEXT_SEC }}>© 2026 NORMX AI SAS — 5/7 rue Benjamin Raspail, 60100 Creil, France</span>
      </div>
    </div>
  );
}
