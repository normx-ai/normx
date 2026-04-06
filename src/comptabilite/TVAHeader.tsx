import React from 'react';
import { jsPDF } from 'jspdf';
import { LuEye, LuPenLine, LuX } from 'react-icons/lu';
import {
  StatusStyleItem,
  ImpotSectionItem,
  DeclarationItem,
  MOIS,
  STATUS_STYLES,
  IMPOTS_SECTIONS,
  inputStyle,
} from './DeclarationTVA.types';
import { buildDeclarationPDF } from './DeclarationTVA.pdf';

function StatusBadge({ statut }: { statut: string }): React.ReactElement {
  const s: StatusStyleItem = STATUS_STYLES[statut] || STATUS_STYLES.nouvelle;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontSize: 13, fontWeight: 600,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

interface TVAHeaderProps {
  selectedMois: number;
  selectedDecl: DeclarationItem | null;
  declarations: DeclarationItem[];
  exerciceAnnee: number;
  eName: string;
  eSigle: string;
  eNif: string;
  eAdresse: string;
  selectedImpot: string;
  setSelectedImpot: (key: string) => void;
  setActiveTab: (tab: string) => void;
  revueStatus: Record<string, boolean>;
  setRevueStatus: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showFilePanel: boolean;
  setShowFilePanel: (v: boolean) => void;
  onClose: () => void;
}

function TVAHeader(props: TVAHeaderProps): React.ReactElement {
  const {
    selectedMois, selectedDecl, declarations, exerciceAnnee,
    eName, eSigle, eNif, eAdresse,
    selectedImpot, setSelectedImpot, setActiveTab,
    revueStatus, setRevueStatus,
    showFilePanel, setShowFilePanel, onClose,
  } = props;

  const total: number = IMPOTS_SECTIONS.length;
  const revues: number = IMPOTS_SECTIONS.filter((s: ImpotSectionItem) => revueStatus[`${selectedMois}_${s.key}`]).length;
  const pct: number = Math.round((revues / total) * 100);

  return (
    <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #e2e5ea' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>
              Déclaration - {MOIS[selectedMois]} {exerciceAnnee}
            </span>
            <StatusBadge statut={selectedDecl?.statut || 'nouvelle'} />
          </div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
            Vérifiez chaque section d&apos;impôt avant de transmettre la déclaration unique à l&apos;administration fiscale.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              value={selectedImpot}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedImpot(e.target.value); if (e.target.value === 'tva') setActiveTab('collectee'); }}
              style={{ ...inputStyle, maxWidth: 360, fontSize: 14, fontWeight: 600 }}
            >
              {IMPOTS_SECTIONS.map((s: ImpotSectionItem) => {
                const rKey: string = `${selectedMois}_${s.key}`;
                const isRevue: boolean = !!revueStatus[rKey];
                return (
                  <option key={s.key} value={s.key}>
                    {isRevue ? '\u2713 ' : '\u25CB '}{s.label} — {s.description}
                  </option>
                );
              })}
            </select>
            <button
              onClick={() => {
                const rKey: string = `${selectedMois}_${selectedImpot}`;
                setRevueStatus((prev: Record<string, boolean>) => ({ ...prev, [rKey]: !prev[rKey] }));
              }}
              style={{
                padding: '7px 14px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: revueStatus[`${selectedMois}_${selectedImpot}`] ? '1px solid #16a34a' : '1px solid #D4A843',
                background: revueStatus[`${selectedMois}_${selectedImpot}`] ? '#dcfce7' : '#eff6ff',
                color: revueStatus[`${selectedMois}_${selectedImpot}`] ? '#16a34a' : '#D4A843',
                display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
              }}
            >
              {revueStatus[`${selectedMois}_${selectedImpot}`] ? '\u2713 Revue terminée' : 'Marquer comme revue'}
            </button>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, maxWidth: 300, background: '#e5e7eb', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{ background: pct === 100 ? '#16a34a' : '#D4A843', height: '100%', width: `${pct}%`, borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 13, color: pct === 100 ? '#16a34a' : '#666', fontWeight: 500 }}>
              {revues}/{total} sections revues
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => {
              const decl: DeclarationItem | undefined = declarations.find((d: DeclarationItem) => d.mois === selectedMois + 1);
              const pdfDoc: jsPDF = buildDeclarationPDF({
                entiteName: eName, entiteSigle: eSigle, entiteNif: eNif, entiteAdresse: eAdresse,
                moisName: MOIS[selectedMois], exerciceAnnee, declaration: decl || null
              });
              const blob: Blob = pdfDoc.output('blob');
              const url: string = URL.createObjectURL(blob);
              window.open(url, '_blank');
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#D4A843', fontSize: 13, fontWeight: 500 }}
          >
            <LuEye size={16} color="#D4A843" />
            Voir la déclaration
          </button>
          <button
            onClick={() => setShowFilePanel(!showFilePanel)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#D4A843', fontSize: 13, fontWeight: 500 }}
          >
            <LuPenLine size={14} color="#D4A843" />
            Fichiers
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <LuX size={18} color="#888" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TVAHeader;
