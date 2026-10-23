import React, { useState, useEffect } from 'react';

/**
 * Generates an intelligent auto-fix patch for common errors at a given line
 */
function getSuggestedFix(filePath, lineNum, currentCode, errorName) {
  if (!currentCode) return null;
  const lines = currentCode.split('\n');
  const lineIdx = lineNum ? lineNum - 1 : -1;
  const targetLine = (lineIdx >= 0 && lineIdx < lines.length) ? lines[lineIdx] : '';

  // 1. Format / undefined total fix
  if (filePath.includes('format') || targetLine.includes('inv.total')) {
    const fixed = [
      '  // [CodeArchi Fix] Defensive guard for undefined/null invoice or total',
      '  if (!inv || typeof inv.total !== "number") {',
      '    return sym + "0.00";',
      '  }',
      '  return sym + inv.total.toFixed(2);'
    ].join('\n');

    const newLines = [...lines];
    newLines.splice(lineIdx, 1, fixed);
    return {
      title: 'Add Null/Undefined Guard for Invoice Total',
      description: 'Prevents "Cannot read properties of undefined (reading total)" by returning ₹0.00 fallback.',
      patchedCode: newLines.join('\n')
    };
  }

  // 2. Database client query row check
  if (filePath.includes('invoice') && (targetLine.includes('row.rows[0]') || targetLine.includes('rows[0]'))) {
    const fixed = [
      '  // [CodeArchi Fix] Verify query returned rows before accessing first row',
      '  if (!row.rows || row.rows.length === 0) {',
      '    throw new Error(`Order #${orderId} invoice record not found`);',
      '  }',
      '  const invoice = row.rows[0];'
    ].join('\n');

    const newLines = [...lines];
    newLines.splice(lineIdx, 1, fixed);
    return {
      title: 'Add Empty Query Result Check',
      description: 'Ensures database query returned at least one row before accessing row.rows[0].',
      patchedCode: newLines.join('\n')
    };
  }

  // 3. JWT verification / token expired
  if (filePath.includes('token') && targetLine.includes('jwt.verify')) {
    const fixed = [
      '  // [CodeArchi Fix] Handle expired or invalid JWT token safely',
      '  try {',
      '    return jwt.verify(token, secret);',
      '  } catch (err) {',
      '    if (err.name === "TokenExpiredError") {',
      '      return null; // Return null session for expired tokens to trigger re-auth',
      '    }',
      '    throw err;',
      '  }'
    ].join('\n');

    const newLines = [...lines];
    newLines.splice(lineIdx, 1, fixed);
    return {
      title: 'Wrap JWT Verification in Try/Catch',
      description: 'Gracefully catches TokenExpiredError and returns null instead of crashing the server.',
      patchedCode: newLines.join('\n')
    };
  }

  // 4. DB Host connection fallback
  if (filePath.includes('client') && targetLine.includes('DB_HOST')) {
    const fixed = [
      '  // [CodeArchi Fix] Robust connection configuration with port and timeouts',
      '  host: process.env.DB_HOST || "127.0.0.1",',
      '  port: Number(process.env.DB_PORT) || 5432,',
      '  connectionTimeoutMillis: 3000,'
    ].join('\n');

    const newLines = [...lines];
    newLines.splice(lineIdx, 1, fixed);
    return {
      title: 'Add Connection Timeout & Safe Fallback',
      description: 'Provides explicit port configuration and connection timeout to prevent hanging.',
      patchedCode: newLines.join('\n')
    };
  }

  // Generic fallback patch: wrap target line in safe try-catch or null check
  if (lineIdx >= 0 && targetLine.trim()) {
    const indent = targetLine.match(/^\s*/)[0];
    const fixed = [
      `${indent}// [CodeArchi Auto-Guard] Defensive check`,
      `${indent}try {`,
      `${targetLine}`,
      `${indent}} catch (err) {`,
      `${indent}  console.warn("Caught runtime exception at line ${lineNum}:", err.message);`,
      `${indent}}`
    ].join('\n');

    const newLines = [...lines];
    newLines.splice(lineIdx, 1, fixed);
    return {
      title: `Wrap Line ${lineNum} in Error Handler`,
      description: `Surrounds the failing expression with defensive try/catch handling.`,
      patchedCode: newLines.join('\n')
    };
  }

  return null;
}

export default function FailureCodeEditor({
  file,
  filePath,
  lineNum,
  reason,
  errorName,
  onSaveCode,
  onOpenInExplorer
}) {
  const initialContent = file?.content || (file?.lines ? file.lines.join('\n') : '');
  const [code, setCode] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [suggestedFix, setSuggestedFix] = useState(null);

  // Sync state if file or filePath changes
  useEffect(() => {
    const fresh = file?.content || (file?.lines ? file.lines.join('\n') : '');
    setCode(fresh);
    setIsEditing(false);
    setSaveStatus(null);
    setSuggestedFix(getSuggestedFix(filePath, lineNum, fresh, errorName));
  }, [filePath, file, lineNum, errorName]);

  const isDirty = code !== initialContent;

  const handleSave = () => {
    if (!onSaveCode || !filePath) return;
    onSaveCode(filePath, code);
    setSaveStatus('Code changes saved successfully! Project in-memory state updated.');
    setTimeout(() => setSaveStatus(null), 4000);
  };

  const handleApplyFix = () => {
    if (!suggestedFix) return;
    setCode(suggestedFix.patchedCode);
    setIsEditing(true);
    setSaveStatus('Suggested patch applied to editor! Review below and click "Save Changes".');
    setTimeout(() => setSaveStatus(null), 5000);
  };

  const handleDiscard = () => {
    setCode(initialContent);
    setIsEditing(false);
    setSaveStatus(null);
  };

  if (!file) {
    return (
      <div className="failure-code-box missing-file">
        <div className="fc-header">
          <div className="fc-file-info">
            <span className="fc-file-icon">⚠️</span>
            <span className="fc-file-path">{filePath}</span>
            <span className="fc-badge off">External or Unindexed File</span>
          </div>
        </div>
        <p style={{ color: 'var(--mute)', margin: '12px 0 0', fontSize: '0.88rem' }}>
          This file is referenced in the stack trace, but is not present in the current workspace files.
          Upload or create it in the project to edit and inspect its code.
        </p>
      </div>
    );
  }

  const lines = code.split('\n');

  return (
    <div className="failure-code-box">
      {/* Top Header */}
      <div className="fc-header">
        <div className="fc-file-info">
          <span className="fc-file-icon">📄</span>
          <span className="fc-file-path">{filePath}</span>
          {lineNum && (
            <span className="fc-badge line-badge">
              🔥 Reported at Line {lineNum}
            </span>
          )}
          {isDirty && (
            <span className="fc-badge dirty-badge">
              ● Unsaved Edits
            </span>
          )}
        </div>

        <div className="fc-actions">
          {suggestedFix && (
            <button
              type="button"
              className="fc-btn auto-fix-btn"
              onClick={handleApplyFix}
              title={suggestedFix.description}
            >
              ✨ Apply Suggested Fix
            </button>
          )}

          {!isEditing ? (
            <button
              type="button"
              className="fc-btn edit-toggle-btn"
              onClick={() => setIsEditing(true)}
            >
              ✏️ Edit Code
            </button>
          ) : (
            <button
              type="button"
              className="fc-btn preview-toggle-btn"
              onClick={() => setIsEditing(false)}
            >
              👁️ View Preview
            </button>
          )}

          {isDirty && (
            <button
              type="button"
              className="fc-btn discard-btn"
              onClick={handleDiscard}
            >
              ↩️ Discard
            </button>
          )}

          <button
            type="button"
            className={`fc-btn save-btn ${isDirty ? 'hot' : ''}`}
            disabled={!isDirty}
            onClick={handleSave}
          >
            💾 Save to Project
          </button>

          {onOpenInExplorer && (
            <button
              type="button"
              className="fc-btn explorer-btn"
              onClick={() => onOpenInExplorer(filePath)}
              title="Open this file in Codebase Explorer"
            >
              📂 Explorer
            </button>
          )}
        </div>
      </div>

      {/* Suggested Fix Banner if available */}
      {suggestedFix && !isDirty && (
        <div className="fc-suggestion-banner">
          <div className="fc-sb-left">
            <span className="fc-sb-icon">💡</span>
            <div>
              <strong>CodeArchi Quick Fix: {suggestedFix.title}</strong>
              <p>{suggestedFix.description}</p>
            </div>
          </div>
          <button
            type="button"
            className="key hot fc-sb-action"
            onClick={handleApplyFix}
          >
            Apply Fix Now
          </button>
        </div>
      )}

      {/* Save Toast Notification */}
      {saveStatus && (
        <div className="fc-toast-banner">
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Code Editor / Preview Body */}
      <div className="fc-body">
        {isEditing ? (
          <div className="fc-editor-wrapper">
            <div className="fc-editor-helper-bar">
              <span className="fc-helper-text">
                ✏️ <b>Live Editor Active:</b> Type your code changes directly below. Click <b>"Save to Project"</b> to persist.
              </span>
              <span className="fc-line-count">{lines.length} lines</span>
            </div>
            <textarea
              className="fc-code-textarea"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck="false"
              autoCapitalize="off"
              autoComplete="off"
              rows={Math.min(24, Math.max(12, lines.length))}
            />
          </div>
        ) : (
          <div className="fc-preview-wrapper">
            <div className="fc-editor-helper-bar">
              <span className="fc-helper-text">
                👁️ <b>Code Preview:</b> Error target line is highlighted in amber/red. Click <b>"✏️ Edit Code"</b> to modify.
              </span>
              <span className="fc-line-count">{lines.length} lines</span>
            </div>
            <div className="fc-code-lines">
              {lines.map((line, idx) => {
                const currentLineNumber = idx + 1;
                const isErrorLine = lineNum === currentLineNumber;
                return (
                  <div
                    key={idx}
                    className={`fc-code-line ${isErrorLine ? 'error-highlight-line' : ''}`}
                  >
                    <span className="fc-line-num">{currentLineNumber}</span>
                    {isErrorLine && <span className="fc-error-marker">🔥</span>}
                    <span className="fc-line-content">{line || ' '}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Context Info */}
      <div className="fc-footer">
        <span>Reason: <b>{reason || 'Referenced in stack trace'}</b></span>
        <span>Path: <code>{filePath}</code></span>
      </div>
    </div>
  );
}
