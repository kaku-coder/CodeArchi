import { useProject } from '../../context/projectContext';
import { importsOf, importedByOf, shortPath } from '../../data/projectModel';

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
  const project = useProject();

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
          {renderChips(importsOf(project, k), 'd')}
          Imported by:
          {renderChips(importedByOf(project, k))}
        </div>
      ))}
    </div>
  );
}
