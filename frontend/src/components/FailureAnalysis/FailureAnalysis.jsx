import React from 'react';
import PresetSelector from './PresetSelector';
import AnalysisResult from './AnalysisResult';

export default function FailureAnalysis({
  errorLog,
  onChangeLog,
  onAnalyze,
  activePresetIndex,
  onSelectPreset,
  analysisResult,
  isSlide = false
}) {
  const content = (
    <>
      <div>
        <span className="tag">
          <span className="led"></span>Failure Analysis
        </span>
        <h2>Paste an error. Get a place to start.</h2>
        <p>
          Give CodeArchi an error message or log. It finds the files named in the trace, ranks them, and proposes causes and steps to check.
        </p>
        <ul>
          <li>Reads stack frames and error types.</li>
          <li>Ranks the most relevant files with a reason.</li>
          <li>Lists possible causes and investigation steps in order.</li>
        </ul>
      </div>
      <div className="panel unit">
        <PresetSelector
          activePresetIndex={activePresetIndex}
          onSelectPreset={onSelectPreset}
        />
        <textarea
          id="log"
          aria-label="Error log"
          value={errorLog}
          onChange={(e) => onChangeLog(e.target.value)}
        />
        <button
          type="button"
          className="key hot"
          id="go"
          onClick={() => onAnalyze()}
        >
          Analyze
        </button>
        <AnalysisResult result={analysisResult} />
      </div>
    </>
  );

  if (isSlide) {
    return <div className="feat">{content}</div>;
  }

  return (
    <section className="mod" id="failure">
      {content}
    </section>
  );
}
