import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import useServiceWorkerStore from '@/features/service-worker/stores/useServiceWorkerStore'

if (import.meta.env.PROD) {
  useServiceWorkerStore.getState().initializeServiceWorker()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
