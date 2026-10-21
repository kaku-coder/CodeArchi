import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useProject } from '../../context/projectContext';
import CodeViewer from './CodeViewer';

function MiniDonut({ value = 75, size = 38, stroke = 4, color = '#a78bfa', bgColor = 'rgba(255, 255, 255, 0.08)' }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="mini-donut-wrap" title={`${Math.round(value)}% density`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={bgColor} strokeWidth={stroke} fill="transparent" />
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

function buildNestedTree(entries, files) {
  const root = {
    type: 'dir',
    name: 'root',
    path: '',
    children: new Map(),
    files: []
  };

  const fileInfoMap = {};
  (files || []).forEach((f) => {
    fileInfoMap[f.path] = f;
  });

  (entries || []).forEach((entry) => {
    const normalized = entry.path.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length === 0) return;

    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const dirPath = parts.slice(0, i + 1).join('/');
      if (!current.children.has(part)) {
        current.children.set(part, {
          type: 'dir',
          name: part,
          path: dirPath,
          children: new Map(),
          files: [],
          totalLines: 0,
          totalSize: 0,
          totalOutEdges: 0,
          totalInEdges: 0
        });
      }
      current = current.children.get(part);
    }

    const fileObj = fileInfoMap[entry.path] || {};
    const linesCount = fileObj.lines ? fileObj.lines.length : fileObj.content ? fileObj.content.split('\n').length : 1;
    const sizeBytes = fileObj.size || (fileObj.content ? fileObj.content.length : 120);

    current.files.push({
      path: entry.path,
      name: parts[parts.length - 1],
      lang: fileObj.lang || 'File',
      lines: linesCount,
      size: sizeBytes,
      off: entry.off
    });
  });

  function aggregate(node) {
    let lines = 0;
    let size = 0;
    let out = 0;
    let inp = 0;

    node.files.forEach((f) => {
      lines += f.lines || 0;
      size += f.size || 0;
    });

    for (const child of node.children.values()) {
      aggregate(child);
      lines += child.totalLines || 0;
      size += child.totalSize || 0;
      out += child.totalOutEdges || 0;
      inp += child.totalInEdges || 0;
    }

    node.totalLines = lines;
    node.totalSize = size;
    node.totalOutEdges = out;
    node.totalInEdges = inp;
    node.fileCount = node.files.length;
  }

  aggregate(root);
  return root;
}

function OrgTreeNode({
  node,
  depth,
  totalProjectLines,
  selectedFile,
  onSelectFile,
  expanded,
  toggle,
  showGauges,
  showMetricPills,
  hideFiles,
  dragStartRef
}) {
  const isRoot = node.path === '';
  const isOpen = isRoot || expanded.has(node.path);
  const hasChildren = node.children.size > 0;
  const hasFiles = node.files.length > 0;
  const hasAny = hasChildren || hasFiles;

  if (isRoot) {
    return (
      <>
        {[...node.children.values()]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((child) => (
            <OrgTreeNode
              key={child.path}
              node={child}
              depth={0}
              totalProjectLines={totalProjectLines}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              expanded={expanded}
              toggle={toggle}
              showGauges={showGauges}
              showMetricPills={showMetricPills}
              hideFiles={hideFiles}
              dragStartRef={dragStartRef}
            />
          ))}
      </>
    );
  }

  const densityPct =
    totalProjectLines > 0 ? Math.min(100, Math.round(((node.totalLines || 0) / totalProjectLines) * 100)) : 20;

  const dirSelected = selectedFile && selectedFile.startsWith(node.path + '/');

  return (
    <div className={`org-branch-column ${dirSelected ? 'branch-active' : ''}`}>
      <div className={`org-node-card dir-card ${dirSelected ? 'selected-card' : ''}`}>
        <button
          type="button"
          className="org-node-header org-node-header-btn"
          onClick={() => hasAny && toggle(node.path)}
          aria-expanded={isOpen}
        >
          <div className="org-node-title-group">
            <span className={`org-expand-arrow ${isOpen ? 'open' : ''}`}>{hasAny ? '▸' : '•'}</span>
            <span className="dir-folder-icon">📁</span>
            <h4 className="org-node-title" title={node.path + '/'}>
              {node.name}/
            </h4>
          </div>
          {showGauges && (
            <MiniDonut value={densityPct} size={34} stroke={3.5} color="#c084fc" bgColor="rgba(192, 132, 252, 0.15)" />
          )}
        </button>

        {showMetricPills && (
          <div className="card-metrics-grid">
            <div className="metric-cell">
              <span className="m-label">FILES</span>
              <span className="m-val">{node.fileCount || 0}</span>
            </div>
            <div className="metric-cell">
              <span className="m-label">LINES</span>
              <span className="m-val">{node.totalLines || 0}</span>
            </div>
            <div className="metric-cell">
              <span className="m-label">SUBDIRS</span>
              <span className="m-val">{node.children.size}</span>
            </div>
            <div className="metric-cell">
              <span className="m-label">SIZE</span>
              <span className="m-val">{Math.round(((node.totalSize || 0) / 1024) * 10) / 10}KB</span>
            </div>
          </div>
        )}

        {isOpen && !hideFiles && hasAny && (
          <div className="dir-file-members">
            {[...node.children.values()]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((child) => (
                <OrgTreeNode
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  totalProjectLines={totalProjectLines}
                  selectedFile={selectedFile}
                  onSelectFile={onSelectFile}
                  expanded={expanded}
                  toggle={toggle}
                  showGauges={showGauges}
                  showMetricPills={showMetricPills}
                  hideFiles={hideFiles}
                  dragStartRef={dragStartRef}
                />
              ))}

            {[...node.files]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((file) => {
                const isFileCurrent = file.path === selectedFile;
                const isTS = file.name.endsWith('.ts') || file.name.endsWith('.tsx');
                const isJS = file.name.endsWith('.js') || file.name.endsWith('.jsx');
                const isJSON = file.name.endsWith('.json');
                const isImg = file.off;

                const badgeBg = isTS ? '#3178c6' : isJS ? '#f7df1e' : isJSON ? '#cb3837' : isImg ? '#64748b' : '#8b5cf6';
                const badgeColor = isJS ? '#000' : '#fff';
                const badgeText = isTS ? 'TS' : isJS ? 'JS' : isJSON ? '{ }' : isImg ? 'IMG' : 'SRC';

                return (
                  <button
                    key={file.path}
                    type="button"
                    className={`leaf-file-card ${isFileCurrent ? 'leaf-active' : ''} ${file.off ? 'leaf-off' : ''}`}
                    onClick={() => {
                      if (!dragStartRef.current?.moved) {
                        onSelectFile(file.path);
                      }
                    }}
                  >
                    <div className="file-avatar-badge" style={{ backgroundColor: badgeBg, color: badgeColor }}>
                      {badgeText}
                    </div>
                    <div className="file-info-col">
                      <div className="file-card-name" title={file.path}>
                        {file.name}
                      </div>
                      <div className="file-card-role">
                        {file.lang} • {file.lines}L
                      </div>
                    </div>
                    {isFileCurrent && <span className="leaf-check-pill">Active</span>}
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrgTreeView({ selectedFile, onSelectFile }) {
  const project = useProject();

  const [controlsOpen, setControlsOpen] = useState(false);
  const [showGauges, setShowGauges] = useState(true);
  const [showMetricPills, setShowMetricPills] = useState(true);
  const [hideFiles, setHideFiles] = useState(false);
  const [highlightDeps, setHighlightDeps] = useState(true);
  const [showInspector, setShowInspector] = useState(true);

  const [zoom, setZoom] = useState(0.9);

  const scrollContainerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0, moved: false });
  const [isDragging, setIsDragging] = useState(false);

  const [expanded, setExpanded] = useState(() => new Set());

  const toggle = (path) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, select, a, textarea')) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.pageX,
      startY: e.pageY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
      moved: false
    };
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const dx = e.pageX - dragStartRef.current.startX;
    const dy = e.pageY - dragStartRef.current.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragStartRef.current.moved = true;
    }

    container.scrollLeft = dragStartRef.current.scrollLeft - dx;
    container.scrollTop = dragStartRef.current.scrollTop - dy;
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    if (e.target.closest('button, input, select, a, textarea')) return;
    const touch = e.touches[0];
    const container = scrollContainerRef.current;
    if (!container) return;

    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: touch.pageX,
      startY: touch.pageY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
      moved: false
    };
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const container = scrollContainerRef.current;
    if (!container) return;

    const dx = touch.pageX - dragStartRef.current.startX;
    const dy = touch.pageY - dragStartRef.current.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragStartRef.current.moved = true;
    }

    container.scrollLeft = dragStartRef.current.scrollLeft - dx;
    container.scrollTop = dragStartRef.current.scrollTop - dy;
  };

  const handleTouchEnd = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  };

  useEffect(() => {
    const onGlobalUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };
    window.addEventListener('mouseup', onGlobalUp);
    window.addEventListener('touchend', onGlobalUp);
    return () => {
      window.removeEventListener('mouseup', onGlobalUp);
      window.removeEventListener('touchend', onGlobalUp);
    };
  }, []);

  const handleFit = () => {
    setZoom(0.9);
    if (scrollContainerRef.current) {
      const c = scrollContainerRef.current;
      c.scrollTo({
        left: Math.max(0, (c.scrollWidth - c.clientWidth) / 2),
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const treeData = useMemo(() => {
    const entries = project.fileEntries || [];
    const files = project.files || [];
    const edges = project.edges || [];

    let totalProjectLines = 0;
    let totalProjectSize = 0;
    entries.forEach((entry) => {
      const f = (files || []).find((x) => x.path === entry.path) || {};
      const linesCount = f.lines ? f.lines.length : f.content ? f.content.split('\n').length : 1;
      const sizeBytes = f.size || (f.content ? f.content.length : 120);
      totalProjectLines += linesCount;
      totalProjectSize += sizeBytes;
    });

    const nested = buildNestedTree(entries, files);

    return {
      rootName: project.name || 'Project Root',
      nested,
      totalFiles: entries.length,
      totalLines: totalProjectLines,
      totalEdges: edges.length,
      totalSize: totalProjectSize
    };
  }, [project]);

  return (
    <div className="org-tree-workspace">
      <div className="org-top-toolbar">
        <div className="org-toolbar-info">
          <span className="org-tree-title">
            <span className="tree-led"></span>
            Hierarchical Architecture Tree
          </span>
          <span className="org-toolbar-stats">
            {treeData.nested.children.size} Top-Level Folders • {treeData.totalFiles} Files • {treeData.totalLines} Lines
          </span>
        </div>

        <div className="org-toolbar-actions">
          <div className="org-pan-hint" title="Click & drag anywhere on the canvas background to pan">
            <span className="pan-icon">🖐</span>
            <span>Drag to Pan</span>
          </div>

          <div className="org-zoom-group">
            <button type="button" className="org-zoom-btn" onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))} title="Zoom Out">−</button>
            <span className="org-zoom-text">{Math.round(zoom * 100)}%</span>
            <button type="button" className="org-zoom-btn" onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))} title="Zoom In">+</button>
            <button type="button" className="org-zoom-reset" onClick={handleFit} title="Reset Zoom">Fit</button>
          </div>

          <button type="button" className={`vis-trigger-btn ${controlsOpen ? 'active' : ''}`} onClick={() => setControlsOpen(!controlsOpen)}>
            ⚙ Display Options {controlsOpen ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {controlsOpen && (
        <div className="vis-horizontal-strip">
          <div className="strip-title">
            <span className="strip-dot"></span>
            <span>Display Rules:</span>
          </div>
          <label className="strip-toggle">
            <input type="checkbox" checked={highlightDeps} onChange={(e) => setHighlightDeps(e.target.checked)} />
            <span>Highlight Deps</span>
          </label>
          <label className="strip-toggle">
            <input type="checkbox" checked={hideFiles} onChange={(e) => setHideFiles(e.target.checked)} />
            <span>Folders Only</span>
          </label>
          <label className="strip-toggle">
            <input type="checkbox" checked={showMetricPills} onChange={(e) => setShowMetricPills(e.target.checked)} />
            <span>Metric Cells</span>
          </label>
          <label className="strip-toggle">
            <input type="checkbox" checked={showGauges} onChange={(e) => setShowGauges(e.target.checked)} />
            <span>Donut Gauges</span>
          </label>
          <label className="strip-toggle">
            <input type="checkbox" checked={showInspector} onChange={(e) => setShowInspector(e.target.checked)} />
            <span>Code Inspector</span>
          </label>
          <button type="button" className="strip-close-btn" onClick={() => setControlsOpen(false)}>×</button>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className={`org-tree-scroll-container ${isDragging ? 'is-dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="org-tree-canvas" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
          <div className="org-level org-level-root">
            <div className="org-node-card root-card">
              <div className="org-node-header">
                <div className="org-node-title-group">
                  <span className="root-pill-badge">ROOT MODULE</span>
                  <h3 className="org-node-title">{treeData.rootName}</h3>
                </div>
                {showGauges && <MiniDonut value={100} size={42} stroke={4} color="#818cf8" bgColor="rgba(129, 140, 248, 0.15)" />}
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

          <div className="tree-stem-vertical"></div>

          <div className="org-level org-level-branches">
            <OrgTreeNode
              node={treeData.nested}
              depth={0}
              totalProjectLines={treeData.totalLines}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              expanded={expanded}
              toggle={toggle}
              showGauges={showGauges}
              showMetricPills={showMetricPills}
              hideFiles={hideFiles}
              dragStartRef={dragStartRef}
            />
          </div>
        </div>
      </div>

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
