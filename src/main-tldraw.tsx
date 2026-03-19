import React from 'react'
import ReactDOM from 'react-dom/client'
import TldrawCanvas from './components/TldrawCanvas'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TldrawCanvas />
  </React.StrictMode>,
)
