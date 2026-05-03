import React from 'react';

export interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
}

function QuickAction({ icon, title, sub, onClick }: QuickActionProps): React.ReactElement {
  return (
    <button type="button" className="cd-qa" onClick={onClick}>
      <span className="cd-qa-icon">{icon}</span>
      <span className="cd-qa-content">
        <span className="cd-qa-title">{title}</span>
        <span className="cd-qa-sub">{sub}</span>
      </span>
    </button>
  );
}

export default QuickAction;
