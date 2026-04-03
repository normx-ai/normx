import React from 'react';

interface LandingPageProps {
  onLogin: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <>
      <style>{`
        .lp *,.lp *::before,.lp *::after{margin:0;padding:0;box-sizing:border-box}
        .lp{--primary:#2563eb;--primary-light:#60a5fa;--primary-bg:rgba(37,99,235,.06);--gold:#D4A843;--dark:#0F2A42;--text:#1f2937;--text2:#6b7280;--text3:#9ca3af;--bg:#fff;--bg2:#faf8f5;--bg3:#f9fafb;--border:rgba(0,0,0,.08);--green:#059669;--red:#ef4444;--orange:#d97706;--purple:#7c3aed;--r:16px;--shadow:0 1px 3px rgba(0,0,0,.06);--shadow-lg:0 20px 60px rgba(0,0,0,.08);font-family:'Inter',-apple-system,sans-serif;color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
        .lp a{text-decoration:none;color:inherit}

        /* NAV */
        .lp-nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(255,255,255,.92);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
        .lp .nav-inner{max-width:1200px;margin:0 auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:64px}
        .lp .nav-logo{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:800;color:var(--dark);cursor:pointer;background:none;border:none}
        .lp .nav-icon{width:34px;height:34px;border-radius:10px;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#fff}
        .lp .nav-links{display:flex;align-items:center;gap:6px}
        .lp .nav-link{padding:8px 14px;font-size:14px;font-weight:600;color:var(--text2);border-radius:8px;transition:all .2s;cursor:pointer}
        .lp .nav-link:hover{color:var(--text);background:rgba(0,0,0,.04)}
        .lp .nav-cta{padding:9px 22px;background:var(--primary);color:#fff;font-size:14px;font-weight:700;border-radius:8px;border:none;cursor:pointer}
        .lp .nav-dropdown{position:relative}
        .lp .nav-dropdown-menu{position:absolute;top:100%;left:50%;transform:translateX(-50%) translateY(-4px);margin-top:4px;background:#fff;border:1px solid var(--border);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.12);width:560px;padding:24px;opacity:0;pointer-events:none;transition:all .2s ease;z-index:200}
        .lp .nav-dropdown:hover .nav-dropdown-menu{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0)}
        .lp .nav-dropdown-header{margin-bottom:16px}
        .lp .nav-dropdown-header h3{font-size:16px;font-weight:700;color:var(--dark);margin-bottom:4px}
        .lp .nav-dropdown-header p{font-size:13px;color:var(--text2)}
        .lp .nav-dropdown-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}
        .lp .nav-dropdown-item{display:flex;align-items:flex-start;gap:12px;padding:12px;border-radius:10px;font-size:14px;color:var(--text);transition:background .15s}
        .lp .nav-dropdown-item:hover{background:var(--bg2)}
        .lp .nav-dropdown-item .dd-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#fff;flex-shrink:0}
        .lp .nav-dropdown-item .dd-name{font-size:14px;font-weight:600;color:var(--dark)}
        .lp .nav-dropdown-item .dd-desc{font-size:12px;font-weight:400;color:var(--text2);line-height:1.4;margin-top:2px}
        .lp .badge-soon{display:inline-block;font-size:9px;font-weight:600;background:#f3f4f6;color:var(--text3);padding:2px 8px;border-radius:10px;margin-left:6px;vertical-align:middle}
        .lp .nav-dropdown-footer{margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:flex;justify-content:center}
        .lp .nav-dropdown-footer a{font-size:13px;font-weight:500;color:var(--primary)}
        @media(max-width:900px){.lp .nav-dropdown-menu{width:90vw;left:auto;right:-60px;transform:translateY(-4px)}.lp .nav-dropdown:hover .nav-dropdown-menu{transform:translateY(0)}.lp .nav-dropdown-grid{grid-template-columns:1fr}}

        /* TORN PAPER DIVIDER */
        .lp .torn-wrap{position:relative;z-index:1}
        .lp .torn-bottom::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:40px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 40' preserveAspectRatio='none'%3E%3Cpath d='M0,20 Q30,8 60,18 T120,14 T180,22 T240,12 T300,20 T360,10 T420,18 T480,14 T540,22 T600,10 T660,20 T720,12 T780,18 T840,22 T900,10 T960,20 T1020,14 T1080,22 T1140,12 T1200,18 T1260,14 T1320,22 T1380,10 T1440,18 L1440,40 L0,40 Z' fill='%23ffffff'/%3E%3C/svg%3E") no-repeat bottom;background-size:100% 40px;z-index:2}
        .lp .torn-bottom-warm::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:40px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 40' preserveAspectRatio='none'%3E%3Cpath d='M0,20 Q30,8 60,18 T120,14 T180,22 T240,12 T300,20 T360,10 T420,18 T480,14 T540,22 T600,10 T660,20 T720,12 T780,18 T840,22 T900,10 T960,20 T1020,14 T1080,22 T1140,12 T1200,18 T1260,14 T1320,22 T1380,10 T1440,18 L1440,40 L0,40 Z' fill='%23faf8f5'/%3E%3C/svg%3E") no-repeat bottom;background-size:100% 40px;z-index:2}

        /* HERO */
        .lp .hero{padding:120px 24px 80px;background:var(--bg2);position:relative}
        .lp .hero-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
        .lp .hero-badge{display:inline-flex;align-items:center;gap:6px;background:var(--primary-bg);border-radius:100px;padding:8px 20px;font-size:13px;font-weight:700;color:var(--primary);margin-bottom:20px}
        .lp .hero h1{font-size:clamp(30px,4vw,48px);font-weight:900;color:var(--dark);line-height:1.15;margin-bottom:16px;letter-spacing:-.5px}
        .lp .hero h1 span{color:var(--primary)}
        .lp .hero p{font-size:17px;color:var(--text2);max-width:480px;line-height:1.7;margin-bottom:28px}
        .lp .hero-btns{display:flex;gap:12px;margin-bottom:20px}
        .lp .btn-primary{padding:14px 28px;background:var(--primary);color:#fff;font-size:15px;font-weight:700;border-radius:10px;border:none;cursor:pointer}
        .lp .btn-outline{padding:14px 28px;border:1.5px solid var(--border);background:#fff;color:var(--dark);font-size:15px;font-weight:600;border-radius:10px;cursor:pointer}

        /* STATS */
        .lp .stats{background:var(--dark);border-radius:16px;padding:24px 48px;display:flex;justify-content:center;gap:48px;flex-wrap:wrap;max-width:800px;margin:48px auto 0}
        .lp .stat{text-align:center}
        .lp .stat .n{font-size:32px;font-weight:900;color:var(--gold)}
        .lp .stat .l{font-size:11px;color:rgba(255,255,255,.7);margin-top:4px}

        /* SECTIONS */
        .lp .section{padding:80px 24px;position:relative}
        .lp .section.alt{background:var(--bg2)}
        .lp .section-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
        .lp .section-inner.reverse{direction:rtl}
        .lp .section-inner.reverse>*{direction:ltr}
        .lp .section-label{font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px}
        .lp .section h2{font-size:clamp(24px,3vw,36px);font-weight:900;line-height:1.2;margin-bottom:16px;color:var(--dark)}
        .lp .section p{font-size:16px;color:var(--text2);line-height:1.7;margin-bottom:24px}
        .lp .checks{list-style:none;margin-bottom:24px}
        .lp .checks li{display:flex;align-items:start;gap:10px;padding:6px 0;font-size:15px}
        .lp .checks li .ci{color:var(--green);font-size:18px;margin-top:2px;flex-shrink:0}

        /* PRICING */
        .lp .pricing{padding:60px 24px;text-align:center}
        .lp .pricing h2{font-size:clamp(26px,3vw,40px);font-weight:900;color:var(--dark);margin-bottom:8px}
        .lp .pricing .sub{font-size:17px;color:var(--text2);margin-bottom:40px}
        .lp .plans{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;max-width:700px;margin:0 auto}
        .lp .plan{flex:1;min-width:260px;max-width:320px;border-radius:16px;padding:28px;text-align:left}
        .lp .plan.free{background:var(--bg3);border:1px solid var(--border)}
        .lp .plan.pro{background:var(--primary-bg);border:2px solid var(--primary);position:relative}
        .lp .plan .tag{font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:12px}
        .lp .plan .price{font-size:38px;font-weight:900;color:var(--dark)}
        .lp .plan .period{font-size:15px;color:var(--text2);margin-bottom:20px}
        .lp .plan .feat{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:15px;color:var(--text2)}
        .lp .plan .feat .ci{font-size:16px}
        .lp .plan .cta-btn{display:block;margin-top:16px;padding:12px;border-radius:10px;text-align:center;font-size:16px;font-weight:700;border:none;cursor:pointer;width:100%}

        /* CTA */
        .lp .cta-section{padding:60px 24px;background:var(--bg2)}
        .lp .cta-box{max-width:700px;margin:0 auto;background:#fff;border:1px solid var(--border);border-radius:20px;padding:48px;text-align:center}
        .lp .cta-box h2{font-size:28px;font-weight:900;color:var(--dark);margin-bottom:12px}
        .lp .cta-box p{color:var(--text2);font-size:16px;margin-bottom:28px}

        /* FOOTER */
        .lp footer{padding:40px 24px;border-top:1px solid var(--border);text-align:center;font-size:13px;color:var(--text2)}
        .lp footer a{color:var(--primary);font-weight:600}

        /* TABLE */
        .lp .mt{width:100%;border-collapse:collapse;font-size:11px}
        .lp .mt th{text-align:left;padding:6px 8px;background:#f9fafb;color:var(--text2);font-weight:700;border-bottom:1px solid var(--border);font-size:10px;text-transform:uppercase;letter-spacing:.5px}
        .lp .mt td{padding:8px;border-bottom:1px solid #f3f4f6}
        .lp .mt .num{text-align:right;font-family:'Inter',monospace;font-weight:600}

        @media(max-width:900px){
          .lp .hero-inner,.lp .section-inner{grid-template-columns:1fr;text-align:center}
          .lp .hero p{margin:0 auto 28px}
          .lp .hero-btns{justify-content:center}
          .lp .hero-visual{display:none}
          .lp .section-inner.reverse{direction:ltr}
          .lp .stats{gap:20px;padding:24px 16px}
          .lp .stat .n{font-size:24px}
        }
      `}</style>

      <div className="lp">
        {/* NAV */}
        <nav className="lp-nav">
          <div className="nav-inner">
            <button className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="nav-icon">N</div> NORMX Compta
            </button>
            <div className="nav-links">
              <a href="#fonctionnalites" className="nav-link">Fonctionnalites</a>
              <a href="#tarifs" className="nav-link">Tarifs</a>
              <div className="nav-dropdown">
                <span className="nav-link">Produits &#9662;</span>
                <div className="nav-dropdown-menu">
                  <div className="nav-dropdown-header">
                    <h3>Produits</h3>
                    <p>Suite logicielle pour les professionnels de l'espace OHADA</p>
                  </div>
                  <div className="nav-dropdown-grid">
                    <a href="https://normx-ai.com" className="nav-dropdown-item">
                      <div className="dd-icon" style={{ background: '#08080d', fontSize: 12 }}>N</div>
                      <div><div className="dd-name">NORMX AI</div><div className="dd-desc">Plateforme principale</div></div>
                    </a>
                    <a href="https://app.normx-ai.com" className="nav-dropdown-item">
                      <div className="dd-icon" style={{ background: 'var(--primary)', fontSize: 12 }}>C</div>
                      <div><div className="dd-name">NORMX Compta</div><div className="dd-desc">Comptabilite SYSCOHADA, etats financiers et paie</div></div>
                    </a>
                    <a href="https://tax.normx-ai.com" className="nav-dropdown-item">
                      <div className="dd-icon" style={{ background: 'var(--gold)', fontSize: 12 }}>T</div>
                      <div><div className="dd-name">NORMX Tax</div><div className="dd-desc">Simulateur fiscal CGI 2026 et assistant IA</div></div>
                    </a>
                    <a href="https://legal.normx-ai.com" className="nav-dropdown-item">
                      <div className="dd-icon" style={{ background: 'var(--purple)', fontSize: 12 }}>L</div>
                      <div><div className="dd-name">NORMX Legal <span className="badge-soon">Bientot</span></div><div className="dd-desc">Documents juridiques OHADA automatises</div></div>
                    </a>
                  </div>
                  <div className="nav-dropdown-footer">
                    <a href="https://normx-ai.com#products">Voir tous les produits →</a>
                  </div>
                </div>
              </div>
              <button className="nav-cta" onClick={onLogin}>Se connecter</button>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="hero torn-wrap torn-bottom">
          <div className="hero-inner">
            <div className="hero-text">
              <div className="hero-badge">&#10024; Comptabilite augmentee par l'IA</div>
              <h1>Gardez le controle de votre <span>comptabilite OHADA</span></h1>
              <p>Saisie d'ecritures, grand livre, balance, etats financiers et assistant IA — conforme SYSCOHADA et SYCEBNL pour l'espace OHADA.</p>
              <div className="hero-btns">
                <button className="btn-primary" onClick={onLogin}>Commencer gratuitement →</button>
                <a href="#fonctionnalites" className="btn-outline">Decouvrir</a>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>Disponible sur Web - Conforme SYSCOHADA &amp; SYCEBNL</div>
            </div>
            <div className="hero-visual">
              {/* MacBook Pro — Grand Livre */}
              <div style={{ maxWidth: 540, width: '100%' }}>
                <div style={{ background: '#e2e2e2', borderRadius: 14, padding: '6px 6px 0', border: '1px solid #d4d4d4' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: '#1a1a1a', margin: '0 auto 4px', border: '1px solid #333' }} />
                  <div style={{ background: '#fff', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ background: 'var(--dark)', height: 30, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 4, background: '#ef4444' }} />
                      <span style={{ width: 7, height: 7, borderRadius: 4, background: '#f59e0b' }} />
                      <span style={{ width: 7, height: 7, borderRadius: 4, background: '#22c55e' }} />
                      <span style={{ flex: 1, textAlign: 'center', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,.6)' }}>NORMX Compta — Grand Livre</span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <div style={{ width: 110, background: 'var(--dark)', padding: '10px 8px', minHeight: 260 }}>
                        {['Dashboard', 'Ecritures'].map(t => (
                          <div key={t} style={{ padding: '6px 8px', borderRadius: 5, fontSize: 8, color: 'rgba(255,255,255,.5)', marginBottom: 2 }}>{t}</div>
                        ))}
                        <div style={{ padding: '6px 8px', borderRadius: 5, background: 'rgba(37,99,235,.25)', fontSize: 8, color: '#60a5fa', fontWeight: 700, marginBottom: 2 }}>Grand Livre</div>
                        {['Balance', 'Etats financiers', 'Plan comptable', 'Assistant IA'].map(t => (
                          <div key={t} style={{ padding: '6px 8px', borderRadius: 5, fontSize: 8, color: 'rgba(255,255,255,.5)', marginBottom: 2 }}>{t}</div>
                        ))}
                      </div>
                      <div style={{ flex: 1, padding: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>601000 — Achats marchandises</span>
                          <span style={{ fontSize: 8, padding: '2px 8px', background: 'var(--primary-bg)', color: 'var(--primary)', borderRadius: 4, fontWeight: 700 }}>Classe 6</span>
                        </div>
                        <table className="mt">
                          <thead><tr><th>Date</th><th>Piece</th><th>Libelle</th><th className="num">Debit</th><th className="num">Credit</th></tr></thead>
                          <tbody>
                            <tr><td>02/01</td><td>ACH-001</td><td>Fournisseur ALPHA</td><td className="num" style={{ color: 'var(--orange)' }}>1 250 000</td><td className="num">—</td></tr>
                            <tr><td>15/01</td><td>ACH-012</td><td>Matiere premiere</td><td className="num" style={{ color: 'var(--orange)' }}>3 800 000</td><td className="num">—</td></tr>
                            <tr><td>28/01</td><td>ACH-018</td><td>Fournisseur BETA</td><td className="num" style={{ color: 'var(--orange)' }}>950 000</td><td className="num">—</td></tr>
                            <tr><td>05/02</td><td>OD-003</td><td>Avoir fournisseur</td><td className="num">—</td><td className="num" style={{ color: 'var(--green)' }}>200 000</td></tr>
                            <tr><td>12/02</td><td>ACH-025</td><td>Fournitures bureau</td><td className="num" style={{ color: 'var(--orange)' }}>480 000</td><td className="num">—</td></tr>
                          </tbody>
                        </table>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: 6, background: '#f9fafb', borderRadius: 4 }}>
                          <span style={{ fontSize: 9, color: 'var(--text2)' }}>Solde debiteur</span>
                          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--primary)' }}>6 280 000 FCFA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ height: 8, background: '#d1d1d1', borderBottomLeftRadius: 2, borderBottomRightRadius: 2, margin: '0 20px' }}>
                  <div style={{ width: 60, height: 3, background: '#b0b0b0', borderBottomLeftRadius: 2, borderBottomRightRadius: 2, margin: '0 auto' }} />
                </div>
              </div>
            </div>
          </div>
          {/* Stats */}
          <div className="stats">
            <div className="stat"><div className="n">1 409</div><div className="l">Comptes SYSCOHADA</div></div>
            <div className="stat"><div className="n">5</div><div className="l">Journaux comptables</div></div>
            <div className="stat"><div className="n">37</div><div className="l">Notes annexes</div></div>
            <div className="stat"><div className="n">IA</div><div className="l">Assistant intelligent</div></div>
          </div>
        </section>

        {/* FEATURE 1 — Ecritures */}
        <section className="section torn-wrap torn-bottom-warm" id="fonctionnalites">
          <div className="section-inner">
            <div>
              <div className="section-label" style={{ color: 'var(--primary)' }}>SAISIE D'ECRITURES</div>
              <h2>Saisissez vos ecritures en toute simplicite</h2>
              <p>Multi-journaux (OD, ACH, VTE, BQ, CAI), plan comptable SYSCOHADA avec 1 409 comptes, lettrage automatique.</p>
              <ul className="checks">
                <li><span className="ci">&#10003;</span> Saisie rapide avec autocompletion des comptes</li>
                <li><span className="ci">&#10003;</span> 5 journaux : OD, Achats, Ventes, Banque, Caisse</li>
                <li><span className="ci">&#10003;</span> Lettrage automatique des tiers</li>
                <li><span className="ci">&#10003;</span> Import d'ecritures depuis Excel</li>
              </ul>
            </div>
            <div>
              {/* MacBook — Journal */}
              <div style={{ maxWidth: 460 }}>
                <div style={{ background: '#e2e2e2', borderRadius: 14, padding: '6px 6px 0', border: '1px solid #d4d4d4' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: '#1a1a1a', margin: '0 auto 4px', border: '1px solid #333' }} />
                  <div style={{ background: '#fff', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ background: 'var(--dark)', height: 28, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 4, background: '#ef4444' }} />
                      <span style={{ width: 7, height: 7, borderRadius: 4, background: '#f59e0b' }} />
                      <span style={{ width: 7, height: 7, borderRadius: 4, background: '#22c55e' }} />
                      <span style={{ flex: 1, textAlign: 'center', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,.6)' }}>Journal des Achats — Mars 2026</span>
                    </div>
                    <div style={{ padding: 12 }}>
                      <table className="mt">
                        <thead><tr><th>Date</th><th>Compte</th><th>Libelle</th><th className="num">Debit</th><th className="num">Credit</th></tr></thead>
                        <tbody>
                          <tr><td>01/03</td><td>601000</td><td>Achats marchandises</td><td className="num" style={{ color: 'var(--orange)' }}>2 500 000</td><td className="num">—</td></tr>
                          <tr><td>01/03</td><td>445100</td><td>TVA deductible 18%</td><td className="num" style={{ color: 'var(--orange)' }}>450 000</td><td className="num">—</td></tr>
                          <tr><td>01/03</td><td>401000</td><td>Fournisseur ALPHA</td><td className="num">—</td><td className="num" style={{ color: 'var(--green)' }}>2 950 000</td></tr>
                          <tr><td>05/03</td><td>605000</td><td>Fournitures bureau</td><td className="num" style={{ color: 'var(--orange)' }}>180 000</td><td className="num">—</td></tr>
                          <tr><td>05/03</td><td>445100</td><td>TVA deductible 18%</td><td className="num" style={{ color: 'var(--orange)' }}>32 400</td><td className="num">—</td></tr>
                          <tr><td>05/03</td><td>401200</td><td>Fournisseur GAMMA</td><td className="num">—</td><td className="num" style={{ color: 'var(--green)' }}>212 400</td></tr>
                        </tbody>
                      </table>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: 6, background: '#f9fafb', borderRadius: 4 }}>
                        <span style={{ fontSize: 9, color: 'var(--text2)' }}>6 ecritures</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--green)' }}>Equilibre &#10003;</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ height: 8, background: '#d1d1d1', borderBottomLeftRadius: 2, borderBottomRightRadius: 2, margin: '0 20px' }}>
                  <div style={{ width: 60, height: 3, background: '#b0b0b0', margin: '0 auto' }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE 2 — Balance & Grand Livre */}
        <section className="section alt torn-wrap torn-bottom">
          <div className="section-inner reverse">
            <div>
              <div className="section-label" style={{ color: 'var(--green)' }}>ETATS COMPTABLES</div>
              <h2>Balance, grand livre et etats de synthese en un clic</h2>
              <p>Generez instantanement vos etats comptables conformes SYSCOHADA et SYCEBNL avec correspondances automatiques.</p>
              <ul className="checks">
                <li><span className="ci">&#10003;</span> Balance generale et balance des tiers</li>
                <li><span className="ci">&#10003;</span> Grand livre par compte et par periode</li>
                <li><span className="ci">&#10003;</span> Bilan actif/passif avec notes annexes</li>
                <li><span className="ci">&#10003;</span> Compte de resultat conforme</li>
                <li><span className="ci">&#10003;</span> TFT methode directe et indirecte</li>
              </ul>
            </div>
            <div>
              {/* iPad — Balance */}
              <div style={{ maxWidth: 400 }}>
                <div style={{ background: '#1a1a1e', borderRadius: 24, padding: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: '#333', margin: '0 auto 6px' }} />
                  <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ background: 'var(--dark)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--gold)', fontSize: 14 }}>&#9776;</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Balance Generale — Mars 2026</span>
                    </div>
                    <div style={{ padding: 14 }}>
                      <table className="mt">
                        <thead><tr><th>Compte</th><th>Libelle</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Solde</th></tr></thead>
                        <tbody>
                          <tr><td>101000</td><td>Capital social</td><td className="num">—</td><td className="num" style={{ color: 'var(--green)' }}>10 000 000</td><td className="num" style={{ fontWeight: 700, color: 'var(--green)' }}>-10 000 000</td></tr>
                          <tr><td>411000</td><td>Clients</td><td className="num" style={{ color: 'var(--orange)' }}>8 500 000</td><td className="num" style={{ color: 'var(--green)' }}>3 200 000</td><td className="num" style={{ fontWeight: 700, color: 'var(--orange)' }}>5 300 000</td></tr>
                          <tr><td>521000</td><td>Banque</td><td className="num" style={{ color: 'var(--orange)' }}>15 600 000</td><td className="num" style={{ color: 'var(--green)' }}>12 400 000</td><td className="num" style={{ fontWeight: 700, color: 'var(--orange)' }}>3 200 000</td></tr>
                          <tr><td>601000</td><td>Achats march.</td><td className="num" style={{ color: 'var(--orange)' }}>6 280 000</td><td className="num">—</td><td className="num" style={{ fontWeight: 700, color: 'var(--orange)' }}>6 280 000</td></tr>
                          <tr><td>701000</td><td>Ventes march.</td><td className="num">—</td><td className="num" style={{ color: 'var(--green)' }}>12 500 000</td><td className="num" style={{ fontWeight: 700, color: 'var(--green)' }}>-12 500 000</td></tr>
                        </tbody>
                      </table>
                      <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <span style={{ fontSize: 9, padding: '3px 10px', background: 'rgba(5,150,105,.1)', color: 'var(--green)', borderRadius: 10, fontWeight: 700 }}>Total equilibre &#10003;</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ width: 80, height: 4, borderRadius: 2, background: '#555', margin: '8px auto 0' }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE 3 — Assistant IA */}
        <section className="section torn-wrap torn-bottom-warm">
          <div className="section-inner">
            <div>
              <div className="section-label" style={{ color: 'var(--purple)' }}>ASSISTANT IA</div>
              <h2>Un expert comptable IA a vos cotes</h2>
              <p>Posez vos questions comptables, l'IA repond avec les references du plan SYSCOHADA et les normes OHADA.</p>
              <ul className="checks">
                <li><span className="ci">&#10003;</span> Recherche de comptes par mot-cle</li>
                <li><span className="ci">&#10003;</span> Explication des normes OHADA</li>
                <li><span className="ci">&#10003;</span> Aide a la saisie et au lettrage</li>
                <li><span className="ci">&#10003;</span> Generation des notes annexes</li>
              </ul>
            </div>
            <div>
              {/* iPhone — Chat IA */}
              <div style={{ maxWidth: 280, margin: '0 auto' }}>
                <div style={{ background: '#1a1a1e', borderRadius: 36, padding: 10 }}>
                  <div style={{ width: 80, height: 20, borderRadius: 12, background: '#1a1a1e', margin: '0 auto -10px', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: '#333', margin: '6px auto 0' }} />
                  </div>
                  <div style={{ background: '#faf8f5', borderRadius: 26, overflow: 'hidden' }}>
                    <div style={{ height: 20, background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
                      <span style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,.7)' }}>9:41</span>
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,.5)' }}>&#9679; &#9679; &#9679;</span>
                    </div>
                    <div style={{ background: 'var(--dark)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--gold)', fontSize: 14 }}>&#128172;</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Assistant Comptable</span>
                    </div>
                    <div style={{ padding: 12, minHeight: 260 }}>
                      <div style={{ marginBottom: 10, textAlign: 'right' }}>
                        <div style={{ display: 'inline-block', background: 'var(--dark)', color: '#fff', padding: '8px 12px', borderRadius: '14px 14px 4px 14px', fontSize: 11, maxWidth: '80%' }}>Quel compte pour les frais de mission ?</div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'inline-block', background: '#fff', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '14px 14px 14px 4px', fontSize: 11, maxWidth: '85%', color: 'var(--text)' }}>
                          Les frais de mission se comptabilisent au compte <b style={{ color: 'var(--primary)' }}>625800</b> — Deplacements, missions et receptions. C'est un compte de charge de la classe 6 du plan SYSCOHADA.
                        </div>
                      </div>
                      <div style={{ marginBottom: 10, textAlign: 'right' }}>
                        <div style={{ display: 'inline-block', background: 'var(--dark)', color: '#fff', padding: '8px 12px', borderRadius: '14px 14px 4px 14px', fontSize: 11, maxWidth: '80%' }}>Et la TVA ?</div>
                      </div>
                      <div>
                        <div style={{ display: 'inline-block', background: '#fff', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: 14, fontSize: 11 }}>
                          <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 3, background: 'var(--primary)', marginRight: 4, opacity: 0.5 }} />
                          <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 3, background: 'var(--primary)', marginRight: 4, opacity: 0.7 }} />
                          <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 3, background: 'var(--primary)', opacity: 0.9 }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, background: '#fff' }}>
                      <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 20, padding: '7px 12px', fontSize: 11, color: 'var(--text3)' }}>Posez votre question...</div>
                      <div style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 12, color: '#fff' }}>&#9654;</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ width: 60, height: 4, borderRadius: 2, background: '#555', margin: '6px auto 0' }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="pricing" id="tarifs">
          <h2>Tarif simple, acces complet</h2>
          <div className="sub">Offre beta — testez l'integralite de la plateforme</div>
          <div className="plans">
            <div className="plan free">
              <div className="tag" style={{ color: 'var(--text2)' }}>Decouverte</div>
              <div className="price">0</div>
              <div className="period">7 jours d'essai</div>
              <div className="feat"><span className="ci" style={{ color: 'var(--green)' }}>&#10003;</span> Saisie d'ecritures</div>
              <div className="feat"><span className="ci" style={{ color: 'var(--green)' }}>&#10003;</span> Grand livre et balance</div>
              <div className="feat"><span className="ci" style={{ color: 'var(--green)' }}>&#10003;</span> Plan comptable SYSCOHADA</div>
              <div className="feat"><span className="ci" style={{ color: 'var(--green)' }}>&#10003;</span> 5 questions IA</div>
              <button className="cta-btn" onClick={onLogin} style={{ background: 'rgba(0,0,0,.06)', border: '1px solid var(--border)', color: 'var(--dark)' }}>Essayer gratuitement</button>
            </div>
            <div className="plan pro">
              <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '3px 12px', borderRadius: 10, letterSpacing: 1 }}>BETA</div>
              <div className="tag" style={{ color: 'var(--primary)' }}>Pro</div>
              <div className="price">1EUR</div>
              <div className="period">offre beta — acces complet</div>
              <div className="feat"><span className="ci" style={{ color: 'var(--primary)' }}>&#10003;</span> Tout le plan Decouverte</div>
              <div className="feat"><span className="ci" style={{ color: 'var(--primary)' }}>&#10003;</span> Etats financiers complets</div>
              <div className="feat"><span className="ci" style={{ color: 'var(--primary)' }}>&#10003;</span> 37 notes annexes OHADA</div>
              <div className="feat"><span className="ci" style={{ color: 'var(--primary)' }}>&#10003;</span> Export PDF professionnel</div>
              <div className="feat"><span className="ci" style={{ color: 'var(--primary)' }}>&#10003;</span> Assistant IA illimite</div>
              <div className="feat"><span className="ci" style={{ color: 'var(--primary)' }}>&#10003;</span> Multi-exercices</div>
              <button className="cta-btn" onClick={onLogin} style={{ background: 'var(--primary)', color: '#fff' }}>Commencer a 1 EUR</button>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="cta-box">
            <h2>Pret a simplifier votre comptabilite ?</h2>
            <p>Accedez a la comptabilite SYSCOHADA propulsee par l'IA. Conforme, rapide, fiable.</p>
            <button className="btn-primary" onClick={onLogin}>Commencer gratuitement →</button>
            <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text3)' }}>Connexion securisee via NORMX AI</div>
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
              <a href="https://normx-ai.com">NORMX AI</a>
              <a href="https://tax.normx-ai.com">NORMX Tax</a>
              <a href="https://legal.normx-ai.com">NORMX Legal</a>
            </div>
            <p>&copy; 2026 NORMX AI SAS — 5 rue Benjamin Raspail, 60100 Creil — info-contact@normx-ai.com</p>
          </div>
        </footer>
      </div>
    </>
  );
}
