import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { uploadDataset, getDatasetPreview } from '../services/api';

const Upload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<{ columns: string[]; rows: Record<string, any>[] } | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setStatus('');
        setPreviewData(null);
        setMetadata(null);
      } else {
        setStatus('Only CSV files are supported.');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('');
      setPreviewData(null);
      setMetadata(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus('Please select or drop a CSV file.');
      return;
    }
    try {
      setLoading(true);
      setStatus('Uploading and parsing dataset...');
      const response = await uploadDataset(file);
      
      const fileId = response.data.file_id;
      const filename = response.data.filename;
      const fileMeta = response.data.metadata;
      
      localStorage.setItem('activeFileId', fileId);
      localStorage.setItem('activeFilename', filename);
      
      setMetadata(fileMeta);
      setStatus(`Uploaded successfully: ${filename}`);
      
      // Load preview
      try {
        const previewRes = await getDatasetPreview(fileId);
        setPreviewData(previewRes.data);
      } catch (err) {
        console.error('Failed to load dataset preview:', err);
      }
    } catch (err: any) {
      console.error(err);
      setStatus(err.response?.data?.detail || 'Upload failed. Ensure backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadgeClass = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('int') || t.includes('float') || t.includes('double')) return 'numeric';
    return 'categorical';
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="main-content">
        <div>
          <h1>Upload CSV Dataset</h1>
          <p style={{ marginTop: '0.5rem' }}>Upload your raw data here. The platform supports tabular CSV formats for analysis.</p>
        </div>

        <div className="glass-card">
          <div
            className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('csv-file-input')?.click()}
          >
            <input
              type="file"
              id="csv-file-input"
              accept=".csv"
              onChange={handleChange}
              style={{ display: 'none' }}
            />
            <div className="upload-icon">📤</div>
            {file ? (
              <div>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{file.name}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{(file.size / 1024).toFixed(2)} KB • Click or drop to replace file</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Drag & drop your CSV file here</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>or click to browse local files</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{status}</span>
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={!file || loading}
            >
              {loading ? 'Uploading...' : 'Upload & Load Dataset'}
            </button>
          </div>
        </div>

        {/* Dataset Schema Metadata Info */}
        {metadata && (
          <div className="glass-card" style={{ padding: '1.75rem', borderLeft: '4px solid var(--accent-secondary)' }}>
            <h3 style={{ marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>📊 Dataset Schema Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '1rem 1.25rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Total Rows</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{metadata.num_rows}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '1rem 1.25rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Total Columns</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{metadata.num_cols}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Parsed Columns:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {Object.entries(metadata.data_types || {}).map(([col, type]: [string, any]) => (
                  <div key={col} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{col}</span>
                    <span className={`type-badge ${getTypeBadgeClass(type)}`}>{type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tabular Preview */}
        {previewData && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2>📋 Tabular Preview (First 10 Rows)</h2>
            <p style={{ fontSize: '0.9rem' }}>Review the columns and rows parsed from your uploaded CSV.</p>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    {previewData.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {previewData.columns.map((col) => (
                        <td key={col}>{row[col] !== null ? String(row[col]) : <em style={{ color: 'var(--text-muted)' }}>null</em>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
