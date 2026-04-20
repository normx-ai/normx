// Champ de filtre label + enfant — partage entre les 3 ecrans.

import React from 'react';

interface FilterFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FilterField({ label, required, children }: FilterFieldProps): React.JSX.Element {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      {children}
    </div>
  );
}
