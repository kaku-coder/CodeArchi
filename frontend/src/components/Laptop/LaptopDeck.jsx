import React, { useState, useEffect } from 'react';
import Trackpad from './Trackpad';
import { playKeyClickSound } from '../../utils/soundEffects';

const KEY_ROWS = [
  ['Esc', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', '⏻'],
  ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '|'],
  ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", '\u2191', 'Enter'],
  ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', '\u2190', '\u2193', '\u2192']
];

const KEY_LABELS = {
  1: 'Explorer',
  2: 'Dependencies',
  3: 'Failures',
  4: 'Impact',
  5: 'AI insights',
  '⏻': 'Power / Shutdown'
};

export default function LaptopDeck({
  currentSlide,
  onNavigateSlide,
  onEscape,
  onTrackpadMove,
  onTrackpadClick,
  isPoweredOff = false,
  onTogglePower
}) {
  const [pressedKey, setPressedKey] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || /INPUT|TEXTAREA/.test(e.target.tagName)) return;

      playKeyClickSound('key');

      if (/^[1-5]$/.test(e.key)) {
        const n = +e.key - 1;
        onNavigateSlide?.(n);
        setPressedKey(e.key);
        setTimeout(() => setPressedKey(null), 150);
      } else if (e.key === 'ArrowLeft') {
        onNavigateSlide?.(Math.max(0, currentSlide - 1));
        setPressedKey('←');
        setTimeout(() => setPressedKey(null), 150);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        onNavigateSlide?.(Math.min(4, currentSlide + 1));
        setPressedKey('→');
        setTimeout(() => setPressedKey(null), 150);
      } else if (e.key === 'Escape') {
        onEscape?.();
        setPressedKey('Esc');
        setTimeout(() => setPressedKey(null), 150);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, onNavigateSlide, onEscape]);

  const handleKeyClick = (keyText) => {
    if (keyText === '⏻') {
      playKeyClickSound(isPoweredOff ? 'power-on' : 'power-off');
      onTogglePower?.();
      return;
    }

    // Any other key plays tactile switch click
    playKeyClickSound('key');

    // If powered off, pressing any key boots system up
    if (isPoweredOff) {
      onTogglePower?.();
      return;
    }

    if (/^[1-5]$/.test(keyText)) {
      onNavigateSlide?.(+keyText - 1);
    } else if (keyText === '\u2190') {
      onNavigateSlide?.(Math.max(0, currentSlide - 1));
    } else if (keyText === '\u2192' || keyText === 'Enter') {
      onNavigateSlide?.(Math.min(4, currentSlide + 1));
    } else if (keyText === 'Esc') {
      onEscape?.();
    }
  };

  return (
    <div className="deck">
      {/* Power LED Indicator */}
      <div
        className={`dled ${isPoweredOff ? 'off' : ''}`}
        title={isPoweredOff ? 'System Offline' : 'System Active'}
      ></div>

      <div className="keys" id="keys">
        {KEY_ROWS.flat().map((keyText, idx) => {
          const isPowerBtn = keyText === '⏻';
          const num = /^[1-5]$/.test(keyText) ? +keyText - 1 : -1;
          const isFunctional =
            isPowerBtn ||
            num >= 0 ||
            keyText === '\u2190' ||
            keyText === '\u2192' ||
            keyText === 'Enter' ||
            keyText === 'Esc';
          const isCur = num >= 0 && num === currentSlide && !isPoweredOff;
          const isPressed = pressedKey === keyText;

          let btnClass = 'k';
          if (isFunctional) btnClass += ' f';
          if (isCur) btnClass += ' cur';
          if (isPressed) btnClass += ' p';
          if (isPowerBtn) btnClass += ` pwr ${isPoweredOff ? 'off' : 'on'}`;

          return (
            <button
              key={idx}
              type="button"
              className={btnClass}
              tabIndex={isFunctional ? 0 : -1}
              aria-label={KEY_LABELS[keyText] || (num >= 0 ? KEY_LABELS[num + 1] : keyText)}
              title={isPowerBtn ? (isPoweredOff ? 'Turn ON Laptop' : 'Shut Down Laptop') : undefined}
              onClick={() => handleKeyClick(keyText)}
            >
              {keyText}
            </button>
          );
        })}
      </div>
      <Trackpad
        onPointerMove={onTrackpadMove}
        onPointerClick={onTrackpadClick}
      />
    </div>
  );
}
