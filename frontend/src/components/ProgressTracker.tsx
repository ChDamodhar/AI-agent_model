import React from 'react';

interface ProgressTrackerProps {
  steps: Record<string, string>;
}

const STEP_ORDER = [
  { key: 'Cleaning',               icon: '🧹', desc: 'Handles missing values, duplicate entries, and caps dataset outliers.' },
  { key: 'EDA',                    icon: '🔬', desc: 'Computes statistics, correlations, and generates visualization plots.' },
  { key: 'Feature Engineering',    icon: '⚙️', desc: 'Processes categories, parses datetimes, and scales continuous features.' },
  { key: 'Model Selection',        icon: '🤖', desc: 'Splits features, fits models, and ranks performance on a leaderboard.' },
  { key: 'Hyperparameter Tuning',  icon: '⚡', desc: 'Optimizes parameters of the best model using Optuna Bayesian search.' },
  { key: 'Explainability',         icon: '🔍', desc: 'Extracts global feature importance using SHAP game-theoretic values.' },
];

const resolveStatus = (raw: string) => {
  if (['complete', 'completed', 'done'].includes(raw)) return 'complete';
  if (['running', 'in_progress'].includes(raw)) return 'running';
  return 'pending';
};

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ steps }) => {
  const completedCount = STEP_ORDER.filter(s => resolveStatus(steps[s.key] ?? 'pending') === 'complete').length;
  const pct = Math.round((completedCount / STEP_ORDER.length) * 100);

  return (
    <div>
      {/* Progress summary bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px', overflow: 'hidden', minWidth: '200px' }}>
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
              borderRadius: '99px',
              transition: 'width 0.5s ease',
              boxShadow: pct > 0 ? '0 0 8px rgba(99,102,241,0.6)' : 'none',
            }}
          />
        </div>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: pct === 100 ? 'var(--accent-success)' : 'var(--text-secondary)', minWidth: '90px' }}>
          {completedCount} / {STEP_ORDER.length} Done {pct === 100 && '🎉'}
        </span>
      </div>

      {/* Steps list */}
      <div className="stepper-container">
        {STEP_ORDER.map((step, idx) => {
          const statusClass = resolveStatus(steps[step.key] ?? 'pending');
          return (
            <div key={step.key} className={`step-item ${statusClass}`}>
              <div className="step-icon-wrapper">
                {statusClass === 'complete' ? '✔' : statusClass === 'running' ? step.icon : idx + 1}
              </div>
              <div className="step-details">
                <div className="step-title">{step.key}</div>
                <div className="step-desc">{step.desc}</div>
              </div>
              <div className="step-status-badge">
                {statusClass === 'complete' ? 'Done' : statusClass === 'running' ? 'Running' : 'Pending'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressTracker;
