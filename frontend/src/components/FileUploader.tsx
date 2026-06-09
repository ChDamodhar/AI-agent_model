import React, { useState } from 'react';
import { uploadDataset } from '../services/api';

interface FileUploaderProps {
  onUpload: (file: File) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUpload }) => {
  const [selected, setSelected] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelected(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selected) return;
    try {
      await uploadDataset(selected);
      onUpload(selected);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={handleChange} />
      <button onClick={handleUpload} disabled={!selected} style={{ marginLeft: '0.5rem' }}>
        Upload
      </button>
    </div>
  );
};

export default FileUploader;
