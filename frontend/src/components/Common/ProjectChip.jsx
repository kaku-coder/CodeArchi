export default function ProjectChip({ project, onChange }) {
  if (!project) return null;

  return (
    <div className="pchip">
      <span className="led"></span>
      <b>{project.name}</b>
      <span className="badge">{project.source === 'upload' ? 'Your upload' : 'Sample'}</span>
      <span className="cap">
        {project.fileEntries.length} files · {project.edges.length} internal links
      </span>
      {onChange && (
        <button type="button" className="key" onClick={onChange}>
          Change project
        </button>
      )}
    </div>
  );
}
