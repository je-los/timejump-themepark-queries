import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

console.log('[main] loaded');
const el = document.getElementById('root');
if (!el) {
  document.body.innerHTML = '<pre style="color:red">#root not found in index.html</pre>';
} else {
  createRoot(el).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
