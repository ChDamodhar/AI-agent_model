import React, { useState } from 'react';
import { uploadDataset } from '../services/api';

const Upload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus('Please select a file');
      return;
    }
    try {
      setStatus('Uploading...');
      const response = await uploadDataset(file);
      setStatus(`Uploaded successfully, dataset_id: ${response.data.dataset_id || 'N/A'}`);
    } catch (err) {
      console.error(err);
      setStatus('Upload failed');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Upload CSV</h1>
      <input type="file" accept=".csv" onChange={handleChange} />
      <button onClick={handleUpload} style={{ marginLeft: '1rem' }}>Upload</button>
      <p>{status}</p>
    </div>
  );
};

export default Upload;
