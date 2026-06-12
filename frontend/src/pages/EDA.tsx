import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { api } from '../services/api';

const EDA: React.FC = () => {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fileId = localStorage.getItem('activeFileId');
    if (fileId) {
      setActiveFileId(fileId);
      loadOrRunEDA(fileId);
    } else {
      setError('Please upload a dataset first');
    }
  }, []);

  const loadOrRunEDA = async (fileId: string, customTarget?: string) => {
    setLoading(true);
    setError('');
    try {
      // 1. Try to fetch existing metadata first if not forcing custom target
      if (!customTarget) {
        const metaResponse = await api.get(`/api/v1/data/metadata/${fileId}`);
        if (metaResponse.data && metaResponse.data.eda_report) {
          setResult({
            eda_report: metaResponse.data.eda_report,
            eda_plots: metaResponse.data.eda_plots,
            target_column: metaResponse.data.target_column || "",
            message: "Loaded existing EDA results."
          });
          setTargetColumn(metaResponse.data.target_column || "");
          setLoading(false);
          return;
        }
      }

      // 2. If not found or forcing run, trigger EDA agent
      const response = await api.post(`/api/v1/agents/eda`, {
        file_id: fileId,
        target_column: customTarget || targetColumn || null,
      });
      setResult(response.data);
      if (response.data.target_column) {
        setTargetColumn(response.data.target_column);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error running EDA agent');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomTargetRun = () => {
    if (activeFileId) {
      loadOrRunEDA(activeFileId, targetColumn);
    }
  };

  const report = result?.eda_report;
  const plots = result?.eda_plots;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>📊 Exploratory Data Analysis</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.7 }}>Analyze variables, target class distributions, and data correlations</p>
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
            {loading ? 'Analyzing...' : 'Run Analysis'}
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
            <p style={{ margin: 0, fontWeight: 600 }}>EDA agent is analyzing correlations and variables...</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', opacity: 0.6 }}>Generating plots and descriptive statistics</p>
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
            
            {/* Target Column Info */}
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '1.5rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
            }}>
              <span style={{ fontSize: '0.8rem', background: 'var(--accent-primary)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>Target Column</span>
              <h2 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.5rem' }}>{result.target_column || "Not specified"}</h2>
              
              {report.target_summary && report.target_summary.counts && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Target Variable Distribution:</div>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {Object.entries(report.target_summary.counts).map(([label, val]: any) => (
                      <div key={label} style={{ background: 'var(--bg-primary)', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <strong>{label}:</strong> {val} ({report.target_summary.percentages?.[label]?.toFixed(1)}%)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Visualizations (Images Grid) */}
            {plots && Object.keys(plots).length > 0 && (
              <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>📊 Exploratory Visualizations</h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                  gap: '1.5rem'
                }}>
                  {Object.entries(plots).map(([key, filename]: any) => {
                    const plotUrl = `/api/v1/data/plot/${activeFileId}/${filename}`;
                    const readableName = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    return (
                      <div key={key} style={{
                        background: 'var(--bg-secondary)',
                        padding: '1rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                      }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', alignSelf: 'flex-start' }}>{readableName}</h3>
                        <img 
                          src={plotUrl} 
                          alt={readableName} 
                          style={{
                            maxWidth: '100%',
                            maxHeight: '300px',
                            objectFit: 'contain',
                            borderRadius: '6px',
                            background: '#fff',
                            padding: '0.5rem'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Numerical / Categorical summaries */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {/* Numerical */}
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}>
                <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>🔢 Numerical Column Statistics</h2>
                <div style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '1rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', opacity: 0.6 }}>
                        <th style={{ padding: '0.5rem' }}>Feature</th>
                        <th style={{ padding: '0.5rem' }}>Mean</th>
                        <th style={{ padding: '0.5rem' }}>Median</th>
                        <th style={{ padding: '0.5rem' }}>Missing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(report.numerical_summary || {}).map(([col, stats]: any) => (
                        <tr key={col} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.5rem', fontWeight: 600 }}>{col}</td>
                          <td style={{ padding: '0.5rem' }}>{stats.mean?.toFixed(2)}</td>
                          <td style={{ padding: '0.5rem' }}>{stats.median}</td>
                          <td style={{ padding: '0.5rem', color: stats.missing_count > 0 ? '#ff6666' : 'inherit' }}>{stats.missing_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Categorical */}
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}>
                <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>🔤 Categorical Column Cardinality</h2>
                <div style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '1rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', opacity: 0.6 }}>
                        <th style={{ padding: '0.5rem' }}>Feature</th>
                        <th style={{ padding: '0.5rem' }}>Unique Vals</th>
                        <th style={{ padding: '0.5rem' }}>Missing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(report.categorical_summary || {}).map(([col, stats]: any) => (
                        <tr key={col} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.5rem', fontWeight: 600 }}>{col}</td>
                          <td style={{ padding: '0.5rem' }}>{stats.unique_count}</td>
                          <td style={{ padding: '0.5rem', color: stats.missing_count > 0 ? '#ff6666' : 'inherit' }}>{stats.missing_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
};

export default EDA;
