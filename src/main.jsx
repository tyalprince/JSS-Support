import * as Sentry from '@sentry/react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { installSearchableSelects } from './lib/searchableSelect.js'
import { scrub } from './lib/sentry-scrub.js'

// Error + performance monitoring. Disabled unless VITE_SENTRY_DSN is set.
// No session replay: this app shows families' and children's data.
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_VERCEL_ENV || import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
  beforeSend: scrub,
})

// Every dropdown gets a search box (see searchableSelect.js).
installSearchableSelects()

function AppCrashFallback() {
  return (
    <div className="app-main" style={{ textAlign: 'center' }}>
      <h2 style={{ margin: '0 0 8px' }}>Something went wrong</h2>
      <p style={{ color: 'var(--muted)', margin: '0 0 16px' }}>Please reload the page to continue.</p>
      <button
        onClick={() => window.location.reload()}
        style={{ padding: '8px 16px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}
      >
        Reload
      </button>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <Sentry.ErrorBoundary fallback={<AppCrashFallback />}>
    <App />
  </Sentry.ErrorBoundary>
)
