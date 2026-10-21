export default function ProjectRisks({ project, onUse }) {
  if (!project || project.source !== 'upload' || !project.risks.length) return null;

  return (
    <div className="res">
      <h3>Spots found in this project</h3>
      <p style={{ color: 'var(--mute)', margin: '0 0 10px' }}>
        These came out of the uploaded code. Send one to the log and the analysis will read that
        exact line.
      </p>
      {project.risks.map((risk, index) => (
        <div key={index} className="hit-row">
          <code>
            {risk.path}:{risk.line}
          </code>
          <span>
            {risk.kind}. {risk.reason}
          </span>
          <button type="button" className="key" onClick={() => onUse(risk)}>
            Send to log
          </button>
        </div>
      ))}
    </div>
  );
}
