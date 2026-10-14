import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import ErrorBoundary from './components/layout/ErrorBoundary.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data remains fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Cache kept for 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus for dashboard apps by default
    },
  },
})

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
