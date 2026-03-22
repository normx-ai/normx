import React, { useState, useEffect } from 'react';
import { LuUsers, LuChevronDown, LuChevronRight, LuSave, LuPlus, LuTrash2, LuClipboardList, LuCheck, LuInfo } from 'react-icons/lu';
import { BalanceLigne } from '../types';
import { fmt, fmtInput, parseInputValue, ODEcriture, Suggestion } from './revisionTypes';
import JournalOD from './JournalOD';
import FonctionnementCompte from './FonctionnementCompte';

interface RevisionPersonnelProps {
  balanceN: BalanceLigne[];
  exerciceAnnee: number;
  entiteId: number;
  exerciceId: number;
}

// Contrôle 1 : Cadrage charges de personnel
interface ChargePersonnelLigne {
  compte: string;
  designation: string;
  soldeN: number;
  soldeN1: number;
  variation: number;
  variationPct: number;
}

// Contrôle 3 : Avances et acomptes au personnel
interface AvanceLigne {
  compte: string;
  designation: string;
  soldeN: number;
  soldeN1: number;
  anteriorite: string;
  accordFormalise: string; // 'Oui' | 'Non'
  observations: string;
}

// Contrôle 4 : Dettes sociales
interface DetteSocialeLigne {
  compte: string;
  designation: string;
  soldeN: number;
  soldeN1: number;
  variation: number;
  commentaire: string;
}

// Contrôle 2 : Provision congés payés — données éditables
interface ProvisionCongesData {
  masseSalariale: number;
  joursCongesParMois: number;
  tauxChargesSociales: number;
  tauxChargesFiscales: number;
}

const TRAVAUX_PERSONNEL = [
  'Vérifier la cohérence globale des charges de personnel par rapport à N-1 (revue analytique)',
  'Calculer et comptabiliser la provision pour congés payés',
  'Justifier les avances et acomptes au personnel (comptes 421x)',
  'Rapprocher les dettes sociales (comptes 43x) avec les déclarations sociales et fiscales',
  'Vérifier les charges sociales patronales (CNSS, ONEMO, etc.)',
  'Contrôler les indemnités de fin de contrat et provisions associées',
  'Vérifier la conformité des bulletins de paie avec la comptabilité',
  'Rapprocher la masse salariale avec les déclarations fiscales (IRPP, contribution forfaitaire)',
];

function RevisionPersonnel({ balanceN, exerciceAnnee, entiteId, exerciceId }: RevisionPersonnelProps): React.ReactElement {
  // --- State ---
  const [saved, setSaved] = useState(false);
  const [odEcritures, setOdEcritures] = useState<ODEcriture[]>([]);
  const [nextOdId, setNextOdId] = useState(1);
  const [showTravaux, setShowTravaux] = useState(true);

  // Contrôle 2 : Provision congés payés
  const [congesData, setCongesData] = useState<ProvisionCongesData>({
    masseSalariale: 0,
    joursCongesParMois: 2,
    tauxChargesSociales: 20,
    tauxChargesFiscales: 5,
  });

  // Contrôle 3 : Avances — editable fields
  const [avancesEdit, setAvancesEdit] = useState<Record<string, { anteriorite: string; accordFormalise: string; observations: string }>>({});

  // Contrôle 4 : Dettes sociales — editable commentaires
  const [dettesCommentaires, setDettesCommentaires] = useState<Record<string, string>>({});

  // Section collapse state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ c1: true, c2: true, c3: true, c4: true });

  const toggleSection = (key: string): void => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- Contrôle 1 : Cadrage charges de personnel (comptes 66x) ---
  const chargesPersonnel: ChargePersonnelLigne[] = (() => {
    const comptesVus = new Set<string>();
    const lignes: ChargePersonnelLigne[] = [];

    for (const bl of balanceN) {
      if (!bl.numero_compte.startsWith('66')) continue;
      if (comptesVus.has(bl.numero_compte)) continue;
      comptesVus.add(bl.numero_compte);

      const soldeN = (parseFloat(String(bl.solde_debiteur)) || 0) - (parseFloat(String(bl.solde_crediteur)) || 0);
      const soldeN1 = (parseFloat(String(bl.si_debit ?? 0)) || 0) - (parseFloat(String(bl.si_credit ?? 0)) || 0);
      const variation = soldeN - soldeN1;
      const variationPct = soldeN1 !== 0 ? (variation / Math.abs(soldeN1)) * 100 : (soldeN !== 0 ? 100 : 0);

      lignes.push({ compte: bl.numero_compte, designation: bl.libelle_compte, soldeN, soldeN1, variation, variationPct });
    }

    lignes.sort((a, b) => a.compte.localeCompare(b.compte));
    return lignes;
  })();

  const totalChargesN = chargesPersonnel.reduce((s, l) => s + l.soldeN, 0);
  const totalChargesN1 = chargesPersonnel.reduce((s, l) => s + l.soldeN1, 0);
  const totalChargesVariation = totalChargesN - totalChargesN1;
  const totalChargesVariationPct = totalChargesN1 !== 0 ? (totalChargesVariation / Math.abs(totalChargesN1)) * 100 : 0;
  const hasAnomalieCharges = chargesPersonnel.some(l => Math.abs(l.variationPct) > 10);

  // --- Contrôle 2 : Calcul provision congés payés ---
  const joursAcquis = 12 * congesData.joursCongesParMois;
  const joursOuvrablesMois = 26;
  const provisionConges = congesData.masseSalariale > 0
    ? (congesData.masseSalariale * joursAcquis) / (joursOuvrablesMois * 12)
    : 0;
  const chargesSocialesConges = provisionConges * (congesData.tauxChargesSociales / 100);
  const chargesFiscalesConges = provisionConges * (congesData.tauxChargesFiscales / 100);
  const totalProvisionConges = provisionConges + chargesSocialesConges + chargesFiscalesConges;

  // Solde 4281 en balance (charges à payer congés)
  const solde4281 = balanceN
    .filter(l => l.numero_compte.startsWith('4281'))
    .reduce((s, l) => s + ((parseFloat(String(l.solde_crediteur)) || 0) - (parseFloat(String(l.solde_debiteur)) || 0)), 0);
  const ecartConges = totalProvisionConges - solde4281;

  // --- Contrôle 3 : Avances et acomptes au personnel (421x) ---
  const avancesLignes: AvanceLigne[] = (() => {
    const lignes: AvanceLigne[] = [];
    const comptesVus = new Set<string>();

    for (const bl of balanceN) {
      if (!bl.numero_compte.startsWith('421')) continue;
      if (comptesVus.has(bl.numero_compte)) continue;
      comptesVus.add(bl.numero_compte);

      const soldeN = (parseFloat(String(bl.solde_debiteur)) || 0) - (parseFloat(String(bl.solde_crediteur)) || 0);
      const soldeN1 = (parseFloat(String(bl.si_debit ?? 0)) || 0) - (parseFloat(String(bl.si_credit ?? 0)) || 0);

      const edit = avancesEdit[bl.numero_compte] || { anteriorite: '', accordFormalise: 'Non', observations: '' };
      lignes.push({ compte: bl.numero_compte, designation: bl.libelle_compte, soldeN, soldeN1, ...edit });
    }

    lignes.sort((a, b) => a.compte.localeCompare(b.compte));
    return lignes;
  })();

  const totalAvancesN = avancesLignes.reduce((s, l) => s + l.soldeN, 0);
  const totalAvancesN1 = avancesLignes.reduce((s, l) => s + l.soldeN1, 0);

  // --- Contrôle 4 : Dettes sociales (43x) ---
  const dettesLignes: DetteSocialeLigne[] = (() => {
    const lignes: DetteSocialeLigne[] = [];
    const comptesVus = new Set<string>();

    for (const bl of balanceN) {
      if (!bl.numero_compte.startsWith('43')) continue;
      if (comptesVus.has(bl.numero_compte)) continue;
      comptesVus.add(bl.numero_compte);

      const soldeN = (parseFloat(String(bl.solde_crediteur)) || 0) - (parseFloat(String(bl.solde_debiteur)) || 0);
      const soldeN1 = (parseFloat(String(bl.si_credit ?? 0)) || 0) - (parseFloat(String(bl.si_debit ?? 0)) || 0);
      const variation = soldeN - soldeN1;
      const commentaire = dettesCommentaires[bl.numero_compte] || '';

      lignes.push({ compte: bl.numero_compte, designation: bl.libelle_compte, soldeN, soldeN1, variation, commentaire });
    }

    lignes.sort((a, b) => a.compte.localeCompare(b.compte));
    return lignes;
  })();

  const totalDettesN = dettesLignes.reduce((s, l) => s + l.soldeN, 0);
  const totalDettesN1 = dettesLignes.reduce((s, l) => s + l.soldeN1, 0);
  const totalDettesVariation = totalDettesN - totalDettesN1;
  const hasDettesAnomalie = dettesLignes.some(l => {
    const pct = l.soldeN1 !== 0 ? Math.abs(l.variation / Math.abs(l.soldeN1)) * 100 : (l.variation !== 0 ? 100 : 0);
    return pct > 20;
  });

  // --- Load / Save ---
  useEffect(() => { loadSaved(); }, [entiteId, exerciceId]);

  const loadSaved = (): void => {
    fetch(`/api/revision/${entiteId}/${exerciceId}/personnel`)
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then((data: any) => {
        if (data.congesData) setCongesData(data.congesData);
        if (data.avancesEdit) setAvancesEdit(data.avancesEdit);
        if (data.dettesCommentaires) setDettesCommentaires(data.dettesCommentaires);
        if (data.odEcritures?.length > 0) {
          setOdEcritures(data.odEcritures);
          setNextOdId(Math.max(...data.odEcritures.map((e: ODEcriture) => e.id)) + 1);
        }
      })
      .catch(() => {});
  };

  const handleSave = async (): Promise<void> => {
    try {
      await fetch(`/api/revision/${entiteId}/${exerciceId}/personnel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ congesData, avancesEdit, dettesCommentaires, odEcritures }),
      });
      setSaved(true);
    } catch { /* silently */ }
  };

  // --- Journal OD ---
  const addOdEcriture = (source?: string, compteDebit?: string, compteCredit?: string, montant?: number, libelle?: string): void => {
    const newOd: ODEcriture = {
      id: nextOdId, date: `${exerciceAnnee}-12-31`,
      compteDebit: compteDebit || '', libelleDebit: '',
      compteCredit: compteCredit || '', libelleCredit: '',
      montant: montant || 0, libelle: libelle || '',
      source: source || 'Manuel',
    };
    setOdEcritures(prev => [...prev, newOd]);
    setNextOdId(prev => prev + 1);
    setSaved(false);
  };

  const updateOd = (id: number, field: keyof ODEcriture, value: string | number): void => {
    setOdEcritures(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    setSaved(false);
  };

  const removeOd = (id: number): void => {
    setOdEcritures(prev => prev.filter(e => e.id !== id));
    setSaved(false);
  };

  // --- Suggestions ---
  const suggestions: Suggestion[] = [];

  // Suggestion contrôle 2 : Écart provision congés payés
  if (congesData.masseSalariale > 0 && Math.abs(ecartConges) > 0.5) {
    const dejaPropose = odEcritures.some(od => od.source === 'Personnel-C2-Conges');
    if (!dejaPropose) {
      if (ecartConges > 0) {
        // Provision calculée > balance → dotation manquante
        // Indemnités de congés
        const provisionIndemnites = provisionConges - (solde4281 > 0 ? solde4281 * (provisionConges / totalProvisionConges) : 0);
        const provisionChargesPatronales = chargesSocialesConges + chargesFiscalesConges;

        suggestions.push({
          compteDebit: '6610', libelleDebit: 'Indemnités de congés payés',
          compteCredit: '4281', libelleCredit: 'Charges à payer — congés payés',
          montant: provisionConges > 0 ? Math.min(ecartConges, provisionConges) : ecartConges,
          libelle: 'Provision pour congés payés — indemnités',
          source: 'Personnel-C2-Conges',
        });

        if (provisionChargesPatronales > 0) {
          const ecartCharges = ecartConges - Math.min(ecartConges, provisionConges);
          if (ecartCharges > 0.5) {
            suggestions.push({
              compteDebit: '6641', libelleDebit: 'Charges sociales sur congés payés',
              compteCredit: '4281', libelleCredit: 'Charges à payer — congés payés',
              montant: ecartCharges,
              libelle: 'Provision pour congés payés — charges patronales (sociales + fiscales)',
              source: 'Personnel-C2-Charges',
            });
          }
        }
      } else {
        // Provision calculée < balance → reprise excédentaire
        suggestions.push({
          compteDebit: '4281', libelleDebit: 'Charges à payer — congés payés',
          compteCredit: '6610', libelleCredit: 'Indemnités de congés payés',
          montant: Math.abs(ecartConges),
          libelle: 'Reprise provision congés payés excédentaire',
          source: 'Personnel-C2-Conges',
        });
      }
    }
  }

  // Suggestion contrôle 3 : Dépréciation avances anciennes
  for (const av of avancesLignes) {
    const edit = avancesEdit[av.compte];
    if (edit && edit.anteriorite && av.soldeN > 0) {
      // Check if user indicated old balance (> 6 mois)
      const isOld = edit.anteriorite.toLowerCase().includes('> 6') ||
                    edit.anteriorite.toLowerCase().includes('>6') ||
                    edit.anteriorite.toLowerCase().includes('ancien') ||
                    edit.anteriorite.toLowerCase().includes('plus de 6');
      if (isOld) {
        const dejaPropose = odEcritures.some(od => od.source === `Personnel-C3-${av.compte}`);
        if (!dejaPropose) {
          suggestions.push({
            compteDebit: '6594', libelleDebit: 'Charges provisionnées — personnel',
            compteCredit: '4912', libelleCredit: 'Dépréciation avances au personnel',
            montant: av.soldeN,
            libelle: `Dépréciation avance au personnel ${av.compte} (antériorité : ${edit.anteriorite})`,
            source: `Personnel-C3-${av.compte}`,
          });
        }
      }
    }
  }

  return (
    <div className="revision-kp">
      <div className="revision-section-header">
        <h3><LuUsers size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />Comptes de Personnel</h3>
        <button className="revision-save-btn" onClick={handleSave}>
          <LuSave size={14} /> {saved ? 'Sauvegard\u00e9' : 'Sauvegarder'}
        </button>
      </div>

      <div className="revision-objectif">
        <strong>Objectif :</strong> S'assurer de l'exhaustivit\u00e9, de la r\u00e9alit\u00e9 et de la correcte \u00e9valuation des charges de personnel, des provisions pour cong\u00e9s pay\u00e9s, des avances au personnel et des dettes sociales.
      </div>

      {/* Travaux \u00e0 effectuer */}
      <div className="revision-travaux">
        <button className="revision-travaux-toggle" onClick={() => setShowTravaux(!showTravaux)}>
          {showTravaux ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <LuClipboardList size={14} />
          <span>Travaux \u00e0 effectuer</span>
        </button>
        {showTravaux && (
          <ul className="revision-travaux-list">
            {TRAVAUX_PERSONNEL.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </div>

      <FonctionnementCompte prefixes={['42','66']} titre="Personnel" />

      {/* ============================== */}
      {/* Contr\u00f4le 1 : Cadrage charges de personnel */}
      {/* ============================== */}
      <div className="revision-control">
        <div className="revision-control-title" onClick={() => toggleSection('c1')} style={{ cursor: 'pointer' }}>
          {openSections.c1 ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <span>Contr\u00f4le 1 — Cadrage des charges de personnel (comptes 66x)</span>
          {chargesPersonnel.length > 0 && (
            hasAnomalieCharges
              ? <span className="revision-badge ko"><LuInfo size={11} /> Variation {'>'} 10%</span>
              : <span className="revision-badge ok"><LuCheck size={11} /> Coh\u00e9rent</span>
          )}
        </div>
        <div className="revision-ref">Revue analytique — comparaison N vs N-1 des comptes 66x (salaires et charges sociales)</div>

        {openSections.c1 && (
          <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
            <table className="revision-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Compte</th>
                  <th>D\u00e9signation</th>
                  <th className="num" style={{ width: 130 }}>Solde N ({exerciceAnnee})</th>
                  <th className="num" style={{ width: 130 }}>Solde N-1 ({exerciceAnnee - 1})</th>
                  <th className="num" style={{ width: 120 }}>Variation</th>
                  <th className="num" style={{ width: 90 }}>Variation %</th>
                </tr>
              </thead>
              <tbody>
                {chargesPersonnel.map(l => {
                  const isAnomalie = Math.abs(l.variationPct) > 10;
                  return (
                    <tr key={l.compte} className={isAnomalie ? 'ecart-row' : ''}>
                      <td className="compte">{l.compte}</td>
                      <td>{l.designation}</td>
                      <td className="num">{fmt(l.soldeN)}</td>
                      <td className="num">{fmt(l.soldeN1)}</td>
                      <td className={`num ${l.variation > 0.5 ? 'ecart-val' : l.variation < -0.5 ? 'ok-val' : ''}`}>{fmt(l.variation)}</td>
                      <td className={`num ${isAnomalie ? 'ecart-val' : ''}`}>
                        {l.soldeN1 !== 0 || l.soldeN !== 0 ? `${l.variationPct >= 0 ? '+' : ''}${l.variationPct.toFixed(1)}%` : ''}
                      </td>
                    </tr>
                  );
                })}
                {chargesPersonnel.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte 66x dans la balance.</td></tr>
                )}
              </tbody>
              {chargesPersonnel.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Total</strong></td>
                    <td className="num"><strong>{fmt(totalChargesN)}</strong></td>
                    <td className="num"><strong>{fmt(totalChargesN1)}</strong></td>
                    <td className="num"><strong>{fmt(totalChargesVariation)}</strong></td>
                    <td className={`num ${Math.abs(totalChargesVariationPct) > 10 ? 'ecart-val' : ''}`}>
                      <strong>{totalChargesN1 !== 0 ? `${totalChargesVariationPct >= 0 ? '+' : ''}${totalChargesVariationPct.toFixed(1)}%` : ''}</strong>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ============================== */}
      {/* Contr\u00f4le 2 : Provision pour cong\u00e9s pay\u00e9s */}
      {/* ============================== */}
      <div className="revision-control">
        <div className="revision-control-title" onClick={() => toggleSection('c2')} style={{ cursor: 'pointer' }}>
          {openSections.c2 ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <span>Contr\u00f4le 2 — Provision pour cong\u00e9s pay\u00e9s</span>
          {congesData.masseSalariale > 0 && (
            Math.abs(ecartConges) < 0.5
              ? <span className="revision-badge ok"><LuCheck size={11} /> Conforme</span>
              : <span className="revision-badge ko"><LuInfo size={11} /> \u00c9cart d\u00e9tect\u00e9</span>
          )}
        </div>
        <div className="revision-ref">Comptes 4281 (charges \u00e0 payer cong\u00e9s) — Provision = masse salariale x jours acquis / (jours ouvrables x 12) + charges patronales</div>

        {openSections.c2 && (
          <>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 600 }}>
              <div className="revision-field">
                <label>Masse salariale brute annuelle</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="revision-input"
                  value={fmtInput(congesData.masseSalariale)}
                  onChange={e => { setCongesData(prev => ({ ...prev, masseSalariale: parseInputValue(e.target.value) })); setSaved(false); }}
                  placeholder="Saisir la masse salariale..."
                />
              </div>
              <div className="revision-field">
                <label>Jours de cong\u00e9s acquis / mois</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="revision-input"
                  value={congesData.joursCongesParMois || ''}
                  onChange={e => { setCongesData(prev => ({ ...prev, joursCongesParMois: parseFloat(e.target.value) || 0 })); setSaved(false); }}
                />
              </div>
              <div className="revision-field">
                <label>Taux charges patronales sociales (%)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="revision-input"
                  value={congesData.tauxChargesSociales || ''}
                  onChange={e => { setCongesData(prev => ({ ...prev, tauxChargesSociales: parseFloat(e.target.value) || 0 })); setSaved(false); }}
                />
              </div>
              <div className="revision-field">
                <label>Taux charges patronales fiscales (%)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="revision-input"
                  value={congesData.tauxChargesFiscales || ''}
                  onChange={e => { setCongesData(prev => ({ ...prev, tauxChargesFiscales: parseFloat(e.target.value) || 0 })); setSaved(false); }}
                />
              </div>
            </div>

            {congesData.masseSalariale > 0 && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: '12.5px' }}>
                <table className="revision-table revision-table-small" style={{ maxWidth: 500 }}>
                  <tbody>
                    <tr>
                      <td>Jours acquis (12 \u00d7 {congesData.joursCongesParMois})</td>
                      <td className="num"><strong>{joursAcquis}</strong></td>
                    </tr>
                    <tr>
                      <td>Jours ouvrables / mois (fixe)</td>
                      <td className="num">{joursOuvrablesMois}</td>
                    </tr>
                    <tr>
                      <td>Provision cong\u00e9s (indemnit\u00e9s)</td>
                      <td className="num"><strong>{fmt(provisionConges)}</strong></td>
                    </tr>
                    <tr>
                      <td>Charges sociales patronales ({congesData.tauxChargesSociales}%)</td>
                      <td className="num">{fmt(chargesSocialesConges)}</td>
                    </tr>
                    <tr>
                      <td>Charges fiscales patronales ({congesData.tauxChargesFiscales}%)</td>
                      <td className="num">{fmt(chargesFiscalesConges)}</td>
                    </tr>
                    <tr style={{ borderTop: '2px solid #333' }}>
                      <td><strong>Total provision cong\u00e9s pay\u00e9s</strong></td>
                      <td className="num"><strong>{fmt(totalProvisionConges)}</strong></td>
                    </tr>
                    <tr>
                      <td>Solde 4281 en balance</td>
                      <td className="num"><strong>{fmt(solde4281)}</strong></td>
                    </tr>
                    <tr>
                      <td>\u00c9cart</td>
                      <td className={`num ${Math.abs(ecartConges) > 0.5 ? 'ecart-val' : 'ok-val'}`}>
                        <strong>{fmt(ecartConges)}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
                {Math.abs(ecartConges) < 0.5
                  ? <span className="revision-badge ok" style={{ marginTop: 6, display: 'inline-block' }}>Conforme</span>
                  : <span className="revision-badge ko" style={{ marginTop: 6, display: 'inline-block' }}>\u00c9cart — suggestion d'OD ci-dessous</span>
                }
              </div>
            )}
          </>
        )}
      </div>

      {/* ============================== */}
      {/* Contr\u00f4le 3 : Avances et acomptes au personnel (421x) */}
      {/* ============================== */}
      <div className="revision-control">
        <div className="revision-control-title" onClick={() => toggleSection('c3')} style={{ cursor: 'pointer' }}>
          {openSections.c3 ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <span>Contr\u00f4le 3 — Avances et acomptes au personnel (comptes 421x)</span>
        </div>
        <div className="revision-ref">Si ant\u00e9riorit\u00e9 {'>'} 6 mois : envisager une d\u00e9pr\u00e9ciation (D 6594 / C 4912)</div>

        {openSections.c3 && (
          <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
            <table className="revision-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Compte</th>
                  <th>D\u00e9signation</th>
                  <th className="num" style={{ width: 120 }}>Solde N</th>
                  <th className="num" style={{ width: 120 }}>Solde N-1</th>
                  <th className="editable-col" style={{ width: 130 }}>Ant\u00e9riorit\u00e9</th>
                  <th className="editable-col" style={{ width: 90 }}>Accord formalis\u00e9</th>
                  <th className="editable-col" style={{ width: 160 }}>Observations</th>
                </tr>
              </thead>
              <tbody>
                {avancesLignes.map(l => {
                  const edit = avancesEdit[l.compte] || { anteriorite: '', accordFormalise: 'Non', observations: '' };
                  const isOld = edit.anteriorite.toLowerCase().includes('> 6') ||
                                edit.anteriorite.toLowerCase().includes('>6') ||
                                edit.anteriorite.toLowerCase().includes('ancien') ||
                                edit.anteriorite.toLowerCase().includes('plus de 6');
                  return (
                    <tr key={l.compte} className={isOld && l.soldeN > 0 ? 'ecart-row' : ''}>
                      <td className="compte">{l.compte}</td>
                      <td>{l.designation}</td>
                      <td className="num">{fmt(l.soldeN)}</td>
                      <td className="num">{fmt(l.soldeN1)}</td>
                      <td className="editable-cell">
                        <input
                          type="text"
                          value={edit.anteriorite}
                          onChange={e => {
                            setAvancesEdit(prev => ({ ...prev, [l.compte]: { ...edit, anteriorite: e.target.value } }));
                            setSaved(false);
                          }}
                          placeholder="Ex: > 6 mois"
                          style={{ maxWidth: 'none', fontSize: '11px' }}
                        />
                      </td>
                      <td className="editable-cell">
                        <select
                          value={edit.accordFormalise}
                          onChange={e => {
                            setAvancesEdit(prev => ({ ...prev, [l.compte]: { ...edit, accordFormalise: e.target.value } }));
                            setSaved(false);
                          }}
                          style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #ddd', width: '100%', fontSize: '11px' }}
                        >
                          <option value="Oui">Oui</option>
                          <option value="Non">Non</option>
                        </select>
                      </td>
                      <td className="editable-cell">
                        <input
                          type="text"
                          value={edit.observations}
                          onChange={e => {
                            setAvancesEdit(prev => ({ ...prev, [l.compte]: { ...edit, observations: e.target.value } }));
                            setSaved(false);
                          }}
                          style={{ maxWidth: 'none', fontSize: '11px' }}
                          placeholder="..."
                        />
                      </td>
                    </tr>
                  );
                })}
                {avancesLignes.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte 421x dans la balance.</td></tr>
                )}
              </tbody>
              {avancesLignes.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Total</strong></td>
                    <td className="num"><strong>{fmt(totalAvancesN)}</strong></td>
                    <td className="num"><strong>{fmt(totalAvancesN1)}</strong></td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ============================== */}
      {/* Contr\u00f4le 4 : Dettes sociales (43x) */}
      {/* ============================== */}
      <div className="revision-control">
        <div className="revision-control-title" onClick={() => toggleSection('c4')} style={{ cursor: 'pointer' }}>
          {openSections.c4 ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          <span>Contr\u00f4le 4 — Dettes sociales (comptes 43x)</span>
          {dettesLignes.length > 0 && (
            hasDettesAnomalie
              ? <span className="revision-badge ko"><LuInfo size={11} /> Variation significative</span>
              : <span className="revision-badge ok"><LuCheck size={11} /> Coh\u00e9rent</span>
          )}
        </div>
        <div className="revision-ref">Comparaison N vs N-1 des dettes sociales — signaler les variations significatives</div>

        {openSections.c4 && (
          <div className="revision-table-wrapper" style={{ marginTop: 8 }}>
            <table className="revision-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Compte</th>
                  <th>D\u00e9signation</th>
                  <th className="num" style={{ width: 120 }}>Solde N ({exerciceAnnee})</th>
                  <th className="num" style={{ width: 120 }}>Solde N-1 ({exerciceAnnee - 1})</th>
                  <th className="num" style={{ width: 110 }}>Variation</th>
                  <th className="editable-col" style={{ width: 180 }}>Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {dettesLignes.map(l => {
                  const pct = l.soldeN1 !== 0 ? Math.abs(l.variation / Math.abs(l.soldeN1)) * 100 : (l.variation !== 0 ? 100 : 0);
                  const isAnomalie = pct > 20;
                  return (
                    <tr key={l.compte} className={isAnomalie ? 'ecart-row' : ''}>
                      <td className="compte">{l.compte}</td>
                      <td>{l.designation}</td>
                      <td className="num">{fmt(l.soldeN)}</td>
                      <td className="num">{fmt(l.soldeN1)}</td>
                      <td className={`num ${isAnomalie ? 'ecart-val' : ''}`}>{fmt(l.variation)}</td>
                      <td className="editable-cell">
                        <input
                          type="text"
                          value={dettesCommentaires[l.compte] || ''}
                          onChange={e => {
                            setDettesCommentaires(prev => ({ ...prev, [l.compte]: e.target.value }));
                            setSaved(false);
                          }}
                          style={{ maxWidth: 'none', fontSize: '11px' }}
                          placeholder="..."
                        />
                      </td>
                    </tr>
                  );
                })}
                {dettesLignes.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16, fontStyle: 'italic' }}>Aucun compte 43x dans la balance.</td></tr>
                )}
              </tbody>
              {dettesLignes.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Total</strong></td>
                    <td className="num"><strong>{fmt(totalDettesN)}</strong></td>
                    <td className="num"><strong>{fmt(totalDettesN1)}</strong></td>
                    <td className="num"><strong>{fmt(totalDettesVariation)}</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Journal OD */}
      <JournalOD
        suggestions={suggestions}
        odEcritures={odEcritures}
        onAddOd={addOdEcriture}
        onUpdateOd={updateOd}
        onRemoveOd={removeOd}
      />
    </div>
  );
}

export default RevisionPersonnel;
