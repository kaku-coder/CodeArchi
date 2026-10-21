import React, { useState } from 'react';
import FileTree from './FileTree';
import CodeViewer from './CodeViewer';
import OrgTreeView from './OrgTreeView';

export default function CodeExplorer({ selectedFile, onSelectFile, isSlide = false }) {
  const [viewMode, setViewMode] = useState('org'); // 'org' | 'split'

  const content = (
    <>
      <div className="explorer-header-row">
        <div>
          <span className="tag">
            <span className="led"></span>Codebase Explorer
          </span>
          <h2>Open any project and see what is inside.</h2>
          <p>
            Upload a ZIP or connect a supported repository. CodeArchi maps project structure into an interactive hierarchical tree chart with metrics and code inspection.
          </p>
        </div>

        {/* View Switcher: Hierarchical Org Tree vs Classic Split */}
        <div className="explorer-view-switcher">
          <button
            type="button"
            className={`view-tab-btn ${viewMode === 'org' ? 'active' : ''}`}
            onClick={() => setViewMode('org')}
          >
            🌳 Hierarchical Tree Chart
          </button>
          <button
            type="button"
            className={`view-tab-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
          >
            📋 Classic Split List
          </button>
        </div>
      </div>

      <div className="panel unit" style={{ padding: viewMode === 'org' ? '20px' : '24px' }}>
        {viewMode === 'org' ? (
          <OrgTreeView selectedFile={selectedFile} onSelectFile={onSelectFile} />
        ) : (
          <div className="explorer">
            <FileTree selectedFile={selectedFile} onSelectFile={onSelectFile} />
            <CodeViewer selectedFile={selectedFile} />
          </div>
        )}
      </div>
    </>
  );

  if (isSlide) {
    return (
      <div className={`feat ${viewMode === 'org' ? 'feat-wide-tree' : ''}`}>
        {content}
      </div>
    );
  }

  return (
    <section className="mod" id="explorer">
      {content}
    </section>
  );
}
