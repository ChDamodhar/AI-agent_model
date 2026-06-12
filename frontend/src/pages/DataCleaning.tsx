import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { api } from '../services/api';

const DataCleaning: React.FC = () => {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fileId = localStorage.getItem('activeFileId');
    if (fileId) {
      setActiveFileId(fileId);
      loadOrRunCleaning(fileId);
    } else {
      setError('Please upload a dataset first');
    }
  }, []);

  const loadOrRunCleaning = async (fileId: string) => {
    setLoading(true);
    setError('');
    try {
      // 1. Try to fetch existing metadata first
      const metaResponse = await api.get(`/api/v1/data/metadata/${fileId}`);
      if (metaResponse.data && metaResponse.data.cleaning_report) {
        setResult({
          cleaning_report: metaResponse.data.cleaning_report,
          message: "Loaded existing cleaning results."
        });
        setLoading(false);
        return;
      }
      
      // 2. If not found, trigger cleaning agent automatically
      const response = await api.post(`/api/v1/agents/cleaning`, {
        file_id: fileId,
      });
      setResult(response.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error running cleaning agent');
    } finally {
      setLoading(false);
    }
  };

  const forceReRun = async () => {
    if (!activeFileId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await api.post(`/api/v1/agents/cleaning`, {
        file_id: activeFileId,
      });
      setResult(response.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error running cleaning agent');
    } finally {
      setLoading(false);
    }
  };

  const report = result?.cleaning_report;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>🧹 Data Cleaning Agent</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.7 }}>Automatically remove duplicates, impute missing values, and cap outliers</p>
          </div>
          {activeFileId && (
            <button
              onClick={forceReRun}
              disabled={loading}
              style={{
                background: 'transparent',
                color: 'var(--accent-primary)',
                border: '1px solid var(--accent-primary)',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              Re-run Cleaning
            </button>
          )}
        </div>

        {loading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            marginBottom: '2rem'
          }}>
            <div className="spinner" style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255,255,255,0.1)',
              borderTop: '4px solid var(--accent-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '1rem'
            }}></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <p style={{ margin: 0, fontWeight: 600 }}>Data Cleaning agent is hard at work...</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', opacity: 0.6 }}>Detecting missing values, duplicates, and outliers</p>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid #ff4444',
            color: '#ff6666',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '2rem',
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && report && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Summary Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.5rem',
            }}>
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontSize: '0.85rem', opacity: 0.6, fontWeight: 600, textTransform: 'uppercase' }}>Missing Values Filled</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: '#4caf50' }}>
                  {report.missing_values}
                </div>
              </div>

              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontSize: '0.85rem', opacity: 0.6, fontWeight: 600, textTransform: 'uppercase' }}>Duplicates Removed</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: '#ff9800' }}>
                  {report.duplicates_removed}
                </div>
              </div>

              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontSize: '0.85rem', opacity: 0.6, fontWeight: 600, textTransform: 'uppercase' }}>Outliers Capped</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: '#2196f3' }}>
                  {report.outliers_detected}
                </div>
              </div>
            </div>

            {/* Shape comparison card */}
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '1.5rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
            }}>
              <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>Dataset Dimensions Change</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>Original Shape</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '0.25rem' }}>
                    {report.original_shape?.[0]} rows × {report.original_shape?.[1]} columns
                  </div>
                </div>
                <div style={{ fontSize: '1.5rem', opacity: 0.5 }}>➔</div>
                <div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>Cleaned Shape</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--accent-primary)' }}>
                    {report.cleaned_shape?.[0]} rows × {report.cleaned_shape?.[1]} columns
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataCleaning;
