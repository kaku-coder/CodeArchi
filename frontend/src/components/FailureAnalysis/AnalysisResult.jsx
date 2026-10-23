import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/projectContext';
import FailureCodeEditor from './FailureCodeEditor';

export default function AnalysisResult({
  result,
  project: propProject,
  onUpdateFileCode,
  onOpenInExplorer
}) {
  const contextProject = useProject();
  const project = propProject || contextProject;
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);

  // Reset selected file to top file with line number when result changes
  useEffect(() => {
    if (result && result.files && result.files.length) {
      const firstWithLine = result.files.findIndex(([, line]) => Boolean(line));
      setSelectedFileIdx(firstWithLine >= 0 ? firstWithLine : 0);
    } else {
      setSelectedFileIdx(0);
    }
  }, [result]);

  if (!result) {
    return (
      <div className="res">
        <p style={{ color: 'var(--mute)' }}>
          No known file path or error type found. Paste a trace that includes paths, such as src/utils/format.ts:12.
        </p>
      </div>
    );
  }

  const files = result.files || [];
  const activeFileEntry = files[selectedFileIdx] || files[0] || null;
  const activeFilePath = activeFileEntry ? activeFileEntry[0] : null;
  const activeLineNum = activeFileEntry ? activeFileEntry[1] : null;
  const activeReason = activeFileEntry ? activeFileEntry[2] : null;
  const fileObj = project && activeFilePath ? project.byPath[activeFilePath] : null;

  return (
    <div className="res">
      <div className="ar-section-header">
        <h3>Relevant files ({files.length})</h3>
        <span className="ar-subtitle">
          Click any file to inspect code, apply fixes, or edit live:
        </span>
      </div>

      <div className="hit-row-list">
        {files.map(([filePath, lineNum, reason], idx) => {
          const isSelected = idx === selectedFileIdx;
          const existsInProject = project && project.byPath && project.byPath[filePath];
          return (
            <div
              key={idx}
              className={`hit-row interactive-hit-row ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedFileIdx(idx)}
              role="button"
              tabIndex={0}
              title="Click to view and edit this file"
            >
              <div className="hit-row-left">
                <span className="hit-row-indicator">{isSelected ? '▶' : '·'}</span>
                <code>
                  {filePath}
                  {lineNum ? `:${lineNum}` : ''}
                </code>
                {!existsInProject && (
                  <span className="badge no" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                    external
                  </span>
                )}
              </div>
              <span className="hit-row-reason">{reason}</span>
              <button
                type="button"
                className={`key hit-row-action-btn ${isSelected ? 'hot' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFileIdx(idx);
                }}
              >
                {isSelected ? 'Editing' : 'Inspect & Edit ✏️'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Embedded Live Code Editor & Patch Studio */}
      {activeFilePath && (
        <FailureCodeEditor
          file={fileObj}
          filePath={activeFilePath}
          lineNum={activeLineNum}
          reason={activeReason}
          errorName={result.n}
          onSaveCode={onUpdateFileCode}
          onOpenInExplorer={onOpenInExplorer}
        />
      )}

      <h3>Possible causes</h3>
      <ul>
        {result.causes.map((cause, idx) => (
          <li key={idx}>{cause}</li>
        ))}
      </ul>

      <h3>Investigation steps</h3>
      <ol>
        {result.steps.map((step, idx) => (
          <li key={idx}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
