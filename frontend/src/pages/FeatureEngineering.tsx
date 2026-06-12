import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { api } from '../services/api';

const FeatureEngineering: React.FC = () => {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fileId = localStorage.getItem('activeFileId');
    if (fileId) {
      setActiveFileId(fileId);
      loadOrRunFeatureEngineering(fileId);
    } else {
      setError('Please upload a dataset first');
    }
  }, []);

  const loadOrRunFeatureEngineering = async (fileId: string, customTarget?: string) => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch metadata first if not forcing run with custom target
      if (!customTarget) {
        const metaResponse = await api.get(`/api/v1/data/metadata/${fileId}`);
        if (metaResponse.data && metaResponse.data.feature_engineering_report) {
          setResult({
            feature_engineering_report: metaResponse.data.feature_engineering_report,
            target_column: metaResponse.data.target_column || "",
            message: "Loaded existing feature engineering results."
          });
          setTargetColumn(metaResponse.data.target_column || "");
          setLoading(false);
          return;
        }
      }

      // 2. Auto-run feature engineering agent
      const response = await api.post(`/api/v1/agents/feature-engineering`, {
        file_id: fileId,
        target_column: customTarget || targetColumn || null,
      });
      setResult(response.data);
      if (response.data.target_column) {
        setTargetColumn(response.data.target_column);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error running feature engineering agent');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomTargetRun = () => {
    if (activeFileId) {
      loadOrRunFeatureEngineering(activeFileId, targetColumn);
    }
  };

  const report = result?.feature_engineering_report;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>✨ Feature Engineering</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.7 }}>Automatically encode categories, parse datetimes, handle texts, and scale numbers</p>
          </div>
        </div>

        {/* Configuration block */}
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '1.25rem',
          borderRadius: '10px',
          marginBottom: '2rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-end',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Target Column Name (Optional):</label>
            <input
              type="text"
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              placeholder="e.g., price, deposit, churn"
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem'
              }}
            />
          </div>
          <button
            onClick={handleCustomTargetRun}
            disabled={!activeFileId || loading}
            style={{
              background: 'var(--accent-primary)',
              color: 'white',
              border: 'none',
              padding: '0.65rem 1.5rem',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Running...' : 'Run Feature Engineering'}
          </button>
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
            <p style={{ margin: 0, fontWeight: 600 }}>Feature Engineering agent is building features...</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', opacity: 0.6 }}>One-hot encoding categories and scaling numerical values</p>
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
            
            {/* Shape changes */}
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '1.5rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
            }}>
              <h2 style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '1.25rem' }}>Feature Count Expansion</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>Original Dimensions</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '0.25rem' }}>
                    {report.original_shape?.[0]} rows × {report.original_shape?.[1]} columns
                  </div>
                </div>
                <div style={{ fontSize: '1.5rem', opacity: 0.5 }}>➔</div>
                <div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>Engineered Dimensions</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--accent-primary)' }}>
                    {report.engineered_shape?.[0]} rows × {report.engineered_shape?.[1]} columns
                  </div>
                </div>
              </div>
            </div>

            {/* Columns detected card */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem'
            }}>
              {Object.entries(report.columns_detected || {}).map(([type, cols]: any) => (
                <div key={type} style={{
                  background: 'var(--bg-secondary)',
                  padding: '1.25rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ textTransform: 'capitalize', fontWeight: 700, fontSize: '0.9rem', opacity: 0.8, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                    {type} Variables ({cols.length})
                  </div>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    {cols.length > 0 ? cols.join(', ') : 'None detected'}
                  </div>
                </div>
              ))}
            </div>

            {/* Transformations applied */}
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '1.5rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
            }}>
              <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>Applied Transformations</h2>
              {report.transformations_applied && report.transformations_applied.length > 0 ? (
                <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.95rem', lineHeight: '1.8' }}>
                  {report.transformations_applied.map((t: string, idx: number) => (
                    <li key={idx} style={{ marginBottom: '0.5rem' }}>{t}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, opacity: 0.6, fontSize: '0.95rem' }}>No transformations were required.</p>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default FeatureEngineering;
