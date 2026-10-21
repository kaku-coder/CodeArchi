import { useMemo, useState } from 'react';
import { useProject } from '../../context/projectContext';

function buildTree(entries) {
  const root = {
    type: 'dir',
    name: 'root',
    path: '',
    children: new Map(),
    files: []
  };

  entries.forEach((entry) => {
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
          files: []
        });
      }
      current = current.children.get(part);
    }
    current.files.push(entry);
  });

  return root;
}

function TreeNode({ node, depth = 0, selectedFile, onSelectFile, expanded, toggle }) {
  const isRoot = node.path === '';
  const isOpen = isRoot || expanded.has(node.path);
  const hasDirChildren = node.children && node.children.size > 0;
  const hasFiles = node.files && node.files.length > 0;
  const hasAny = hasDirChildren || hasFiles;

  if (isRoot) {
    return (
      <>
        {[...node.children.values()]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={0}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              expanded={expanded}
              toggle={toggle}
            />
          ))}
      </>
    );
  }

  return (
    <div className="ftree-group">
      <button
        type="button"
        className="ftree-dir"
        style={{ paddingLeft: depth * 16 + 10 }}
        onClick={() => toggle(node.path)}
        aria-expanded={isOpen}
      >
        <span className={`ftree-arrow ${isOpen ? 'open' : ''}`}>
          {hasAny ? '▸' : '•'}
        </span>
        <span className="ftree-folder">📁</span>
        <span className="ftree-dirname">{node.name}</span>
        <span className="ftree-count">
          {(node.children.size + node.files.length)}
        </span>
      </button>

      {isOpen && hasAny && (
        <div className="ftree-branch">
          {[...node.children.values()]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                expanded={expanded}
                toggle={toggle}
              />
            ))}

          {[...node.files]
            .sort((a, b) => a.path.localeCompare(b.path))
            .map((fileEntry) => {
              const fileName = fileEntry.path.split('/').pop();
              const isActive = fileEntry.path === selectedFile;

              return (
                <button
                  key={fileEntry.path}
                  type="button"
                  className={`ftree-file ${fileEntry.off ? 'off' : ''} ${isActive ? 'active' : ''}`}
                  style={{ paddingLeft: (depth + 1) * 16 + 26 }}
                  onClick={() => onSelectFile(fileEntry.path)}
                  title={fileEntry.path}
                >
                  <span className="ftree-fileicon">📄</span>
                  <span className="ftree-filename">{fileName}</span>
                  {fileEntry.off && <span className="ftree-tag">bin</span>}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ selectedFile, onSelectFile }) {
  const project = useProject();
  const [expanded, setExpanded] = useState(() => new Set());

  const tree = useMemo(() => buildTree(project.fileEntries), [project.fileEntries]);

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

  return (
    <div className="ftree" role="tree">
      <div className="ftree-header">
        <span className="tag">
          <span className="led"></span>
          Project Files
        </span>
        <span className="cap">{project.fileEntries.length} items</span>
      </div>
      <div className="ftree-body">
        <TreeNode
          node={tree}
          depth={-1}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          expanded={expanded}
          toggle={toggle}
        />
      </div>
    </div>
  );
}
