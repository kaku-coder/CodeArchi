import { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { MX_TRANSFORM } from '../../data/codebaseData';
import { calculateImpact } from '../../data/projectModel';
import { useProject } from '../../context/projectContext';

function formatChipName(name, maxChars = 20) {
  if (!name) return '';
  if (name.length <= maxChars) return name;
  const dotIdx = name.lastIndexOf('.');
  if (dotIdx > 0) {
    const ext = name.slice(dotIdx);
    const base = name.slice(0, dotIdx);
    const rem = maxChars - ext.length - 2; // 2 for '..'
    if (rem >= 6) {
      const front = Math.ceil(rem * 0.58);
      const back = rem - front;
      return base.slice(0, front) + '..' + base.slice(-back) + ext;
    }
  }
  return name.slice(0, maxChars - 1) + '…';
}

function formatChipDir(dir, maxChars = 16) {
  if (!dir) return '';
  const d = dir.endsWith('/') ? dir : dir + '/';
  if (d.length <= maxChars) return d;
  return d.slice(0, maxChars - 3) + '../';
}

const CircuitBoard = forwardRef(function CircuitBoard(
  { id, mode, activeMap, onToggleNode },
  ref
) {
  const project = useProject();
  const svgRef = useRef(null);
  const [view3d, setView3d] = useState(true);

  const board = project.board;
  const coords = board.coords;
  const boardEdges = board.edges;

  // Expose hit testing for trackpad simulation
  useImperativeHandle(ref, () => ({
    getSvgElement: () => svgRef.current,
    hit: (px, py, W, H) => {
      const s = Math.min(W / 520, H / 320);
      const sx = (px - (W - 520 * s) / 2) / s - (view3d ? 200 : 0);
      const sy = (py - (H - 320 * s) / 2) / s - (view3d ? 22 : 0);
      const a = view3d ? sx / 0.62 : sx;
      const b = view3d ? sy / 0.36 : sy;
      const fx = view3d ? (a + b) / 2 : a;
      const fy = view3d ? (b - a) / 2 : b;

      for (const k in coords) {
        const [x, y] = coords[k];
        if (fx >= x - 50 && fx <= x + 50 && fy >= y - 24 && fy <= y + 24) {
          return k;
        }
      }
      return null;
    }
  }));

  const activeKeys = Object.keys(activeMap).filter((k) => activeMap[k]);

  // Compute node status and wire status
  let nodeClasses = {};
  let wireClasses = [];
  let nodeDelays = {};
  let wireDelays = [];

  if (mode === 'deps') {
    activeKeys.forEach((k) => {
      (project.imports[k] || []).forEach((x) => {
        nodeClasses[x] = nodeClasses[x] || 'out';
      });
      (project.importedBy[k] || []).forEach((x) => {
        nodeClasses[x] = nodeClasses[x] || 'in';
      });
    });

    wireClasses = boardEdges.map((e) => {
      if (activeMap[e[0]]) return 'out';
      if (activeMap[e[1]]) return 'in';
      return '';
    });
  } else {
    // Impact mode
    const { depth, classes } = calculateImpact(project, activeMap);
    nodeClasses = classes;

    wireClasses = boardEdges.map((e) => {
      if (depth[e[1]] !== undefined && depth[e[0]] !== undefined) {
        return 'hit';
      }
      return '';
    });

    Object.keys(coords).forEach((k) => {
      if (depth[k] && !activeMap[k]) {
        nodeDelays[k] = depth[k] * 0.3;
      }
    });

    wireDelays = boardEdges.map((e, i) => {
      if (wireClasses[i]) {
        return (depth[e[1]] || 0) * 0.3;
      }
      return 0;
    });
  }

  const patternId = `dt_${id}`;

  return (
    <div className="pcb3d-wrap">
      <div className="pcb3d-head">
        <span className="tag">
          <span className="led"></span>
          {mode === 'deps' ? 'Dependency Map' : 'Impact Map'}
        </span>
        <div className="pcb3d-toggle">
          <button
            type="button"
            className={`key ${view3d ? 'hot' : ''}`}
            onClick={() => setView3d(true)}
          >
            3D Isometric
          </button>
          <button
            type="button"
            className={`key ${!view3d ? 'hot' : ''}`}
            onClick={() => setView3d(false)}
          >
            2D Top View
          </button>
        </div>
      </div>

      <div className={`pcbw ${view3d ? 'is3d' : 'is2d'} ${activeKeys.length ? 'has-active' : ''}`}>
        <svg
          ref={svgRef}
          id={id}
          viewBox={view3d ? '0 0 520 320' : '0 0 520 290'}
          className="pcb"
          role="group"
          aria-label={mode === 'deps' ? 'Dependency graph' : 'Impact graph'}
        >
          <defs>
            {/* Blueprint Grid Pattern */}
            <pattern
              id={patternId}
              width="18"
              height="18"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="18" y2="0" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="0.8" />
              <line x1="0" y1="0" x2="0" y2="18" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="0.8" />
              <circle cx="9" cy="9" r="0.7" fill="rgba(56, 189, 248, 0.16)" />
            </pattern>
            <filter id={`bp_glow_${id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {view3d ? (
            <g transform="translate(200 22)">
              {/* Base board shadows */}
              <g transform="translate(0 10)">
                <g transform={MX_TRANSFORM}>
                  <rect
                    width="470"
                    height="290"
                    rx="14"
                    fill="#060910"
                    stroke="rgba(56, 189, 248, 0.15)"
                  />
                </g>
              </g>

              {/* Main Blueprint board */}
              <g transform={MX_TRANSFORM}>
                <rect
                  width="470"
                  height="290"
                  rx="14"
                  fill="#0b0f19"
                  stroke="rgba(56, 189, 248, 0.35)"
                  strokeWidth="1.5"
                />
                <rect
                  width="470"
                  height="290"
                  rx="14"
                  fill={`url(#${patternId})`}
                />
                <text
                  x="14"
                  y="16"
                  fontSize="7.8"
                  fontWeight="600"
                  fill="#38bdf8"
                  fontFamily="'Chakra Petch', sans-serif"
                  letterSpacing="0.06em"
                >
                  ⚡ BLUEPRINT CIRCUIT FLOW • CLICK ANY FILE TO TRACE CONNECTIONS
                </text>

                {/* Curved Blueprint Connecting Wires */}
                {boardEdges.map((e, i) => {
                  const a = coords[e[1]];
                  const b = coords[e[0]];
                  const dx = Math.max(26, Math.abs(b[0] - a[0]) * 0.45);
                  const d = `M${a[0] + 47} ${a[1]} C${a[0] + 47 + dx} ${a[1]}, ${b[0] - 47 - dx} ${b[1]}, ${b[0] - 47} ${b[1]}`;
                  const wClass = wireClasses[i] || '';
                  const delay = wireDelays[i] || 0;

                  return (
                    <path
                      key={`wire-${i}`}
                      className={`wire bp-wire ${wClass}`}
                      d={d}
                      filter={wClass ? `url(#bp_glow_${id})` : undefined}
                      style={delay ? { '--d': `${delay}s` } : undefined}
                    />
                  );
                })}

                {/* Clean Blueprint File Nodes */}
                {Object.keys(coords).map((k) => {
                  const [x, y] = coords[k];
                  const parts = k.split('/');
                  const isTurnedOn = !!activeMap[k];
                  const nodeClass = isTurnedOn
                    ? 'on'
                    : nodeClasses[k] || (activeKeys.length ? 'dim' : '');
                  const delay = nodeDelays[k] || 0;
                  const fileName = parts[parts.length - 1];
                  const dirName = parts.length > 1 ? parts[parts.length - 2] : '';
                  const dispName = formatChipName(fileName, 20);
                  const dispDir = formatChipDir(dirName, 16);

                  return (
                    <g
                      key={k}
                      className={`bp-file-node ${nodeClass}`}
                      data-k={k}
                      tabIndex={0}
                      role="button"
                      aria-pressed={isTurnedOn}
                      aria-label={k}
                      style={delay ? { '--d': `${delay}s` } : undefined}
                      onClick={() => onToggleNode(k)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          onToggleNode(k);
                        }
                      }}
                    >
                      <title>{k}</title>

                      {/* Card Drop Shadow */}
                      <rect
                        className="bp-node-shadow"
                        x={x - 45}
                        y={y - 17}
                        width="94"
                        height="36"
                        rx="6"
                      />

                      {/* Card Main Body */}
                      <rect
                        className="bp-node-body"
                        x={x - 47}
                        y={y - 19}
                        width="94"
                        height="36"
                        rx="6"
                      />

                      {/* Top Accent Strip */}
                      <rect
                        className="bp-node-accent"
                        x={x - 47}
                        y={y - 19}
                        width="94"
                        height="3.5"
                        rx="1.5"
                      />

                      {/* Connection Ports (Left = In, Right = Out) */}
                      <circle className="bp-port in" cx={x - 47} cy={y} r="2.6" />
                      <circle className="bp-port out" cx={x + 47} cy={y} r="2.6" />

                      {/* Status Lamp LED */}
                      <circle
                        className="lamp"
                        cx={x + 36}
                        cy={y - 9}
                        r="2.4"
                      />

                      {/* Directory Path */}
                      <text
                        className="bp-dir-text"
                        x={x - 40}
                        y={y - 5}
                      >
                        {dispDir}
                      </text>

                      {/* File Name */}
                      <text
                        className="bp-nm-text"
                        x={x - 40}
                        y={y + 8}
                      >
                        {dispName}
                      </text>
                    </g>
                  );
                })}
              </g>
            </g>
          ) : (
            <g transform="translate(20 12)">
              <rect
                width="480"
                height="266"
                rx="12"
                fill="#0b0f19"
                stroke="rgba(56, 189, 248, 0.35)"
                strokeWidth="1.5"
              />
              <rect
                width="480"
                height="266"
                rx="12"
                fill={`url(#${patternId})`}
              />
              <g className="pcb-header-note" transform="translate(18, 12)">
                <circle cx="4" cy="5" r="2.8" fill="#38bdf8" />
                <text
                  x="12"
                  y="8"
                  fontSize="7.8"
                  fontWeight="600"
                  fill="#38bdf8"
                  fontFamily="'Chakra Petch', sans-serif"
                  letterSpacing="0.06em"
                >
                  ⚡ BLUEPRINT CIRCUIT FLOW • CLICK ANY FILE TO TRACE CONNECTIONS
                </text>
              </g>

              {/* Curved Blueprint Connecting Wires (2D) */}
              {boardEdges.map((e, i) => {
                const a = coords[e[1]];
                const b = coords[e[0]];
                const dx = Math.max(26, Math.abs(b[0] - a[0]) * 0.45);
                const d = `M${a[0] + 47} ${a[1]} C${a[0] + 47 + dx} ${a[1]}, ${b[0] - 47 - dx} ${b[1]}, ${b[0] - 47} ${b[1]}`;
                const wClass = wireClasses[i] || '';
                const delay = wireDelays[i] || 0;

                return (
                  <path
                    key={`wire2-${i}`}
                    className={`wire flat bp-wire ${wClass}`}
                    d={d}
                    filter={wClass ? `url(#bp_glow_${id})` : undefined}
                    style={delay ? { '--d': `${delay}s` } : undefined}
                  />
                );
              })}

              {/* Clean Blueprint File Nodes (2D) */}
              {Object.keys(coords).map((k) => {
                const [x, y] = coords[k];
                const parts = k.split('/');
                const isTurnedOn = !!activeMap[k];
                const nodeClass = isTurnedOn
                  ? 'on'
                  : nodeClasses[k] || (activeKeys.length ? 'dim' : '');
                const delay = nodeDelays[k] || 0;
                const fileName = parts[parts.length - 1];
                const dirName = parts.length > 1 ? parts[parts.length - 2] : '';
                const dispName = formatChipName(fileName, 20);
                const dispDir = formatChipDir(dirName, 16);

                return (
                  <g
                    key={`flat-${k}`}
                    className={`bp-file-node flat ${nodeClass}`}
                    data-k={k}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isTurnedOn}
                    aria-label={k}
                    style={delay ? { '--d': `${delay}s` } : undefined}
                    onClick={() => onToggleNode(k)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        onToggleNode(k);
                      }
                    }}
                    transform={`translate(${x - 47}, ${y - 19})`}
                  >
                    <title>{k}</title>

                    {/* Card Drop Shadow */}
                    <rect className="bp-node-shadow" x="2" y="2" width="94" height="36" rx="6" />

                    {/* Card Body */}
                    <rect className="bp-node-body" x="0" y="0" width="94" height="36" rx="6" />

                    {/* Top Accent Strip */}
                    <rect className="bp-node-accent" x="0" y="0" width="94" height="3.5" rx="1.5" />

                    {/* Connection Ports */}
                    <circle className="bp-port in" cx="0" cy="18" r="2.6" />
                    <circle className="bp-port out" cx="94" cy="18" r="2.6" />

                    {/* Status Lamp LED */}
                    <circle className="lamp" cx="83" cy="9" r="2.4" />

                    {/* Labels */}
                    <text className="bp-dir-text" x="8" y="13">
                      {dispDir}
                    </text>
                    <text
                      className="bp-nm-text"
                      x="8"
                      y="26"
                    >
                      {dispName}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
});

export default CircuitBoard;
