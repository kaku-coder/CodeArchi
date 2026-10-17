import CircuitBoard from '../Common/CircuitBoard';
import DependencyReadout from './DependencyReadout';

export default function DependencyIntelligence({
  activeMap,
  onToggleNode,
  boardRef,
  isSlide = false
}) {
  const activeKeys = Object.keys(activeMap).filter((k) => activeMap[k]);

  const content = (
    <>
      <div>
        <span className="tag">
          <span className="led"></span>Dependency Intelligence
        </span>
        <h2>See how files connect.</h2>
        <p>
          Imports and other supported code relationships are drawn as a graph. Flip a file’s switch to light up the modules it connects to.
        </p>
        <ul>
          <li>Switch a file on and its wires start to glow.</li>
          <li>Orange wires: files it imports. Green wires: files that import it.</li>
          <li>Switch on several files to compare their connections.</li>
        </ul>
      </div>
      <div className="panel unit">
        <CircuitBoard
          ref={boardRef}
          id="g1"
          mode="deps"
          activeMap={activeMap}
          onToggleNode={onToggleNode}
        />
        <DependencyReadout activeKeys={activeKeys} />
      </div>
    </>
  );

  if (isSlide) {
    return <div className="feat">{content}</div>;
  }

  return (
    <section className="mod" id="deps">
      {content}
    </section>
  );
}
