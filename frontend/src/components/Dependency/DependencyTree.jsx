import React, { useState } from 'react';
import { useProject } from '../../context/projectContext';
import { shortPath } from '../../data/projectModel';
import BlueprintGraph from './BlueprintGraph';

function collectNodes(project) {
  const nodes = new Set();
  project.edges.forEach(([from, to]) => {
    nodes.add(from);
    nodes.add(to);
  });
  if (project.summary?.entryPoints) {
    project.summary.entryPoints.forEach((p) => nodes.add(p));
  }
  return Array.from(nodes);
}

function buildTree(project) {
  const roots = new Set();
  const entryPoints = project.summary?.entryPoints || [];
  const allFiles = new Set(project.files.map((f) => f.path));

  entryPoints.forEach((ep) => {
    if (allFiles.has(ep)) roots.add(ep);
  });

  if (roots.size === 0) {
    collectNodes(project).forEach((node) => {
      const importers = project.importedBy[node] || [];
      if (importers.length === 0 && project.imports[node]?.length) {
        roots.add(node);
      }
    });
  }

  if (roots.size === 0) {
    collectNodes(project)
      .slice(0, 4)
      .forEach((node) => roots.add(node));
  }

  const tree = [];
  const visited = new Set();

  function walk(current, depth, pathStack) {
    if (depth > 6 || pathStack.includes(current)) return;
    const children = (project.imports[current] || [])
      .filter((child) => !visited.has(child))
      .slice(0, 10);

    children.forEach((child) => visited.add(child));

    tree.push({
      path: current,
      depth,
      children: children.map((child) => child)
    });

    children.forEach((child) => {
      walk(child, depth + 1, [...pathStack, current]);
    });
  }

  Array.from(roots).forEach((root) => {
    visited.add(root);
    const children = (project.imports[root] || []).slice(0, 10);
    children.forEach((c) => visited.add(c));
    tree.push({ path: root, depth: 0, children });
    children.forEach((child) => walk(child, 1, [root]));
  });

  return tree;
}

export default function DependencyTree({ activeMap, onToggleNode }) {
  const project = useProject();
  const [viewMode, setViewMode] = useState('blueprint'); // 'blueprint' | 'list'
  const [expanded, setExpanded] = useState({});
  const [showInstalled, setShowInstalled] = useState(true);

  const tree = buildTree(project);
  const external = project.externalDeps || [];

  const toggle = (path) => {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  return (
    <div className="dtree-wrap">
      {/* View Switcher Tabs: Blueprint Flow Graph vs Classic List */}
      <div className="dtree-view-switcher">
        <button
          type="button"
          className={`view-tab-btn ${viewMode === 'blueprint' ? 'active' : ''}`}
          onClick={() => setViewMode('blueprint')}
        >
          ⚡ Blueprint Flow Graph
        </button>
        <button
          type="button"
          className={`view-tab-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          📋 Classic Tree List
        </button>
      </div>

      {viewMode === 'blueprint' ? (
        <BlueprintGraph activeMap={activeMap} onToggleNode={onToggleNode} />
      ) : (
        <>
          {external.length > 0 && (
            <div className="dtree-panel">
              <div className="dtree-head">
                <span className="tag">
                  <span className="led"></span>Installed Dependencies
                </span>
                <button
                  type="button"
                  className="key"
                  onClick={() => setShowInstalled((v) => !v)}
                >
                  {showInstalled ? 'Collapse' : 'Expand'}
                </button>
              </div>
              <p className="dtree-sub">
                {external.length} external package{external.length > 1 ? 's' : ''} used by this project
              </p>
              {showInstalled && (
                <div className="dtree-pkgs">
                  {external.map((pkg) => (
                    <span key={pkg} className="dtree-pkg">
                      {pkg}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="dtree-panel">
            <div className="dtree-head">
              <span className="tag">
                <span className="led"></span>File Dependency Tree
              </span>
              <span className="cap">
                {project.edges.length} internal link{project.edges.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="dtree-sub">
              Tree view of how files import each other. Click a file to toggle its switch on the board logic.
            </p>

            <div className="dtree-tree">
              {tree.map((node, idx) => {
                const isRoot = node.depth === 0;
                const isActive = !!activeMap?.[node.path];
                const imports = project.imports[node.path] || [];
                const importedBy = project.importedBy[node.path] || [];
                const open = expanded[node.path] !== false;

                return (
                  <div key={node.path + idx} className="dtree-node" style={{ marginLeft: node.depth * 26 }}>
                    <div className="dtree-row">
                      <span className={`dtree-line ${isRoot ? 'root' : ''}`}></span>
                      <button
                        type="button"
                        className={`dtree-toggle ${open ? 'open' : ''}`}
                        onClick={() => toggle(node.path)}
                        aria-label="Toggle imports"
                      >
                        {imports.length > 0 ? (open ? '−' : '+') : '•'}
                      </button>
                      <button
                        type="button"
                        className={`dtree-file ${isActive ? 'active' : ''}`}
                        onClick={() => onToggleNode && onToggleNode(node.path)}
                        title="Toggle on dependency board"
                      >
                        <span className="dtree-dot"></span>
                        <span className="dtree-name">{shortPath(node.path)}</span>
                        <span className="dtree-path">{node.path}</span>
                      </button>
                      <span className="dtree-badges">
                        <span className="dtree-badge">imports: {imports.length}</span>
                        <span className="dtree-badge">used by: {importedBy.length}</span>
                      </span>
                    </div>

                    {open && imports.length > 0 && (
                      <div className="dtree-children">
                        {imports.slice(0, 10).map((child, cidx) => {
                          const childActive = !!activeMap?.[child];
                          const childImports = project.imports[child] || [];

                          return (
                            <div key={child + cidx} className="dtree-child-row" style={{ marginLeft: 18 }}>
                              <span className="dtree-branch"></span>
                              <button
                                type="button"
                                className={`dtree-file small ${childActive ? 'active' : ''}`}
                                onClick={() => onToggleNode && onToggleNode(child)}
                              >
                                <span className="dtree-dot"></span>
                                <span className="dtree-name">{shortPath(child)}</span>
                              </button>
                              {childImports.length > 0 && (
                                <span className="dtree-badge subtle">+{childImports.length} more</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {tree.length === 0 && (
              <div className="dtree-empty">
                <p style={{ color: 'var(--mute)', margin: 0 }}>
                  No internal imports found for this project. Try uploading another ZIP or check the sample.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
