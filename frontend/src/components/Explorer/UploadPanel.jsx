import { useRef, useState } from 'react';
import {
  analyzeZip,
  analyzeFolder,
  analyzeGithubRepo,
  analyzeZipUrl
} from '../../utils/projectAnalyzer';

export default function UploadPanel({ onProjectLoaded }) {
  const [activeTab, setActiveTab] = useState('url'); // 'url' | 'folder' | 'zip'
  const [urlInput, setUrlInput] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'busy' | 'done' | 'error'
  const [message, setMessage] = useState('');
  const [progressText, setProgressText] = useState('');
  const [dragging, setDragging] = useState(false);

  const zipInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const multiFileInputRef = useRef(null);

  // Popular open-source repos to test in 1 click
  const QUICK_REPOS = [
    { name: 'Redux (State)', url: 'https://github.com/reduxjs/redux' },
    { name: 'Zustand (Micro)', url: 'https://github.com/pmndrs/zustand' },
    { name: 'Express (Server)', url: 'https://github.com/expressjs/express' },
    { name: 'Chalk (Terminal)', url: 'https://github.com/chalk/chalk' }
  ];

  // Handle GitHub / Direct ZIP URL Ingestion
  const handleLoadUrl = async (overrideUrl) => {
    const targetUrl = (overrideUrl || urlInput).trim();
    if (!targetUrl) {
      setStatus('error');
      setMessage('Please paste a GitHub repository URL or project archive link.');
      return;
    }

    setStatus('busy');
    setMessage('Connecting to repository...');
    setProgressText('Initializing...');

    try {
      let project;
      if (targetUrl.endsWith('.zip') || targetUrl.includes('.zip?')) {
        project = await analyzeZipUrl(targetUrl, (prog) => {
          setProgressText(prog);
          setMessage(prog);
        });
      } else {
        project = await analyzeGithubRepo(targetUrl, (prog) => {
          setProgressText(prog);
          setMessage(prog);
        });
      }

      onProjectLoaded(project);
      setStatus('done');
      setMessage(`Successfully loaded "${project.name}" with ${project.fileEntries.length} files!`);
      setProgressText('');
    } catch (err) {
      setStatus('error');
      setMessage(err && err.message ? err.message : 'Failed to load repository from URL.');
      setProgressText('');
    }
  };

  // Handle Single / Multiple File Upload
  const handleZipFile = async (file) => {
    if (!file) return;

    setStatus('busy');
    setMessage(`Reading archive: ${file.name}...`);
    setProgressText('Decompressing and parsing...');

    try {
      const project = await analyzeZip(file);
      onProjectLoaded(project);
      setStatus('done');
      setMessage(`Loaded project "${project.name}" (${project.fileEntries.length} files).`);
      setProgressText('');
    } catch (error) {
      setStatus('error');
      setMessage(error && error.message ? error.message : 'That archive could not be read.');
      setProgressText('');
    }
  };

  // Handle Folder Upload
  const handleFolderFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    setStatus('busy');
    setMessage(`Scanning folder contents (${fileList.length} files)...`);
    setProgressText('Extracting modules & imports...');

    try {
      const project = await analyzeFolder(fileList);
      onProjectLoaded(project);
      setStatus('done');
      setMessage(`Loaded project "${project.name}" (${project.fileEntries.length} files).`);
      setProgressText('');
    } catch (error) {
      setStatus('error');
      setMessage(error && error.message ? error.message : 'Could not analyze folder.');
      setProgressText('');
    }
  };

  // Drag and Drop (handles both Folders & Files!)
  const onDrop = async (event) => {
    event.preventDefault();
    setDragging(false);

    const items = event.dataTransfer.items;
    const rawFiles = event.dataTransfer.files;

    if (!items && !rawFiles) return;

    // Check if user dropped a single zip file
    if (rawFiles && rawFiles.length === 1 && (/\.zip$/i.test(rawFiles[0].name) || rawFiles[0].type === 'application/zip')) {
      handleZipFile(rawFiles[0]);
      return;
    }

    // Traverse directory tree if folder was dropped
    if (items && items.length > 0 && items[0].webkitGetAsEntry) {
      setStatus('busy');
      setMessage('Traversing dropped folder directory...');
      const collectedFiles = [];

      async function scanEntry(entry, currentPath = '') {
        if (entry.isFile) {
          const file = await new Promise((res) => entry.file(res));
          file.customPath = currentPath + file.name;
          collectedFiles.push(file);
        } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          const readAll = async () => {
            const entries = await new Promise((res) => dirReader.readEntries(res));
            if (entries.length > 0) {
              for (const child of entries) {
                await scanEntry(child, currentPath + entry.name + '/');
              }
              await readAll();
            }
          };
          await readAll();
        }
      }

      try {
        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry();
          if (entry) await scanEntry(entry);
        }
        if (collectedFiles.length > 0) {
          handleFolderFiles(collectedFiles);
          return;
        }
      } catch (err) {
        console.warn('Folder drag scan fallback:', err);
      }
    }

    // Fallback: standard file list
    if (rawFiles && rawFiles.length > 0) {
      handleFolderFiles(rawFiles);
    }
  };

  return (
    <div className="upload-studio-box">
      {/* Ingestion Mode Switcher Tabs */}
      <div className="ingest-tabs">
        <button
          type="button"
          className={`ingest-tab ${activeTab === 'url' ? 'active' : ''}`}
          onClick={() => setActiveTab('url')}
        >
          <span className="tab-icon">🌐</span>
          <span>GitHub / Git URL</span>
        </button>
        <button
          type="button"
          className={`ingest-tab ${activeTab === 'folder' ? 'active' : ''}`}
          onClick={() => setActiveTab('folder')}
        >
          <span className="tab-icon">📁</span>
          <span>Local Folder / Files</span>
        </button>
        <button
          type="button"
          className={`ingest-tab ${activeTab === 'zip' ? 'active' : ''}`}
          onClick={() => setActiveTab('zip')}
        >
          <span className="tab-icon">📦</span>
          <span>ZIP Archive</span>
        </button>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        style={{ display: 'none' }}
        onChange={(e) => {
          handleZipFile(e.target.files && e.target.files[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory="true"
        directory="true"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFolderFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={multiFileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFolderFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* TAB 1: GitHub / URL Ingestion */}
      {activeTab === 'url' && (
        <div className="ingest-panel">
          <div className="url-input-group">
            <span className="url-prefix-icon">⚡</span>
            <input
              type="text"
              className="url-text-field"
              placeholder="Paste GitHub URL (e.g. https://github.com/reduxjs/redux or facebook/react)..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
              disabled={status === 'busy'}
            />
            {urlInput && (
              <button
                type="button"
                className="url-clear-btn"
                onClick={() => setUrlInput('')}
                title="Clear input"
              >
                ✕
              </button>
            )}
            <button
              type="button"
              className="key hot"
              onClick={() => handleLoadUrl()}
              disabled={status === 'busy'}
            >
              {status === 'busy' ? 'Fetching...' : 'Analyze Repo'}
            </button>
          </div>

          {/* Quick Demo Repos Chips */}
          <div className="quick-repos-row">
            <span className="quick-label">⚡ 1-Click Test Repos:</span>
            {QUICK_REPOS.map((repo) => (
              <button
                key={repo.name}
                type="button"
                className="quick-chip-btn"
                onClick={() => {
                  setUrlInput(repo.url);
                  handleLoadUrl(repo.url);
                }}
                disabled={status === 'busy'}
              >
                {repo.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Local Folder & Multi-Files */}
      {activeTab === 'folder' && (
        <div className="ingest-panel">
          <div className="folder-actions-row">
            <button
              type="button"
              className="key hot"
              onClick={() => folderInputRef.current && folderInputRef.current.click()}
              disabled={status === 'busy'}
            >
              📁 Browse Folder on Disk
            </button>
            <button
              type="button"
              className="key"
              onClick={() => multiFileInputRef.current && multiFileInputRef.current.click()}
              disabled={status === 'busy'}
            >
              📄 Select Multiple Source Files
            </button>
            <span className="cap">No ZIP needed — reads directly from disk</span>
          </div>
        </div>
      )}

      {/* TAB 3: ZIP Archive Upload */}
      {activeTab === 'zip' && (
        <div className="ingest-panel">
          <div className="folder-actions-row">
            <button
              type="button"
              className="key hot"
              onClick={() => zipInputRef.current && zipInputRef.current.click()}
              disabled={status === 'busy'}
            >
              📦 Select Project ZIP File
            </button>
            <span className="cap">Reads and unzips in-memory in browser</span>
          </div>
        </div>
      )}

      {/* Universal Drag & Drop Zone */}
      <div
        className={`drop-area ${dragging ? 'drag-active' : ''} ${status === 'busy' ? 'busy-state' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => {
          if (activeTab === 'folder') folderInputRef.current?.click();
          else if (activeTab === 'zip') zipInputRef.current?.click();
          else folderInputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
      >
        <div className="drop-indicator-icon">
          {status === 'busy' ? '⏳' : dragging ? '📥' : '⚡'}
        </div>
        <div className="drop-text-content">
          <span className="drop-main-text">
            {status === 'busy'
              ? progressText || 'Processing codebase...'
              : dragging
              ? 'Release to analyze this project!'
              : 'Drag & drop any Project Folder or ZIP archive here'}
          </span>
          <span className="drop-sub-text">
            {status === 'busy'
              ? 'Parsing AST syntax trees & dependency connections...'
              : 'Works with JavaScript, TypeScript, Python, Java, Go, Rust, and config manifests'}
          </span>
        </div>
        {status === 'busy' && <div className="busy-progress-bar"></div>}
      </div>

      {/* Live Status / Error Message */}
      {message && (
        <div className={`upload-status-alert ${status}`}>
          <span className="status-badge-dot"></span>
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
