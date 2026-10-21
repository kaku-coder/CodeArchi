export default function ProjectSummary({ project, onNavigate, onReset }) {
  if (!project || !project.summary) return null;

  const summary = project.summary;
  const isUpload = project.source === 'upload';

  return (
    <div className="psum">
      <div className="psum-head">
        <span className="tag">
          <span className="led"></span>
          {isUpload ? 'Your project' : 'Sample project'}
        </span>
        <h2>{summary.headline}</h2>
        {isUpload && (
          <button type="button" className="key" onClick={onReset}>
            Back to sample project
          </button>
        )}
      </div>

      <div className="psum-body">
        {summary.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}

        {summary.capabilities && summary.capabilities.length > 0 && (
          <div className="chips">
            {summary.capabilities.map((capability) => (
              <span key={capability} className="chip d">
                {capability}
              </span>
            ))}
          </div>
        )}

        {summary.stack && summary.stack.length > 0 && (
          <div className="chips">
            {summary.stack.map((item) => (
              <span key={item} className="chip">
                {item}
              </span>
            ))}
          </div>
        )}

        <div className="psum-facts">
          {summary.facts.map(([label, value]) => (
            <div key={label} className="fact">
              <span className="fact-k">{label}</span>
              <span className="fact-v">{value}</span>
            </div>
          ))}
        </div>

        {isUpload && project.risks.length > 0 && (
          <>
            <h3>Spots worth a look</h3>
            <div className="res">
              {project.risks.slice(0, 5).map((risk, index) => (
                <div key={index} className="hit-row">
                  <code>
                    {risk.path}:{risk.line}
                  </code>
                  <span>
                    {risk.kind}. {risk.reason}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {isUpload && project.externalDeps.length > 0 && (
          <p className="cap">
            External packages used: {project.externalDeps.slice(0, 14).join(', ')}
            {project.externalDeps.length > 14 ? ' ...' : ''}
          </p>
        )}

        {isUpload && project.skipped > 0 && (
          <p className="cap">
            {project.skipped} file(s) were skipped, for example build output, dependencies or
            binary assets.
          </p>
        )}

        <div className="row">
          <button type="button" className="key" onClick={() => onNavigate('deps')}>
            Map dependencies
          </button>
          <button type="button" className="key" onClick={() => onNavigate('failure')}>
            Trace a failure
          </button>
          <button type="button" className="key" onClick={() => onNavigate('impact')}>
            Blast radius
          </button>
          <button type="button" className="key" onClick={() => onNavigate('insights')}>
            AI insights
          </button>
        </div>
      </div>
    </div>
  );
}
