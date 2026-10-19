
export default function AiInsights({ result, isSlide = false }) {
  const content = (
    <>
      <div>
        <span className="tag">
          <span className="led"></span>AI Insights and Test Suggestions
        </span>
        <h2>Explanations that show their work.</h2>
        <p>
          For the error analyzed above, the insight below cites the code it relied on, states how confident it is, and says what it could not see.
        </p>
        <ul>
          <li>Evidence: the exact lines behind each claim.</li>
          <li>Uncertainty: what is unknown and how it limits the answer.</li>
          <li>Tests: concrete checks tied to the files involved.</li>
        </ul>
      </div>
      <div className="panel unit">
        <div className="res">
          {!result ? (
            <p style={{ color: 'var(--mute)' }}>
              No known file path or error type found. Paste a trace that includes paths, such as src/utils/format.ts:12.
            </p>
          ) : (
            <>
              <p style={{ margin: 0, color: 'var(--ink)' }}>{result.why}</p>

              <h3>Confidence</h3>
              <div className="meter" aria-hidden="true">
                {[...Array(10)].map((_, i) => (
                  <i key={i} className={i < result.conf ? 'on' : ''} />
                ))}
              </div>
              <span className="cap">
                {result.conf * 10} percent, based on the visible code and log
              </span>

              <h3>Evidence</h3>
              {result.ev.map(([file, line, codeSnippet], idx) => (
                <div key={idx} className="ev">
                  <code>
                    {file}:{line}
                  </code>
                  <q>{codeSnippet}</q>
                </div>
              ))}

              <div className="warn">
                <b>What we cannot see.</b> {result.unk}
              </div>

              <h3>Suggested tests</h3>
              <ul>
                {result.tests.map((test, idx) => (
                  <li key={idx}>{test}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );

  if (isSlide) {
    return <div className="feat">{content}</div>;
  }

  return (
    <section className="mod" id="insights">
      {content}
    </section>
  );
}
