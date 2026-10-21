import { readZipArchive } from './zipReader';
import {
  buildProject,
  detectLanguage,
  isBinaryPath,
  isCodeLanguage
} from '../data/projectModel';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.hg',
  '.svn',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.output',
  'coverage',
  '__pycache__',
  '.venv',
  'venv',
  'env',
  'vendor',
  'target',
  '.idea',
  '.vscode',
  '.cache',
  '.pytest_cache',
  '.mypy_cache',
  '.gradle',
  'bower_components',
  'jspm_packages',
  '.terraform',
  'Pods',
  'DerivedData',
  '.parcel-cache',
  '.turbo'
]);

const CODE_EXTS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.vue',
  '.svelte',
  '.astro',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.cs',
  '.php',
  '.swift',
  '.c',
  '.h',
  '.cpp',
  '.hpp',
  '.json',
  '.graphql'
];

const MAX_FILES = 4000;
const MAX_TEXT_BYTES = 300 * 1024;
const MAX_TOTAL_TEXT_BYTES = 24 * 1024 * 1024;
const MAX_LINES = 4000;

const PY_LANGS = new Set(['Python']);
const JVM_LANGS = new Set(['Java', 'Kotlin', 'Scala']);

function normalizePath(path) {
  const parts = [];
  path.split('/').forEach((part) => {
    if (!part || part === '.') return;
    if (part === '..') {
      parts.pop();
      return;
    }
    parts.push(part);
  });
  return parts.join('/');
}

function dirname(path) {
  const index = path.lastIndexOf('/');
  return index < 0 ? '' : path.slice(0, index);
}

function isProbablyBinary(sample) {
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) return true;
  }
  return false;
}

function stripCommonRoot(paths) {
  if (paths.length < 2) return paths;
  const firsts = new Set(paths.map((path) => path.split('/')[0]));
  if (firsts.size !== 1) return paths;
  const root = paths[0].split('/')[0];
  if (IGNORED_DIRS.has(root)) return paths;
  if (!paths.some((path) => path.includes('/'))) return paths;
  return paths.map((path) => path.slice(root.length + 1)).filter(Boolean);
}

function buildSuffixIndex(paths) {
  const index = new Map();
  paths.forEach((path) => {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      const key = parts.slice(i).join('/');
      if (!index.has(key)) index.set(key, path);
    }
  });
  return index;
}

function matchCandidate(base, pathSet, suffixIndex) {
  const candidates = [base];
  CODE_EXTS.forEach((ext) => {
    candidates.push(base + ext);
    candidates.push(base + '/index' + ext);
  });

  const dot = base.lastIndexOf('.');
  const slash = base.lastIndexOf('/');
  if (dot > slash) {
    const stem = base.slice(0, dot);
    CODE_EXTS.forEach((ext) => candidates.push(stem + ext));
  }

  for (const candidate of candidates) {
    if (pathSet.has(candidate)) return candidate;
  }

  if (suffixIndex.has(base)) return suffixIndex.get(base);

  const baseName = base.split('/').pop();
  if (baseName && suffixIndex.has(baseName)) return suffixIndex.get(baseName);

  return null;
}

function resolveSpecifier(spec, fromPath, ctx) {
  const { pathSet, suffixIndex, langOf } = ctx;
  const dir = dirname(fromPath);
  const lang = langOf(fromPath);

  if (spec.startsWith('.')) {
    return matchCandidate(normalizePath(dir + '/' + spec), pathSet, suffixIndex);
  }

  if (spec.startsWith('/')) {
    return matchCandidate(normalizePath(spec.slice(1)), pathSet, suffixIndex);
  }

  if (PY_LANGS.has(lang)) {
    const base = spec.replace(/\./g, '/');
    return (
      matchCandidate(base, pathSet, suffixIndex) ||
      matchCandidate(base + '/__init__', pathSet, suffixIndex)
    );
  }

  if (JVM_LANGS.has(lang)) {
    return matchCandidate(spec.replace(/\./g, '/'), pathSet, suffixIndex);
  }

  if (lang === 'Rust') {
    const base = spec.replace(/::/g, '/');
    return (
      matchCandidate(base, pathSet, suffixIndex) ||
      matchCandidate('src/' + base, pathSet, suffixIndex)
    );
  }

  if (lang === 'Go') {
    const segments = spec.split('/');
    for (let take = Math.min(3, segments.length); take >= 1; take--) {
      const hit = matchCandidate(segments.slice(-take).join('/'), pathSet, suffixIndex);
      if (hit) return hit;
    }
    return null;
  }

  if (lang === 'PHP') {
    return matchCandidate(spec.replace(/\\/g, '/'), pathSet, suffixIndex);
  }

  if (lang === 'Ruby') {
    return matchCandidate(spec.replace(/^\.\//, ''), pathSet, suffixIndex);
  }

  return null;
}

const IMPORT_RULES = {
  JavaScript: [
    /\bimport\s+[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bexport\s+[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ],
  Python: [/^\s*from\s+([\w.]+)\s+import\s+/gm, /^\s*import\s+([\w][\w.]*)/gm],
  Java: [/^\s*import\s+(?:static\s+)?([\w.]+)\s*;/gm],
  Kotlin: [/^\s*import\s+([\w.]+)/gm],
  Go: [/^\s*import\s+"([^"]+)"/gm],
  Rust: [/^\s*(?:pub\s+)?use\s+([\w:]+)/gm],
  PHP: [/^\s*use\s+([\w\\]+)\s*;/gm, /\brequire(?:_once)?\s*\(?\s*['"]([^'"]+)['"]/g],
  Ruby: [/^\s*require(?:_relative)?\s*['"]([^'"]+)['"]/gm]
};

function extractImports(content, lang) {
  const rules = IMPORT_RULES[lang] || IMPORT_RULES.JavaScript;
  const found = [];
  rules.forEach((rule) => {
    rule.lastIndex = 0;
    let match = rule.exec(content);
    while (match) {
      if (match[1]) found.push(match[1]);
      match = rule.exec(content);
    }
  });
  return found;
}

function packageNameOf(spec) {
  if (spec.startsWith('@')) {
    return spec.split('/').slice(0, 2).join('/');
  }
  return spec.split('/')[0];
}

function parseManifest(text, path) {
  if (path.endsWith('package.json')) {
    try {
      return { kind: 'node', data: JSON.parse(text) };
    } catch {
      return null;
    }
  }
  if (path.endsWith('requirements.txt') || path.endsWith('requirements-dev.txt')) {
    const deps = text
      .split('\n')
      .map((line) => line.split('#')[0].trim())
      .filter((line) => line && !line.startsWith('-'));
    return { kind: 'python', data: { dependencies: deps, name: '', description: '' } };
  }
  if (path.endsWith('pyproject.toml')) {
    const deps = [];
    const re = /^\s*([A-Za-z0-9_.-]+)\s*=\s*["'][^"']+["']/gm;
    let match = re.exec(text);
    while (match) {
      deps.push(match[1]);
      match = re.exec(text);
    }
    const description = /description\s*=\s*["']([^"']+)["']/m.exec(text);
    const projectName = /name\s*=\s*["']([^"']+)["']/m.exec(text);
    return {
      kind: 'python',
      data: {
        dependencies: deps,
        description: description ? description[1] : '',
        name: projectName ? projectName[1] : ''
      }
    };
  }
  if (path.endsWith('Cargo.toml')) {
    const deps = [];
    const re = /^\s*([A-Za-z0-9_-]+)\s*=\s*["'][^"']+["']/gm;
    let match = re.exec(text);
    while (match) {
      deps.push(match[1]);
      match = re.exec(text);
    }
    return { kind: 'rust', data: { dependencies: deps } };
  }
  if (path.endsWith('go.mod')) {
    const deps = [];
    const re = /^\s*([\w./-]+)\s+v[\d.]/gm;
    let match = re.exec(text);
    while (match) {
      deps.push(match[1]);
      match = re.exec(text);
    }
    return { kind: 'go', data: { dependencies: deps } };
  }
  return null;
}

function detectSignals(files) {
  const signals = {
    httpRoutes: false,
    database: false,
    auth: false,
    httpClient: false,
    ui: false,
    cli: false,
    worker: false,
    machineLearning: false,
    container: false,
    graphql: false
  };

  files.forEach((file) => {
    const content = file.content || '';
    const name = file.path.toLowerCase();

    if (
      /\b(router|app)\s*\.\s*(get|post|put|patch|delete|options)\s*\(/.test(content) ||
      /@(?:app|router)\.(route|get|post|put|delete)\s*\(/.test(content) ||
      /\b(express|fastify|koa|nest|gin|echo|fiber)\b/i.test(content) ||
      /handle_request|http\.HandleFunc/.test(content)
    ) {
      signals.httpRoutes = true;
    }

    if (
      /\b(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/i.test(content) ||
      /PrismaClient|Sequelize|sequelize|mongoose|typeorm|TypeORM|knex|psycopg|sqlalchemy|SQLAlchemy/i.test(
        content
      )
    ) {
      signals.database = true;
    }

    if (/\b(jwt|jsonwebtoken|passport|bcrypt|oauth|argon2|authenticate|authorization)\b/i.test(content)) {
      signals.auth = true;
    }

    if (/\bfetch\s*\(|axios\.|requests\.(get|post|put|delete)\s*\(|httpx\.|superagent/i.test(content)) {
      signals.httpClient = true;
    }

    if (
      /\.(jsx?|tsx?|vue|svelte)$/.test(file.path) &&
      /createRoot|ReactDOM|createApp|defineComponent|<template>|\bsvelte\b/i.test(content)
    ) {
      signals.ui = true;
    }

    if (/process\.argv|argparse|commander|yargs|click\.|sys\.argv|cobra/i.test(content)) {
      signals.cli = true;
    }

    if (/\b(worker|celery|bull|agenda|kafka|consumer|scheduler|cron)\b/i.test(content)) {
      signals.worker = true;
    }

    if (/\b(torch|tensorflow|sklearn|transformers|keras|xgboost)\b/i.test(content)) {
      signals.machineLearning = true;
    }

    if (/docker-compose|kind:\s*Deployment/.test(content) || name.includes('dockerfile')) {
      signals.container = true;
    }

    if (/\b(graphql|apollo|type-graphql)\b/i.test(content)) {
      signals.graphql = true;
    }
  });

  return signals;
}

function capabilityList(signals) {
  const list = [];
  if (signals.httpRoutes) list.push('serves HTTP endpoints');
  if (signals.database) list.push('reads and writes a database');
  if (signals.auth) list.push('handles authentication and sessions');
  if (signals.httpClient) list.push('calls other services over HTTP');
  if (signals.ui) list.push('renders a user interface');
  if (signals.cli) list.push('runs as a command line tool');
  if (signals.worker) list.push('processes background jobs');
  if (signals.machineLearning) list.push('runs machine learning models');
  if (signals.graphql) list.push('exposes a GraphQL schema');
  if (signals.container) list.push('ships as a container');
  return list;
}

function classifyKind(signals, files, manifests) {
  const hasNode = manifests.some((manifest) => manifest.kind === 'node');
  const hasPython = manifests.some((manifest) => manifest.kind === 'python');
  const hasRust = manifests.some((manifest) => manifest.kind === 'rust');
  const hasGo = manifests.some((manifest) => manifest.kind === 'go');

  if (signals.cli && !signals.httpRoutes && !signals.ui) return 'command line tool';
  if (signals.httpRoutes && signals.ui) return 'full stack web application';
  if (signals.httpRoutes) return 'backend service';
  if (signals.ui) return 'web frontend';
  if (signals.machineLearning) return 'machine learning project';
  if (signals.worker) return 'background processing service';
  if (hasNode || hasPython || hasRust || hasGo) {
    return files.length < 12 ? 'small utility script' : 'library or package';
  }
  return 'collection of source files';
}

const RISK_RULES = [
  {
    kind: 'Silent error swallow',
    severity: 3,
    test: /catch\s*\([^)]*\)\s*\{\s*\}/,
    reason: 'The error is caught and discarded, so a failure looks like success.'
  },
  {
    kind: 'Silent error swallow',
    severity: 3,
    test: /except[^\n]*:\s*\n\s*pass/,
    reason: 'The exception handler does nothing, so failures pass unnoticed.'
  },
  {
    kind: 'Unfinished work',
    severity: 1,
    test: /\b(TODO|FIXME|HACK|XXX)\b/,
    reason: 'A marker comment shows the code is not finished.'
  },
  {
    kind: 'Hard coded secret',
    severity: 4,
    test: /(api[_-]?key|secret|password|passwd|token)\s*[:=]{1,2}\s*['"][^'"\s]{6,}['"]/i,
    reason: 'A credential looks hard coded in the source.'
  },
  {
    kind: 'Hard coded secret',
    severity: 4,
    test: /process\.env\.[A-Z0-9_]*(SECRET|KEY|TOKEN|PASSWORD|CREDENTIAL)[A-Z0-9_]*\s*\|\|\s*['"][^'"]{4,}['"]/,
    reason: 'An environment variable falls back to a secret written in the code.'
  },
  {
    kind: 'Dynamic code execution',
    severity: 4,
    test: /\beval\s*\(/,
    reason: 'eval runs code built at runtime, which is hard to reason about.'
  },
  {
    kind: 'Debug logging left in',
    severity: 1,
    test: /console\.(log|debug)\s*\(/,
    reason: 'Debug output is still printed in a source file.'
  }
];

function detectRisks(files) {
  const risks = [];

  files.forEach((file) => {
    if (!isCodeLanguage(file.lang)) return;
    if (/\.(test|spec)\.[jt]sx?$|__tests__/.test(file.path)) return;

    const lines = file.lines || [];
    lines.forEach((line, index) => {
      RISK_RULES.forEach((rule) => {
        if (risks.length >= 40) return;
        if (!rule.test.test(line)) return;
        risks.push({
          path: file.path,
          line: index + 1,
          snippet: line.trim().slice(0, 160),
          kind: rule.kind,
          reason: rule.reason,
          severity: rule.severity
        });
      });
    });
  });

  return risks.sort((a, b) => b.severity - a.severity).slice(0, 14);
}

function detectEnvVars(files) {
  const vars = new Set();
  const patterns = [
    /process\.env\.([A-Z0-9_]+)/g,
    /os\.environ(?:\.get)?\[['"]([A-Z0-9_]+)['"]\]/g,
    /os\.getenv\(['"]([A-Z0-9_]+)['"]/g
  ];

  files.forEach((file) => {
    if (!isCodeLanguage(file.lang)) return;
    const content = file.content || '';

    patterns.forEach((pattern) => {
      pattern.lastIndex = 0;
      let match = pattern.exec(content);
      while (match) {
        vars.add(match[1]);
        match = pattern.exec(content);
      }
    });
  });

  return Array.from(vars).sort();
}

function detectTests(files) {
  return files.filter(
    (file) =>
      /(^|\/)(tests?|__tests__|spec)\//.test(file.path) ||
      /\.(test|spec)\.[a-z]+$/i.test(file.path) ||
      /(^|\/)test_[^/]*\.py$/.test(file.path) ||
      /_test\.(go|rb)$/.test(file.path)
  );
}

function detectEntryPoints(files, manifests) {
  const points = [];
  const names = ['index', 'main', 'app', 'server', 'cli', 'program', '__main__', 'run'];

  manifests.forEach((manifest) => {
    if (manifest.kind !== 'node') return;
    const data = manifest.data || {};
    if (typeof data.main === 'string') points.push(data.main);
    if (data.bin && typeof data.bin === 'object') {
      Object.values(data.bin).forEach((value) => {
        if (typeof value === 'string') points.push(value);
      });
    }
  });

  files.forEach((file) => {
    const base = file.path.split('/').pop().replace(/\.[^.]+$/, '');
    const depth = file.path.split('/').length;
    if (names.includes(base) && depth <= 3) points.push(file.path);
  });

  return Array.from(new Set(points)).filter((path) =>
    files.some((file) => file.path === path || file.path.endsWith(path))
  );
}

const FRAMEWORK_HINTS = [
  ['react', 'React'],
  ['next', 'Next.js'],
  ['vue', 'Vue'],
  ['nuxt', 'Nuxt'],
  ['svelte', 'Svelte'],
  ['@angular/core', 'Angular'],
  ['express', 'Express'],
  ['fastify', 'Fastify'],
  ['koa', 'Koa'],
  ['@nestjs/core', 'NestJS'],
  ['mongoose', 'Mongoose'],
  ['prisma', 'Prisma'],
  ['sequelize', 'Sequelize'],
  ['typeorm', 'TypeORM'],
  ['pg', 'Postgres'],
  ['mysql2', 'MySQL'],
  ['sqlite3', 'SQLite'],
  ['socket.io', 'Socket.IO'],
  ['graphql', 'GraphQL'],
  ['redux', 'Redux'],
  ['zustand', 'Zustand'],
  ['tailwindcss', 'Tailwind'],
  ['jsonwebtoken', 'JWT'],
  ['jest', 'Jest'],
  ['vitest', 'Vitest'],
  ['playwright', 'Playwright'],
  ['webpack', 'webpack'],
  ['vite', 'Vite']
];

function plural(count, singular, pluralForm) {
  return count + ' ' + (count === 1 ? singular : pluralForm || singular + 's');
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function mostConnected(edges) {
  const degree = {};
  edges.forEach(([from, to]) => {
    degree[from] = (degree[from] || 0) + 1;
    degree[to] = (degree[to] || 0) + 1;
  });
  const ranked = Object.keys(degree).sort((a, b) => degree[b] - degree[a]);
  if (!ranked.length) return 'none, because no internal imports were found';
  return ranked[0] + ' with ' + degree[ranked[0]] + ' connections';
}

/**
 * Reads a ZIP archive and turns it into a CodeArchi project model:
 * files, dependency graph, detected stack, risks and a written summary.
 */
export async function analyzeZip(file) {
  const { entries } = await readZipArchive(file);

  const fileEntries = entries.filter((entry) => !entry.isDirectory && entry.path);
  const strippedPaths = stripCommonRoot(fileEntries.map((entry) => entry.path));

  const pathByEntry = new Map();
  fileEntries.forEach((entry, index) => {
    pathByEntry.set(entry, normalizePath(strippedPaths[index]));
  });

  const kept = [];
  let skipped = 0;

  fileEntries.forEach((entry) => {
    const path = pathByEntry.get(entry);
    const segments = path.split('/');
    if (segments.some((segment) => IGNORED_DIRS.has(segment))) {
      skipped++;
      return;
    }
    if (kept.length >= MAX_FILES) {
      skipped++;
      return;
    }
    kept.push(entry);
  });

  const pathSet = new Set(kept.map((entry) => pathByEntry.get(entry)));
  const suffixIndex = buildSuffixIndex(pathSet);

  const files = [];
  const offFiles = {};
  const manifests = [];
  const langByPath = new Map();
  let totalBytes = 0;
  let readBytes = 0;
  let readme = '';
  let readmeExcerpt = '';

  for (const entry of kept) {
    const cleanPath = pathByEntry.get(entry);
    if (!cleanPath) continue;

    totalBytes += entry.size;
    const lang = detectLanguage(cleanPath);
    const binary = isBinaryPath(cleanPath);

    if (binary) {
      offFiles[cleanPath] = { note: 'Binary file, listed but not read', size: entry.size };
      continue;
    }

    if (entry.size > MAX_TEXT_BYTES) {
      offFiles[cleanPath] = { note: 'Too large to analyse', size: entry.size };
      continue;
    }

    if (readBytes + entry.size > MAX_TOTAL_TEXT_BYTES) {
      offFiles[cleanPath] = { note: 'Archive read limit reached', size: entry.size };
      continue;
    }

    let content;
    try {
      content = await entry.readText();
    } catch {
      offFiles[cleanPath] = { note: 'Could not be decompressed', size: entry.size };
      continue;
    }

    if (isProbablyBinary(content.slice(0, 2048))) {
      offFiles[cleanPath] = { note: 'Binary content', size: entry.size };
      continue;
    }

    readBytes += entry.size;

    const lines = content.split('\n');
    const file = {
      path: cleanPath,
      lang: lang || 'Text',
      size: entry.size,
      content,
      lines: lines.length > MAX_LINES ? lines.slice(0, MAX_LINES) : lines
    };

    files.push(file);
    langByPath.set(cleanPath, file.lang);

    const manifest = parseManifest(content, cleanPath);
    if (manifest) manifests.push(manifest);

    if (/readme\.mdx?$/i.test(cleanPath) && !readmeExcerpt) {
      readme = cleanPath;
      readmeExcerpt = content
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/[#*_>`]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 320);
    }
  }

  const ctx = {
    pathSet,
    suffixIndex,
    langOf: (path) => langByPath.get(path) || ''
  };

  const edges = [];
  const edgeSet = new Set();
  const external = new Set();

  files.forEach((file) => {
    if (!isCodeLanguage(file.lang)) return;
    extractImports(file.content, file.lang).forEach((spec) => {
      const resolved = resolveSpecifier(spec, file.path, ctx);
      if (resolved) {
        const key = file.path + '->' + resolved;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push([file.path, resolved]);
        }
        return;
      }
      if (!spec.startsWith('.') && !spec.startsWith('/')) {
        external.add(packageNameOf(spec));
      }
    });
  });

  const signals = detectSignals(files);
  const capabilities = capabilityList(signals);
  const kind = classifyKind(signals, files, manifests);
  const tests = detectTests(files);
  const entryPoints = detectEntryPoints(files, manifests);
  const envVars = detectEnvVars(files);
  const risks = detectRisks(files);

  const nodeManifest = manifests.find((manifest) => manifest.kind === 'node');
  const nodeData = nodeManifest ? nodeManifest.data : {};
  const pythonManifest = manifests.find(
    (manifest) => manifest.kind === 'python' && manifest.data.name
  );

  const projectName =
    nodeData.name ||
    (pythonManifest ? pythonManifest.data.name : '') ||
    cleanProjectName(file.name.replace(/\.zip$/i, ''));

  const description =
    nodeData.description ||
    (pythonManifest ? pythonManifest.data.description : '') ||
    readmeExcerpt.slice(0, 180);

  const sourceFiles = files.filter((item) => isCodeLanguage(item.lang));
  const totalLines = sourceFiles.reduce((sum, item) => sum + item.lines.length, 0);
  const folders = new Set(
    files.map((item) => dirname(item.path)).filter(Boolean)
  );

  const stack = Array.from(
    new Set(
      files
        .map((item) => item.lang)
        .filter((lang) => lang && lang !== 'Text' && lang !== 'JSON' && lang !== 'Markdown')
    )
  );

  const declaredNames = manifests
    .filter((manifest) => manifest.kind === 'node')
    .flatMap((manifest) => Object.keys(manifest.data.dependencies || {}));
  declaredNames.forEach((declared) => {
    const hint = FRAMEWORK_HINTS.find(([key]) => declared === key || declared.startsWith(key + '-'));
    if (hint && !stack.includes(hint[1])) stack.push(hint[1]);
  });

  const stackList = stack.slice(0, 8);

  const headline = projectName + ' looks like a ' + kind + '.';

  const paragraphs = [];
  paragraphs.push(
    description
      ? 'Its manifest or README describes it as: "' + description + '".'
      : 'There is no package manifest or README description, so the shape was inferred from the code itself.'
  );
  paragraphs.push(
    'The archive holds ' +
      files.length +
      ' readable files (' +
      sourceFiles.length +
      ' of them source) inside ' +
      folders.size +
      ' folders, about ' +
      totalLines.toLocaleString() +
      ' lines of code, ' +
      formatBytes(totalBytes) +
      ' in total.'
  );
  if (capabilities.length) {
    paragraphs.push(
      'Reading the code it ' + capabilities.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.'
    );
  }
  paragraphs.push(
    'The code imports ' +
      edges.length +
      ' internal modules' +
      (external.size ? ' and ' + external.size + ' external packages' : '') +
      '. The most connected file is ' +
      mostConnected(edges) +
      ', so a change there travels the furthest.'
  );
  paragraphs.push(
    tests.length
      ? tests.length === 1
        ? 'There is 1 test file, so the project has some automated coverage.'
        : 'There are ' + tests.length + ' test files, so the project has some automated coverage.'
      : 'No test files were found, so this upload has no automated coverage.'
  );

  const facts = [
    ['Type', kind],
    ['Files', files.length + ' readable, ' + Object.keys(offFiles).length + ' listed only'],
    ['Size', formatBytes(totalBytes)],
    ['Code', sourceFiles.length + ' source files, ' + totalLines.toLocaleString() + ' lines'],
    ['Imports', edges.length + ' internal, ' + external.size + ' external'],
    ['Tests', tests.length ? plural(tests.length, 'test file') : 'none found']
  ];

  if (entryPoints.length) facts.push(['Entry points', entryPoints.slice(0, 3).join(', ')]);
  if (envVars.length) facts.push(['Environment', envVars.slice(0, 5).join(', ')]);
  if (risks.length) facts.push(['Risks found', plural(risks.length, 'spot') + ' worth a look']);

  const summary = {
    headline,
    paragraphs,
    facts,
    stack: stackList,
    capabilities,
    entryPoints,
    envVars,
    testCount: tests.length
  };

  return buildProject({
    id: 'upload-' + Date.now(),
    name: projectName,
    source: 'upload',
    files,
    offFiles,
    edges,
    summary,
    risks,
    externalDeps: Array.from(external).sort(),
    readme,
    skipped
  });
}

function cleanProjectName(name) {
  const cleaned = name
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'uploaded project';
}
