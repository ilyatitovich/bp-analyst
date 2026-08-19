import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ReportApp } from './ReportApp';
import './report.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Report root element was not found.');
}

createRoot(container).render(
  <StrictMode>
    <ReportApp />
  </StrictMode>,
);
