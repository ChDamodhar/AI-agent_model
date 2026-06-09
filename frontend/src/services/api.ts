import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

export const healthCheck = () => apiClient.get('/');
export const uploadDataset = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/api/v1/data/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const runPipeline = (payload: { dataset_id: string }) =>
  apiClient.post('/api/v1/pipeline/run', payload);
export const getPipelineStatus = (jobId: string) =>
  apiClient.get(`/api/v1/pipeline/status/${jobId}`);
export const sendChatMessage = (message: string) =>
  apiClient.post('/api/v1/chat', { message });
