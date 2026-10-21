import { useRef, useImperativeHandle, forwardRef } from 'react';
import { MX_TRANSFORM } from '../../data/codebaseData';
import { calculateImpact } from '../../data/projectModel';
import { useProject } from '../../context/projectContext';

const CircuitBoard = forwardRef(function CircuitBoard(
  { id, mode, activeMap, onToggleNode },
  ref
) {
  const project = useProject();
  const svgRef = useRef(null);

  const board = project.board;
  const coords = board.coords;
  const boardEdges = board.edges;

  // Expose hit testing for trackpad simulation
  useImperativeHandle(ref, () => ({
    getSvgElement: () => svgRef.current,
    hit: (px, py, W, H) => {
      const s = Math.min(W / 520, H / 320);
      const sx = (px - (W - 520 * s) / 2) / s - 200;
      const sy = (py - (H - 320 * s) / 2) / s - 22;
      const a = sx / 0.62;
      const b = sy / 0.36;
      const fx = (a + b) / 2;
      const fy = (b - a) / 2;

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
    <div className="pcbw">
      <svg
        ref={svgRef}
        id={id}
        viewBox="0 0 520 320"
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
                  <text
                    className="dir"
                    x={x}
                    y={y - 5}
                    textAnchor="middle"
                  >
                    {parts.length > 1 ? parts[parts.length - 2] : ''}
                  </text>
                  <text
                    className="nm"
                    x={x}
                    y={y + 10}
                    textAnchor="middle"
                  >
                    {parts[parts.length - 1]}
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
      </svg>
    </div>
  );
});

export default CircuitBoard;
