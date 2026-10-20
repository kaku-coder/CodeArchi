import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import CodeExplorer from '../Explorer/CodeExplorer';
import DependencyIntelligence from '../Dependency/DependencyIntelligence';
import FailureAnalysis from '../FailureAnalysis/FailureAnalysis';
import ImpactAnalysis from '../ImpactAnalysis/ImpactAnalysis';
import AiInsights from '../AiInsights/AiInsights';

const LaptopScreen = forwardRef(function LaptopScreen(
  {
    activeSlideIndex, // 0 is Boot, 1 is Explorer, 2 is Deps, 3 is Failure, 4 is Impact, 5 is Insights
    selectedFile,
    onSelectFile,
    depsActive,
    onToggleDepNode,
    impactActive,
    onToggleImpactNode,
    errorLog,
    onChangeErrorLog,
    onAnalyzeError,
    activePresetIndex,
    onSelectPreset,
    analysisResult,
    depsBoardRef,
    impactBoardRef,
    ptrCoords,
    showPtr,
    onOpenFullView,
    onClose,
    onMinimize,
    onMaximize,
    isPoweredOff = false,
    onTogglePower
  },
  ref
) {
  const screenRef = useRef(null);

  // Helper to compute relative position of an element inside screen
  const getRelativePos = (el, scr) => {
    let x = 0;
    let y = 0;
    let n = el;
    while (n && n !== scr) {
      x += n.offsetLeft;
      y += n.offsetTop;
      const p = n.offsetParent;
      if (p && p !== scr) {
        x -= p.scrollLeft;
        y -= p.scrollTop;
      }
      n = p;
    }
    return [x, y];
  };

  useImperativeHandle(ref, () => ({
    getScreenElement: () => screenRef.current,
    triggerVirtualClick: (px, py) => {
      if (!screenRef.current) return;
      const scr = screenRef.current;
      const X = px * scr.offsetWidth;
      const Y = py * scr.offsetHeight;

      const activeSlideEl = scr.querySelector('.slide.on');
      if (!activeSlideEl) return;

      // 1. Check circuit board PCBs first
      const pcbWrappers = activeSlideEl.querySelectorAll('.pcbw');
      for (let i = 0; i < pcbWrappers.length; i++) {
        const b = pcbWrappers[i];
        const [rx, ry] = getRelativePos(b, scr);
        if (
          X >= rx &&
          X <= rx + b.offsetWidth &&
          Y >= ry &&
          Y <= ry + b.offsetHeight
        ) {
          const svgEl = b.querySelector('svg');
          if (svgEl) {
            // Hit test based on svg id
            const isDeps = svgEl.id === 'g1';
            const boardRef = isDeps ? depsBoardRef : impactBoardRef;
            if (boardRef?.current?.hit) {
              const hitKey = boardRef.current.hit(
                X - rx,
                Y - ry,
                b.offsetWidth,
                b.offsetHeight
              );
              if (hitKey) {
                if (isDeps) onToggleDepNode(hitKey);
                else onToggleImpactNode(hitKey);
                return;
              }
            }
          }
        }
      }

      // 2. Check interactive buttons and textareas
      const clickables = activeSlideEl.querySelectorAll('button, textarea');
      for (let i = 0; i < clickables.length; i++) {
        const b = clickables[i];
        const [rx, ry] = getRelativePos(b, scr);
        if (
          X >= rx &&
          X <= rx + b.offsetWidth &&
          Y >= ry &&
          Y <= ry + b.offsetHeight
        ) {
          if (b.tagName === 'TEXTAREA') {
            b.focus();
          } else {
            b.click();
          }
          return;
        }
      }
    }
  }));

  const slideTitles = [
    'System Overview',
    'Codebase Explorer',
    'Dependency Intelligence',
    'Failure Analysis',
    'Change Impact Analysis',
    'AI Insights & Suggestions'
  ];

  const slidePageIds = ['home', 'explorer', 'deps', 'failure', 'impact', 'insights'];

  const ptrStyle = {
    transform: `translate(${ptrCoords.px * (screenRef.current?.offsetWidth || 1000)}px, ${ptrCoords.py * (screenRef.current?.offsetHeight || 550)}px)`
  };

  if (isPoweredOff) {
    return (
      <div className="screen-container powered-off">
        <div
          className="shutdown-screen"
          onClick={onTogglePower}
          title="Click to Boot Up CodeArchi OS"
        >
          <div className="shutdown-icon">⏻</div>
          <div className="shutdown-title">SYSTEM SHUT DOWN</div>
          <div className="shutdown-hint">
            Press ⏻ Power key on keyboard or click here to Boot
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container">
      {/* Laptop Screen Top Header Bar */}
      <div className="screen-header-bar">
        <div className="screen-dots" role="group" aria-label="Window controls">
          <button
            type="button"
            className="screen-dot r"
            onClick={onClose}
            title="Close / Sleep (Scroll to top & close laptop)"
            aria-label="Close laptop"
          >
            <span className="dot-icon">×</span>
          </button>
          <button
            type="button"
            className="screen-dot y"
            onClick={onMinimize}
            title="Minimize to System Overview"
            aria-label="Minimize to overview"
          >
            <span className="dot-icon">−</span>
          </button>
          <button
            type="button"
            className="screen-dot g"
            onClick={onMaximize || (() => onOpenFullView?.(slidePageIds[activeSlideIndex] || 'explorer'))}
            title="Maximize to Full Page View"
            aria-label="Maximize to full page"
          >
            <span className="dot-icon">⤢</span>
          </button>
        </div>
        <div style={{ fontWeight: 600, letterSpacing: '0.04em' }}>
          CodeArchi // {slideTitles[activeSlideIndex] || 'System'}
        </div>
        {activeSlideIndex > 0 ? (
          <button
            type="button"
            className="screen-full-btn"
            onClick={() => onOpenFullView?.(slidePageIds[activeSlideIndex])}
            title="Open this section in dedicated full page view"
          >
            Full Page View ↗
          </button>
        ) : (
          <div style={{ width: '80px' }}></div>
        )}
      </div>

      {/* Main Screen Area - completely separate from header bar */}
      <div className="screen" id="screen" ref={screenRef}>
        {/* Virtual trackpad pointer */}
        <div className={`ptr ${showPtr ? 'on' : ''}`} style={ptrStyle}>
          <svg viewBox="0 0 16 22">
            <path
              d="M1 1V17L5.5 13L8.5 20L11 19L8 12.5H14Z"
              fill="#fff"
              stroke="#111"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </div>

      {/* Slide 0: Boot */}
      <div className={`slide boot ${activeSlideIndex === 0 ? 'on' : ''}`}>
        <div className="unit">
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
      </div>

      {/* Slide 1: Explorer */}
      <div className={`slide mod ${activeSlideIndex === 1 ? 'on' : ''}`}>
        <CodeExplorer
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          isSlide
        />
      </div>

      {/* Slide 2: Dependencies */}
      <div className={`slide mod ${activeSlideIndex === 2 ? 'on' : ''}`}>
        <DependencyIntelligence
          activeMap={depsActive}
          onToggleNode={onToggleDepNode}
          boardRef={depsBoardRef}
          isSlide
        />
      </div>

      {/* Slide 3: Failures */}
      <div className={`slide mod ${activeSlideIndex === 3 ? 'on' : ''}`}>
        <FailureAnalysis
          errorLog={errorLog}
          onChangeLog={onChangeErrorLog}
          onAnalyze={onAnalyzeError}
          activePresetIndex={activePresetIndex}
          onSelectPreset={onSelectPreset}
          analysisResult={analysisResult}
          isSlide
        />
      </div>

      {/* Slide 4: Impact */}
      <div className={`slide mod ${activeSlideIndex === 4 ? 'on' : ''}`}>
        <ImpactAnalysis
          activeMap={impactActive}
          onToggleNode={onToggleImpactNode}
          boardRef={impactBoardRef}
          isSlide
        />
      </div>

        {/* Slide 5: AI Insights */}
        <div className={`slide mod ${activeSlideIndex === 5 ? 'on' : ''}`}>
          <AiInsights result={analysisResult} isSlide />
        </div>
      </div>
    </div>
  );
});

export default LaptopScreen;
