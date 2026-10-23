import { useState, useEffect } from 'react';
import { useProject } from '../../context/projectContext';
import { importsOf, importedByOf, shortPath, isCodeLanguage } from '../../data/projectModel';

export default function CodeViewer({ selectedFile, onUpdateFileCode }) {
  const project = useProject();
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);

  const file = project.byPath[selectedFile];
  const fileContent = file?.content || (file?.lines ? file.lines.join('\n') : '');

  // Reset editor state when selected file changes
  useEffect(() => {
    setEditedCode(fileContent);
    setIsEditing(false);
    setSaveStatus(null);
  }, [selectedFile, fileContent]);

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

  if (!file) {
    return <div id="viewer">Select a file to inspect code</div>;
  }

  const lines = (isEditing ? editedCode : fileContent).split('\n');
  const langLabel = file.lang || 'Text';
  const isCode = isCodeLanguage(langLabel);

  const importsList = importsOf(project, selectedFile).map(shortPath);
  const importedByList = importedByOf(project, selectedFile).map(shortPath);

  const isDirty = editedCode !== fileContent;

  const handleSave = () => {
    if (!onUpdateFileCode) return;
    onUpdateFileCode(selectedFile, editedCode);
    setSaveStatus('File saved! Project state updated.');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleDiscard = () => {
    setEditedCode(fileContent);
    setIsEditing(false);
    setSaveStatus(null);
  };

  return (
    <div id="viewer">
      <div className="meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <b>{selectedFile}</b>
          <span className={isCode ? 'badge' : 'badge no'}>
            {langLabel} · {isCode ? 'supported' : 'listed'}
          </span>
          <span>{lines.length} lines</span>
          <span>{file.size} bytes</span>
          {isDirty && (
            <span className="badge hot" style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', border: '1px solid #fbbf24' }}>
              ● Unsaved Changes
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onUpdateFileCode && (
            <>
              {!isEditing ? (
                <button
                  type="button"
                  className="key"
                  style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                  onClick={() => setIsEditing(true)}
                >
                  ✏️ Edit File
                </button>
              ) : (
                <>
                  {isDirty && (
                    <button
                      type="button"
                      className="key"
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      onClick={handleDiscard}
                    >
                      ↩️ Discard
                    </button>
                  )}
                  <button
                    type="button"
                    className="key hot"
                    style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                    disabled={!isDirty}
                    onClick={handleSave}
                  >
                    💾 Save Changes
                  </button>
                  <button
                    type="button"
                    className="key"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    onClick={() => setIsEditing(false)}
                  >
                    👁️ Preview
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {saveStatus && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid #22c55e',
          color: '#4ade80',
          padding: '6px 14px',
          borderRadius: '6px',
          margin: '8px 0',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>✅</span>
          <span>{saveStatus}</span>
        </div>
      )}

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0' }}>
          <textarea
            value={editedCode}
            onChange={(e) => setEditedCode(e.target.value)}
            spellCheck="false"
            autoCapitalize="off"
            autoComplete="off"
            style={{
              width: '100%',
              minHeight: '380px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '0.88rem',
              lineHeight: 1.5,
              background: '#0a0d12',
              color: '#e2e8f0',
              border: '1px solid #38bdf8',
              borderRadius: '8px',
              padding: '14px',
              resize: 'vertical',
              outline: 'none'
            }}
          />
        </div>
      ) : (
        <pre>
          {lines.map((line, idx) => (
            <div key={idx}>
              <span className="ln">{idx + 1}</span>
              {line}
            </div>
          ))}
        </pre>
      )}

      <div className="links">
        Imports: <b>{importsList.length ? importsList.join(', ') : 'none'}</b>
        <br />
        Imported by: <b>{importedByList.length ? importedByList.join(', ') : 'none'}</b>
      </div>
    </div>
  );
}
