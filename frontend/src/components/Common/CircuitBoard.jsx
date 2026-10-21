import { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { MX_TRANSFORM } from '../../data/codebaseData';
import { calculateImpact } from '../../data/projectModel';
import { useProject } from '../../context/projectContext';

function formatChipName(name, maxChars = 13) {
  if (!name) return '';
  if (name.length <= maxChars) return name;
  const dotIdx = name.lastIndexOf('.');
  if (dotIdx > 0) {
    const ext = name.slice(dotIdx);
    const base = name.slice(0, dotIdx);
    const rem = maxChars - ext.length - 2; // 2 for '..'
    if (rem >= 4) {
      const front = Math.ceil(rem * 0.52);
      const back = rem - front;
      return base.slice(0, front) + '..' + base.slice(-back) + ext;
    }
  }
  return name.slice(0, maxChars - 1) + '…';
}

function formatChipDir(dir, maxChars = 10) {
  if (!dir) return '';
  const d = dir.endsWith('/') ? dir : dir + '/';
  if (d.length <= maxChars) return d;
  return d.slice(0, maxChars - 2) + '../';
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
        if (fx >= x - 42 && fx <= x + 42 && fy >= y - 22 && fy <= y + 40) {
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

      <div className={`pcbw ${view3d ? 'is3d' : 'is2d'}`}>
        <svg
          ref={svgRef}
          id={id}
          viewBox={view3d ? '0 0 520 320' : '0 0 520 290'}
          className="pcb"
          role="group"
          aria-label={mode === 'deps' ? 'Dependency graph' : 'Impact graph'}
        >
          <defs>
            <pattern
              id={patternId}
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="7" cy="7" r="1" fill="#2e3033" />
            </pattern>
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
                    fill="#0b0b0c"
                    stroke="#2a2b2e"
                  />
                </g>
              </g>

              {/* Main PCB board */}
              <g transform={MX_TRANSFORM}>
                <rect
                  width="470"
                  height="290"
                  rx="14"
                  fill="#18191b"
                  stroke="#38393d"
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
                  fontSize="8"
                  fill="#6b6d73"
                  fontFamily="Chakra Petch, sans-serif"
                >
                  signal flows from the imported file to the file that imports it
                </text>

                {/* Wires */}
                {boardEdges.map((e, i) => {
                  const a = coords[e[1]];
                  const b = coords[e[0]];
                  const ex = board.elbows[i];
                  const d = `M${a[0] + 42} ${a[1]}H${ex}V${b[1]}H${b[0] - 42}`;
                  const wClass = wireClasses[i] || '';
                  const delay = wireDelays[i] || 0;

                  return (
                    <path
                      key={`wire-${i}`}
                      className={`wire ${wClass}`}
                      d={d}
                      style={delay ? { '--d': `${delay}s` } : undefined}
                    />
                  );
                })}

                {/* IC Chips */}
                {Object.keys(coords).map((k) => {
                  const [x, y] = coords[k];
                  const parts = k.split('/');
                  const isTurnedOn = !!activeMap[k];
                  const nodeClass = isTurnedOn
                    ? 'on'
                    : nodeClasses[k] || (activeKeys.length ? 'dim' : '');
                  const delay = nodeDelays[k] || 0;

                  return (
                    <g
                      key={k}
                      className={`ic ${nodeClass}`}
                      data-k={k}
                      tabIndex={0}
                      role="switch"
                      aria-checked={isTurnedOn}
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
                      {/* IC Pins */}
                      {[0, 1, 2, 3, 4].map((pIdx) => (
                        <g key={pIdx}>
                          <rect
                            className="pin"
                            x={x - 32 + pIdx * 16}
                            y={y - 22}
                            width="6"
                            height="4"
                          />
                          <rect
                            className="pin"
                            x={x - 32 + pIdx * 16}
                            y={y + 18}
                            width="6"
                            height="4"
                          />
                        </g>
                      ))}

                      <rect
                        className="shadow"
                        x={x - 39}
                        y={y - 15}
                        width="84"
                        height="36"
                        rx="4"
                      />
                      <rect
                        className="body"
                        x={x - 42}
                        y={y - 18}
                        width="84"
                        height="36"
                        rx="4"
                      />
                      <title>{k}</title>
                      <text
                        className="dir"
                        x={x}
                        y={y - 5}
                        textAnchor="middle"
                      >
                        {formatChipDir(parts.length > 1 ? parts[parts.length - 2] : '', 12)}
                      </text>
                      <text
                        className="nm"
                        x={x}
                        y={y + 10}
                        textAnchor="middle"
                        textLength={Math.min(74, Math.max(40, formatChipName(parts[parts.length - 1], 15).length * 6))}
                        lengthAdjust="spacingAndGlyphs"
                      >
                        {formatChipName(parts[parts.length - 1], 15)}
                      </text>
                      <circle
                        className="lamp"
                        cx={x + 34}
                        cy={y - 11}
                        r="3"
                      />
                      <rect
                        className="trk"
                        x={x - 15}
                        y={y + 27}
                        width="30"
                        height="13"
                        rx="6.5"
                      />
                      <circle
                        className="knob"
                        cx={x - 8}
                        cy={y + 33.5}
                        r="5"
                      />
                    </g>
                  );
                })}
              </g>
            </g>
          ) : (
            <g transform="translate(30 20)">
              <rect
                width="460"
                height="250"
                rx="12"
                fill="#151617"
                stroke="#38393d"
                strokeWidth="1.2"
              />
              <rect
                width="460"
                height="250"
                rx="12"
                fill={`url(#${patternId})`}
              />
              <text
                x="16"
                y="18"
                fontSize="8"
                fill="#6b6d73"
                fontFamily="Chakra Petch, sans-serif"
              >
                Top view: straight trace from imported file to importer
              </text>

              {boardEdges.map((e, i) => {
                const a = coords[e[1]];
                const b = coords[e[0]];
                const wClass = wireClasses[i] || '';
                const delay = wireDelays[i] || 0;
                const d = `M${a[0]} ${a[1]}H${(a[0] + b[0]) / 2}V${b[1]}H${b[0]}`;

                return (
                  <path
                    key={`wire2-${i}`}
                    className={`wire flat ${wClass}`}
                    d={d}
                    style={delay ? { '--d': `${delay}s` } : undefined}
                  />
                );
              })}

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
                const dispName = formatChipName(fileName, 13);
                const dispDir = formatChipDir(dirName, 10);
                const textLen = Math.min(62, Math.max(36, dispName.length * 5.2));

                return (
                  <g
                    key={`flat-${k}`}
                    className={`ic flat ${nodeClass}`}
                    data-k={k}
                    tabIndex={0}
                    role="switch"
                    aria-checked={isTurnedOn}
                    aria-label={k}
                    style={delay ? { '--d': `${delay}s` } : undefined}
                    onClick={() => onToggleNode(k)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        onToggleNode(k);
                      }
                    }}
                    transform={`translate(${x - 37}, ${y - 15})`}
                  >
                    <title>{k}</title>
                    <rect className="shadow" x="3" y="4" width="74" height="30" rx="4" />
                    <rect className="body" x="0" y="0" width="74" height="30" rx="4" />
                    <rect className="trk" x="23" y="33" width="28" height="9" rx="4.5" />
                    <circle className="knob" cx={isTurnedOn ? 43 : 30} cy="37.5" r="3.8" />
                    <circle className="lamp" cx="64" cy="7" r="2.6" />
                    {[0, 1, 2, 3, 4].map((pIdx) => (
                      <g key={pIdx}>
                        <rect className="pin" x={8 + pIdx * 14} y={-4} width="5" height="4" />
                        <rect className="pin" x={8 + pIdx * 14} y={30} width="5" height="4" />
                      </g>
                    ))}
                    <text className="dir" x="37" y="10" textAnchor="middle">
                      {dispDir}
                    </text>
                    <text
                      className="nm"
                      x="37"
                      y="21"
                      textAnchor="middle"
                      textLength={textLen}
                      lengthAdjust="spacingAndGlyphs"
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
