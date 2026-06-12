import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { api } from '../services/api';

const HyperparameterTuning: React.FC = () => {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [nTrials, setNTrials] = useState('20');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fileId = localStorage.getItem('activeFileId');
    if (fileId) {
      setActiveFileId(fileId);
      loadOrRunTuning(fileId);
    } else {
      setError('Please run model selection first');
    }
  }, []);

  const loadOrRunTuning = async (fileId: string, customTarget?: string) => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch metadata first if not forcing run
      if (!customTarget) {
        const metaResponse = await api.get(`/api/v1/data/metadata/${fileId}`);
        if (metaResponse.data && metaResponse.data.tuning_report) {
          setResult({
            tuning_report: metaResponse.data.tuning_report,
            target_column: metaResponse.data.target_column || "",
            message: "Loaded existing hyperparameter tuning results."
          });
          setTargetColumn(metaResponse.data.target_column || "");
          setLoading(false);
          return;
        }
      }

      // 2. Auto-run tuning agent
      const response = await api.post(`/api/v1/agents/tuning`, {
        file_id: fileId,
        target_column: customTarget || targetColumn || null,
        n_trials: parseInt(nTrials),
      });
      setResult(response.data);
      if (response.data.target_column) {
        setTargetColumn(response.data.target_column);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error running hyperparameter tuning');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomTuningRun = () => {
    if (activeFileId) {
      loadOrRunTuning(activeFileId, targetColumn);
    }
  };

  const report = result?.tuning_report;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>⚡ Hyperparameter Tuning</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.7 }}>Optimize tree‑based models using Optuna Bayesian search algorithms</p>
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
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Target Column (Optional):</label>
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
          <div style={{ width: '120px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Trials (max 100):</label>
            <input
              type="number"
              value={nTrials}
              onChange={(e) => setNTrials(e.target.value)}
              min="5"
              max="100"
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
            onClick={handleCustomTuningRun}
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
            {loading ? 'Tuning...' : 'Run Hyperparameter Tuning'}
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
            <p style={{ margin: 0, fontWeight: 600 }}>Tuning agent is running Bayesian trials...</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', opacity: 0.6 }}>Evaluating cross-validation folds on selected tree models</p>
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
            
            {/* Tunable flag check */}
            {!report.tunable ? (
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
              }}>
                <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>ℹ️ Tuning is Not Required</h2>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', lineHeight: '1.6', opacity: 0.8 }}>
                  The selected best model <strong>{report.model_name}</strong> is a linear or simple algorithm. It is already operating at its theoretical mathematical optimal capacity. Optuna-based Bayesian search was bypassed as it is not applicable.
                </p>
                <div style={{ background: 'var(--bg-primary)', padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'inline-block', marginTop: '1rem' }}>
                  <strong>Baseline Performance Score:</strong> {report.baseline_metric?.toFixed(4)}
                </div>
              </div>
            ) : (
              <>
                {/* Metric comparisons */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1.5rem'
                }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 600, textTransform: 'uppercase' }}>Baseline Score</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>{report.baseline_metric?.toFixed(4)}</div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 600, textTransform: 'uppercase' }}>Tuned Score</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#4caf50' }}>{report.tuned_metric?.toFixed(4)}</div>
                  </div>

                  {report.tuned_metric > report.baseline_metric && (
                    <div style={{ background: 'rgba(76, 175, 80, 0.05)', padding: '1.5rem', borderRadius: '10px', border: '1px solid #4caf50', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: '0.8rem', color: '#4caf50', fontWeight: 600, textTransform: 'uppercase' }}>Performance Gain</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#4caf50' }}>
                        +{((report.tuned_metric - report.baseline_metric) * 100).toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Hyperparameters optimized */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '1.5rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                }}>
                  <h2 style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '1.25rem' }}>🎯 Best Hyperparameters Selected</h2>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', opacity: 0.7 }}>Optuna found these parameters to be optimal across {report.n_trials} trials:</p>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '1rem',
                  }}>
                    {report.best_params && Object.entries(report.best_params).map(([param, value]: any) => (
                      <div key={param} style={{
                        background: 'var(--bg-primary)',
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 600 }}>{param}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--accent-primary)' }}>
                          {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(5) : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default HyperparameterTuning;
