import { useMemo, useState } from 'react';
import { useProject } from '../../context/projectContext';
import { importsOf, importedByOf } from '../../data/projectModel';
import CodeViewer from './CodeViewer';

const LANG_COLORS = {
  TypeScript: '#38bdf8',
  JavaScript: '#fbbf24',
  Python: '#4ade80',
  Ruby: '#fb7185',
  Go: '#22d3ee',
  Rust: '#fb923c',
  Java: '#f87171',
  Kotlin: '#c084fc',
  'C#': '#a78bfa',
  PHP: '#818cf8',
  Swift: '#f97316',
  C: '#94a3b8',
  'C++': '#60a5fa',
  JSON: '#facc15',
  Markdown: '#cbd5e1',
  HTML: '#fb923c',
  CSS: '#38bdf8'
};

function normalize(path) {
  return String(path || '').replace(/\\/g, '/');
}

function buildTree(entries) {
  const root = {
    type: 'dir',
    name: '',
    path: '',
    children: new Map(),
    files: []
  };

  entries.forEach((entry) => {
    const parts = normalize(entry.path).split('/').filter(Boolean);
    if (!parts.length) return;

    let node = root;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const name = parts[i];
      const path = parts.slice(0, i + 1).join('/');
      if (!node.children.has(name)) {
        node.children.set(name, {
          type: 'dir',
          name,
          path,
          children: new Map(),
          files: []
        });
      }
      node = node.children.get(name);
    }

    node.files.push({
      ...entry,
      type: 'file',
      name: parts[parts.length - 1],
      path: normalize(entry.path)
    });
  });

  attachStats(root);
  return root;
}

function attachStats(node) {
  let files = 0;
  let readable = 0;
  let bytes = 0;

  node.files.forEach((file) => {
    files += 1;
    if (!file.off) readable += 1;
    bytes += file.size || 0;
  });

  node.children.forEach((child) => {
    const stats = attachStats(child);
    files += stats.files;
    readable += stats.readable;
    bytes += stats.bytes;
  });

  node.stats = { files, readable, bytes };
  return node.stats;
}

function filterTree(node, query) {
  if (!query) return node;

  if (node.name && node.name.toLowerCase().includes(query)) {
    return node;
  }

  const children = new Map();
  node.children.forEach((child, name) => {
    const match = filterTree(child, query);
    if (match) children.set(name, match);
  });

  const files = node.files.filter(
    (file) =>
      file.name.toLowerCase().includes(query) || file.path.toLowerCase().includes(query)
  );

  if (!children.size && !files.length) return null;

  return { ...node, children, files };
}

function collectDirPaths(node, list) {
  node.children.forEach((child) => {
    list.push(child.path);
    collectDirPaths(child, list);
  });
  return list;
}

function firstFilePath(node) {
  const files = [...node.files].sort((a, b) => a.path.localeCompare(b.path));
  if (files.length) return files[0].path;
  const children = [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const child of children) {
    const found = firstFilePath(child);
    if (found) return found;
  }
  return null;
}

function toneOf(name) {
  const value = name.toLowerCase();
  if (/front|client|web|ui|app/.test(value)) return 'front';
  if (/back|server|api|service/.test(value)) return 'back';
  if (/shared|common|lib|utils|packages/.test(value)) return 'shared';
  if (/test|spec|e2e/.test(value)) return 'test';
  return 'plain';
}

function FileRow({ entry, depth, isActive, onSelectFile }) {
  return (
    <button
      type="button"
      className={`pm-row pm-file-row ${isActive ? 'is-active' : ''} ${entry.off ? 'is-off' : ''}`}
      style={{ paddingLeft: 12 + (depth + 1) * 16 }}
      onClick={() => onSelectFile(entry.path)}
      title={entry.path}
    >
      <span
        className="pm-file-dot"
        style={{ background: LANG_COLORS[entry.lang] || '#94a3b8' }}
      />
      <span className="pm-name">{entry.name}</span>
      {entry.off ? (
        <span className="pm-tag">listed</span>
      ) : (
        <span className="pm-count">{entry.lang || 'Text'}</span>
      )}
    </button>
  );
}

function FolderBranch({
  node,
  depth,
  expanded,
  collapsedTop,
  query,
  selectedFile,
  onSelectFile,
  onToggleFolder
}) {
  const children = [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name));
  const files = [...node.files].sort((a, b) => a.path.localeCompare(b.path));
  const isTop = depth === 0;
  const isOpen = query ? true : isTop ? !collapsedTop.has(node.path) : expanded.has(node.path);
  const hasContent = children.length > 0 || files.length > 0;

  return (
    <div className="pm-branch">
      <button
        type="button"
        className={`pm-row pm-folder-row pm-tone-${toneOf(node.name)} ${isOpen ? 'is-open' : ''}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        onClick={() => onToggleFolder(node.path, isTop)}
        aria-expanded={isOpen}
        title={node.path}
      >
        <span className={`pm-chevron ${isOpen ? 'open' : ''}`} />
        <span className="pm-folder-icon" />
        <span className="pm-name">{node.name}</span>
        <span className="pm-count">
          {node.stats.files} {node.stats.files === 1 ? 'file' : 'files'}
        </span>
      </button>

      {isOpen && hasContent && (
        <div className="pm-children">
          {children.map((child) => (
            <FolderBranch
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              collapsedTop={collapsedTop}
              query={query}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              onToggleFolder={onToggleFolder}
            />
          ))}
          {files.map((file) => (
            <FileRow
              key={file.path}
              entry={file}
              depth={depth}
              isActive={file.path === selectedFile}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LinkChips({ label, paths, onSelectFile }) {
  if (!paths.length) {
    return (
      <div className="pm-link-group">
        <span className="pm-link-label">{label}</span>
        <span className="pm-link-empty">none</span>
      </div>
    );
  }

  return (
    <div className="pm-link-group">
      <span className="pm-link-label">{label}</span>
      <div className="pm-link-chips">
        {paths.slice(0, 14).map((path) => (
          <button
            key={path}
            type="button"
            className="pm-link-chip"
            onClick={() => onSelectFile(path)}
            title={path}
          >
            {path.split('/').pop()}
          </button>
        ))}
        {paths.length > 14 && <span className="pm-link-empty">+{paths.length - 14} more</span>}
      </div>
    </div>
  );
}

export default function ProjectMap({
  selectedFile,
  onSelectFile,
  onUpdateFileCode,
  compact = false
}) {
  const project = useProject();
  const [expanded, setExpanded] = useState(() => new Set());
  const [collapsedTop, setCollapsedTop] = useState(() => new Set());
  const [query, setQuery] = useState('');

  const tree = useMemo(() => buildTree(project.fileEntries), [project.fileEntries]);
  const allDirPaths = useMemo(() => collectDirPaths(tree, []), [tree]);
  const rootFolders = useMemo(
    () => [...tree.children.values()].sort((a, b) => a.name.localeCompare(b.name)),
    [tree]
  );
  const normalizedQuery = query.trim().toLowerCase();
  const visibleTree = useMemo(
    () => filterTree(tree, normalizedQuery),
    [tree, normalizedQuery]
  );

  const selectedEntry = project.fileEntries.find((entry) => entry.path === selectedFile);
  const selectedFileData = project.byPath[selectedFile];
  const imports = selectedFile ? importsOf(project, selectedFile) : [];
  const importedBy = selectedFile ? importedByOf(project, selectedFile) : [];

  const toggleFolder = (path, isTop) => {
    if (isTop) {
      setCollapsedTop((prev) => {
        const next = new Set(prev);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        return next;
      });
      return;
    }

    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const expandAll = () => {
    setExpanded(new Set(allDirPaths));
    setCollapsedTop(new Set());
  };

  const collapseAll = () => {
    setExpanded(new Set());
    setCollapsedTop(new Set(rootFolders.map((folder) => folder.path)));
  };

  const visibleRootFolders = visibleTree
    ? [...visibleTree.children.values()].sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const visibleRootFiles = visibleTree
    ? [...visibleTree.files].sort((a, b) => a.path.localeCompare(b.path))
    : [];

  const firstSelectableFolder = rootFolders.find((folder) => firstFilePath(folder));

  return (
    <div className={`project-map ${compact ? 'is-compact' : ''}`}>
      <aside className="pm-sidebar">
        <div className="pm-head">
          <div className="pm-title-row">
            <div>
              <span className="pm-eyebrow">Workspace</span>
              <h3 className="pm-title">{project.name}</h3>
            </div>
            <span className="pm-total">{project.fileEntries.length} files</span>
          </div>

          <div className="pm-roots" aria-label="Top level folders">
            {rootFolders.length ? (
              rootFolders.map((folder) => (
                <span key={folder.path} className={`pm-root-chip pm-tone-${toneOf(folder.name)}`}>
                  <span className="pm-root-dot" />
                  {folder.name}
                </span>
              ))
            ) : (
              <span className="pm-root-chip">root files only</span>
            )}
          </div>

          {rootFolders.length === 1 && (
            <p className="pm-note">
              Only one top-level folder was found. If your project also has a frontend or backend,
              upload the parent folder or the whole repository ZIP.
            </p>
          )}

          <input
            type="search"
            className="pm-search"
            placeholder="Search a file or folder..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search files and folders"
          />

          <div className="pm-controls">
            <button type="button" className="key pm-mini" onClick={expandAll}>
              Expand all
            </button>
            <button type="button" className="key pm-mini" onClick={collapseAll}>
              Collapse all
            </button>
          </div>
        </div>

        <div className="pm-tree">
          {visibleRootFolders.map((folder) => (
            <FolderBranch
              key={folder.path}
              node={folder}
              depth={0}
              expanded={expanded}
              collapsedTop={collapsedTop}
              query={normalizedQuery}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              onToggleFolder={toggleFolder}
            />
          ))}

          {visibleRootFiles.map((file) => (
            <FileRow
              key={file.path}
              entry={file}
              depth={-1}
              isActive={file.path === selectedFile}
              onSelectFile={onSelectFile}
            />
          ))}

          {!visibleRootFolders.length && !visibleRootFiles.length && (
            <div className="pm-tree-empty">
              <p>No file or folder matches “{query}”.</p>
              <button type="button" className="key" onClick={() => setQuery('')}>
                Clear search
              </button>
            </div>
          )}
        </div>
      </aside>

      <section className="pm-main">
        {selectedFile ? (
          <div className="pm-detail">
            <div className="pm-detail-head">
              <div>
                <span className="pm-eyebrow">Selected file</span>
                <h3 className="pm-file-title">{selectedFile}</h3>
              </div>
              <div className="pm-file-badges">
                {selectedEntry && <span className="pm-badge">{selectedEntry.lang || 'Text'}</span>}
                {selectedFileData && (
                  <span className="pm-badge">
                    {selectedFileData.lines?.length || 0} lines
                  </span>
                )}
                {selectedEntry?.off && <span className="pm-badge is-off">listed only</span>}
              </div>
            </div>

            <div className="pm-links">
              <LinkChips label="Imports" paths={imports} onSelectFile={onSelectFile} />
              <LinkChips label="Used by" paths={importedBy} onSelectFile={onSelectFile} />
            </div>
          </div>
        ) : (
          <div className="pm-detail pm-empty">
            <span className="pm-eyebrow">Start here</span>
            <h3>Choose a file to read it.</h3>
            <p>
              Top-level folders are open by default, so both <b>frontend</b> and <b>backend</b>{' '}
              appear together. Click a folder to expand it, then click any file to see its code and
              its imports in large, readable text.
            </p>
            <div className="pm-empty-actions">
              {firstSelectableFolder && (
                <button
                  type="button"
                  className="key hot"
                  onClick={() => onSelectFile(firstFilePath(firstSelectableFolder))}
                >
                  Open first file in {firstSelectableFolder.name}
                </button>
              )}
              <button type="button" className="key" onClick={expandAll}>
                Show every folder
              </button>
            </div>
          </div>
        )}

        <div className="pm-code">
          <CodeViewer selectedFile={selectedFile} onUpdateFileCode={onUpdateFileCode} />
        </div>
      </section>
    </div>
  );
}
