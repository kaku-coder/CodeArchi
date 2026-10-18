import React from 'react';

export default function AnalysisResult({ result }) {
  if (!result) {
    return (
      <div className="res">
        <p style={{ color: 'var(--mute)' }}>
          No known file path or error type found. Paste a trace that includes paths, such as src/utils/format.ts:12.
        </p>
      </div>
    );
  }

  return (
    <div className="res">
      <h3>Relevant files</h3>
      {result.files.map(([filePath, lineNum, reason], idx) => (
        <div key={idx} className="hit-row">
          <code>
            {filePath}
            {lineNum ? `:${lineNum}` : ''}
          </code>
          <span>{reason}</span>
        </div>
      ))}

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
