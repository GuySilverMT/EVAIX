import * as React from 'react';
import ReactDOM from 'react-dom/client';
import '@vscode/codicons/dist/codicon.css'; // Import locally
import { HashRouter } from 'react-router-dom'
import { httpBatchLink } from '@trpc/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SuperJSON from 'superjson';

import App from './App.js';
import { trpc } from './utils/trpc.js';
import { injectCssVariables } from './design-system/cssVariables.js';

// Initialize Theme Scopes
console.log('[main.tsx] Injecting theme scopes...');
try {
  injectCssVariables();
  console.log('[main.tsx] Theme scopes injected.');
} catch (e) {
  console.error('[main.tsx] Failed to inject theme scopes:', e);
}

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL || 'http://localhost:4000/trpc', // URL of your tRPC server
    }),
  ],
  transformer: SuperJSON,
});

console.log('[main.tsx] Rendering React app...');
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </HashRouter>
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>
);
console.log('[main.tsx] React render called.');
