import React from 'react'
import ReactDOM from 'react-dom/client'
import AppWrapper from './AppWrapper.tsx'
import { setupServiceWorkerUpdates } from './serviceWorkerRegistration'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
)

setupServiceWorkerUpdates()
