import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initTheme } from './hooks/use-theme';
import './index.css';

// Apply saved theme preference before first render to avoid flash
initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

