import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useProject } from '../../context/projectContext';

/**
 * BlueprintGraph - Unreal Engine Blueprint Node Flow visualizer matching the user's reference image
 */
export default function BlueprintGraph({ activeMap = {}, onToggleNode }) {
  const project = useProject();
  const containerRef = useRef(null);

  // Viewport Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging state for individual nodes
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Custom node positions: map of path -> { x, y }
  const [nodePositions, setNodePositions] = useState({});

  // Auto-layout computation: Group nodes in Left-to-Right columns based on dependency flow
  const computedLayout = useMemo(() => {
    const edges = project.edges || [];
    const files = project.files || [];
    const entryPoints = new Set(project.summary?.entryPoints || []);

    // Collect all unique node paths
    const allPaths = new Set();
    files.forEach((f) => allPaths.add(f.path));
    edges.forEach(([from, to]) => {
      allPaths.add(from);
      allPaths.add(to);
    });

    const pathList = Array.from(allPaths);
    if (!pathList.length) return {};

    // Calculate topological depth (distance from entry points)
    const depthMap = {};
    const queue = [];

    pathList.forEach((p) => {
      if (entryPoints.has(p) || (project.importedBy[p] || []).length === 0) {
        depthMap[p] = 0;
        queue.push(p);
      }
    });

    // Fallback if no entry points
    if (queue.length === 0 && pathList.length > 0) {
      depthMap[pathList[0]] = 0;
      queue.push(pathList[0]);
    }

    while (queue.length > 0) {
      const curr = queue.shift();
      const currDepth = depthMap[curr] || 0;
      const targets = project.imports[curr] || [];

      targets.forEach((next) => {
        if (depthMap[next] === undefined || depthMap[next] < currDepth + 1) {
          depthMap[next] = currDepth + 1;
          queue.push(next);
        }
      });
    }

    // Default remaining to depth 1
    pathList.forEach((p) => {
      if (depthMap[p] === undefined) depthMap[p] = 1;
    });

    // Group by column depth
    const columns = {};
    pathList.forEach((p) => {
      const d = depthMap[p];
      if (!columns[d]) columns[d] = [];
      columns[d].push(p);
    });

    const positions = {};
    const COL_WIDTH = 340;
    const ROW_HEIGHT = 190;
    const START_X = 60;
    const START_Y = 50;

    Object.keys(columns)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((colIdx) => {
        const nodesInCol = columns[colIdx];
        nodesInCol.forEach((path, rowIdx) => {
          positions[path] = {
            x: START_X + Number(colIdx) * COL_WIDTH,
            y: START_Y + rowIdx * ROW_HEIGHT
          };
        });
      });

    return positions;
  }, [project]);

  // Sync computed layout to state once or on project change
  useEffect(() => {
    setNodePositions(computedLayout);
  }, [computedLayout]);

  // Helper to determine node type & Unreal Blueprint header color
  const getNodeMeta = useCallback(
    (path) => {
      const entryPoints = project.summary?.entryPoints || [];
      const isEntry = entryPoints.includes(path);
      const isController = path.includes('controller') || path.includes('api');
      const isService = path.includes('service') || path.includes('billing');
      const isDb = path.includes('db') || path.includes('model') || path.includes('data');
      const isUi = path.includes('ui') || path.includes('page') || path.endsWith('.tsx') || path.endsWith('.jsx');
      const isAuth = path.includes('auth');

      if (isEntry) {
        return {
          headerType: 'event',
          headerBg: 'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)',
          headerBorder: '#ef4444',
          badgeText: 'EVENT ENTRY',
          badgeColor: '#fca5a5',
          icon: '♦'
        };
      }
      if (isUi) {
        return {
          headerType: 'widget',
          headerBg: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
          headerBorder: '#38bdf8',
          badgeText: 'UI WIDGET',
          badgeColor: '#bae6fd',
          icon: '❖'
        };
      }
      if (isController || isService) {
        return {
          headerType: 'function',
          headerBg: 'linear-gradient(180deg, #0d9488 0%, #115e59 100%)',
          headerBorder: '#2dd4bf',
          badgeText: 'FUNCTION',
          badgeColor: '#99f6e4',
          icon: 'ƒ'
        };
      }
      if (isDb || isAuth) {
        return {
          headerType: 'data',
          headerBg: 'linear-gradient(180deg, #4f46e5 0%, #3730a3 100%)',
          headerBorder: '#818cf8',
          badgeText: 'DATA STORE',
          badgeColor: '#c7d2fe',
          icon: '⛁'
        };
      }
      return {
        headerType: 'pure',
        headerBg: 'linear-gradient(180deg, #15803d 0%, #166534 100%)',
        headerBorder: '#4ade80',
        badgeText: 'PURE UTILITY',
        badgeColor: '#bbf7d0',
        icon: '☵'
      };
    },
    [project]
  );

  // Mouse pan handlers on grid canvas
  const handleMouseDown = (e) => {
    // Only pan if clicking canvas background, not on a node
    if (e.target.closest('.bp-node-card')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else if (draggingNode) {
      const newX = (e.clientX - dragOffset.x) / zoom;
      const newY = (e.clientY - dragOffset.y) / zoom;
      setNodePositions((prev) => ({
        ...prev,
        [draggingNode]: { x: Math.max(10, newX), y: Math.max(10, newY) }
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNode(null);
  };

  // Node drag start
  const handleNodeDragStart = (e, path) => {
    e.stopPropagation();
    const pos = nodePositions[path] || { x: 0, y: 0 };
    setDraggingNode(path);
    setDragOffset({
      x: e.clientX - pos.x * zoom,
      y: e.clientY - pos.y * zoom
    });
  };

  // Zoom controls
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.min(1.8, Math.max(0.45, z * zoomFactor)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 40, y: 30 });
    setNodePositions(computedLayout);
  };

  // Nodes list with rendered coordinates
  const nodes = useMemo(() => {
    return Object.keys(nodePositions).map((path) => {
      const pos = nodePositions[path];
      const imports = project.imports[path] || [];
      const importedBy = project.importedBy[path] || [];
      const isActive = !!activeMap[path];
      const meta = getNodeMeta(path);
      const fileName = path.split('/').pop();
      const dirName = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';

      return {
        path,
        fileName,
        dirName,
        x: pos.x,
        y: pos.y,
        width: 250,
        height: 140,
        imports,
        importedBy,
        isActive,
        meta
      };
    });
  }, [nodePositions, project, activeMap, getNodeMeta]);

  // Edges list with calculated cubic bezier wire splines
  const wireSplines = useMemo(() => {
    const edges = project.edges || [];
    const splines = [];

    edges.forEach(([from, to], i) => {
      const src = nodes.find((n) => n.path === from);
      const dst = nodes.find((n) => n.path === to);
      if (!src || !dst) return;

      const isWireActive = activeMap[from] || activeMap[to];

      // Output pin position (right edge of src)
      // Exec line at top (y + 40), Data line at middle (y + 75)
      const isExec = i % 2 === 0;
      const x1 = src.x + src.width;
      const y1 = src.y + (isExec ? 42 : 78);

      // Input pin position (left edge of dst)
      const x2 = dst.x;
      const y2 = dst.y + (isExec ? 42 : 78);

      const dx = Math.max(60, Math.abs(x2 - x1) * 0.55);
      const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      // Wire color: White for execution flow, Cyan/Orange/Green for data splines
      const wireColor = isWireActive
        ? '#fbbf24'
        : isExec
        ? 'rgba(255, 255, 255, 0.75)'
        : (i % 3 === 0 ? '#38bdf8' : i % 3 === 1 ? '#ec4899' : '#4ade80');

      splines.push({
        id: `${from}->${to}`,
        pathData,
        wireColor,
        isExec,
        isWireActive,
        from,
        to
      });
    });

    return splines;
  }, [project.edges, nodes, activeMap]);

  return (
    <div className="bp-workspace-container">
      {/* Blueprint Toolbar */}
      <div className="bp-toolbar">
        <div className="bp-toolbar-left">
          <span className="bp-toolbar-logo">
            <span className="bp-sparkle">⚡</span>
            Blueprint Dependency Graph
          </span>
          <span className="bp-badge">NODE FLOW ENGINE</span>
        </div>

        <div className="bp-toolbar-legend">
          <span className="bp-leg-item">
            <span className="bp-leg-line" style={{ background: '#fff' }}></span>
            <span>Exec Flow</span>
          </span>
          <span className="bp-leg-item">
            <span className="bp-leg-line" style={{ background: '#38bdf8' }}></span>
            <span>Object Ref</span>
          </span>
          <span className="bp-leg-item">
            <span className="bp-leg-line" style={{ background: '#ec4899' }}></span>
            <span>String / Data</span>
          </span>
          <span className="bp-leg-item">
            <span className="bp-leg-line" style={{ background: '#fbbf24' }}></span>
            <span>Active Trace</span>
          </span>
        </div>

        <div className="bp-toolbar-controls">
          <button
            type="button"
            className="bp-tool-btn"
            onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
            title="Zoom In"
          >
            +
          </button>
          <span className="bp-zoom-label">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="bp-tool-btn"
            onClick={() => setZoom((z) => Math.max(0.45, z - 0.15))}
            title="Zoom Out"
          >
            −
          </button>
          <button
            type="button"
            className="bp-tool-btn bp-btn-reset"
            onClick={resetView}
            title="Reset Graph Layout & Zoom"
          >
            ↺ Reset Graph
          </button>
        </div>
      </div>

      {/* Main Canvas with Blueprint Grid */}
      <div
        className="bp-canvas-area"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <div
          className="bp-graph-plane"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          {/* SVG Layer for Spline Wires */}
          <svg className="bp-splines-svg">
            <defs>
              <filter id="bp-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {wireSplines.map((wire) => (
              <g key={wire.id} className={wire.isWireActive ? 'bp-wire-active' : ''}>
                {/* Thick background shadow trace */}
                <path
                  d={wire.pathData}
                  fill="none"
                  stroke="rgba(0,0,0,0.8)"
                  strokeWidth={wire.isExec ? 6 : 4}
                  strokeLinecap="round"
                />
                {/* Main colored bezier wire */}
                <path
                  d={wire.pathData}
                  fill="none"
                  stroke={wire.wireColor}
                  strokeWidth={wire.isExec ? 3 : 2}
                  strokeLinecap="round"
                  filter={wire.isWireActive ? 'url(#bp-glow)' : undefined}
                  className={wire.isWireActive ? 'bp-wire-flowing' : ''}
                />
              </g>
            ))}
          </svg>

          {/* HTML Nodes Layer: Blueprint Nodes matching Unreal Engine */}
          <div className="bp-nodes-layer">
            {nodes.map((node) => (
              <div
                key={node.path}
                className={`bp-node-card ${node.isActive ? 'active-node' : ''}`}
                style={{
                  transform: `translate(${node.x}px, ${node.y}px)`,
                  width: `${node.width}px`
                }}
                onClick={() => onToggleNode && onToggleNode(node.path)}
              >
                {/* Node Title Header Bar */}
                <div
                  className="bp-node-header"
                  style={{
                    background: node.meta.headerBg,
                    borderBottom: `1.5px solid ${node.meta.headerBorder}`
                  }}
                  onMouseDown={(e) => handleNodeDragStart(e, node.path)}
                  title="Drag node to reposition"
                >
                  <div className="bp-header-top">
                    <span className="bp-node-icon">{node.meta.icon}</span>
                    <span className="bp-header-title" title={node.path}>
                      {node.fileName}
                    </span>
                    <span
                      className="bp-badge-pill"
                      style={{ color: node.meta.badgeColor }}
                    >
                      {node.meta.badgeText}
                    </span>
                  </div>
                  {node.dirName && (
                    <div className="bp-header-sub">
                      Target: {node.dirName}/
                    </div>
                  )}
                </div>

                {/* Node Body with Execution & Data Pins */}
                <div className="bp-node-body">
                  {/* Left Column: Input Pins */}
                  <div className="bp-pins-col bp-inputs">
                    {/* Execution Input Pin */}
                    <div className="bp-pin-row">
                      <div className="bp-pin-exec bp-pin-in" title="Execution Flow Input">
                        <span className="bp-exec-shape">▷</span>
                      </div>
                      <span className="bp-pin-name">Exec</span>
                    </div>

                    {/* Data Input Pin */}
                    <div className="bp-pin-row">
                      <span className="bp-pin-dot bp-dot-cyan" title="Object In">●</span>
                      <span className="bp-pin-name">Target</span>
                    </div>

                    {node.importedBy.length > 0 && (
                      <div className="bp-pin-subtext">
                        Used by: {node.importedBy.length} callers
                      </div>
                    )}
                  </div>

                  {/* Right Column: Output Pins */}
                  <div className="bp-pins-col bp-outputs">
                    {/* Execution Output Pin */}
                    <div className="bp-pin-row bp-row-right">
                      <span className="bp-pin-name">Then</span>
                      <div className="bp-pin-exec bp-pin-out" title="Execution Flow Output">
                        <span className="bp-exec-shape">▶</span>
                      </div>
                    </div>

                    {/* Data Output Pin */}
                    <div className="bp-pin-row bp-row-right">
                      <span className="bp-pin-name">Exports</span>
                      <span className="bp-pin-dot bp-dot-pink" title="Data/Exports Out">●</span>
                    </div>

                    {node.imports.length > 0 && (
                      <div className="bp-pin-subtext bp-subtext-right">
                        Imports: {node.imports.length} modules
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Indicator Strip */}
                {node.isActive && (
                  <div className="bp-active-strip">
                    <span className="bp-active-led"></span>
                    <span>ACTIVE DEPENDENCY TRACE</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
