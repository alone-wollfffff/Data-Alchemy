import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './styles/global.css'

// ── Auto-cleanup: delete all user project data when browser closes ──
// Uses sendBeacon which works even during unload events
window.addEventListener('beforeunload', () => {
  navigator.sendBeacon('/api/session/cleanup')
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border-2)',
          borderRadius: '10px',
          fontSize: '13px',
        },
      }}
    />
  </BrowserRouter>
)
