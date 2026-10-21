import React from 'react';
import FileTree from './FileTree';
import CodeViewer from './CodeViewer';

export default function CodeExplorer({ selectedFile, onSelectFile, isSlide = false }) {
  const content = (
    <>
      <div>
        <span className="tag">
          <span className="led"></span>Codebase Explorer
        </span>
        <h2>Open any project and see what is inside.</h2>
        <p>
          Upload a ZIP or connect a supported repository. CodeArchi lists every file and folder, marks which ones it can read, and lets you view the content.
        </p>
        <ul>
          <li>Browse folders and files in a tree.</li>
          <li>Source files it supports are identified by language.</li>
          <li>Files it cannot analyze, like images, are marked clearly.</li>
        </ul>
      </div>
      <div className="panel unit">
        <div className="explorer">
          <FileTree selectedFile={selectedFile} onSelectFile={onSelectFile} />
          <CodeViewer selectedFile={selectedFile} />
        </div>
      </div>
    </>
  );

  if (isSlide) {
    return <div className="feat">{content}</div>;
  }

  return (
    <section className="mod" id="explorer">
      {content}
    </section>
  );
}
