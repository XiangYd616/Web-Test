import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 渲染应用
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 性能监控
if (import.meta.env.DEV) {
  console.log('🔧 开发模式已启用');
}
