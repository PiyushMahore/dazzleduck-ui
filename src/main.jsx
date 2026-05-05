import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { QueryDashboardProvider } from './context/QueryDashboardContext.jsx'
import ErrorBoundary from './components/utils/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryDashboardProvider>
        <App />
      </QueryDashboardProvider>
    </ErrorBoundary>
  </StrictMode>
)
