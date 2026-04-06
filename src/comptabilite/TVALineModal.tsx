import React from 'react';
import { LuX } from 'react-icons/lu';
import { TVALigne, LineForm, inputStyle } from './DeclarationTVA.types';

interface TVALineModalProps {
  editingLine: TVALigne | null;
  lineForm: LineForm;
  setLineForm: React.Dispatch<React.SetStateAction<LineForm>>;
  onSave: () => void;
  onClose: () => void;
}

function TVALineModal({
  editingLine,
  lineForm,
  setLineForm,
  onSave,
  onClose,
}: TVALineModalProps): React.ReactElement {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: '24px 28px', maxWidth: 540, width: '90%', boxShadow: '0 8px 30px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>{editingLine ? 'Modifier la ligne' : 'Ajouter une ligne'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <LuX size={18} color="#888" />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Groupe</label>
            <input style={inputStyle} value={lineForm.groupe} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, groupe: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Référence</label>
            <input style={inputStyle} value={lineForm.reference} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, reference: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Libellé</label>
            <input style={inputStyle} value={lineForm.libelle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, libelle: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Montant net</label>
            <input type="number" step="0.01" style={inputStyle} value={lineForm.montant_net} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, montant_net: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Taux de taxe (%)</label>
            <input type="number" step="0.01" style={inputStyle} value={lineForm.taux_taxe} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, taux_taxe: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Montant de la taxe</label>
            <input type="number" step="0.01" style={inputStyle} value={lineForm.montant_taxe} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, montant_taxe: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>Date du document</label>
            <input type="date" style={inputStyle} value={lineForm.date_document} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, date_document: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
            <input type="checkbox" id="avoir-check" checked={lineForm.avoir} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLineForm((f: LineForm) => ({ ...f, avoir: e.target.checked }))} />
            <label htmlFor="avoir-check" style={{ fontSize: 14, color: '#333', cursor: 'pointer' }}>Avoir</label>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 18px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', fontSize: 14, cursor: 'pointer', color: '#333' }}
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            style={{ padding: '9px 18px', border: 'none', borderRadius: 4, background: '#D4A843', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff' }}
          >
            {editingLine ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TVALineModal;
