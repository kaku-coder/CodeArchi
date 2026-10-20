import React, { useRef, useState } from 'react';

export default function Trackpad({ onPointerMove, onPointerClick }) {
  const [isDown, setIsDown] = useState(false);
  const padRef = useRef(null);

  const handlePointerMove = (e) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const px = Math.max(0, Math.min(1, offsetX / rect.width));
    const py = Math.max(0, Math.min(1, offsetY / rect.height));
    onPointerMove?.(px, py);
  };

  const handlePointerDown = (e) => {
    handlePointerMove(e);
    setIsDown(true);
    onPointerClick?.();
  };

  const handlePointerUp = () => {
    setIsDown(false);
  };

  return (
    <div
      ref={padRef}
      className={`pad ${isDown ? 'dn' : ''}`}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
