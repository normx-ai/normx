/**
 * Rendu des notes annexes SYSCOHADA :
 * - barre de navigation prev/next entre les notes filtrees
 * - rendu de la note individuelle en fonction de activeTab
 * - grille des cards lorsque activeTab === 'notes_annexes_sys'
 */

import React from 'react';
import type { TypeActivite, Offre } from '../types';
import { NoteAnnexe } from './notesConfig';
import {
  Note1, Note2, Note3A, Note3B, Note3C, Note3D, Note3E, Note4, Note5, Note6,
  Note7, Note8, Note8A, Note9, Note10, Note11, Note12, Note13, Note14,
  Note15A, Note15B, Note16A, Note16B, Note16C, Note17, Note18, Note19, Note20,
  Note21, Note22, Note23, Note24, Note25, Note26, Note27A, Note27B, Note28, Note29,
  Note30, Note31, Note32, Note33, Note34, Note35, Note36,
} from './lazyModules';

interface EtatBaseProps {
  entiteName: string;
  entiteSigle: string;
  entiteAdresse: string;
  entiteNif: string;
  typeActivite: TypeActivite;
  entiteId: number;
  offre: Offre;
  onBack: () => void;
}

const NOTE_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType<EtatBaseProps & { onGoToParametres?: () => void }>>> = {
  note_1_sys: Note1, note_2_sys: Note2,
  note_3a_sys: Note3A, note_3b_sys: Note3B, note_3c_sys: Note3C, note_3d_sys: Note3D, note_3e_sys: Note3E,
  note_4_sys: Note4, note_5_sys: Note5, note_6_sys: Note6, note_7_sys: Note7,
  note_8_sys: Note8, note_8a_sys: Note8A, note_9_sys: Note9, note_10_sys: Note10, note_11_sys: Note11,
  note_12_sys: Note12, note_13_sys: Note13, note_14_sys: Note14,
  note_15a_sys: Note15A, note_15b_sys: Note15B,
  note_16a_sys: Note16A, note_16b_sys: Note16B, note_16c_sys: Note16C,
  note_17_sys: Note17, note_18_sys: Note18, note_19_sys: Note19, note_20_sys: Note20,
  note_21_sys: Note21, note_22_sys: Note22, note_23_sys: Note23, note_24_sys: Note24,
  note_25_sys: Note25, note_26_sys: Note26, note_27a_sys: Note27A, note_27b_sys: Note27B,
  note_28_sys: Note28, note_29_sys: Note29, note_30_sys: Note30, note_31_sys: Note31,
  note_32_sys: Note32, note_33_sys: Note33, note_34_sys: Note34, note_35_sys: Note35,
  note_36_sys: Note36,
};

interface NotesNavigationProps {
  filteredNotes: NoteAnnexe[];
  activeTab: string;
  openTab: (id: string) => void;
}

export function NotesNavigation({ filteredNotes, activeTab, openTab }: NotesNavigationProps): React.ReactElement | null {
  if (!filteredNotes.some(n => n.id === activeTab)) return null;
  const idx = filteredNotes.findIndex(n => n.id === activeTab);
  const prev = idx > 0 ? filteredNotes[idx - 1] : null;
  const next = idx < filteredNotes.length - 1 ? filteredNotes[idx + 1] : null;
  const current = filteredNotes[idx];

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px', background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
      <button
        onClick={() => prev && openTab(prev.id)}
        disabled={!prev}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, background: prev ? '#fff' : '#f3f4f6', color: prev ? '#1e40af' : '#9ca3af', fontSize: 12, fontWeight: 600, cursor: prev ? 'pointer' : 'default' }}
      >
        <span style={{ fontSize: 16 }}>&larr;</span> {prev ? prev.titre + ' — ' + prev.desc : ''}
      </button>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{current?.titre}</span>
      <button
        onClick={() => next && openTab(next.id)}
        disabled={!next}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, background: next ? '#fff' : '#f3f4f6', color: next ? '#1e40af' : '#9ca3af', fontSize: 12, fontWeight: 600, cursor: next ? 'pointer' : 'default' }}
      >
        {next ? next.titre + ' — ' + next.desc : ''} <span style={{ fontSize: 16 }}>&rarr;</span>
      </button>
    </div>
  );
}

interface NoteRendererProps {
  activeTab: string;
  etatBaseProps: EtatBaseProps;
  openTab: (id: string) => void;
}

export function NoteRenderer({ activeTab, etatBaseProps, openTab }: NoteRendererProps): React.ReactElement | null {
  const Component = NOTE_COMPONENTS[activeTab];
  if (!Component) return null;
  return <Component {...etatBaseProps} onGoToParametres={() => openTab('parametres')} />;
}

interface NotesGridProps {
  filteredNotes: NoteAnnexe[];
  openTab: (id: string) => void;
}

export function NotesGrid({ filteredNotes, openTab }: NotesGridProps): React.ReactElement {
  return (
    <div style={{ padding: '20px 24px' }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#1a1a1a' }}>Notes annexes SYSCOHADA</h2>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 14,
      }}>
        {filteredNotes.map(note => (
          <div key={note.id} onClick={() => openTab(note.id)} style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
            padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s',
            display: 'flex', alignItems: 'center', gap: 14,
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#D4A843'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(212,168,67,0.15)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 8, background: '#1A3A5C',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}>
              {note.titre.replace('Note ', 'N')}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{note.titre}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{note.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
