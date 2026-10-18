import React from 'react';
import CircuitBoard from '../Common/CircuitBoard';
import ImpactReadout from './ImpactReadout';

export default function ImpactAnalysis({
  activeMap,
  onToggleNode,
  boardRef,
  isSlide = false
}) {
  const content = (
    <>
      <div>
        <span className="tag">
          <span className="led"></span>Change Impact Analysis
        </span>
        <h2>Know what a change can reach.</h2>
        <p>
          Flip the switch of a file you plan to edit. Using the detected dependency relationships, CodeArchi shows which modules may be affected.
        </p>
        <ul>
          <li>Direct importers are marked separately from indirect ones.</li>
          <li>Results come from detected imports only, so dynamic loading may be missed.</li>
          <li>Use the list to decide what to retest.</li>
        </ul>
      </div>
      <div className="panel unit">
        <CircuitBoard
          ref={boardRef}
          id="g2"
          mode="impact"
          activeMap={activeMap}
          onToggleNode={onToggleNode}
        />
        <ImpactReadout activeMap={activeMap} />
      </div>
    </>
  );

  if (isSlide) {
    return <div className="feat">{content}</div>;
  }

  return (
    <section className="mod" id="impact">
      {content}
    </section>
  );
}
