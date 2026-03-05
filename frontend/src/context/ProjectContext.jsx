import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { projectsApi } from '../api/client'

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await projectsApi.list()
      setProjects(res.data.projects)
      setActiveId(res.data.active_id)
    } catch {
      // Server not ready yet — ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const switchProject = async (projectId) => {
    try {
      await projectsApi.switch(projectId)
      setActiveId(projectId)
      setProjects(ps => ps.map(p => ({ ...p, is_active: p.id === projectId })))
    } catch (e) {
      console.error('Failed to switch project', e)
    }
  }

  const deleteProject = async (projectId) => {
    try {
      await projectsApi.delete(projectId)
      setProjects(ps => ps.filter(p => p.id !== projectId))
      if (activeId === projectId) setActiveId(null)
    } catch (e) {
      console.error('Failed to delete project', e)
    }
  }

  const activeProject = projects.find(p => p.id === activeId) ?? null

  return (
    <ProjectContext.Provider value={{ projects, activeId, activeProject, loading, refresh, switchProject, deleteProject }}>
      {children}
    </ProjectContext.Provider>
  )
}

export const useProjects = () => {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjects must be used inside ProjectProvider')
  return ctx
}
