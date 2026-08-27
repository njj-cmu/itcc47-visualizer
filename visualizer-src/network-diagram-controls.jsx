import React, { memo } from 'react';

export const NetworkDiagramControls = memo(function NetworkDiagramControls({ mode, onModeChange, showLabels, onShowLabelsChange }) {
  const interfacesVisible = mode === 'interfaces';
  return <div className="network-diagram-controls" aria-label="Diagram display controls">
    <div className="network-display-modes" role="group" aria-label="Diagram detail">
      <button type="button" aria-pressed={mode === 'generic'} onClick={() => onModeChange('generic')}>Generic</button>
      <button type="button" aria-pressed={interfacesVisible} onClick={() => onModeChange('interfaces')}>Interfaces</button>
    </div>
    <label className={!interfacesVisible ? 'is-disabled' : ''}>
      <span>Labels</span>
      <input type="checkbox" checked={showLabels} disabled={!interfacesVisible} onChange={(event) => onShowLabelsChange(event.target.checked)}/>
      <i aria-hidden="true"/>
    </label>
  </div>;
});
