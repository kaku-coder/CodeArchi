import { useProject } from '../../context/projectContext';
import { importsOf, importedByOf, shortPath, isCodeLanguage } from '../../data/projectModel';

export default function CodeViewer({ selectedFile }) {
  const project = useProject();

  const offEntry = project.fileEntries.find(
    (entry) => entry.path === selectedFile && entry.off
  );

  if (offEntry) {
    return (
      <div id="viewer">
        <div className="meta">
          <b>{selectedFile}</b>
          <span className="badge no">Not analyzed</span>
        </div>
        <p style={{ color: 'var(--mute)', margin: 0 }}>
          {offEntry.note} files are listed but not read for code relationships.
        </p>
      </div>
    );
  }

  const file = project.byPath[selectedFile];
  if (!file) {
    return <div id="viewer">Select a file</div>;
  }

  const lines = file.lines || [];
  const langLabel = file.lang || 'Text';
  const isCode = isCodeLanguage(langLabel);

  const importsList = importsOf(project, selectedFile).map(shortPath);
  const importedByList = importedByOf(project, selectedFile).map(shortPath);

  return (
    <div id="viewer">
      <div className="meta">
        <b>{selectedFile}</b>
        <span className={isCode ? 'badge' : 'badge no'}>
          {langLabel} · {isCode ? 'supported' : 'listed'}
        </span>
        <span>{lines.length} lines shown</span>
        <span>{file.size} bytes</span>
      </div>
      <pre>
        {lines.map((line, idx) => (
          <div key={idx}>
            <span className="ln">{idx + 1}</span>
            {line}
          </div>
        ))}
      </pre>
      <div className="links">
        Imports: <b>{importsList.length ? importsList.join(', ') : 'none'}</b>
        <br />
        Imported by: <b>{importedByList.length ? importedByList.join(', ') : 'none'}</b>
      </div>
    </div>
  );
}
