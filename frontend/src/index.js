import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// ─── 1) Handle GitHub‑Pages 404 redirect ──────────────────────────────────────
// When GH‑Pages can't find a route it serves public/404.html, which
// immediately redirects to /?redirect=/original/path
const basename = '/blockchain-voting-dapp';
const params = new URLSearchParams(window.location.search);
const redirectedPath = params.get('redirect');
if (redirectedPath) {
  // Ensure the path starts with the basename
  const normalizedPath = redirectedPath.startsWith(basename) 
    ? redirectedPath 
    : basename + (redirectedPath.startsWith('/') ? redirectedPath : '/' + redirectedPath);
  // Replace URL to the original path so your BrowserRouter can match it
  window.history.replaceState(null, '', normalizedPath);
}
// ─────────────────────────────────────────────────────────────────────────────

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
