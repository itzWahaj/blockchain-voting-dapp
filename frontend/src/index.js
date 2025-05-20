import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// ─── 1) Handle GitHub‑Pages 404 redirect ──────────────────────────────────────
// When GH‑Pages can’t find a route it serves public/404.html, which
// immediately redirects to /?redirect=/original/path
const params = new URLSearchParams(window.location.search);
const redirectedPath = params.get('redirect');
if (redirectedPath) {
  // Replace URL to the original path so your BrowserRouter can match it
  window.history.replaceState(null, '', redirectedPath);
}
// ─────────────────────────────────────────────────────────────────────────────

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
