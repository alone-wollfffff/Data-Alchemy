import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { projectsApi, sessionApi, statusApi } from '../api/client'

const ProjectContext = createContext(null)

const POLL_FAST = 3000
const POLL_SLOW = 20000

const INITIAL_TASK_STATUS = {
  autofeat_status: 'idle',
  autofeat_suggestions: [],
  autofeat_error: null,
  training_status: 'idle',
  training_error: null,
  leaderboards: [],
  profiling_status: 'idle',
  profiling_error: null,
  profile_ready: false,
  automl_target: null,
}

// Default per-page settings — used when no project or project just switched
const DEFAULT_PAGE_SETTINGS = {
  operations: {
    featTarget: '',         // '' means "not yet chosen"
    featProblemType: 'regression',
  },
  automl: {
    target: '',             // '' means "not yet chosen"
    config: {
      problem_type: 'auto',
      eval_metric: 'auto',
      presets: 'medium_quality',
      time_limit: 300,
      holdout_frac: 0.2,
    },
    runLabel: '',
  },
}

function anyTaskRunning(s) {
  return (
    s.autofeat_status === 'running' ||
    s.training_status === 'training' ||
    s.profiling_status === 'running'
  )
}

export function ProjectProvider({ children }) {
  const [projects,     setProjects]     = useState([])
  const [activeId,     setActiveId]     = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [taskStatus,   setTaskStatus]   = useState(INITIAL_TASK_STATUS)
  // pageSettings: { [projectId]: { operations: {...}, automl: {...} } }
  const [pageSettings, setPageSettings] = useState({})

  const pollRef     = useRef(null)
  const intervalMs  = useRef(POLL_SLOW)
  const prevStatus  = useRef(null)
  const activeIdRef = useRef(null)
  const projectsRef = useRef([])
  const cleanupSentRef = useRef(false)

  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  useEffect(() => { projectsRef.current = projects }, [projects])

  // ── Page settings helpers ─────────────────────────────────────
  // Get settings for a page, falling back to defaults
  const getPageSettings = useCallback((page) => {
    if (!activeIdRef.current) return DEFAULT_PAGE_SETTINGS[page] || {}
    return pageSettings[activeIdRef.current]?.[page] ?? DEFAULT_PAGE_SETTINGS[page] ?? {}
  }, [pageSettings])

  // Update a single key in a page's settings
  const setPageSetting = useCallback((page, key, value) => {
    const pid = activeIdRef.current
    if (!pid) return
    setPageSettings(prev => ({
      ...prev,
      [pid]: {
        ...prev[pid],
        [page]: {
          ...(DEFAULT_PAGE_SETTINGS[page] || {}),
          ...(prev[pid]?.[page] || {}),
          [key]: value,
        },
      },
    }))
  }, [])

  // Update multiple keys at once for a page
  const mergePageSettings = useCallback((page, updates) => {
    const pid = activeIdRef.current
    if (!pid) return
    setPageSettings(prev => ({
      ...prev,
      [pid]: {
        ...prev[pid],
        [page]: {
          ...(DEFAULT_PAGE_SETTINGS[page] || {}),
          ...(prev[pid]?.[page] || {}),
          ...updates,
        },
      },
    }))
  }, [])

  // ── Toasts on task transitions ────────────────────────────────
  function fireTransitionToasts(prev, next) {
    if (!prev) return
    if (prev.autofeat_status === 'running' && next.autofeat_status === 'done') {
      const n = next.autofeat_suggestions?.length || 0
      toast.success(n > 0 ? `✨ AutoFeat found ${n} new feature(s)!` : 'AutoFeat finished — no new features found.')
    }
    if (prev.autofeat_status === 'running' && next.autofeat_status === 'error') {
      toast.error(`AutoFeat failed: ${next.autofeat_error || 'Unknown error'}`)
    }
    if (prev.training_status === 'training' && next.training_status === 'done') {
      toast.success('🎉 AutoML training complete!')
    }
    if (prev.training_status === 'training' && next.training_status === 'error') {
      toast.error(`Training failed: ${next.training_error || 'Unknown error'}`)
    }
    if (prev.profiling_status === 'running' && next.profiling_status === 'done') {
      toast.success('📊 Profile report is ready!')
    }
    if (prev.profiling_status === 'running' && next.profiling_status === 'error') {
      toast.error(`Profiling failed: ${next.profiling_error || 'Unknown error'}`)
    }
  }

  // ── Polling ───────────────────────────────────────────────────
  const doPoll = useCallback(async () => {
    if (!activeIdRef.current) return
    try {
      const res = await statusApi.all()
      const next = res.data
      fireTransitionToasts(prevStatus.current, next)
      prevStatus.current = next
      setTaskStatus(next)
      const desired = anyTaskRunning(next) ? POLL_FAST : POLL_SLOW
      if (intervalMs.current !== desired) {
        intervalMs.current = desired
        clearInterval(pollRef.current)
        pollRef.current = setInterval(doPoll, desired)
      }
    } catch {
      // network hiccup — keep going
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startFastPolling = useCallback(() => {
    intervalMs.current = POLL_FAST
    clearInterval(pollRef.current)
    doPoll()
    pollRef.current = setInterval(doPoll, POLL_FAST)
  }, [doPoll])

  const refreshTaskStatus = useCallback(async () => {
    if (!activeIdRef.current) return
    try {
      const res = await statusApi.all()
      const next = res.data
      prevStatus.current = next
      setTaskStatus(next)
      if (anyTaskRunning(next)) startFastPolling()
    } catch {}
  }, [startFastPolling])

  // ── Projects ──────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const res = await projectsApi.list()
      setProjects(res.data.projects)
      setActiveId(res.data.active_id)
      activeIdRef.current = res.data.active_id
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    async function init() {
      await refresh()
      setTimeout(() => {
        intervalMs.current = POLL_SLOW
        pollRef.current = setInterval(doPoll, POLL_SLOW)
        doPoll()
      }, 400)
    }
    init()
    return () => clearInterval(pollRef.current)
  }, [refresh, doPoll])

  useEffect(() => {
    function cleanupOnBrowserClose() {
      if (cleanupSentRef.current) return
      const hasSessionProjects = projectsRef.current.length > 0 || !!activeIdRef.current
      if (!hasSessionProjects) return
      cleanupSentRef.current = true
      sessionApi.cleanupOnClose()
    }

    window.addEventListener('pagehide', cleanupOnBrowserClose)
    window.addEventListener('beforeunload', cleanupOnBrowserClose)

    return () => {
      window.removeEventListener('pagehide', cleanupOnBrowserClose)
      window.removeEventListener('beforeunload', cleanupOnBrowserClose)
    }
  }, [])

  // On project switch — reset task status & poll, but KEEP pageSettings (persisted per-pid)
  const prevActiveId = useRef(null)
  useEffect(() => {
    if (activeId && activeId !== prevActiveId.current) {
      prevActiveId.current = activeId
      prevStatus.current = null
      setTaskStatus(INITIAL_TASK_STATUS)
      refreshTaskStatus()
    }
  }, [activeId, refreshTaskStatus])

  const switchProject = async (projectId) => {
    try {
      await projectsApi.switch(projectId)
      setActiveId(projectId)
      activeIdRef.current = projectId
      setProjects(ps => ps.map(p => ({ ...p, is_active: p.id === projectId })))
    } catch (e) { console.error('Failed to switch project', e) }
  }

  const deleteProject = async (projectId) => {
    try {
      await projectsApi.delete(projectId)
      setProjects(ps => ps.filter(p => p.id !== projectId))
      if (activeId === projectId) {
        setActiveId(null)
        activeIdRef.current = null
        setTaskStatus(INITIAL_TASK_STATUS)
        prevStatus.current = null
        // Clear saved settings for this project
        setPageSettings(prev => {
          const next = { ...prev }
          delete next[projectId]
          return next
        })
      }
    } catch (e) { console.error('Failed to delete project', e) }
  }

  const activeProject = projects.find(p => p.id === activeId) ?? null

  return (
    <ProjectContext.Provider value={{
      projects, activeId, activeProject, loading,
      refresh, switchProject, deleteProject,
      taskStatus, refreshTaskStatus, startFastPolling,
      // Page settings
      getPageSettings, setPageSetting, mergePageSettings,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export const useProjects = () => {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjects must be used inside ProjectProvider')
  return ctx
}
