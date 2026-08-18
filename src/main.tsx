import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import ErrorBoundary from './components/layout/ErrorBoundary.tsx'

// Handle Vite dynamic import chunk failures gracefully (e.g. after a new deployment)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected. Forcing page reload to fetch latest chunks...', event);
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
