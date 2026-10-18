import React from 'react';
import { FAILURE_PRESETS } from '../../data/failurePresets';

export default function PresetSelector({ activePresetIndex, onSelectPreset }) {
  return (
    <div className="row" style={{ gap: '10px' }}>
      {FAILURE_PRESETS.map((preset, idx) => {
        const isPressed = activePresetIndex === idx;
        return (
          <button
            key={preset.n}
            type="button"
            className="key"
            aria-pressed={isPressed}
            onClick={() => onSelectPreset(idx)}
          >
            {preset.n}
          </button>
        );
      })}
    </div>
  );
}
