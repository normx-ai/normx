import React, { useState, useEffect } from 'react';
import { clientFetch } from '../lib/api';
import { LuBookOpen, LuChevronDown, LuChevronRight, LuArrowDownLeft, LuArrowUpRight, LuBan, LuShieldCheck, LuMessageSquare } from 'react-icons/lu';

// Fonctionnement d'un compte OHADA — données chargées depuis l'API Qdrant
interface FonctionnementData {
  numero: string;
  titre: string;
  contenu: string;
  fonctionnement: {
    credit: string[];
    debit: string[];
  } | null;
  exclusions: { ne_pas_enregistrer: string; utiliser: string }[] | string[];
  controles: string[];
  commentaires?: string[];
  sens: string;
}

interface FonctionnementCompteProps {
  /** Préfixes de comptes à afficher (ex: ['10','11','12','13']) */
  prefixes: string[];
  /** Titre de la section (ex: "Capitaux propres") */
  titre?: string;
}

function FonctionnementCompte({ prefixes, titre }: FonctionnementCompteProps): React.ReactElement | null {
  const [data, setData] = useState<FonctionnementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showSection, setShowSection] = useState(false);

  useEffect(() => {
    // Charger les données de fonctionnement depuis l'API
    setLoading(true);
    clientFetch('/api/assistant/fonctionnement-comptes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes }),
    })
      .then(r => r.ok ? r.json() : [])
      .then((result: FonctionnementData[]) => {
        setData(result);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [prefixes.join(',')]);

  if (loading) return null;
  if (data.length === 0) return null;

  return (
    <div style={{ marginTop: 12, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setShowSection(!showSection)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '10px 14px', background: '#f0f4ff', border: 'none',
          cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1e40af',
        }}
      >
        {showSection ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
        <LuBookOpen size={14} />
        <span>Fonctionnement des comptes OHADA{titre ? ' — ' + titre : ''}</span>
        <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b', marginLeft: 'auto' }}>
          {data.length} compte{data.length > 1 ? 's' : ''}
        </span>
      </button>

      {showSection && (
        <div style={{ padding: '8px 14px 14px' }}>
          {data.map(item => {
            const isExpanded = expanded === item.numero;
            return (
              <div key={item.numero} style={{ marginBottom: 6, border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : item.numero)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 12px', background: isExpanded ? '#eff6ff' : '#fafafa',
                    border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    color: '#334155', textAlign: 'left',
                  }}
                >
                  {isExpanded ? <LuChevronDown size={12} /> : <LuChevronRight size={12} />}
                  <span style={{ color: '#1e40af', minWidth: 40 }}>{item.numero}</span>
                  <span>{item.titre?.replace(/^COMPTE \d+\s*/i, '') || ''}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 10,
                    background: item.sens === 'debiteur' ? '#dbeafe' : item.sens === 'crediteur' ? '#dcfce7' : '#fef3c7',
                    color: item.sens === 'debiteur' ? '#1e40af' : item.sens === 'crediteur' ? '#166534' : '#92400e',
                  }}>
                    {item.sens === 'debiteur' ? 'Débiteur' : item.sens === 'crediteur' ? 'Créditeur' : 'Mixte'}
                  </span>
                </button>

                {isExpanded && (
                  <div style={{ padding: '10px 16px', fontSize: 12, lineHeight: 1.6, color: '#475569' }}>
                    {/* Contenu */}
                    {item.contenu && (
                      <p style={{ margin: '0 0 10px', color: '#334155' }}>{item.contenu}</p>
                    )}

                    {/* Fonctionnement Débit */}
                    {item.fonctionnement?.debit && item.fonctionnement.debit.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>
                          <LuArrowUpRight size={13} /> Débit (quand débiter)
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {item.fonctionnement.debit.map((d, i) => <li key={i} style={{ marginBottom: 3 }}>{d}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Fonctionnement Crédit */}
                    {item.fonctionnement?.credit && item.fonctionnement.credit.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#059669', marginBottom: 4 }}>
                          <LuArrowDownLeft size={13} /> Crédit (quand créditer)
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {item.fonctionnement.credit.map((c, i) => <li key={i} style={{ marginBottom: 3 }}>{c}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Exclusions */}
                    {item.exclusions && item.exclusions.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#b45309', marginBottom: 4 }}>
                          <LuBan size={13} /> Ne pas enregistrer ici
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {item.exclusions.map((e, i) => {
                            if (typeof e === 'string') return <li key={i}>{e}</li>;
                            return <li key={i}>{e.ne_pas_enregistrer} &rarr; <em>{e.utiliser}</em></li>;
                          })}
                        </ul>
                      </div>
                    )}

                    {/* Commentaires */}
                    {item.commentaires && item.commentaires.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#6366f1', marginBottom: 4 }}>
                          <LuMessageSquare size={13} /> Commentaires
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {item.commentaires.map((c, i) => <li key={i} style={{ marginBottom: 3 }}>{c}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Éléments de contrôle */}
                    {item.controles && item.controles.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#0891b2', marginBottom: 4 }}>
                          <LuShieldCheck size={13} /> Éléments de contrôle
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {item.controles.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FonctionnementCompte;
