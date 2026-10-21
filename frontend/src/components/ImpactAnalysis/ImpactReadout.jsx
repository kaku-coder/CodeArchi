import { useProject } from '../../context/projectContext';
import { shortPath, calculateImpact } from '../../data/projectModel';

export default function ImpactReadout({ activeMap }) {
  const project = useProject();
  const { affectedList, activeKeys } = calculateImpact(project, activeMap);

  if (!activeKeys.length) {
    return (
      <div className="readout" aria-live="polite">
        Flip a switch to light up the connections.
      </div>
    );
  }

  const activeNames = activeKeys.map(shortPath).join(', ');
  const hasImpact = affectedList.length > 0;

  return (
    <div className="readout" aria-live="polite">
      <b>{activeNames}</b>{' '}
      {hasImpact ? (
        <>
          can affect{' '}
          <b>
            {affectedList.length} file{affectedList.length > 1 ? 's' : ''}
          </b>
          :
        </>
      ) : (
        'is not imported by any other file, so a change stays local.'
      )}

      {hasImpact && (
        <div className="chips">
          {affectedList.map((item) => {
            const isDirect = item.depth === 1;
            const viaText = isDirect ? 'direct' : `via ${shortPath(item.via)}`;
            return (
              <span
                key={item.path}
                className={`chip ${isDirect ? 'd' : ''}`}
              >
                {shortPath(item.path)} · {viaText}
              </span>
            );
          })}
        </div>
      )}

      {hasImpact && (
        <span style={{ color: 'var(--mute)' }}>
          Retest:{' '}
          {affectedList
            .slice(0, 3)
            .map((item) => shortPath(item.path))
            .join(', ')}
          {affectedList.length > 3 ? ' and the rest' : ''}.
        </span>
      )}
    </div>
  );
}
