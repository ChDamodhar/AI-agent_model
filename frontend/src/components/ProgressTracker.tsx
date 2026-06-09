import React from 'react';

interface ProgressTrackerProps {
  steps: Record<string, string>;
}

const stepOrder = [
  'Cleaning',
  'EDA',
  'Feature Engineering',
  'Model Selection',
  'Hyperparameter Tuning',
];

const statusIcon = (status: string) => {
  switch (status) {
    case 'complete':
    case 'completed':
    case 'done':
      return '✔';
    case 'running':
    case 'in_progress':
      return '⏳';
    default:
      return '⌛';
  }
};

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ steps }) => {
  return (
    <div style={{ marginTop: '1rem' }}>
      <h2>Pipeline Progress</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {stepOrder.map((step) => (
          <li key={step} style={{ marginBottom: '0.5rem' }}>
            {statusIcon(steps[step] ?? 'pending')} {step}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProgressTracker;
