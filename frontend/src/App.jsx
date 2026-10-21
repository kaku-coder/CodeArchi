import { useState, useRef, useCallback } from 'react';
import Header from './components/Header/Header';
import LaptopScene from './components/Laptop/LaptopScene';
import FileTree from './components/Explorer/FileTree';
import CodeViewer from './components/Explorer/CodeViewer';
import OrgTreeView from './components/Explorer/OrgTreeView';
import UploadPanel from './components/Explorer/UploadPanel';
import ProjectSummary from './components/Explorer/ProjectSummary';
import ProjectChip from './components/Common/ProjectChip';
import ProjectRisks from './components/FailureAnalysis/ProjectRisks';
import CircuitBoard from './components/Common/CircuitBoard';
import DependencyTree from './components/Dependency/DependencyTree';
import DependencyReadout from './components/Dependency/DependencyReadout';
import ImpactReadout from './components/ImpactAnalysis/ImpactReadout';
import PresetSelector from './components/FailureAnalysis/PresetSelector';
import AnalysisResult from './components/FailureAnalysis/AnalysisResult';
import AiInsights from './components/AiInsights/AiInsights';
import Footer from './components/Footer/Footer';
import { FAILURE_PRESETS, analyzeErrorLog, buildExampleTrace } from './data/failurePresets';
import { SAMPLE_PROJECT } from './data/projectModel';
import { ProjectContext } from './context/projectContext';

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [currentSlide, setCurrentSlide] = useState(-1);
  const [depsView, setDepsView] = useState('tree');
  const [explorerView, setExplorerView] = useState('org');

  // Active project: the built in sample, or the uploaded archive
  const [project, setProject] = useState(SAMPLE_PROJECT);

  // Explorer State
  const [selectedFile, setSelectedFile] = useState('src/utils/format.ts');

  // Dependency Intelligence State
  const [depsActive, setDepsActive] = useState({
    'src/billing/invoice.ts': true
  });

  // Change Impact Analysis State
  const [impactActive, setImpactActive] = useState({
    'src/db/client.ts': true
  });

  // Failure Analysis & AI Insights State
  const [errorLog, setErrorLog] = useState(FAILURE_PRESETS[0].log);
  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(FAILURE_PRESETS[0]);

  // Board refs for hit testing
  const depsBoardRef = useRef(null);
  const impactBoardRef = useRef(null);

  const handleToggleDepNode = useCallback((k) => {
    setDepsActive((prev) => ({
      ...prev,
      [k]: !prev[k]
    }));
  }, []);

  const handleToggleImpactNode = useCallback((k) => {
    setImpactActive((prev) => ({
      ...prev,
      [k]: !prev[k]
    }));
  }, []);

  const handleSelectPreset = useCallback(
    (idx) => {
      const preset = FAILURE_PRESETS[idx];
      setErrorLog(preset.log);
      setActivePresetIndex(idx);
      setAnalysisResult(analyzeErrorLog(preset.log, project));
    },
    [project]
  );

  const handleAnalyzeError = useCallback(
    (customText) => {
      const textToAnalyze = customText !== undefined ? customText : errorLog;
      const result = analyzeErrorLog(textToAnalyze, project);
      setAnalysisResult(result);
      if (result) {
        const idx = FAILURE_PRESETS.findIndex((p) => p.n === result.n);
        setActivePresetIndex(idx >= 0 ? idx : null);
      } else {
        setActivePresetIndex(null);
      }
    },
    [errorLog, project]
  );

  const handleUseRisk = useCallback(
    (risk) => {
      const trace = 'Error: ' + risk.kind + '\n    at ' + risk.path + ':' + risk.line;
      setErrorLog(trace);
      setAnalysisResult(analyzeErrorLog(trace, project));
      setActivePresetIndex(null);
    },
    [project]
  );

  const handleProjectLoaded = useCallback((next) => {
    setProject(next);

    const firstFile = next.fileEntries.find((entry) => !entry.off);
    setSelectedFile(firstFile ? firstFile.path : null);

    const boardStart = Object.keys(next.board.coords)[0];
    setDepsActive(boardStart ? { [boardStart]: true } : {});
    setImpactActive(boardStart ? { [boardStart]: true } : {});

    const trace = buildExampleTrace(next);
    if (trace) {
      setErrorLog(trace);
      setAnalysisResult(analyzeErrorLog(trace, next));
      setActivePresetIndex(null);
    } else {
      setErrorLog('');
      setAnalysisResult(null);
      setActivePresetIndex(null);
    }
  }, []);

  const handleResetProject = useCallback(() => {
    setProject(SAMPLE_PROJECT);
    setSelectedFile('src/utils/format.ts');
    setDepsActive({ 'src/billing/invoice.ts': true });
    setImpactActive({ 'src/db/client.ts': true });
    setErrorLog(FAILURE_PRESETS[0].log);
    setActivePresetIndex(0);
    setAnalysisResult(FAILURE_PRESETS[0]);
  }, []);

  const handleSelectPage = (pageId) => {
    setActivePage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToExplorer = () => handleSelectPage('explorer');

  return (
    <ProjectContext.Provider value={project}>
      {/* Real Fixed Navbar - never scrolls away */}
      <Header
        activePage={activePage}
        onSelectPage={handleSelectPage}
      />

      {/* PAGE 1: 3D Studio / Home */}
      {activePage === 'home' && (
        <LaptopScene
          currentSlide={currentSlide}
          onSlideChange={setCurrentSlide}
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
          depsActive={depsActive}
          onToggleDepNode={handleToggleDepNode}
          impactActive={impactActive}
          onToggleImpactNode={handleToggleImpactNode}
          errorLog={errorLog}
          onChangeErrorLog={(val) => {
            setErrorLog(val);
            handleAnalyzeError(val);
          }}
          onAnalyzeError={() => handleAnalyzeError(errorLog)}
          activePresetIndex={activePresetIndex}
          onSelectPreset={handleSelectPreset}
          analysisResult={analysisResult}
          depsBoardRef={depsBoardRef}
          impactBoardRef={impactBoardRef}
          onOpenFullView={(pageId) => handleSelectPage(pageId)}
        />
      )}

      {/* PAGE 2: Full Codebase Explorer */}
      {activePage === 'explorer' && (
        <div className="full-page">
          <div className="page-banner">
            <span className="tag">
              <span className="led"></span>Codebase Explorer
            </span>
            <h1>Open any project and see what is inside.</h1>
            <p>
              Upload a ZIP or connect a supported repository. CodeArchi lists every file and folder, marks which ones it can read, and lets you view the content in high resolution.
            </p>
          </div>

          <div className="panel unit" style={{ padding: '24px' }}>
            <UploadPanel onProjectLoaded={handleProjectLoaded} />
            <ProjectSummary
              project={project}
              onNavigate={handleSelectPage}
              onReset={handleResetProject}
            />
          </div>

          <div className="panel unit" style={{ padding: '24px', marginTop: '24px' }}>
            <div className="deps-tabs" style={{ marginBottom: '20px' }}>
              <button
                type="button"
                className={`key ${explorerView === 'org' ? 'hot' : ''}`}
                onClick={() => setExplorerView('org')}
              >
                🌳 Hierarchical Tree Chart
              </button>
              <button
                type="button"
                className={`key ${explorerView === 'split' ? 'hot' : ''}`}
                onClick={() => setExplorerView('split')}
              >
                📋 Classic Split List
              </button>
            </div>

            {explorerView === 'org' ? (
              <OrgTreeView
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
              />
            ) : (
              <div
                className="explorer"
                style={{
                  gridTemplateColumns: 'minmax(240px, 280px) minmax(0, 1fr)',
                  gap: '24px'
                }}
              >
                <FileTree
                  selectedFile={selectedFile}
                  onSelectFile={setSelectedFile}
                />
                <CodeViewer selectedFile={selectedFile} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAGE 3: Full Dependency Intelligence */}
      {activePage === 'deps' && (
        <div className="full-page">
          <div className="page-banner">
            <span className="tag">
              <span className="led"></span>Dependency Intelligence
            </span>
            <h1>See how files connect.</h1>
            <p>
              Imports and code relationships are mapped as an interactive circuit board or as a clear tree. Flip any file’s switch to trace imported modules and callers in real time.
            </p>
            <ProjectChip project={project} onChange={goToExplorer} />
          </div>
          <div className="panel unit" style={{ padding: '24px' }}>
            <div className="deps-tabs">
              <button
                type="button"
                className={`key ${depsView === 'tree' ? 'hot' : ''}`}
                onClick={() => setDepsView('tree')}
              >
                Tree View
              </button>
              <button
                type="button"
                className={`key ${depsView === 'board' ? 'hot' : ''}`}
                onClick={() => setDepsView('board')}
              >
                Circuit Board
              </button>
            </div>

            {depsView === 'tree' ? (
              <DependencyTree activeMap={depsActive} onToggleNode={handleToggleDepNode} />
            ) : (
              <>
                <CircuitBoard
                  ref={depsBoardRef}
                  id="g1_full"
                  mode="deps"
                  activeMap={depsActive}
                  onToggleNode={handleToggleDepNode}
                />
                <DependencyReadout
                  activeKeys={Object.keys(depsActive).filter((k) => depsActive[k])}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* PAGE 4: Full Failure Analysis */}
      {activePage === 'failure' && (
        <div className="full-page">
          <div className="page-banner">
            <span className="tag">
              <span className="led"></span>Failure Analysis
            </span>
            <h1>Paste an error. Get a place to start.</h1>
            <p>
              Give CodeArchi an error message or log. It finds the files named in the trace, ranks them, and proposes root causes and step-by-step diagnostic actions.
            </p>
            <ProjectChip project={project} onChange={goToExplorer} />
          </div>
          <div className="panel unit" style={{ padding: '28px' }}>
            <PresetSelector
              activePresetIndex={activePresetIndex}
              onSelectPreset={handleSelectPreset}
            />
            <textarea
              id="log_full"
              aria-label="Error log"
              value={errorLog}
              rows={6}
              onChange={(e) => {
                setErrorLog(e.target.value);
                handleAnalyzeError(e.target.value);
              }}
              style={{ minHeight: '140px' }}
            />
            <button
              type="button"
              className="key hot"
              onClick={() => handleAnalyzeError(errorLog)}
            >
              Analyze Stack Trace
            </button>
            <AnalysisResult result={analysisResult} />
            <ProjectRisks project={project} onUse={handleUseRisk} />
          </div>
        </div>
      )}

      {/* PAGE 5: Full Change Impact Analysis */}
      {activePage === 'impact' && (
        <div className="full-page">
          <div className="page-banner">
            <span className="tag">
              <span className="led"></span>Change Impact Analysis
            </span>
            <h1>Know what a change can reach.</h1>
            <p>
              Flip the switch of a file you plan to edit. CodeArchi traverses the dependency tree with breadth-first search to show what modules will be affected.
            </p>
            <ProjectChip project={project} onChange={goToExplorer} />
          </div>
          <div className="panel unit" style={{ padding: '28px' }}>
            <CircuitBoard
              ref={impactBoardRef}
              id="g2_full"
              mode="impact"
              activeMap={impactActive}
              onToggleNode={handleToggleImpactNode}
            />
            <ImpactReadout activeMap={impactActive} />
          </div>
        </div>
      )}

      {/* PAGE 6: Full AI Insights */}
      {activePage === 'insights' && (
        <div className="full-page">
          <div className="page-banner">
            <span className="tag">
              <span className="led"></span>AI Insights and Test Suggestions
            </span>
            <h1>Explanations that show their work.</h1>
            <p>
              Every explanation cites the exact code evidence it relied on, declares its confidence percentage, highlights unknowns, and proposes automated test checks.
            </p>
            <ProjectChip project={project} onChange={goToExplorer} />
          </div>
          <AiInsights result={analysisResult} project={project} />
        </div>
      )}

      <Footer />
    </ProjectContext.Provider>
  );
}
