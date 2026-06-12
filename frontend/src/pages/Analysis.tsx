import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import ProgressTracker from '../components/ProgressTracker';
import { runPipeline, getPipelineStatus, getPlotUrl } from '../services/api';

const Analysis: React.FC = () => {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string>('');
  const [status, setStatus] = useState<string>('idle');
  const [steps, setSteps] = useState<Record<string, string>>({});
  const [metadata, setMetadata] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [activeTab, setActiveTab] = useState<string>('stepper');

  useEffect(() => {
    const fileId = localStorage.getItem('activeFileId');
    const filename = localStorage.getItem('activeFilename');
    setActiveFileId(fileId);
    setActiveFilename(filename);

    const savedJobId = localStorage.getItem('activeJobId');
    if (savedJobId) {
      setJobId(savedJobId);
      setStatus('running');
    }
  }, []);

  const startAnalysis = async () => {
    if (!activeFileId) return;
    try {
      setStatus('starting');
      setErrorMsg('');
      setMetadata(null);
      setSteps({});
      setActiveTab('stepper');

      const response = await runPipeline({ file_id: activeFileId });
      const newJobId = response.data.job_id;
      setJobId(newJobId);
      localStorage.setItem('activeJobId', newJobId);
      setStatus('running');
    } catch (e: any) {
      setStatus('failed');
      setErrorMsg(e.response?.data?.detail || 'Failed to start the ML pipeline.');
    }
  };

  // Poll for pipeline status every 2.5s
  useEffect(() => {
    if (!jobId || status === 'completed' || status === 'failed' || status === 'idle') return;

    const interval = setInterval(async () => {
      try {
        const res = await getPipelineStatus(jobId);
        const data = res.data;

        setStatus(data.status || 'running');
        if (data.steps) setSteps(data.steps);

        if (data.status === 'completed') {
          setMetadata(data.metadata);
          clearInterval(interval);
          setActiveTab('insights');
        } else if (data.status === 'failed') {
          setErrorMsg(data.metadata?.error || 'Pipeline execution failed.');
          clearInterval(interval);
        }
      } catch {
        setStatus('failed');
        setErrorMsg('Communication error with status API.');
        clearInterval(interval);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [jobId, status]);

  const getRankBadgeClass = (idx: number) => ['rank-1','rank-2','rank-3'][idx] ?? 'rank-other';
  const getRankLabel = (idx: number) => ['1st','2nd','3rd'][idx] ?? `${idx + 1}th`;

  const statusColor = () => {
    if (status === 'completed') return 'var(--accent-success)';
    if (status === 'failed') return 'var(--accent-error)';
    if (status === 'running') return 'var(--accent-primary)';
    return 'var(--text-secondary)';
  };

  const TABS = [
    { id: 'stepper',       label: '⚙️ Progress',       gated: false },
    { id: 'insights',      label: '💡 AI Insights',    gated: true  },
    { id: 'leaderboard',   label: '🏆 Leaderboard',    gated: true  },
    { id: 'explainability',label: '🔍 SHAP',           gated: true  },
    { id: 'plots',         label: '📈 EDA Charts',     gated: true  },
  ];

  return (
    <div className="app-container">
      <Navbar />
      <div className="main-content">

        {/* Page Header */}
        <div>
          <h1>Machine Learning Training Pipeline</h1>
          <p style={{ marginTop: '0.5rem' }}>
            {activeFilename
              ? <>Executing autonomous analysis on <strong style={{ color: 'var(--text-primary)' }}>{activeFilename}</strong></>
              : 'Upload a dataset first to run the automated ML pipeline.'}
          </p>
        </div>

        {/* No dataset guard */}
        {!activeFileId && (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
            <h3 style={{ marginBottom: '0.5rem' }}>No Dataset Selected</h3>
            <p>Upload a CSV file first before running model training pipelines.</p>
            <a href="/upload" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>Go to Upload</a>
          </div>
        )}

        {activeFileId && (
          <>
            {/* Pipeline Controller Card */}
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <h2>Pipeline Controller</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
                  {(status === 'running' || status === 'starting') && (
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent-primary)', display: 'inline-block', boxShadow: '0 0 10px var(--accent-primary)', animation: 'pulse-border 1.5s infinite' }} />
                  )}
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: statusColor() }}>
                    {status.toUpperCase()}
                  </span>
                </div>
                {errorMsg && (
                  <div style={{ marginTop: '0.5rem', padding: '0.6rem 1rem', background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '10px', color: 'var(--accent-error)', fontSize: '0.88rem', maxWidth: '480px' }}>
                    ⚠️ {errorMsg}
                  </div>
                )}
              </div>
              <button
                className="btn btn-primary"
                onClick={startAnalysis}
                disabled={status === 'running' || status === 'starting'}
                style={{ minWidth: '180px' }}
              >
                {status === 'running' || status === 'starting' ? '⏳ Running...' : '▶ Run ML Pipeline'}
              </button>
            </div>

            {/* Tabs — always show stepper, rest gated on completion */}
            <div className="tabs-header">
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                  disabled={t.gated && !metadata}
                  style={{ opacity: t.gated && !metadata ? 0.4 : 1, cursor: t.gated && !metadata ? 'not-allowed' : 'pointer' }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Tab: Stepper ── */}
            {activeTab === 'stepper' && (
              <div className="glass-card">
                <h3 style={{ marginBottom: '1.25rem', fontFamily: 'var(--font-heading)' }}>🤖 Agent Node Stepper</h3>
                <ProgressTracker steps={steps} />
                {status === 'idle' && Object.keys(steps).length === 0 && (
                  <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                    Press <strong>"Run ML Pipeline"</strong> to begin. Each node will update in real-time as agents execute.
                  </p>
                )}
              </div>
            )}

            {/* ── Tab: AI Insights ── */}
            {activeTab === 'insights' && metadata && (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2>💡 Autonomous Business Insights</h2>
                    <p style={{ fontSize: '0.9rem' }}>AI-generated strategic observations based on modeling and data structure findings.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <a href={`/api/v1/data/report/download/${activeFileId}/pdf`} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">📄 PDF Report</a>
                    <a href={`/api/v1/data/report/download/${activeFileId}/pptx`} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">📊 PPTX Deck</a>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {(metadata.business_insights || []).length === 0
                    ? <p style={{ color: 'var(--text-muted)' }}>No insights generated yet.</p>
                    : (metadata.business_insights || []).map((insight: string, idx: number) => (
                      <div key={idx} className="insight-card">
                        <p style={{ color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.65 }}>{insight}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ── Tab: Leaderboard ── */}
            {activeTab === 'leaderboard' && metadata && (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h2>🏆 Model Leaderboard</h2>
                  <p style={{ fontSize: '0.9rem' }}>
                    Comparative ranking of predictors evaluated on target column&nbsp;
                    <strong style={{ color: 'var(--text-primary)' }}>{metadata.target_column}</strong>.
                  </p>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Model</th>
                        {metadata.model_selection?.problem_type === 'classification' ? (
                          <><th>Accuracy</th><th>F1 Score</th><th>ROC-AUC</th></>
                        ) : (
                          <><th>R² Score</th><th>MSE</th><th>MAE</th></>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(metadata.model_selection?.leaderboard || []).map((row: any, idx: number) => {
                        const isBest = row.model_name === metadata.model_selection?.best_model_name;
                        return (
                          <tr key={idx} style={isBest ? { background: 'rgba(99,102,241,0.04)', fontWeight: 700 } : {}}>
                            <td><span className={`rank-badge ${getRankBadgeClass(idx)}`}>{getRankLabel(idx)}</span></td>
                            <td style={{ color: 'var(--text-primary)' }}>
                              {row.model_name}{isBest && <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 800 }}>⭐ BEST</span>}
                            </td>
                            {metadata.model_selection?.problem_type === 'classification' ? (
                              <>
                                <td><span style={{ color: 'var(--accent-success)', fontWeight: 700 }}>{(row.accuracy * 100).toFixed(1)}%</span></td>
                                <td>{row.f1_score?.toFixed(4)}</td>
                                <td>{row.roc_auc?.toFixed(4)}</td>
                              </>
                            ) : (
                              <>
                                <td><span style={{ color: 'var(--accent-success)', fontWeight: 700 }}>{row.r2_score?.toFixed(4)}</span></td>
                                <td>{row.mse?.toFixed(2)}</td>
                                <td>{row.mae?.toFixed(2)}</td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Optuna Tuning Results Panel */}
                {metadata.tuning_report && (
                  <div style={{ marginTop: '0.5rem', padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '16px', background: 'rgba(255,255,255,0.01)' }}>
                    <h4 style={{ color: 'var(--accent-secondary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontSize: '1rem' }}>
                      ⚡ Optuna Hyperparameter Tuning Results
                    </h4>
                    {metadata.tuning_report.tunable ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Baseline Score</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{metadata.tuning_report.baseline_metric?.toFixed(4)}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '1.5rem' }}>→</div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Tuned Score</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-success)' }}>{metadata.tuning_report.tuned_metric?.toFixed(4)}</div>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Trials</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{metadata.tuning_report.n_trials}</div>
                          </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--mono)', border: '1px solid var(--border-color)' }}>
                          Best Params: {JSON.stringify(metadata.tuning_report.best_params)}
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Linear models are not eligible for Optuna-based hyperparameter searches. Baseline scores returned unchanged.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: SHAP Explainability ── */}
            {activeTab === 'explainability' && metadata && (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <div>
                  <h2>🔍 Global Feature Explainability (SHAP)</h2>
                  <p style={{ fontSize: '0.9rem' }}>Game-theoretic SHAP values showing each feature's mean absolute contribution to predictions.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
                  {/* Feature importance table */}
                  <div>
                    <h4 style={{ marginBottom: '0.75rem', fontFamily: 'var(--font-heading)' }}>Feature Rankings</h4>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr><th>#</th><th>Feature</th><th>SHAP Impact</th></tr>
                        </thead>
                        <tbody>
                          {(metadata.explainability_report?.feature_importance || []).slice(0, 12).map((feat: any, idx: number) => {
                            const maxImp = (metadata.explainability_report?.feature_importance?.[0]?.importance || 1);
                            const pct = ((feat.importance / maxImp) * 100).toFixed(0);
                            return (
                              <tr key={idx}>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{idx + 1}</td>
                                <td style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{feat.feature}</td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px', overflow: 'hidden' }}>
                                      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', borderRadius: '99px' }} />
                                    </div>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', minWidth: '55px' }}>{feat.importance.toFixed(5)}</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* SHAP beeswarm plot */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <h4 style={{ fontFamily: 'var(--font-heading)' }}>SHAP Beeswarm Summary</h4>
                    <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '14px', border: '1px solid var(--border-color)', width: '100%' }}>
                      <img
                        src={getPlotUrl(activeFileId!, 'shap_summary.png')}
                        alt="SHAP summary plot"
                        style={{ width: '100%', maxHeight: '340px', objectFit: 'contain' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab: EDA Charts ── */}
            {activeTab === 'plots' && metadata && (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <div>
                  <h2>📈 Exploratory Analysis Charts</h2>
                  <p style={{ fontSize: '0.9rem' }}>Visual distributions and linear correlations mapped from the cleaned dataset.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                  {[
                    { key: 'correlation.png', title: 'Correlation Heatmap' },
                    { key: 'target_dist.png', title: `Target Distribution (${metadata.target_column || ''})` },
                  ].map(({ key, title }) => (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <h4 style={{ fontFamily: 'var(--font-heading)' }}>{title}</h4>
                      <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '14px', border: '1px solid var(--border-color)', width: '100%' }}>
                        <img
                          src={getPlotUrl(activeFileId!, key)}
                          alt={title}
                          style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Analysis;
