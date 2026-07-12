import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import './styles/admin-design-system.css';
import App from './App.jsx';
import ToTop from './components/ToTop.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { queryClient } from './lib/queryClient';
import { GOOGLE_CLIENT_ID } from './config';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <BrowserRouter>
            <ToTop />
            <App />
          </BrowserRouter>
        </GoogleOAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
