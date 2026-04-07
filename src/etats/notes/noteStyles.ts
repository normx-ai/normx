/**
 * Styles partages pour toutes les Notes SYSCOHADA/SYCEBNL
 * Elimine la duplication des styles CSS-in-JS dans 47 fichiers Note*.tsx
 */

import React from 'react';

export const thStyle: React.CSSProperties = {
  border: '0.5px solid #000',
  padding: '5px 8px',
  fontSize: 11,
  fontWeight: 700,
  textAlign: 'center',
  verticalAlign: 'middle',
  background: '#f5f5f5',
};

export const tdStyle: React.CSSProperties = {
  border: '0.5px solid #000',
  padding: '5px 8px',
  fontSize: 11,
  verticalAlign: 'middle',
};

export const tdRight: React.CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

export const tdBold: React.CSSProperties = {
  ...tdStyle,
  fontWeight: 700,
};

export const tdBoldRight: React.CSSProperties = {
  ...tdRight,
  fontWeight: 700,
};

export const tdCenter: React.CSSProperties = {
  ...tdStyle,
  textAlign: 'center',
};

export const inputSt: React.CSSProperties = {
  width: '100%',
  padding: '5px 8px',
  fontSize: 12,
  border: '1px solid #D4A843',
  borderRadius: 2,
  background: '#fffbf0',
  textAlign: 'right',
  boxSizing: 'border-box',
};

export const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 60,
  padding: '8px 10px',
  fontSize: 12,
  lineHeight: '1.6',
  border: '1px solid #D4A843',
  borderRadius: 3,
  background: '#fffbf0',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  resize: 'vertical',
};
