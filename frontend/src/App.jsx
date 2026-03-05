import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ProjectProvider } from './context/ProjectContext'
import Layout      from './components/Layout'
import Welcome     from './pages/Welcome'
import Upload      from './pages/Upload'
import Operations  from './pages/Operations'
import Exploration from './pages/Exploration'
import AutoML      from './pages/AutoML'
import Downloads   from './pages/Downloads'

export default function App() {
  return (
    <ProjectProvider>
      <Layout>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/"            element={<Welcome />} />
            <Route path="/upload"      element={<Upload />} />
            <Route path="/operations"  element={<Operations />} />
            <Route path="/exploration" element={<Exploration />} />
            <Route path="/automl"      element={<AutoML />} />
            <Route path="/downloads"   element={<Downloads />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </Layout>
    </ProjectProvider>
  )
}
