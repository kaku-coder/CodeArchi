import { useRef, useState } from 'react';
import { analyzeZip } from '../../utils/projectAnalyzer';

export default function UploadPanel({ onProjectLoaded }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;

    const looksLikeZip = /\.zip$/i.test(file.name) || file.type === 'application/zip';
    if (!looksLikeZip) {
      setStatus('error');
      setMessage('That is not a ZIP file. Export the project as a ZIP archive and try again.');
      return;
    }

    setStatus('busy');
    setMessage('Reading ' + file.name + ' ...');

    try {
      const project = await analyzeZip(file);
      onProjectLoaded(project);
      setStatus('done');
      setMessage('Loaded ' + project.name + '.');
    } catch (error) {
      setStatus('error');
      setMessage(error && error.message ? error.message : 'That archive could not be read.');
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <div className="upload">
      <div className="upload-row">
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="upload-input"
          aria-label="Upload a project ZIP archive"
          onChange={(event) => {
            handleFile(event.target.files && event.target.files[0]);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          className="key hot"
          onClick={() => inputRef.current && inputRef.current.click()}
          disabled={status === 'busy'}
        >
          {status === 'busy' ? 'Reading archive ...' : 'Upload Project ZIP'}
        </button>
        <span className="cap">or drop the archive here</span>
      </div>

      <div
        className={`drop ${dragging ? 'drag' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current && inputRef.current.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (inputRef.current) inputRef.current.click();
          }
        }}
        aria-label="Drop a project ZIP archive here"
      >
        <span className="drop-led"></span>
        <span>
          {dragging
            ? 'Release to analyse this archive.'
            : 'Drop a ZIP of the project you want analysed.'}
        </span>
      </div>

      {message && (
        <p className={`upload-msg ${status}`} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
