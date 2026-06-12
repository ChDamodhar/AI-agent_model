import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { api } from '../services/api';

const ModelSelection: React.FC = () => {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fileId = localStorage.getItem('activeFileId');
    if (fileId) {
      setActiveFileId(fileId);
      loadOrRunModelSelection(fileId);
    } else {
      setError('Please upload and clean a dataset first');
    }
  }, []);

  const loadOrRunModelSelection = async (fileId: string, customTarget?: string) => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch metadata first if not forcing run
      if (!customTarget) {
        const metaResponse = await api.get(`/api/v1/data/metadata/${fileId}`);
        if (metaResponse.data && metaResponse.data.model_selection_report) {
          setResult({
            model_selection_report: metaResponse.data.model_selection_report,
            target_column: metaResponse.data.target_column || "",
            message: "Loaded existing model selection results."
          });
          setTargetColumn(metaResponse.data.target_column || "");
          setLoading(false);
          return;
        }
      }

      // 2. Auto-run model selection agent
      const response = await api.post(`/api/v1/agents/model-selection`, {
        file_id: fileId,
        target_column: customTarget || targetColumn || null,
      });
      setResult(response.data);
      if (response.data.target_column) {
        setTargetColumn(response.data.target_column);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error running model selection agent');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomTargetRun = () => {
    if (activeFileId) {
      loadOrRunModelSelection(activeFileId, targetColumn);
    }
  };

  const report = result?.model_selection_report;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>🤖 Model Selection</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.7 }}>Train and compare multiple algorithms to select the absolute best performer</p>
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
            {loading ? 'Training...' : 'Run Model Selection'}
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
            <p style={{ margin: 0, fontWeight: 600 }}>Model Selection agent is training models...</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', opacity: 0.6 }}>Training Linear Regression, Random Forest, HistGradientBoosting...</p>
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
            
            {/* Best Model card */}
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(33, 150, 243, 0.05) 100%)',
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid var(--accent-primary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.5rem'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', background: 'var(--accent-primary)', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '20px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🏆 Best Model Chosen</span>
                <h2 style={{ margin: '0.75rem 0 0.25rem 0', fontSize: '1.75rem', fontWeight: 800 }}>{report.best_model_name}</h2>
                <p style={{ margin: 0, opacity: 0.7, fontSize: '0.95rem' }}>Problem Type: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{report.problem_type}</span></p>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {report.problem_type === 'classification' ? (
                  <>
                    <div style={{ background: 'var(--bg-primary)', padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>Accuracy</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: '#4caf50' }}>{(report.best_model_metrics?.accuracy * 100).toFixed(1)}%</div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>F1-Score</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--accent-primary)' }}>{report.best_model_metrics?.f1_score?.toFixed(3)}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ background: 'var(--bg-primary)', padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>R² Score</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: '#4caf50' }}>{report.best_model_metrics?.r2_score?.toFixed(4)}</div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>MAE</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: '#ff9800' }}>{report.best_model_metrics?.mae?.toFixed(2)}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Leaderboard Table */}
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '1.5rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
            }}>
              <h2 style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '1.25rem' }}>📊 Model Leaderboard</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)', opacity: 0.7 }}>
                    <th style={{ padding: '0.75rem' }}>Rank</th>
                    <th style={{ padding: '0.75rem' }}>Model Name</th>
                    {report.problem_type === 'classification' ? (
                      <>
                        <th style={{ padding: '0.75rem' }}>Accuracy</th>
                        <th style={{ padding: '0.75rem' }}>F1 Score</th>
                        <th style={{ padding: '0.75rem' }}>ROC-AUC</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: '0.75rem' }}>R² Score</th>
                        <th style={{ padding: '0.75rem' }}>Mean Absolute Error</th>
                        <th style={{ padding: '0.75rem' }}>Mean Squared Error</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {report.leaderboard && report.leaderboard.map((item: any, idx: number) => {
                    const isBest = item.model_name === report.best_model_name;
                    return (
                      <tr key={idx} style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: isBest ? 'rgba(33, 150, 243, 0.03)' : 'transparent',
                        fontWeight: isBest ? 600 : 'normal'
                      }}>
                        <td style={{ padding: '0.75rem' }}>{idx + 1}</td>
                        <td style={{ padding: '0.75rem' }}>
                          {item.model_name} {isBest && '🌟'}
                        </td>
                        {report.problem_type === 'classification' ? (
                          <>
                            <td style={{ padding: '0.75rem', color: isBest ? '#4caf50' : 'inherit' }}>
                              {(item.accuracy * 100).toFixed(1)}%
                            </td>
                            <td style={{ padding: '0.75rem' }}>{item.f1_score?.toFixed(3)}</td>
                            <td style={{ padding: '0.75rem' }}>{item.roc_auc?.toFixed(3)}</td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '0.75rem', color: isBest ? '#4caf50' : 'inherit' }}>
                              {item.r2_score?.toFixed(4)}
                            </td>
                            <td style={{ padding: '0.75rem' }}>{item.mae?.toFixed(2)}</td>
                            <td style={{ padding: '0.75rem' }}>{item.mse?.toFixed(2)}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default ModelSelection;
