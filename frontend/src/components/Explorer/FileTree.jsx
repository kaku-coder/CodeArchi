import React from 'react';
import { ALL_FILES, OFF_FILES } from '../../data/codebaseData';

export default function FileTree({ selectedFile, onSelectFile }) {
  let lastDir = '';

  return (
    <div className="tree" role="list">
      {ALL_FILES.map((p) => {
        const slashIdx = p.lastIndexOf('/');
        const dir = slashIdx > 0 ? p.slice(0, slashIdx + 1) : '/';
        const showDirHeader = dir !== lastDir;
        if (showDirHeader) {
          lastDir = dir;
        }

        const isOff = !!OFF_FILES[p];
        const isCurrent = p === selectedFile;
        const fileName = p.split('/').pop();

        return (
          <React.Fragment key={p}>
            {showDirHeader && <div className="dir">{dir}</div>}
            <button
              type="button"
              className={`file ${isOff ? 'off' : ''}`}
              data-p={p}
              aria-current={isCurrent}
              onClick={() => onSelectFile(p)}
            >
              {fileName}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
