import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import AppErrorBoundary from './components/AppErrorBoundary';
import './i18n';
import './styles/global.scss';
import { isDesktop } from './utils/environment';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container not found');
}

// Electron file:// 协议下 BrowserRouter 不工作，需使用 HashRouter
const Router = isDesktop() ? HashRouter : BrowserRouter;

createRoot(container).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <Router>
        <App />
      </Router>
    </AppErrorBoundary>
  </React.StrictMode>
);
