import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import ErrorBoundary from './components/layout/ErrorBoundary.tsx'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createIdbPersister } from './lib/queryPersister'
import { supabase } from './lib/supabase'
import { initTelemetry } from './utils/telemetry'

// Initialize APM & client error monitoring
initTelemetry();

// Create a client with 24-hour cache time for offline readiness
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data remains fresh for 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours cache retention
      refetchOnWindowFocus: false, // Don't refetch on window focus for dashboard apps by default
    },
  },
})

const idbPersister = createIdbPersister();

// Handle Vite dynamic import chunk failures gracefully (e.g. after a new deployment)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected. Forcing page reload to fetch latest chunks...', event);
  window.location.reload();
});

// Gracefully handle browser Back-Forward Cache (bfcache) and tab freeze/unfreeze
// Prevents "WebSocket connection failed: Page entered Back-Forward Cache" error
const handleBfcacheDisconnect = () => {
  try {
    supabase.realtime?.disconnect();
  } catch {
    // ignore
  }
};

const handleBfcacheConnect = () => {
  try {
    supabase.realtime?.connect();
    queryClient.invalidateQueries();
  } catch {
    // ignore
  }
};

window.addEventListener('pagehide', handleBfcacheDisconnect);
document.addEventListener('freeze', handleBfcacheDisconnect);

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    handleBfcacheConnect();
  }
});
document.addEventListener('resume', handleBfcacheConnect);

// Register Service Worker for Progressive Web App (PWA) offline capabilities
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('PWA ServiceWorker registration failed: ', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: idbPersister,
          maxAge: 1000 * 60 * 60 * 24, // 24 hours
          buster: 'v1.0.0',
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              return query.state.status === 'success';
            },
          },
        }}
      >
        <App />
      </PersistQueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
