import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
          totalSize: 0
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

    node.files.forEach((f) => {
      lines += f.lines || 0;
      size += f.size || 0;
    });

    for (const child of node.children.values()) {
      aggregate(child);
      lines += child.totalLines || 0;
      size += child.totalSize || 0;
    }

    node.totalLines = lines;
    node.totalSize = size;
    node.fileCount = node.files.length;
  }

  aggregate(root);
  return root;
}

/**
 * Group a file path into the folder that represents it at a given depth level.
 * level 1 -> top level folders, level 2 -> second level folders, and so on.
 */
function groupOf(filePath, level) {
  const parts = (filePath || '').replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length <= 1) return '';
  const dirParts = parts.slice(0, -1);
  return dirParts.slice(0, level).join('/');
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
  dragStartRef,
  registerNode,
  connections
}) {
  const isRoot = node.path === '';
  const isOpen = isRoot || expanded.has(node.path);
  const hasChildren = node.children.size > 0;
  const hasFiles = node.files.length > 0;
  const hasAny = hasChildren || hasFiles;

  const setRef = useCallback(
    (el) => {
      if (!el) return;
      if (isRoot) return;
      registerNode(node.path, el);
    },
    [node.path, registerNode, isRoot]
  );

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
              registerNode={registerNode}
              connections={connections}
            />
          ))}
      </>
    );
  }

  const densityPct =
    totalProjectLines > 0 ? Math.min(100, Math.round(((node.totalLines || 0) / totalProjectLines) * 100)) : 20;

  const dirSelected = selectedFile && selectedFile.startsWith(node.path + '/');
  const links = connections.get(node.path) || [];

  return (
    <div ref={setRef} className={`org-branch-column ${dirSelected ? 'branch-active' : ''}`} data-org-path={node.path}>
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

        {links.length > 0 && (
          <div className="dir-conn-chips" title="Folders this one is connected to">
            <span className="conn-chips-label">LINKED</span>
            <div className="conn-chips-row">
              {links.map((link) => (
                <span
                  key={link.path}
                  className="conn-chip"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(link.path);
                  }}
                  title={`${link.count} import link(s) with ${link.path}/`}
                >
                  ⇄ {link.name}
                  <span className="conn-chip-count">{link.count}</span>
                </span>
              ))}
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
                  nodeRefs={nodeRefs}
                  connections={connections}
                  isTopLevel={false}
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
  const [showConnections, setShowConnections] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [linkLevel, setLinkLevel] = useState(2);

  const [zoom, setZoom] = useState(0.9);

  const scrollContainerRef = useRef(null);
  const canvasRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0, moved: false });
  const [isDragging, setIsDragging] = useState(false);

  const nodeRefs = useRef({});

  const [expanded, setExpanded] = useState(() => new Set());
  const [lines, setLines] = useState([]);

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

    // Folder-to-folder connections derived from the import graph, grouped by depth level
    const connMap = new Map();
    const pairMap = new Map();

    edges.forEach((edge) => {
      const from = edge[0];
      const to = edge[1];
      if (!from || !to) return;

      const fromKey = groupOf(from, linkLevel);
      const toKey = groupOf(to, linkLevel);
      if (!fromKey || !toKey || fromKey === toKey) return;

      const a = fromKey < toKey ? fromKey : toKey;
      const b = fromKey < toKey ? toKey : fromKey;
      const key = a + '::' + b;

      pairMap.set(key, { a, b, count: (pairMap.get(key)?.count || 0) + 1 });

      const addLink = (self, other) => {
        if (!connMap.has(self)) connMap.set(self, new Map());
        const bucket = connMap.get(self);
        bucket.set(other, (bucket.get(other) || 0) + 1);
      };
      addLink(fromKey, toKey);
      addLink(toKey, fromKey);
    });

    const connections = new Map();
    connMap.forEach((bucket, selfPath) => {
      connections.set(
        selfPath,
        [...bucket.entries()]
          .map(([path, count]) => ({ path, name: path.split('/').pop(), count }))
          .sort((x, y) => y.count - x.count)
      );
    });

    return {
      rootName: project.name || 'Project Root',
      nested,
      connections,
      pairMap,
      totalFiles: entries.length,
      totalLines: totalProjectLines,
      totalEdges: edges.length,
      totalSize: totalProjectSize
    };
  }, [project, linkLevel]);

  useEffect(() => {
    // Auto expand every folder needed to reveal the current link level
    setExpanded((prev) => {
      const next = new Set(prev);
      levelPaths.forEach((p) => next.add(p));
      return next;
    });
  }, [levelPaths]);

  const levelPaths = useMemo(() => {
    const paths = [];
    const walk = (node, depth) => {
      if (depth >= linkLevel) return;
      node.children.forEach((child) => {
        paths.push(child.path);
        walk(child, depth + 1);
      });
    };
    walk(treeData.nested, 0);
    return paths;
  }, [treeData.nested, linkLevel]);

  const toggleAll = () => {
    setExpanded((prev) => {
      const allOpen = levelPaths.every((p) => prev.has(p));
      const next = new Set();
      if (!allOpen) levelPaths.forEach((p) => next.add(p));
      return next;
    });
  };

  const updateConnections = useCallback(() => {
    if (!showConnections) {
      setLines([]);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pairs = treeData.pairMap;
    if (!pairs || pairs.size === 0) {
      setLines([]);
      return;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const result = [];

    pairs.forEach((pair, key) => {
      const elA = nodeRefs.current[pair.a];
      const elB = nodeRefs.current[pair.b];
      if (!elA || !elB) return;

      const rectA = elA.getBoundingClientRect();
      const rectB = elB.getBoundingClientRect();

      const x1 = rectA.left + rectA.width / 2 - canvasRect.left;
      const y1 = rectA.top + rectA.height / 2 - canvasRect.top;
      const x2 = rectB.left + rectB.width / 2 - canvasRect.left;
      const y2 = rectB.top + rectB.height / 2 - canvasRect.top;

      let d;
      let labelX;
      let labelY;

      if (Math.abs(x1 - x2) < 70) {
        // Stacked vertically: route the wire as a bracket off the right edge
        const ax = rectA.right - canvasRect.left;
        const bx = rectB.right - canvasRect.left;
        const sideX = Math.max(ax, bx) + 22;
        d = `M ${ax} ${y1} C ${sideX} ${y1}, ${sideX} ${y2}, ${bx} ${y2}`;
        labelX = sideX;
        labelY = (y1 + y2) / 2;
      } else {
        // Side by side: arch the wire above the cards
        const midY = Math.min(y1, y2) - 70;
        d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
        labelX = (x1 + x2) / 2;
        labelY = midY + 14;
      }

      result.push({ key, d, x1, y1, x2, y2, labelX, labelY, count: pair.count, a: pair.a, b: pair.b });
    });

    setLines(result);
  }, [showConnections, treeData.pairMap, expanded]);

  useEffect(() => {
    updateConnections();
    const t = setTimeout(updateConnections, 150);
    return () => clearTimeout(t);
  }, [updateConnections, zoom, expanded]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => updateConnections();
    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [updateConnections]);

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
          {showConnections && (
            <div className="org-level-picker" title="Choose which folder level the connections are drawn between">
              <span className="level-picker-label">Link Level</span>
              {[1, 2, 3].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  className={`level-picker-btn ${linkLevel === lvl ? 'on' : ''}`}
                  onClick={() => setLinkLevel(lvl)}
                >
                  L{lvl}
                </button>
              ))}
            </div>
          )}

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
            <input type="checkbox" checked={showConnections} onChange={(e) => setShowConnections(e.target.checked)} />
            <span>Show Connections</span>
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
        <div ref={canvasRef} className="org-tree-canvas" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
          {showConnections && lines.length > 0 && (
            <svg className="org-conn-svg">
              <defs>
                <linearGradient id="orgConnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255, 154, 74, 0.9)" />
                  <stop offset="100%" stopColor="rgba(167, 139, 250, 0.7)" />
                </linearGradient>
              </defs>
              {lines.map((line) => (
                <g key={line.key}>
                  <path d={line.d} className="org-conn-path" stroke="url(#orgConnGrad)" />
                  <circle cx={line.x1} cy={line.y1} r={3.5} className="org-conn-dot" />
                  <circle cx={line.x2} cy={line.y2} r={3.5} className="org-conn-dot" />
                  <g className="org-conn-label-group">
                    <rect
                      x={line.labelX - 26}
                      y={line.labelY - 8}
                      width={52}
                      height={16}
                      rx={8}
                      className="org-conn-label-bg"
                    />
                    <text x={line.labelX} y={line.labelY} className="org-conn-label" textAnchor="middle">
                      {line.count} link{line.count > 1 ? 's' : ''}
                    </text>
                  </g>
                </g>
              ))}
            </svg>
          )}

          <div className="org-level org-level-root">
            <div className="org-node-card root-card">
              <button
                type="button"
                className="org-node-header org-node-header-btn root-toggle-btn"
                onClick={toggleAll}
                title="Expand or collapse every top-level folder"
              >
                <div className="org-node-title-group">
                  <span className="root-pill-badge">ROOT MODULE</span>
                  <h3 className="org-node-title">{treeData.rootName}</h3>
                </div>
                {showGauges && <MiniDonut value={100} size={42} stroke={4} color="#818cf8" bgColor="rgba(129, 140, 248, 0.15)" />}
              </button>
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
              nodeRefs={nodeRefs}
              connections={treeData.connections}
            />
          </div>
        </div>
      </div>

      {showConnections && treeData.pairMap.size > 0 && (
        <div className="org-conn-map">
          <div className="conn-map-title">
            <span className="conn-map-dot"></span>
            Folder Connection Map
            <span className="conn-map-sub">
              {treeData.pairMap.size} folder pair(s) • {treeData.totalEdges} total imports
            </span>
          </div>
          <div className="conn-map-grid">
            {[...treeData.pairMap.entries()].map(([key, pair]) => (
              <div key={key} className="conn-map-row">
                <span className="conn-map-folder">{pair.a.split('/').pop()}/</span>
                <span className="conn-map-arrow">⇄</span>
                <span className="conn-map-folder">{pair.b.split('/').pop()}/</span>
                <span className="conn-map-count">{pair.count} import link(s)</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
