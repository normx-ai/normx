import React from 'react';

const PRIMARY = '#D4A843';
const DARK = '#1A3A5C';

interface OnboardingStepExerciceProps {
  annee: number;
  dateDebut: string;
  dateFin: string;
  onAnneeChange: (annee: number) => void;
  onDateDebutChange: (d: string) => void;
  onDateFinChange: (d: string) => void;
  onCreate: () => void;
  onSkip: () => void;
  saving: boolean;
  error: string;
}

function OnboardingStepExercice({
  annee,
  dateDebut,
  dateFin,
  onAnneeChange,
  onDateDebutChange,
  onDateFinChange,
  onCreate,
  onSkip,
  saving,
  error,
}: OnboardingStepExerciceProps): React.JSX.Element {
  return (
    <>
      <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.2)' }}>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
          Un exercice comptable correspond a une annee fiscale. Vous pourrez ensuite importer
          votre balance et generer vos etats financiers pour cette periode.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 6 }}>
          Annee de l'exercice
        </label>
        <input
          type="number"
          value={annee}
          onChange={(e) => {
            const next = parseInt(e.target.value, 10) || new Date().getFullYear();
            onAnneeChange(next);
          }}
          style={{
            width: '100%',
            padding: '12px 14px',
            border: '1.5px solid rgba(0,0,0,0.12)',
            fontSize: 15,
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 6 }}>
            Date de debut
          </label>
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => onDateDebutChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1.5px solid rgba(0,0,0,0.12)',
              fontSize: 15,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 6 }}>
            Date de fin
          </label>
          <input
            type="date"
            value={dateFin}
            onChange={(e) => onDateFinChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1.5px solid rgba(0,0,0,0.12)',
              fontSize: 15,
              outline: 'none',
            }}
          />
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#dc2626' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onSkip}
          disabled={saving}
          style={{
            flex: 1,
            padding: '14px 28px',
            background: '#fff',
            color: DARK,
            border: '1.5px solid rgba(0,0,0,0.12)',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Plus tard
        </button>
        <button
          onClick={onCreate}
          disabled={saving}
          style={{
            flex: 2,
            padding: '14px 28px',
            background: saving ? '#e5e7eb' : PRIMARY,
            color: saving ? '#9ca3af' : DARK,
            border: 'none',
            fontSize: 16,
            fontWeight: 700,
            cursor: saving ? 'default' : 'pointer',
          }}
        >
          {saving ? 'Création...' : "Créer l'exercice"}
        </button>
      </div>
    </>
  );
}

export default OnboardingStepExercice;
