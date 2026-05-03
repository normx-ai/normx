import React from 'react';

export interface PanelHeaderProps {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}

function PanelHeader({ title, sub, action }: PanelHeaderProps): React.ReactElement {
  return (
    <div className="cd-panel-head">
      <div>
        <div className="cd-panel-title">{title}</div>
        {sub && <div className="cd-panel-sub">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

export default PanelHeader;
