import { Fragment } from 'react';
import { useProject } from '../../context/projectContext';

function groupByDirectory(entries) {
  const groups = [];

  entries.forEach((entry) => {
    const slashIdx = entry.path.lastIndexOf('/');
    const dir = slashIdx > 0 ? entry.path.slice(0, slashIdx + 1) : '/';
    const last = groups[groups.length - 1];

    if (last && last.dir === dir) {
      groups[groups.length - 1] = { dir, items: last.items.concat(entry) };
    } else {
      groups.push({ dir, items: [entry] });
    }
  });

  return groups;
}

export default function FileTree({ selectedFile, onSelectFile }) {
  const project = useProject();

  return (
    <div className="tree" role="list">
      {groupByDirectory(project.fileEntries).map((group) => (
        <Fragment key={group.dir}>
          <div className="dir">{group.dir}</div>
          {group.items.map((entry) => {
            const isCurrent = entry.path === selectedFile;
            const fileName = entry.path.split('/').pop();

            return (
              <button
                key={entry.path}
                type="button"
                className={`file ${entry.off ? 'off' : ''}`}
                data-p={entry.path}
                aria-current={isCurrent}
                onClick={() => onSelectFile(entry.path)}
              >
                {fileName}
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
