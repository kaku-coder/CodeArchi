import React from 'react';
import { FILES_CONTENT, OFF_FILES, getImports, getImportedBy, shortPath } from '../../data/codebaseData';

export default function CodeViewer({ selectedFile }) {
  if (OFF_FILES[selectedFile]) {
    return (
      <div id="viewer">
        <div className="meta">
          <b>{selectedFile}</b>
          <span className="badge no">Not analyzed</span>
        </div>
        <p style={{ color: 'var(--mute)', margin: 0 }}>
          {OFF_FILES[selectedFile]} files are listed but not read for code relationships.
        </p>
      </div>
    );
  }

  const fileData = FILES_CONTENT[selectedFile];
  if (!fileData) {
    return <div id="viewer">Select a file</div>;
  }

  const [startLine, lines] = fileData;
  const isTsx = selectedFile.slice(-3) === 'tsx';
  const langLabel = /tsx?$/.test(selectedFile) ? (isTsx ? 'TSX' : 'TypeScript') : '';

  const importsList = getImports(selectedFile).map(shortPath);
  const importedByList = getImportedBy(selectedFile).map(shortPath);

  return (
    <div id="viewer">
      <div className="meta">
        <b>{selectedFile}</b>
        <span className="badge">{langLabel} · supported</span>
        <span>{lines.length} lines shown</span>
      </div>
      <pre>
        {lines.map((line, idx) => (
          <div key={idx}>
            <span className="ln">{startLine + idx}</span>
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
