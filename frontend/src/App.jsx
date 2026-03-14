import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ProjectProvider, useProjects } from './context/ProjectContext'
import Layout      from './components/Layout'

const Welcome = lazy(() => import('./pages/Welcome'))
const Upload = lazy(() => import('./pages/Upload'))
const Operations = lazy(() => import('./pages/Operations'))
const Exploration = lazy(() => import('./pages/Exploration'))
const AutoML = lazy(() => import('./pages/AutoML'))
const Downloads = lazy(() => import('./pages/Downloads'))

function RouteFallback() {
  return (
    <div className="flex-center" style={{ minHeight: '55vh' }}>
      <div className="card" style={{ minWidth: 220, textAlign: 'center', padding: '26px 22px' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Loading workspace...</div>
      </div>
    </div>
  )
}

function RequireProject({ children }) {
  const { activeProject, loading } = useProjects()
  if (loading) return null
  return activeProject ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <ProjectProvider>
      <Layout>
        <Suspense fallback={<RouteFallback />}>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/"            element={<Welcome />} />
              <Route path="/upload"      element={<Upload />} />
              <Route path="/operations"  element={<RequireProject><Operations /></RequireProject>} />
              <Route path="/exploration" element={<RequireProject><Exploration /></RequireProject>} />
              <Route path="/automl"      element={<RequireProject><AutoML /></RequireProject>} />
              <Route path="/downloads"   element={<RequireProject><Downloads /></RequireProject>} />
              <Route path="*"            element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </Layout>
    </ProjectProvider>
  )
}
