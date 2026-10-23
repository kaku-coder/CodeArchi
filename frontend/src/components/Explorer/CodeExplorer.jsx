import ProjectMap from './ProjectMap';

export default function CodeExplorer({ selectedFile, onSelectFile, isSlide = false }) {
  const content = (
    <>
      <div>
        <span className="tag">
          <span className="led"></span>Codebase Explorer
        </span>
        <h2>Open any project and see what is inside.</h2>
        <p>
          Upload a ZIP or connect a supported repository. Every top-level folder is visible at
          once, and files open in large, readable text.
        </p>
        <ul>
          <li>Folders are open at the top level, so frontend and backend both show.</li>
          <li>Search any file or folder by name.</li>
          <li>Select a file to read its code and see its imports.</li>
        </ul>
      </div>
      <div className="panel unit">
        <ProjectMap
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          compact
        />
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
