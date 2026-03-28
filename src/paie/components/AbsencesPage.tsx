import React, { useState } from 'react';
import { ABSENCES_CONGES_PAYEES, DEFAULT_PLANNING_SALARIE } from '../data/salarieData';

interface SalarieIdentite {
  nom?: string;
  prenom?: string;
}

interface Salarie {
  id: number | string;
  identite?: SalarieIdentite;
}

interface AbsenceForm {
  salarie_id: string;
  type: string;
  date_debut: string;
  date_fin: string;
  jours: string;
  motif: string;
}

interface Absence extends AbsenceForm {
  id: number;
}

interface AbsencesPageProps {
  salaries?: Salarie[];
}

function AbsencesPage({ salaries = [] }: AbsencesPageProps): React.ReactElement {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [form, setForm] = useState<AbsenceForm>({ salarie_id: '', type: '', date_debut: '', date_fin: '', jours: '', motif: '' });
  const [planning] = useState(DEFAULT_PLANNING_SALARIE);

  const handleAdd = (): void => {
    if (!form.salarie_id || !form.type || !form.date_debut) return;
    setAbsences(prev => [...prev, { ...form, id: Date.now() }]);
    setForm({ salarie_id: '', type: '', date_debut: '', date_fin: '', jours: '', motif: '' });
    setShowForm(false);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A3A5C', marginBottom: 4 }}>Congés et absences</h2>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
        Gestion des congés, absences et arrêts de travail — Code du travail Art. 119 : 26 jours ouvrés/an
      </p>

      {/* Horaires par defaut */}
      <div style={{ marginBottom: 24, padding: 16, background: '#f9f7f0', borderRadius: 8, border: '1px solid #e5e0cc' }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1A3A5C', marginBottom: 8 }}>
          Horaires par défaut (Art. 105 : 40h/semaine)
        </h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {planning.map((p, i) => (
            <div key={i} style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 12,
              background: p.statut === 'Ouvert' ? '#fff' : '#f0f0f0',
              border: `1px solid ${p.statut === 'Ouvert' ? '#D4A843' : '#ddd'}`,
              color: p.statut === 'Ouvert' ? '#1A3A5C' : '#999',
            }}>
              <strong>{p.jour.slice(0, 3)}</strong> {p.statut === 'Ouvert' ? `${p.heures}h` : p.statut}
            </div>
          ))}
          <div style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, background: '#D4A843', color: '#fff', fontWeight: 600 }}>
            Total : 40h/sem — 173,33h/mois
          </div>
        </div>
      </div>

      {/* Bouton ajouter */}
      <button
        onClick={() => setShowForm(true)}
        style={{ padding: '8px 16px', background: '#D4A843', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}
      >
        + Saisir une absence
      </button>

      {/* Formulaire */}
      {showForm && (
        <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #e5e5e5', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Salarié <span style={{ color: '#e74c3c' }}>*</span></label>
              <select value={form.salarie_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(p => ({ ...p, salarie_id: e.target.value }))} style={inputStyle}>
                <option value="">Sélectionnez...</option>
                {salaries.map(s => (
                  <option key={s.id} value={s.id}>{s.identite?.nom} {s.identite?.prenom}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Type d'absence <span style={{ color: '#e74c3c' }}>*</span></label>
              <select value={form.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                <option value="">Sélectionnez...</option>
                {ABSENCES_CONGES_PAYEES.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date début <span style={{ color: '#e74c3c' }}>*</span></label>
              <input type="date" value={form.date_debut} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, date_debut: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Date fin</label>
              <input type="date" value={form.date_fin} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, date_fin: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Nombre de jours</label>
              <input type="number" value={form.jours} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, jours: e.target.value }))} placeholder="Ex: 5" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Motif</label>
              <input type="text" value={form.motif} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, motif: e.target.value }))} placeholder="Motif (optionnel)" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={handleAdd} style={{ padding: '8px 16px', background: '#D4A843', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Valider</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', background: '#fff', color: '#666', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Tableau absences */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1A3A5C', color: '#fff' }}>
              <th style={thStyle}>Salarié</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Du</th>
              <th style={thStyle}>Au</th>
              <th style={thStyle}>Jours</th>
              <th style={thStyle}>Motif</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {absences.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>Aucune absence saisie pour cette période.</td></tr>
            ) : (
              absences.map(a => {
                const sal = salaries.find(s => String(s.id) === String(a.salarie_id));
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={tdStyle}>{sal ? `${sal.identite?.nom} ${sal.identite?.prenom}` : '-'}</td>
                    <td style={tdStyle}><span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: a.type === 'Congés payés' ? '#e8f5e9' : a.type === 'Absence injustifiée' ? '#fce4ec' : '#fff8e1',
                      color: a.type === 'Congés payés' ? '#2e7d32' : a.type === 'Absence injustifiée' ? '#c62828' : '#f57f17',
                    }}>{a.type}</span></td>
                    <td style={tdStyle}>{a.date_debut}</td>
                    <td style={tdStyle}>{a.date_fin || '-'}</td>
                    <td style={tdStyle}>{a.jours || '-'}</td>
                    <td style={tdStyle}>{a.motif || '-'}</td>
                    <td style={tdStyle}>
                      <button onClick={() => setAbsences(prev => prev.filter(x => x.id !== a.id))} style={{ color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer' }}>Supprimer</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Rappel legal */}
      <div style={{ marginTop: 24, padding: 12, background: '#f0f4ff', borderRadius: 6, border: '1px solid #d0d8f0', fontSize: 12, color: '#444' }}>
        <strong>Rappels Code du travail Congo :</strong>
        <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
          <li>Art. 105 : Durée légale 40h/semaine, 2 400h/an</li>
          <li>Art. 119 : 26 jours ouvrés de congé payé par an de service</li>
          <li>Art. 83 : Heures sup — +10% (41e-42e), +25% (43e-48e), +50% (au-delà), +100% (dim/fériés)</li>
          <li>Congé maternité : 15 semaines (Code sécurité sociale)</li>
        </ul>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 };
const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '8px 12px' };

export default AbsencesPage;
