// Badge de statut "Valide" / "Erreurs" partage entre CNSS et DAS.

import React from 'react';

export function StatusBadge({ valide }: { valide: boolean }): React.ReactElement {
  return (
    <span className={valide ? 'declarations-status-ok' : 'declarations-status-err'}>
      {valide ? 'Valide' : 'Erreurs'}
    </span>
  );
}
