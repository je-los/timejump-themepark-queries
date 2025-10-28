import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { AuthProvider } from './context/authcontext.jsx';

console.log('[main] loaded');
const el = document.getElementById('root');
if (!el) {
  document.body.innerHTML = '<pre style="color:red">#root not found in index.html</pre>';
} else {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
    );
}
