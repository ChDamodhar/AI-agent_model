import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { api } from '../services/api';

const Explainability: React.FC = () => {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fileId = localStorage.getItem('activeFileId');
    if (fileId) {
      setActiveFileId(fileId);
      loadOrRunExplainability(fileId);
    } else {
      setError('Please run model selection first');
    }
  }, []);

  const loadOrRunExplainability = async (fileId: string, customTarget?: string) => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch metadata first if not forcing run
      if (!customTarget) {
        const metaResponse = await api.get(`/api/v1/data/metadata/${fileId}`);
        if (metaResponse.data && metaResponse.data.explanation_report) {
          setResult({
            explanation_report: metaResponse.data.explanation_report,
            target_column: metaResponse.data.target_column || "",
            message: "Loaded existing model explanations."
          });
          setTargetColumn(metaResponse.data.target_column || "");
          setLoading(false);
          return;
        }
      }

      // 2. Auto-run explainability agent
      const response = await api.post(`/api/v1/agents/explainability`, {
        file_id: fileId,
        target_column: customTarget || targetColumn || null,
      });
      setResult(response.data);
      if (response.data.target_column) {
        setTargetColumn(response.data.target_column);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error generating model explanations');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomTargetRun = () => {
    if (activeFileId) {
      loadOrRunExplainability(activeFileId, targetColumn);
    }
  };

  const report = result?.explanation_report;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>🔍 Model Explainability</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.7 }}>Interpret predictive models and feature weights using SHAP values</p>
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
            {loading ? 'Generating...' : 'Generate Explanations'}
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
            <p style={{ margin: 0, fontWeight: 600 }}>Explainability agent is computing SHAP values...</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', opacity: 0.6 }}>This could take a minute as we compute feature contributions</p>
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
            
            {/* Explanations summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem'
            }}>
              {/* SHAP summary plot */}
              {report.shap_plot_path && (
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '1.5rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.2rem', alignSelf: 'flex-start' }}>📊 SHAP Summary Plot</h2>
                  <img
                    src={`/api/v1/data/plot/${activeFileId}/${report.shap_plot_path}`}
                    alt="SHAP summary plot"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '350px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      background: 'white',
                      padding: '0.5rem'
                    }}
                  />
                </div>
              )}

              {/* Feature importance list */}
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}>
                <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.2rem' }}>🔑 Top Predictive Features</h2>
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', opacity: 0.6 }}>
                        <th style={{ padding: '0.5rem' }}>Rank</th>
                        <th style={{ padding: '0.5rem' }}>Feature</th>
                        <th style={{ padding: '0.5rem' }}>SHAP Importance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.feature_importance && report.feature_importance.map((feat: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.5rem' }}>{idx + 1}</td>
                          <td style={{ padding: '0.5rem', fontWeight: 600 }}>{feat.feature}</td>
                          <td style={{ padding: '0.5rem', color: 'var(--accent-primary)' }}>
                            {feat.importance?.toFixed(5)}
                          </td>
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

export default Explainability;
