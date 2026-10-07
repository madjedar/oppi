import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import NotFound from './components/NotFound'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import AnalyticsProvider from './components/AnalyticsProvider'

// Simple routing based on pathname for the SPA
const currentPath = window.location.pathname;
const isRoot = currentPath === '/' || 
               currentPath === '/index.html' || 
               window.location.search.length > 0 || 
               window.location.hash.length > 0;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AnalyticsProvider />
      {isRoot ? (
        <App />
      ) : (
        <AuthProvider>
          <LanguageProvider>
            <NotFound />
          </LanguageProvider>
        </AuthProvider>
      )}
    </ErrorBoundary>
  </StrictMode>,
)
