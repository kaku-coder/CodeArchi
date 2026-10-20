import React, { useRef, useState, useEffect, useCallback } from 'react';
import LaptopDeck from './LaptopDeck';
import LaptopScreen from './LaptopScreen';

const ease = (x) => x * x * (3 - 2 * x);
const clamp = (x) => Math.max(0, Math.min(1, x));

export default function LaptopScene({
  currentSlide,
  onSlideChange,
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
  onOpenFullView
}) {
  const sceneRef = useRef(null);
  const stageRef = useRef(null);
  const laptopRef = useRef(null);
  const introRef = useRef(null);
  const screenComponentRef = useRef(null);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0); // 0 = boot, 1-5 = slides
  const [ptrCoords, setPtrCoords] = useState({ px: 0.5, py: 0.5 });
  const [showPtr, setShowPtr] = useState(false);
  const [isPoweredOff, setIsPoweredOff] = useState(false);

  const handleTogglePower = useCallback(() => {
    setIsPoweredOff((prev) => !prev);
  }, []);

  const handleScroll = useCallback(() => {
    if (!sceneRef.current || !stageRef.current || !laptopRef.current) return;

    const isDesktop = window.matchMedia('(min-width: 861px)').matches;
    const sc = sceneRef.current;
    const st = stageRef.current;
    const lp = laptopRef.current;

    const r = sc.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(st).top) || 60;
    const total = sc.offsetHeight - st.offsetHeight;
    const p = total > 0 ? clamp((top - r.top) / total) : 0;

    const A = isDesktop ? 0.14 : 0.6;
    const B = 0.22;

    const w = lp.offsetWidth || 850;
    const a = ease(clamp(p / A));

    lp.style.setProperty('--cam', `${-54 + 32 * a}deg`);
    lp.style.setProperty('--ty', `${(-0.22 * w + 50) * (1 - a) + 0.22 * w * a}px`);
    lp.style.setProperty('--tx', '0vw');
    lp.style.setProperty('--ry', '0deg');
    lp.style.setProperty('--lid', `${-90 + 104 * a}deg`);
    st.style.setProperty('--g', a);

    if (introRef.current) {
      introRef.current.style.opacity = `${1 - clamp((p - A * 0.35) / (A * 0.5))}`;
    }

    if (!isDesktop) {
      setActiveSlideIndex(0);
      return;
    }

    const q = clamp((p - B) / (1 - B));
    const i = Math.min(4, Math.floor(q * 5));
    const nextOn = p >= B ? i + 1 : 0;

    setActiveSlideIndex(nextOn);
    const activeSectionIndex = p >= B ? i : -1;
    onSlideChange?.(activeSectionIndex);
  }, [onSlideChange]);

  useEffect(() => {
    const onTick = () => {
      requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', onTick, { passive: true });
    window.addEventListener('resize', onTick);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', onTick);
      window.removeEventListener('resize', onTick);
    };
  }, [handleScroll]);

  // Navigate to slide by calculating scroll position
  const scrollToSlide = useCallback(
    (i) => {
      const isDesktop = window.matchMedia('(min-width: 861px)').matches;
      if (!isDesktop) {
        const ids = ['explorer', 'deps', 'failure', 'impact', 'insights'];
        document.getElementById(ids[i])?.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      if (!sceneRef.current || !stageRef.current) return;
      const sc = sceneRef.current;
      const st = stageRef.current;
      const top = parseFloat(getComputedStyle(st).top) || 60;
      const total = sc.offsetHeight - st.offsetHeight;
      const B = 0.22;

      window.scrollTo({
        top: sc.offsetTop - top + (B + (i + 0.5) / 5 * (1 - B)) * total,
        behavior: 'smooth'
      });
    },
    []
  );

  const handleEscape = useCallback(() => {
    if (!sceneRef.current || !stageRef.current) return;
    const sc = sceneRef.current;
    const st = stageRef.current;
    const top = parseFloat(getComputedStyle(st).top) || 60;
    window.scrollTo({
      top: sc.offsetTop - top,
      behavior: 'smooth'
    });
  }, []);

  const handleTrackpadMove = (px, py) => {
    setPtrCoords({ px, py });
    setShowPtr(true);
  };

  const handleTrackpadClick = () => {
    screenComponentRef.current?.triggerVirtualClick(
      ptrCoords.px,
      ptrCoords.py
    );
  };

  const handleClose = useCallback(() => {
    handleEscape();
  }, [handleEscape]);

  const handleMinimize = useCallback(() => {
    if (!sceneRef.current || !stageRef.current) return;
    const sc = sceneRef.current;
    const st = stageRef.current;
    const top = parseFloat(getComputedStyle(st).top) || 60;
    const total = sc.offsetHeight - st.offsetHeight;
    const B = 0.18;
    window.scrollTo({
      top: sc.offsetTop - top + B * total,
      behavior: 'smooth'
    });
  }, []);

  const handleMaximize = useCallback(() => {
    const pageIds = ['home', 'explorer', 'deps', 'failure', 'impact', 'insights'];
    const targetPage = activeSlideIndex > 0 ? pageIds[activeSlideIndex] : 'explorer';
    onOpenFullView?.(targetPage);
  }, [activeSlideIndex, onOpenFullView]);

  return (
    <div className="scene" id="scene" ref={sceneRef}>
      <div className="stage" id="stage" ref={stageRef}>
        <div className="intro" id="intro" ref={introRef}>
          <h1>Read the codebase. Trace the failure.</h1>
          <p className="lead">
            CodeArchi maps your source code, follows errors back to the files
            behind them, and shows what a change can reach. Every AI answer comes
            with its evidence and its doubts.
          </p>
          <div className="cap" id="hint">
            Scroll to open the laptop. Move over the trackpad to use the cursor.
          </div>
        </div>

        <div className="laptop" id="laptop" ref={laptopRef}>
          {/* Laptop Base / Deck */}
          <LaptopDeck
            currentSlide={currentSlide}
            onNavigateSlide={scrollToSlide}
            onEscape={handleEscape}
            onTrackpadMove={handleTrackpadMove}
            onTrackpadClick={handleTrackpadClick}
            isPoweredOff={isPoweredOff}
            onTogglePower={handleTogglePower}
          />

          <div className="lip"></div>

          {/* Laptop Screen / Lid */}
          <div className="lid">
            <div className="face front">
              <LaptopScreen
                ref={screenComponentRef}
                activeSlideIndex={activeSlideIndex}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                depsActive={depsActive}
                onToggleDepNode={onToggleDepNode}
                impactActive={impactActive}
                onToggleImpactNode={onToggleImpactNode}
                errorLog={errorLog}
                onChangeErrorLog={onChangeErrorLog}
                onAnalyzeError={onAnalyzeError}
                activePresetIndex={activePresetIndex}
                onSelectPreset={onSelectPreset}
                analysisResult={analysisResult}
                depsBoardRef={depsBoardRef}
                impactBoardRef={impactBoardRef}
                ptrCoords={ptrCoords}
                showPtr={showPtr}
                onOpenFullView={onOpenFullView}
                onClose={handleClose}
                onMinimize={handleMinimize}
                onMaximize={handleMaximize}
                isPoweredOff={isPoweredOff}
                onTogglePower={handleTogglePower}
              />
            </div>
            <div className="face back">
              <span>
                <i className="led"></i>CodeArchi
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
