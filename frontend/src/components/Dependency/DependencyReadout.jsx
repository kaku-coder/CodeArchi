import React from 'react';
import { getImports, getImportedBy, shortPath } from '../../data/codebaseData';

function renderChips(arr, customClass) {
  if (!arr.length) {
    return <span> none</span>;
  }
  return (
    <div className="chips">
      {arr.map((item) => (
        <span key={item} className={`chip ${customClass || ''}`}>
          {shortPath(item)}
        </span>
      ))}
    </div>
  );
}

export default function DependencyReadout({ activeKeys }) {
  if (!activeKeys.length) {
    return (
      <div className="readout" aria-live="polite">
        Flip a switch to light up the connections.
      </div>
    );
  }

  return (
    <div className="readout" aria-live="polite">
      {activeKeys.map((k) => (
        <div key={k} style={{ marginBottom: '6px' }}>
          <b>{k}</b> imports:
          {renderChips(getImports(k), 'd')}
          Imported by:
          {renderChips(getImportedBy(k))}
        </div>
      ))}
    </div>
  );
}
