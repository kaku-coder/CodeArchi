import {
  FILES_CONTENT,
  OFF_FILES,
  EDGES,
  PCB_COORDS,
  EX_COORDS
} from './codebaseData';

export const LANG_BY_EXT = {
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.mts': 'TypeScript',
  '.cts': 'TypeScript',
  '.py': 'Python',
  '.pyi': 'Python',
  '.rb': 'Ruby',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.kts': 'Kotlin',
  '.cs': 'C#',
  '.fs': 'F#',
  '.php': 'PHP',
  '.swift': 'Swift',
  '.scala': 'Scala',
  '.dart': 'Dart',
  '.c': 'C',
  '.h': 'C',
  '.cpp': 'C++',
  '.hpp': 'C++',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
  '.astro': 'Astro',
  '.html': 'HTML',
  '.htm': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'Sass',
  '.less': 'Less',
  '.json': 'JSON',
  '.jsonc': 'JSON',
  '.yml': 'YAML',
  '.yaml': 'YAML',
  '.toml': 'TOML',
  '.ini': 'INI',
  '.cfg': 'Config',
  '.env': 'Env',
  '.md': 'Markdown',
  '.mdx': 'MDX',
  '.txt': 'Text',
  '.rst': 'Text',
  '.sql': 'SQL',
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.ps1': 'Shell',
  '.bat': 'Shell',
  '.graphql': 'GraphQL',
  '.gql': 'GraphQL',
  '.prisma': 'Prisma',
  '.xml': 'XML',
  '.lock': 'Lockfile',
  '.map': 'Source map',
  '.csv': 'CSV',
  '.svg': 'SVG',
  '.dockerfile': 'Dockerfile'
};

export const BINARY_EXTS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.ico',
  '.webp',
  '.avif',
  '.pdf',
  '.zip',
  '.gz',
  '.tar',
  '.rar',
  '.7z',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.mp3',
  '.wav',
  '.ogg',
  '.mp4',
  '.webm',
  '.mov',
  '.avi',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.class',
  '.jar',
  '.pyc',
  '.bin',
  '.db',
  '.sqlite',
  '.sqlite3'
]);

const JS_LANGS = new Set(['JavaScript', 'TypeScript', 'Vue', 'Svelte', 'Astro']);
const CODE_LANGS = new Set([
  ...JS_LANGS,
  'Python',
  'Ruby',
  'Go',
  'Rust',
  'Java',
  'Kotlin',
  'C#',
  'PHP',
  'Swift',
  'Scala',
  'Dart',
  'C',
  'C++',
  'HTML',
  'CSS',
  'SCSS',
  'Sass',
  'Less',
  'Shell',
  'SQL',
  'GraphQL'
]);

export function extOf(path) {
  const name = path.split('/').pop() || '';
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return '';
  return name.slice(dot).toLowerCase();
}

export function detectLanguage(path) {
  const name = (path.split('/').pop() || '').toLowerCase();
  if (name === 'dockerfile') return 'Dockerfile';
  if (name === 'makefile') return 'Makefile';
  if (name.startsWith('readme')) return 'Markdown';
  if (name.startsWith('license')) return 'Text';
  return LANG_BY_EXT[extOf(path)] || '';
}

export function isCodeLanguage(lang) {
  return CODE_LANGS.has(lang);
}

export function isBinaryPath(path) {
  return BINARY_EXTS.has(extOf(path));
}

/**
 * Normalises a project into the shape every CodeArchi view consumes:
 * a file list, a dependency graph, board coordinates and a summary.
 */
export function buildProject(config) {
  const {
    id,
    name,
    source,
    files = [],
    offFiles = {},
    edges = [],
    coords = null,
    elbows = null,
    summary = null,
    risks = [],
    externalDeps = [],
    readme = '',
    skipped = 0
  } = config;

  const imports = {};
  const importedBy = {};

  edges.forEach(([from, to]) => {
    if (!imports[from]) imports[from] = [];
    if (!importedBy[to]) importedBy[to] = [];
    if (!imports[from].includes(to)) imports[from].push(to);
    if (!importedBy[to].includes(from)) importedBy[to].push(from);
  });

  const byPath = {};
  files.forEach((file) => {
    byPath[file.path] = file;
  });

  const fileEntries = files
    .map((file) => ({
      path: file.path,
      lang: file.lang,
      size: file.size || 0,
      off: false,
      note: ''
    }))
    .concat(
      Object.keys(offFiles).map((path) => ({
        path,
        lang: 'Binary',
        size: offFiles[path].size || 0,
        off: true,
        note: offFiles[path].note || 'Binary file'
      }))
    )
    .sort((a, b) => a.path.localeCompare(b.path));

  const board = buildBoard(edges, coords, elbows);

  return {
    id,
    name,
    source,
    files,
    byPath,
    fileEntries,
    offFiles,
    edges,
    imports,
    importedBy,
    board,
    summary,
    risks,
    externalDeps,
    readme,
    skipped
  };
}

const BOARD_NODES_MAX = 12;
const BOARD_MIN_X = 62;
const BOARD_MAX_X = 418;
const BOARD_MIN_Y = 46;
const BOARD_MAX_Y = 228;

function selectBoardEdges(edges) {
  const degree = {};
  edges.forEach(([from, to]) => {
    degree[from] = (degree[from] || 0) + 1;
    degree[to] = (degree[to] || 0) + 1;
  });

  const ranked = Object.keys(degree).sort((a, b) => {
    if (degree[b] !== degree[a]) return degree[b] - degree[a];
    return a.localeCompare(b);
  });

  const keep = new Set(ranked.slice(0, BOARD_NODES_MAX));
  return edges.filter(([from, to]) => keep.has(from) && keep.has(to));
}

function layoutNodes(paths) {
  const coords = {};
  const count = paths.length;
  if (!count) return coords;

  const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(count))));
  const rows = Math.ceil(count / cols);
  const stepX = cols > 1 ? (BOARD_MAX_X - BOARD_MIN_X) / (cols - 1) : 0;
  const stepY = rows > 1 ? (BOARD_MAX_Y - BOARD_MIN_Y) / (rows - 1) : 0;

  paths.forEach((path, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = cols > 1 ? BOARD_MIN_X + col * stepX : (BOARD_MIN_X + BOARD_MAX_X) / 2;
    const y = rows > 1 ? BOARD_MIN_Y + row * stepY : (BOARD_MIN_Y + BOARD_MAX_Y) / 2;
    coords[path] = [Math.round(x), Math.round(y)];
  });

  return coords;
}

function buildBoard(edges, coords, elbows) {
  if (coords && Object.keys(coords).length) {
    const boardEdges = [];
    const boardElbows = [];
    edges.forEach((edge, index) => {
      if (!coords[edge[0]] || !coords[edge[1]]) return;
      boardEdges.push(edge);
      boardElbows.push(
        elbows && elbows[index] !== undefined
          ? elbows[index]
          : Math.round((coords[edge[1]][0] + coords[edge[0]][0]) / 2)
      );
    });
    return { coords, edges: boardEdges, elbows: boardElbows };
  }

  const boardEdges = selectBoardEdges(edges);
  const paths = [];
  boardEdges.forEach(([from, to]) => {
    if (!paths.includes(from)) paths.push(from);
    if (!paths.includes(to)) paths.push(to);
  });

  const boardCoords = layoutNodes(paths);
  const boardElbows = boardEdges.map(
    ([from, to]) => Math.round((boardCoords[to][0] + boardCoords[from][0]) / 2)
  );

  return { coords: boardCoords, edges: boardEdges, elbows: boardElbows };
}

export function importsOf(project, path) {
  if (!project) return [];
  return project.imports[path] || [];
}

export function importedByOf(project, path) {
  if (!project) return [];
  return project.importedBy[path] || [];
}

export function shortPath(path) {
  return String(path).replace('src/', '');
}

export function calculateImpact(project, activeFiles) {
  const edges = project ? project.edges : [];
  const importedBy = {};
  edges.forEach(([from, to]) => {
    if (!importedBy[to]) importedBy[to] = [];
    importedBy[to].push(from);
  });

  const active = Object.keys(activeFiles).filter((key) => activeFiles[key]);
  const depth = {};
  const parent = {};
  const classes = {};

  const queue = active.slice();
  active.forEach((key) => {
    depth[key] = 0;
  });

  while (queue.length) {
    const current = queue.shift();
    (importedBy[current] || []).forEach((next) => {
      if (depth[next] === undefined) {
        depth[next] = depth[current] + 1;
        parent[next] = current;
        classes[next] = 'hit';
        queue.push(next);
      }
    });
  }

  const affectedList = Object.keys(depth)
    .filter((key) => depth[key] > 0)
    .sort((a, b) => depth[a] - depth[b])
    .map((key) => ({ path: key, depth: depth[key], via: parent[key] }));

  return { depth, parent, classes, affectedList, activeKeys: active };
}

export const SAMPLE_PROJECT = buildProject({
  id: 'sample',
  name: 'sample-billing-service',
  source: 'sample',
  files: Object.keys(FILES_CONTENT).map((path) => {
    const [, lines] = FILES_CONTENT[path];
    const content = lines.join('\n');
    return {
      path,
      lang: detectLanguage(path),
      size: content.length,
      content,
      lines: content.split('\n')
    };
  }),
  offFiles: Object.keys(OFF_FILES).reduce((acc, path) => {
    acc[path] = { note: OFF_FILES[path] };
    return acc;
  }, {}),
  edges: EDGES,
  coords: PCB_COORDS,
  elbows: EX_COORDS,
  summary: {
    headline: 'A small TypeScript billing service with a React checkout in front of it.',
    paragraphs: [
      'Seven TypeScript modules describe an order to invoice flow. An API route requires a session, the session verifies a JSON web token, and the invoice module reads one row from Postgres before formatting the total.',
      'Eight import edges connect those modules, so the session and invoice files are the most connected in the project and the first ones a change would travel through.',
      'It is the built in sample. Upload a ZIP on the Explorer page and every view below switches to your own files.'
    ],
    facts: [
      ['Type', 'Service with a web frontend'],
      ['Entry points', 'src/api/routes.ts, src/ui/Checkout.tsx'],
      ['Data', 'Postgres through src/db/client.ts'],
      ['Auth', 'Session cookie plus a signed JWT']
    ],
    stack: ['TypeScript', 'React', 'Postgres'],
    entryPoints: ['src/api/routes.ts', 'src/ui/Checkout.tsx']
  },
  risks: [
    {
      path: 'src/billing/invoice.ts',
      line: 40,
      snippet: 'const invoice = row.rows[0];',
      kind: 'Unchecked result',
      reason: 'A query result is used without checking that a row exists.'
    },
    {
      path: 'src/utils/format.ts',
      line: 12,
      snippet: 'return sym + inv.total.toFixed(2);',
      kind: 'Unguarded property access',
      reason: 'A property is read from a value that can be undefined.'
    },
    {
      path: 'src/db/client.ts',
      line: 6,
      snippet: "host: process.env.DB_HOST ?? '127.0.0.1',",
      kind: 'Environment dependency',
      reason: 'The database host falls back to localhost when the variable is missing.'
    }
  ]
});
