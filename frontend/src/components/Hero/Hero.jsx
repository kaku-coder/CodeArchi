import React from 'react';

export default function Hero({ onExplore, onAnalyze }) {
  return (
    <section className="hero">
      <div>
        <h1>Read the codebase. Trace the failure.</h1>
        <p className="lead">
          CodeArchi maps your source code, follows errors back to the files behind them, and shows what a change can reach. Every AI answer comes with its evidence and its doubts.
        </p>
        <div className="row">
          <button
            type="button"
            className="key hot"
            onClick={() => onExplore?.()}
          >
            Explore sample project
          </button>
          <button
            type="button"
            className="key"
            onClick={() => onAnalyze?.()}
          >
            Analyze an error
          </button>
        </div>
      </div>
      <div className="unit" aria-label="Sample project summary">
        <div className="lcd">
          <div className="cells">
            <div className="brandlcd">
              <div className="big nm">CodeArchi</div>
              <div className="cap">Codebase intelligence and failure analysis</div>
            </div>
          </div>
        </div>
        <div className="vent"></div>
      </div>
    </section>
  );
}
