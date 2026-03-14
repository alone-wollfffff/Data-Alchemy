import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './styles/global.css'

// ── Auto-cleanup: delete project data when browser tab is genuinely closed ──
// We use the Page Visibility API + pagehide to distinguish a real close from
// a plain refresh. On a refresh, pagehide fires with event.persisted === false
// AND visibility returns to "visible" within ~1 second — so we delay the beacon.
let _cleanupTimer = null

window.addEventListener('pagehide', (e) => {
  // e.persisted === true  → page went into bfcache (back/forward); don't clean
  if (e.persisted) return
  // Schedule the beacon; cancel it if the page becomes visible again (refresh)
  _cleanupTimer = setTimeout(() => {
    navigator.sendBeacon('/api/session/cleanup')
  }, 500)
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && _cleanupTimer) {
    clearTimeout(_cleanupTimer)
    _cleanupTimer = null
  }
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
