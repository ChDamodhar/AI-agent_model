import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
});

// Export apiClient as 'api' for use in agent pages
export const api = apiClient;

export const healthCheck = () => apiClient.get('/');

export const uploadDataset = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/api/v1/data/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const runPipeline = (payload: { file_id: string; target_column?: string }) =>
  apiClient.post('/api/v1/pipeline/run', payload);

export const getPipelineStatus = (jobId: string) =>
  apiClient.get(`/api/v1/pipeline/status/${jobId}`);

export const sendChatMessage = (fileId: string, message: string) =>
  apiClient.post('/api/v1/data/chat', { file_id: fileId, message });

export const getDatasetPreview = (fileId: string) =>
  apiClient.get(`/api/v1/data/preview/${fileId}`);

export const getPlotUrl = (fileId: string, plotName: string) => {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/data/plot/${fileId}/${plotName}`;
};

