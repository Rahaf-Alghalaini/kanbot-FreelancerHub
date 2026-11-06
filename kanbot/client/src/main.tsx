import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './features/auth/AuthContext';
import { ToastProvider } from './components/Toast';
import { I18nProvider, LangBoundary } from './i18n';
import { ThemeProvider } from './theme/ThemeProvider';
import { router } from './router';
import { queryClient } from './lib/queryClient';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthProvider>
              <LangBoundary>
                <RouterProvider router={router} />
              </LangBoundary>
            </AuthProvider>
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
);
