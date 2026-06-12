import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { api } from '../services/api';

const BusinessInsights: React.FC = () => {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fileId = localStorage.getItem('activeFileId');
    if (fileId) {
      setActiveFileId(fileId);
      loadOrRunInsights(fileId);
    } else {
      setError('Please run model selection first');
    }
  }, []);

  const loadOrRunInsights = async (fileId: string) => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch metadata first to see if insights exist
      const metaResponse = await api.get(`/api/v1/data/metadata/${fileId}`);
      if (metaResponse.data && metaResponse.data.business_insights) {
        setResult({
          insights: metaResponse.data.business_insights,
          message: "Loaded existing business insights."
        });
        setLoading(false);
        return;
      }

      // 2. Otherwise auto-run insights agent
      const response = await api.post(`/api/v1/agents/business-insights`, {
        file_id: fileId,
      });
      setResult(response.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error generating business insights');
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
      const response = await api.post(`/api/v1/agents/business-insights`, {
        file_id: activeFileId,
      });
      setResult(response.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error generating business insights');
    } finally {
      setLoading(false);
    }
  };

  const insightsList = result?.insights;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar />
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>💡 Business Insights</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.7 }}>Actionable insights and strategic recommendations based on ML analysis results</p>
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
              Re-generate Insights
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
            <p style={{ margin: 0, fontWeight: 600 }}>Business Insights agent is generating insights...</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', opacity: 0.6 }}>Synthesizing machine learning findings into strategic actions</p>
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

        {result && insightsList && (
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>Strategic Action Items</h2>
            {Array.isArray(insightsList) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {insightsList.map((insight: string, idx: number) => (
                  <div key={idx} style={{
                    display: 'flex',
                    gap: '1rem',
                    background: 'var(--bg-primary)',
                    padding: '1rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    alignItems: 'flex-start'
                  }}>
                    <span style={{
                      background: 'rgba(33, 150, 243, 0.1)',
                      color: 'var(--accent-primary)',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      flexShrink: 0
                    }}>{idx + 1}</span>
                    <span style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>{insight}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, opacity: 0.7 }}>No business insights found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessInsights;
