import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './style.css';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Analysis from './pages/Analysis';
import Copilot from './pages/Copilot';
import DataCleaning from './pages/DataCleaning';
import EDA from './pages/EDA';
import FeatureEngineering from './pages/FeatureEngineering';
import ModelSelection from './pages/ModelSelection';
import HyperparameterTuning from './pages/HyperparameterTuning';
import Explainability from './pages/Explainability';
import BusinessInsights from './pages/BusinessInsights';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/analysis" element={<Analysis />} />
      <Route path="/copilot" element={<Copilot />} />
      <Route path="/cleaning" element={<DataCleaning />} />
      <Route path="/eda" element={<EDA />} />
      <Route path="/feature-engineering" element={<FeatureEngineering />} />
      <Route path="/model-selection" element={<ModelSelection />} />
      <Route path="/tuning" element={<HyperparameterTuning />} />
      <Route path="/explainability" element={<Explainability />} />
      <Route path="/insights" element={<BusinessInsights />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

const root = ReactDOM.createRoot(document.getElementById('app') as HTMLElement);
root.render(<App />);
