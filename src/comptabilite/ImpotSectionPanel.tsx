import React, { useState, useEffect } from 'react';
import {
  ImpotSectionPanelProps,
  Compte44,
  ComptesData,
  ComptesDataLigne,
  ImpotSectionItem,
  thStyle,
  tdStyle,
  fmtMontant,
  IMPOTS_SECTIONS,
} from './DeclarationTVA.types';

// ---------------------------------------------------------------------------
// Composant pour les sections d'impôts (hors TVA) avec sélecteur de comptes
// ---------------------------------------------------------------------------
function ImpotSectionPanel({ selectedImpot, selectedMois, entiteId, exerciceId, sectionComptes, setSectionComptes }: ImpotSectionPanelProps): React.ReactElement | null {
  const [comptes44, setComptes44] = useState<Compte44[]>([]);
  const [comptesData, setComptesData] = useState<ComptesData>({ lignes: [], total_debit: 0, total_credit: 0, solde: 0 });
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [showComptePicker, setShowComptePicker] = useState<boolean>(false);

  // Charger la liste des comptes 44x au montage
  useEffect(() => {
    fetch('/api/tva/plan-comptable-44')
      .then((r: Response) => r.ok ? r.json() : [])
      .then((data: Compte44[]) => setComptes44(data))
      .catch(() => { /* silently ignore */ });
  }, []);

  // Comptes sélectionnés pour cette section
  const selectedComptes: string[] = sectionComptes[selectedImpot] || [];

  // Charger les données quand les comptes ou le mois changent
  useEffect(() => {
    if (selectedComptes.length === 0 || selectedMois === null || !entiteId || !exerciceId) {
      setComptesData({ lignes: [], total_debit: 0, total_credit: 0, solde: 0 });
      return;
    }
    setLoadingData(true);
    const mois: number = selectedMois + 1;
    fetch(`/api/tva/montants-comptes/${entiteId}/${exerciceId}?mois=${mois}&comptes=${selectedComptes.join(',')}`)
      .then((r: Response) => r.ok ? r.json() : { lignes: [], total_debit: 0, total_credit: 0, solde: 0 })
      .then((data: ComptesData) => { setComptesData(data); setLoadingData(false); })
      .catch(() => { setLoadingData(false); });
  }, [selectedComptes.join(','), selectedMois, entiteId, exerciceId]);

  const toggleCompte = (numero: string): void => {
    setSectionComptes((prev: Record<string, string[]>) => {
      const current: string[] = prev[selectedImpot] || [];
      const updated: string[] = current.includes(numero)
        ? current.filter((c: string) => c !== numero)
        : [...current, numero];
      return { ...prev, [selectedImpot]: updated };
    });
  };

  const section: ImpotSectionItem | undefined = IMPOTS_SECTIONS.find((s: ImpotSectionItem) => s.key === selectedImpot);
  if (!section) return null;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>{section.label}</h3>
        <p style={{ fontSize: 14, color: '#666', margin: 0 }}>{section.description}</p>
      </div>

      {/* Sélecteur de comptes */}
      <div style={{ marginBottom: 16, padding: '14px 16px', background: '#f8f9fb', borderRadius: 6, border: '1px solid #e2e5ea' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Comptes comptables associés</span>
          <button
            onClick={() => setShowComptePicker(!showComptePicker)}
            style={{
              padding: '6px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: '1px solid #D4A843', background: '#eff6ff', color: '#D4A843',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {showComptePicker ? 'Fermer' : 'Sélectionner des comptes'}
          </button>
        </div>

        {/* Comptes sélectionnés (tags) */}
        {selectedComptes.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {selectedComptes.map((c: string) => {
              const info: Compte44 | undefined = comptes44.find((pc: Compte44) => pc.numero === c);
              return (
                <span key={c} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                  background: '#dbeafe', color: '#B08A2E', borderRadius: 4, fontSize: 13, fontWeight: 500,
                }}>
                  {c} {info ? `- ${info.libelle}` : ''}
                  <button
                    onClick={() => toggleCompte(c)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#B08A2E', fontSize: 16, lineHeight: 1 }}
                  >&times;</button>
                </span>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>
            Aucun compte sélectionné. Cliquez sur &quot;Sélectionner des comptes&quot; pour associer des comptes 44x à cette section.
          </div>
        )}

        {/* Liste de sélection des comptes */}
        {showComptePicker && (
          <div style={{ marginTop: 10, maxHeight: 250, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 4, background: '#fff' }}>
            {comptes44.map((c: Compte44) => {
              const isChecked: boolean = selectedComptes.includes(c.numero);
              return (
                <label
                  key={c.numero}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                    cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: 14,
                    background: isChecked ? '#eff6ff' : '#fff',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCompte(c.numero)}
                    style={{ accentColor: '#D4A843' }}
                  />
                  <strong style={{ color: '#1a1a1a', minWidth: 50 }}>{c.numero}</strong>
                  <span style={{ color: '#555' }}>{c.libelle}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Données des écritures */}
      {selectedComptes.length > 0 && (
        <>
          {loadingData ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#888', fontSize: 14 }}>Chargement des écritures...</div>
          ) : (
            <>
              {/* Résumé */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1, border: '1px solid #e2e5ea', borderRadius: 6, padding: '12px 16px', background: '#fff', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{fmtMontant(comptesData.total_debit)}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Total débit</div>
                </div>
                <div style={{ flex: 1, border: '1px solid #e2e5ea', borderRadius: 6, padding: '12px 16px', background: '#fff', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{fmtMontant(comptesData.total_credit)}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Total crédit</div>
                </div>
                <div style={{ flex: 1, border: '1px solid #e2e5ea', borderRadius: 6, padding: '12px 16px', background: '#fff', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: comptesData.solde >= 0 ? '#1a1a1a' : '#dc2626' }}>{fmtMontant(Math.abs(comptesData.solde))}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Solde ({comptesData.solde >= 0 ? 'créditeur' : 'débiteur'})</div>
                </div>
              </div>

              {/* Tableau des écritures */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Compte</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Pièce</th>
                    <th style={{ ...thStyle, minWidth: 160 }}>Libellé</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Débit</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {comptesData.lignes.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '30px 10px', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
                        Aucune écriture trouvée pour ce mois sur les comptes sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    comptesData.lignes.map((l: ComptesDataLigne, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{l.numero_compte}</td>
                        <td style={tdStyle}>{l.date_ecriture ? new Date(l.date_ecriture).toLocaleDateString('fr-FR') : ''}</td>
                        <td style={tdStyle}>{l.numero_piece || ''}</td>
                        <td style={tdStyle}>{l.libelle_ecriture || l.libelle_compte || ''}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{parseFloat(String(l.debit)) > 0 ? fmtMontant(l.debit) : ''}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{parseFloat(String(l.credit)) > 0 ? fmtMontant(l.credit) : ''}</td>
                      </tr>
                    ))
                  )}
                  {comptesData.lignes.length > 0 && (
                    <tr style={{ background: '#f0f4ff', fontWeight: 700 }}>
                      <td colSpan={4} style={{ ...tdStyle, fontWeight: 700 }}>Total</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtMontant(comptesData.total_debit)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtMontant(comptesData.total_credit)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      <div style={{ marginTop: 20, padding: '12px 16px', background: '#f8f9fb', borderRadius: 6, border: '1px solid #e2e5ea', fontSize: 13, color: '#666' }}>
        Sélectionnez les comptes comptables (classe 44) correspondant à cette section d&apos;impôt. Les montants seront calculés automatiquement depuis les écritures validées du mois.
      </div>
    </div>
  );
}

export default ImpotSectionPanel;
