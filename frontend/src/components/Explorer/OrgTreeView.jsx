import React, { useState, useMemo } from 'react';
import { useProject } from '../../context/projectContext';
import CodeViewer from './CodeViewer';

/**
 * MiniDonut: SVG circular gauge matching the reference image's purple donut charts
 */
function MiniDonut({ value = 75, size = 38, stroke = 4, color = '#a78bfa', bgColor = 'rgba(255, 255, 255, 0.08)' }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="mini-donut-wrap" title={`${Math.round(value)}% density`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="mini-donut-val">{Math.round(value)}%</span>
    </div>
  );
}

export default function OrgTreeView({ selectedFile, onSelectFile }) {
  const project = useProject();

  // Visualization Rules controls - false by default, non-intrusive strip
  const [controlsOpen, setControlsOpen] = useState(false);
  const [showGauges, setShowGauges] = useState(true);
  const [showMetricPills, setShowMetricPills] = useState(true);
  const [hideFiles, setHideFiles] = useState(false);
  const [highlightDeps, setHighlightDeps] = useState(true);
  const [showInspector, setShowInspector] = useState(true);

  // Zoom scale state for tree viewport
  const [zoom, setZoom] = useState(0.9);

  // Group project files into directories and aggregate metrics
  const treeData = useMemo(() => {
    const dirMap = {};
    const files = project.files || [];
    const entries = project.fileEntries || [];
    const edges = project.edges || [];

    const fileInfoMap = {};
    files.forEach((f) => {
      fileInfoMap[f.path] = f;
    });

    let totalProjectLines = 0;
    let totalProjectSize = 0;

    entries.forEach((entry) => {
      const fullPath = entry.path;
      const slashIdx = fullPath.lastIndexOf('/');
      const dir = slashIdx > 0 ? fullPath.slice(0, slashIdx) : 'root';
      const fileName = slashIdx > 0 ? fullPath.slice(slashIdx + 1) : fullPath;
      const fileObj = fileInfoMap[fullPath] || {};
      const linesCount = fileObj.lines ? fileObj.lines.length : fileObj.content ? fileObj.content.split('\n').length : 1;
      const sizeBytes = fileObj.size || (fileObj.content ? fileObj.content.length : 120);

      totalProjectLines += linesCount;
      totalProjectSize += sizeBytes;

      const outEdges = edges.filter((e) => e[0] === fullPath).length;
      const inEdges = edges.filter((e) => e[1] === fullPath).length;

      if (!dirMap[dir]) {
        dirMap[dir] = {
          name: dir,
          files: [],
          totalLines: 0,
          totalSize: 0,
          totalOutEdges: 0,
          totalInEdges: 0
        };
      }

      dirMap[dir].files.push({
        path: fullPath,
        name: fileName,
        lang: fileObj.lang || 'File',
        lines: linesCount,
        size: sizeBytes,
        off: entry.off,
        outEdges,
        inEdges
      });

      dirMap[dir].totalLines += linesCount;
      dirMap[dir].totalSize += sizeBytes;
      dirMap[dir].totalOutEdges += outEdges;
      dirMap[dir].totalInEdges += inEdges;
    });

    const directories = Object.values(dirMap);

    return {
      rootName: project.name || 'Project Root',
      directories,
      totalFiles: entries.length,
      totalLines: totalProjectLines,
      totalEdges: edges.length,
      totalSize: totalProjectSize
    };
  }, [project]);

  const isDirSelected = (dirName) => {
    if (!selectedFile) return false;
    if (dirName === 'root') return !selectedFile.includes('/');
    return selectedFile.startsWith(dirName + '/');
  };

  return (
    <div className="org-tree-workspace">
      {/* Top Toolbar: Clear Header & Inline Controls */}
      <div className="org-top-toolbar">
        <div className="org-toolbar-info">
          <span className="org-tree-title">
            <span className="tree-led"></span>
            Hierarchical Architecture Tree
          </span>
          <span className="org-toolbar-stats">
            {treeData.directories.length} Subsystems • {treeData.totalFiles} Files • {treeData.totalLines} Lines
          </span>
        </div>

        {/* Right side controls: Zoom + Rules Strip Toggle */}
        <div className="org-toolbar-actions">
          <div className="org-zoom-group">
            <button
              type="button"
              className="org-zoom-btn"
              onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
              title="Zoom Out"
            >
              −
            </button>
            <span className="org-zoom-text">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="org-zoom-btn"
              onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))}
              title="Zoom In"
            >
              +
            </button>
            <button
              type="button"
              className="org-zoom-reset"
              onClick={() => setZoom(0.9)}
              title="Reset Zoom to Fit"
            >
              Fit
            </button>
          </div>

          <button
            type="button"
            className={`vis-trigger-btn ${controlsOpen ? 'active' : ''}`}
            onClick={() => setControlsOpen(!controlsOpen)}
            title="Configure display filters and rules"
          >
            ⚙ Display Options {controlsOpen ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Non-overlapping Horizontal Options Strip (appears above the tree, never obscures any cards!) */}
      {controlsOpen && (
        <div className="vis-horizontal-strip">
          <div className="strip-title">
            <span className="strip-dot"></span>
            <span>Display Rules:</span>
          </div>

          <label className="strip-toggle">
            <input
              type="checkbox"
              checked={highlightDeps}
              onChange={(e) => setHighlightDeps(e.target.checked)}
            />
            <span>Highlight Deps</span>
          </label>

          <label className="strip-toggle">
            <input
              type="checkbox"
              checked={hideFiles}
              onChange={(e) => setHideFiles(e.target.checked)}
            />
            <span>Folders Only</span>
          </label>

          <label className="strip-toggle">
            <input
              type="checkbox"
              checked={showMetricPills}
              onChange={(e) => setShowMetricPills(e.target.checked)}
            />
            <span>Metric Cells</span>
          </label>

          <label className="strip-toggle">
            <input
              type="checkbox"
              checked={showGauges}
              onChange={(e) => setShowGauges(e.target.checked)}
            />
            <span>Donut Gauges</span>
          </label>

          <label className="strip-toggle">
            <input
              type="checkbox"
              checked={showInspector}
              onChange={(e) => setShowInspector(e.target.checked)}
            />
            <span>Code Inspector</span>
          </label>

          <button
            type="button"
            className="strip-close-btn"
            onClick={() => setControlsOpen(false)}
            title="Close Options Bar"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Hierarchical Tree Flow */}
      <div className="org-tree-scroll-container">
        <div
          className="org-tree-canvas"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center'
          }}
        >
          {/* LEVEL 1: Root Project Node */}
          <div className="org-level org-level-root">
            <div className="org-node-card root-card">
              <div className="org-node-header">
                <div className="org-node-title-group">
                  <span className="root-pill-badge">ROOT MODULE</span>
                  <h3 className="org-node-title">{treeData.rootName}</h3>
                </div>
                {showGauges && (
                  <MiniDonut
                    value={100}
                    size={42}
                    stroke={4}
                    color="#818cf8"
                    bgColor="rgba(129, 140, 248, 0.15)"
                  />
                )}
              </div>

              {showMetricPills && (
                <div className="card-metrics-grid root-metrics">
                  <div className="metric-cell">
                    <span className="m-label">FILES</span>
                    <span className="m-val">{treeData.totalFiles}</span>
                  </div>
                  <div className="metric-cell">
                    <span className="m-label">LINES</span>
                    <span className="m-val">{treeData.totalLines}</span>
                  </div>
                  <div className="metric-cell">
                    <span className="m-label">IMPORTS</span>
                    <span className="m-val">{treeData.totalEdges}</span>
                  </div>
                  <div className="metric-cell">
                    <span className="m-label">SIZE</span>
                    <span className="m-val">{Math.round((treeData.totalSize / 1024) * 10) / 10}KB</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stem going down from Root card */}
          <div className="tree-stem-vertical"></div>

          {/* LEVEL 2: Directory Subsystem Cards with continuous orthogonal branch rails */}
          <div className="org-level org-level-branches">
            {treeData.directories.map((dir) => {
              const dirSelected = isDirSelected(dir.name);
              const densityPct =
                treeData.totalLines > 0
                  ? Math.min(100, Math.round((dir.totalLines / treeData.totalLines) * 100))
                  : 20;

              return (
                <div
                  key={dir.name}
                  className={`org-branch-column ${dirSelected ? 'branch-active' : ''}`}
                >
                  {/* Directory Card */}
                  <div className={`org-node-card dir-card ${dirSelected ? 'selected-card' : ''}`}>
                    <div className="org-node-header">
                      <div className="org-node-title-group">
                        <span className="dir-folder-icon">📁</span>
                        <h4 className="org-node-title" title={dir.name}>{dir.name}/</h4>
                      </div>
                      {showGauges && (
                        <MiniDonut
                          value={densityPct}
                          size={34}
                          stroke={3.5}
                          color="#c084fc"
                          bgColor="rgba(192, 132, 252, 0.15)"
                        />
                      )}
                    </div>

                    {showMetricPills && (
                      <div className="card-metrics-grid">
                        <div className="metric-cell">
                          <span className="m-label">FILES</span>
                          <span className="m-val">{dir.files.length}</span>
                        </div>
                        <div className="metric-cell">
                          <span className="m-label">LINES</span>
                          <span className="m-val">{dir.totalLines}</span>
                        </div>
                        <div className="metric-cell">
                          <span className="m-label">LINKS</span>
                          <span className="m-val">{dir.totalOutEdges + dir.totalInEdges}</span>
                        </div>
                        <div className="metric-cell">
                          <span className="m-label">SIZE</span>
                          <span className="m-val">{dir.totalSize}B</span>
                        </div>
                      </div>
                    )}

                    {/* Member Files List */}
                    {!hideFiles && (
                      <div className="dir-file-members">
                        {dir.files.map((file) => {
                          const isFileCurrent = file.path === selectedFile;
                          const isTS = file.name.endsWith('.ts') || file.name.endsWith('.tsx');
                          const isJS = file.name.endsWith('.js') || file.name.endsWith('.jsx');
                          const isJSON = file.name.endsWith('.json');
                          const isImg = file.off;

                          const badgeBg = isTS
                            ? '#3178c6'
                            : isJS
                            ? '#f7df1e'
                            : isJSON
                            ? '#cb3837'
                            : isImg
                            ? '#64748b'
                            : '#8b5cf6';
                          const badgeColor = isJS ? '#000' : '#fff';
                          const badgeText = isTS
                            ? 'TS'
                            : isJS
                            ? 'JS'
                            : isJSON
                            ? '{ }'
                            : isImg
                            ? 'IMG'
                            : 'SRC';

                          return (
                            <button
                              key={file.path}
                              type="button"
                              className={`leaf-file-card ${isFileCurrent ? 'leaf-active' : ''} ${file.off ? 'leaf-off' : ''}`}
                              onClick={() => onSelectFile(file.path)}
                            >
                              <div
                                className="file-avatar-badge"
                                style={{ backgroundColor: badgeBg, color: badgeColor }}
                              >
                                {badgeText}
                              </div>
                              <div className="file-info-col">
                                <div className="file-card-name" title={file.path}>
                                  {file.name}
                                </div>
                                <div className="file-card-role">
                                  {file.lang} • {file.lines}L • {file.outEdges} deps
                                </div>
                              </div>
                              {isFileCurrent && (
                                <span className="leaf-check-pill" title="Inspecting Code">
                                  Active
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Code Inspector Dock */}
      {showInspector && selectedFile && (
        <div className="org-tree-code-dock">
          <div className="dock-header">
            <div className="dock-title">
              <span className="dock-dot"></span>
              <strong>Inspector:</strong>
              <code className="dock-file-path">{selectedFile}</code>
            </div>
            <span className="dock-hint">Click any file node to inspect source</span>
          </div>
          <div className="dock-viewer-wrap">
            <CodeViewer selectedFile={selectedFile} />
          </div>
        </div>
      )}
    </div>
  );
}
