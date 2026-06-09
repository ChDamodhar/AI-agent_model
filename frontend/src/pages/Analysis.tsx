import React, { useEffect, useState } from 'react';
import { runPipeline, getPipelineStatus } from '../services/api';
import ProgressTracker from '../components/ProgressTracker';

const Analysis: React.FC = () => {
  const [jobId, setJobId] = useState<string>('');
  const [status, setStatus] = useState<string>('Idle');
  const [steps, setSteps] = useState<Record<string, string>>({});

  const startAnalysis = async () => {
    // In a real flow, you would get the dataset_id from the upload step (e.g., via context or localStorage)
    const dummyDatasetId = 'dummy-dataset-id';
    try {
      setStatus('Starting pipeline...');
      const response = await runPipeline({ dataset_id: dummyDatasetId });
      const newJobId = response.data.job_id || response.data.id || 'unknown';
      setJobId(newJobId);
      setStatus('Pipeline started');
    } catch (e) {
      console.error(e);
      setStatus('Failed to start pipeline');
    }
  };

  // Poll for status when we have a jobId
  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await getPipelineStatus(jobId);
        const data = res.data;
        // Expected response format: { status: string, steps: { stepName: 'pending'|'running'|'complete' } }
        setStatus(data.status || 'running');
        if (data.steps) setSteps(data.steps);
      } catch (e) {
        console.error(e);
        setStatus('Error fetching status');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Analysis</h1>
      <p>Status: {status}</p>
      {!jobId && (
        <button onClick={startAnalysis}>Run Analysis</button>
      )}
      {jobId && <ProgressTracker steps={steps} />}
    </div>
  );
};

export default Analysis;
