import React, { useState, useRef } from 'react';
import { LuUpload, LuX, LuFileText, LuCheck, LuLoader, LuTriangleAlert } from 'react-icons/lu';
import type { EcritureRow, TiersItem } from './SaisieJournal.types';

interface FactureLigne {
  description: string;
  montant_ht: number;
  taux_tva: number;
  montant_tva: number;
  montant_ttc: number;
}

interface FactureExtraite {
  type_document: string;
  fournisseur: string;
  client: string;
  date_facture: string;
  numero_facture: string;
  lignes: FactureLigne[];
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  devise: string;
  notes: string;
}

interface EcritureSuggestion {
  journal: string;
  date_ecriture: string;
  numero_piece: string;
  libelle: string;
  lignes: { numero_compte: string; libelle_compte: string; debit: number; credit: number; tiers_id: number | null }[];
}

interface OCRResult {
  extracted: FactureExtraite;
  ecriture: EcritureSuggestion;
  tiers_suggestions: TiersItem[];
  confidence: 'high' | 'medium' | 'low';
}

interface ImportDocumentModalProps {
  entiteId: number;
  exerciceId: number;
  onClose: () => void;
  onImport: (data: { journal: string; dateEcriture: string; numeroPiece: string; libelle: string; lignes: EcritureRow[] }) => void;
}

const fmtM = (val: number): string => val ? Math.round(val).toLocaleString('fr-FR') : '0';

function ImportDocumentModal({ entiteId, exerciceId, onClose, onImport }: ImportDocumentModalProps): React.ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<OCRResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (f: File) => {
    setFile(f);
    setResult(null);
    setError('');
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  const handleAnalyse = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entite_id', String(entiteId));
      formData.append('exercice_id', String(exerciceId));

      const res = await fetch('/api/ocr-import/extract', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Erreur serveur' }));
        throw new Error(data.error || `Erreur ${res.status}`);
      }

      const data: OCRResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'analyse');
    }
    setLoading(false);
  };

  const handleValidate = () => {
    if (!result) return;
    const lignes: EcritureRow[] = result.ecriture.lignes.map(l => ({
      numero_compte: l.numero_compte,
      libelle_compte: l.libelle_compte,
      debit: l.debit || '',
      credit: l.credit || '',
      tiers_id: l.tiers_id || '',
    }));
    onImport({
      journal: result.ecriture.journal,
      dateEcriture: result.ecriture.date_ecriture,
      numeroPiece: result.ecriture.numero_piece,
      libelle: result.ecriture.libelle,
      lignes,
    });
    onClose();
  };

  const confidenceColor = result?.confidence === 'high' ? '#059669' : result?.confidence === 'medium' ? '#d97706' : '#dc2626';
  const confidenceLabel = result?.confidence === 'high' ? 'Fiabilite haute' : result?.confidence === 'medium' ? 'Fiabilite moyenne' : 'Fiabilite faible';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '90%', maxWidth: 800, maxHeight: '90vh',
        overflow: 'auto', padding: 0,
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px', borderBottom: '1px solid #e5e7eb',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F2A42', margin: 0 }}>
            Importer un document comptable
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <LuX size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>

          {/* Zone upload */}
          {!result && (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed #D4A843', borderRadius: 12, padding: 40,
                textAlign: 'center', cursor: 'pointer', background: file ? '#fef9ee' : '#faf8f5',
                transition: 'all 0.2s',
              }}
            >
              <input
                ref={fileRef} type="file" hidden
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
              />
              {file ? (
                <div>
                  {preview && <img src={preview} alt="apercu" style={{ maxHeight: 200, borderRadius: 8, marginBottom: 12 }} />}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <LuFileText size={20} color="#D4A843" />
                    <span style={{ fontWeight: 600, color: '#0F2A42' }}>{file.name}</span>
                    <span style={{ color: '#6b7280', fontSize: 12 }}>({(file.size / 1024).toFixed(0)} Ko)</span>
                  </div>
                </div>
              ) : (
                <div>
                  <LuUpload size={40} color="#D4A843" />
                  <p style={{ margin: '12px 0 4px', fontWeight: 600, color: '#0F2A42' }}>
                    Glissez un document ou cliquez pour parcourir
                  </p>
                  <p style={{ color: '#6b7280', fontSize: 13 }}>
                    Facture, recu, avoir — PDF, JPG, PNG (max 10 Mo)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div style={{ margin: '16px 0', padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Bouton analyser */}
          {file && !result && !loading && (
            <button onClick={handleAnalyse} style={{
              marginTop: 16, width: '100%', padding: '14px',
              background: '#D4A843', color: '#0F2A42', fontWeight: 700,
              fontSize: 15, border: 'none', borderRadius: 10, cursor: 'pointer',
            }}>
              Analyser le document
            </button>
          )}

          {/* Chargement */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <LuLoader size={32} color="#D4A843" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: 12, color: '#6b7280', fontWeight: 500 }}>
                Analyse du document en cours...
              </p>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Resultat */}
          {result && (
            <div>
              {/* Fiabilite */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                {result.confidence === 'high' ? <LuCheck size={18} color={confidenceColor} /> : <LuTriangleAlert size={18} color={confidenceColor} />}
                <span style={{ fontWeight: 600, color: confidenceColor }}>{confidenceLabel}</span>
              </div>

              {/* Donnees extraites */}
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#374151' }}>Donnees extraites</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 13 }}>
                  <div><span style={{ color: '#6b7280' }}>Type :</span> <span style={{ fontWeight: 600 }}>{result.extracted.type_document}</span></div>
                  <div><span style={{ color: '#6b7280' }}>Date :</span> <span style={{ fontWeight: 600 }}>{result.extracted.date_facture}</span></div>
                  <div><span style={{ color: '#6b7280' }}>Fournisseur :</span> <span style={{ fontWeight: 600 }}>{result.extracted.fournisseur || '-'}</span></div>
                  <div><span style={{ color: '#6b7280' }}>N facture :</span> <span style={{ fontWeight: 600 }}>{result.extracted.numero_facture || '-'}</span></div>
                  <div><span style={{ color: '#6b7280' }}>Total HT :</span> <span style={{ fontWeight: 600 }}>{fmtM(result.extracted.total_ht)} FCFA</span></div>
                  <div><span style={{ color: '#6b7280' }}>TVA :</span> <span style={{ fontWeight: 600 }}>{fmtM(result.extracted.total_tva)} FCFA</span></div>
                  <div><span style={{ color: '#6b7280' }}>Total TTC :</span> <span style={{ fontWeight: 700, color: '#0F2A42' }}>{fmtM(result.extracted.total_ttc)} FCFA</span></div>
                </div>
                {result.extracted.lignes.length > 1 && (
                  <div style={{ marginTop: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Lignes de la facture :</span>
                    {result.extracted.lignes.map((l, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#374151', padding: '2px 0' }}>
                        {l.description} — {fmtM(l.montant_ht)} HT
                        {l.taux_tva > 0 && ` (TVA ${l.taux_tva}%)`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ecriture suggeree */}
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#1e40af' }}>Ecriture suggeree</h3>
                <div style={{ fontSize: 13, marginBottom: 8, color: '#374151' }}>
                  Journal <span style={{ fontWeight: 700 }}>{result.ecriture.journal}</span> — {result.ecriture.libelle}
                </div>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#dbeafe' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Compte</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Libelle</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Debit</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.ecriture.lignes.map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 600 }}>{l.numero_compte}</td>
                        <td style={{ padding: '6px 8px' }}>{l.libelle_compte}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: l.debit > 0 ? '#d97706' : '#d1d5db' }}>
                          {l.debit > 0 ? fmtM(l.debit) : '-'}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: l.credit > 0 ? '#059669' : '#d1d5db' }}>
                          {l.credit > 0 ? fmtM(l.credit) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tiers */}
              {result.tiers_suggestions.length > 0 && (
                <div style={{ fontSize: 13, color: '#374151', marginBottom: 16 }}>
                  Tiers trouve : <span style={{ fontWeight: 600 }}>{result.tiers_suggestions[0].nom}</span> ({result.tiers_suggestions[0].code_tiers})
                </div>
              )}

              {/* Boutons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => { setResult(null); setFile(null); setPreview(null); }} style={{
                  flex: 1, padding: '12px', border: '1px solid #e5e7eb', background: '#fff',
                  borderRadius: 10, cursor: 'pointer', fontWeight: 600, color: '#374151',
                }}>
                  Recommencer
                </button>
                <button onClick={handleValidate} style={{
                  flex: 2, padding: '12px', background: '#059669', color: '#fff',
                  border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 15,
                }}>
                  Valider et saisir l'ecriture
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImportDocumentModal;
