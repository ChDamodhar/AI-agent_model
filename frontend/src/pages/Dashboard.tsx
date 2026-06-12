import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<string>('Online');

  useEffect(() => {
    setActiveFilename(localStorage.getItem('activeFilename'));
  }, []);

  return (
    <div className="app-container">
      <Navbar />
      <div className="main-content">
        {/* Top Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', padding: '4px 12px', borderRadius: '99px', border: '1px solid rgba(99, 102, 241, 0.15)', marginBottom: '0.75rem' }}>
              <span className="status-dot"></span>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#a5b4fc', letterSpacing: '0.05em' }}>AI Orchestrator {systemStatus}</span>
            </div>
            <h1>Autonomous Data Science Platform</h1>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
              Leverage multi-agent orchestration to clean, analyze, feature engineer, model, and explain your tabular datasets.
            </p>
          </div>
        </div>

        {/* Core Stats Overview */}
        <div className="dashboard-grid">
          <div className="stat-card">
            <div className="stat-card-value">100%</div>
            <div className="stat-card-label">Autonomous Execution</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>No code required. Seamless agents execution flow from raw data to SHAP explainer.</p>
          </div>
          <div className="stat-card" style={{ borderLeft: '1px solid rgba(168, 85, 247, 0.1)' }}>
            <div className="stat-card-value" style={{ background: 'linear-gradient(135deg, var(--accent-secondary) 0%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>8 Agent</div>
            <div className="stat-card-label">Specialist Swarm</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Collaborative intelligence: Cleaning, EDA, Tuning, and Explainability experts.</p>
          </div>
          <div className="stat-card" style={{ borderLeft: '1px solid rgba(16, 185, 129, 0.1)' }}>
            <div className="stat-card-value" style={{ background: 'linear-gradient(135deg, var(--accent-success) 0%, #34d399 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Optuna</div>
            <div className="stat-card-label">Bayesian Tuning</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Automated search bounds matching model classes to find optimal parameters.</p>
          </div>
        </div>

        {/* Quick Start Workspace */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)' }}>🚀 Live Workspace Quickstart</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Follow these three sequential steps to build, optimize, and explain your models.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginTop: '0.5rem' }}>
            {/* Step 1 */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '200px' }}>
              <div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--accent-primary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>01</div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Upload Data</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Load your dirty CSV dataset to instantly view column structures and previews.</p>
              </div>
              <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1.25rem' }} onClick={() => navigate('/upload')}>
                Go to Upload 📤
              </button>
            </div>

            {/* Step 2 */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '200px' }}>
              <div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--accent-secondary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>02</div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>ML Pipeline</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Execute background data cleaning, engineering, leaderboard training, and SHAP analyses.</p>
              </div>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '1.25rem' }} 
                onClick={() => navigate('/analysis')} 
                disabled={!activeFilename}
              >
                {activeFilename ? 'Run Analysis ⚙️' : 'Upload File First'}
              </button>
            </div>

            {/* Step 3 */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '200px' }}>
              <div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--accent-success)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>03</div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Dataset Copilot</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Converse with our RAG agent to extract critical insights and request business suggestions.</p>
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', marginTop: '1.25rem' }} 
                onClick={() => navigate('/copilot')} 
                disabled={!activeFilename}
              >
                {activeFilename ? 'Open Copilot 💬' : 'Upload File First'}
              </button>
            </div>
          </div>
        </div>

        {/* Currently Active Workspace widget (if active) */}
        {activeFilename && (
          <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Active Workspace</span>
              <h3 style={{ marginBottom: '0.25rem' }}>📂 {activeFilename}</h3>
              <p style={{ fontSize: '0.88rem' }}>Dataset is loaded and ready for modeling or copilot interrogation.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={() => navigate('/analysis')}>Run Pipeline</button>
              <button className="btn btn-secondary" onClick={() => navigate('/copilot')}>Ask Copilot</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
