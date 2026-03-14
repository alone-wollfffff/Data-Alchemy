import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FlaskConical, Upload, Settings2, BarChart3,
  Bot, Download, Sparkles, Cpu, Trash2,
  Loader2, Activity, CheckCircle2, AlertCircle
} from 'lucide-react'
import ChatBot from './ChatBot'
import { useProjects } from '../context/ProjectContext'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/',            icon: Sparkles,  label: 'Welcome',      step: '00' },
  { to: '/upload',      icon: Upload,    label: 'Upload',       step: '01' },
  { to: '/operations',  icon: Settings2, label: 'Operations',   step: '02' },
  { to: '/exploration', icon: BarChart3, label: 'Exploration',  step: '03' },
  { to: '/automl',      icon: Cpu,       label: 'AutoML Forge', step: '04' },
  { to: '/downloads',   icon: Download,  label: 'Downloads',    step: '05' },
]

// ── Orbit ring ──────────────────────────────────────────────────
function OrbitRing({ color, size, duration, reverse = false }) {
  return (
    <motion.div
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
      style={{
        position: 'absolute',
        width: size, height: size,
        borderRadius: '50%',
        border: `1px solid ${color}1e`,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    >
      <div style={{
        position: 'absolute',
        top: -3, left: '50%',
        transform: 'translateX(-50%)',
        width: 5, height: 5,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 10px ${color}, 0 0 22px ${color}88`,
        opacity: 0.75,
      }} />
    </motion.div>
  )
}

// ── Global animated background ─────────────────────────────────
function GlobalBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    let raf
    let pts = []

    const resize = () => {
      cv.width  = window.innerWidth
      cv.height = window.innerHeight
      pts = Array.from({ length: 65 }, () => ({
        x:  Math.random() * cv.width,
        y:  Math.random() * cv.height,
        r:  Math.random() * 2.2 + 0.9,
        vx: (Math.random() - 0.5) * 0.30,
        vy: (Math.random() - 0.5) * 0.30,
        o:  Math.random() * 0.55 + 0.25,
      }))
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const W = cv.width, H = cv.height
      ctx.clearRect(0, 0, W, H)
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = '#00d4ff' + Math.round(p.o * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < 130) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = '#00d4ff' + Math.round((1 - d / 130) * 0.22 * 255).toString(16).padStart(2, '0')
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle, rgba(0,212,255,0.18) 1px, transparent 1px)', backgroundSize: '36px 36px', opacity: 0.70 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <OrbitRing color="#00d4ff" size={420}  duration={28} />
        <OrbitRing color="#9b6dff" size={620}  duration={44} reverse />
        <OrbitRing color="#00d4ff" size={820}  duration={62} />
        <OrbitRing color="#9b6dff" size={1060} duration={80} reverse />
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.18, 0.35, 0.18] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, #00d4ff28 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
        />
      </div>
    </>
  )
}

// ── Task row inside the Background Tasks panel ──────────────────
function TaskRow({ label, status, color, delay = 0 }) {
  const isRunning = status === 'running' || status === 'training'
  const isDone    = status === 'done'
  const isError   = status === 'error'

  if (!isRunning && !isDone && !isError) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11 }}>
      {isRunning && (
        <motion.div
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, delay }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }}
        />
      )}
      {isDone    && <CheckCircle2 size={11} color="var(--green)" style={{ flexShrink: 0 }} />}
      {isError   && <AlertCircle  size={11} color="var(--red)"   style={{ flexShrink: 0 }} />}
      <span style={{ color: isRunning ? color : isDone ? 'var(--green)' : 'var(--red)' }}>
        {label}
        {isRunning && '…'}
        {isDone    && ' — done'}
        {isError   && ' — failed'}
      </span>
    </div>
  )
}

export default function Layout({ children }) {
  const { projects, activeId, deleteProject, refresh, taskStatus } = useProjects()
  const [deletingId, setDeletingId] = useState(null)

  const { training_status, autofeat_status, profiling_status } = taskStatus

  // Show the panel whenever any task has a non-idle status worth showing
  const showTaskPanel = (
    training_status  !== 'idle' ||
    autofeat_status  !== 'idle' ||
    profiling_status !== 'idle'
  )

  const activeProject = projects.find(p => p.id === activeId) ?? null

  async function handleDelete(e, id) {
    e.stopPropagation()
    // Block deletion if this project is actively training
    if (id === activeId && training_status === 'training') {
      toast.error('Cannot delete — AutoML training is in progress. Cancel it first.')
      return
    }
    if (!confirm('Delete this project and all its files? This cannot be undone.')) return
    setDeletingId(id)
    await deleteProject(id)
    await refresh()
    toast.success('Project deleted.')
    setDeletingId(null)
  }

  return (
    <div className="app-layout">
      <GlobalBackground />

      {/* ── Sidebar ── */}
      <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon"><FlaskConical size={16} strokeWidth={2.5} /></div>
          Data Alchemy
        </div>
        <div className="sidebar-divider" />

        {/* Nav */}
        <div className="sidebar-section-label">Pipeline</div>
        <nav>
          {navItems.map(({ to, icon: Icon, label, step }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} className="nav-icon" strokeWidth={isActive ? 2.5 : 1.8} />
                  {label}
                  <span className="step-num">{step}</span>
                  {isActive && (
                    <motion.div
                      layoutId="active-indicator"
                      style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'var(--cyan)', borderRadius: '0 2px 2px 0' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-divider" style={{ margin: '12px 0' }} />

        {/* ── Active Session Card ── */}
        <div style={{ padding: '0 8px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 4px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Activity size={10} />
            Active Session
          </div>

          {activeProject ? (
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--cyan-dim)', border: '1px solid var(--cyan)',
              position: 'relative',
            }}>
              {/* Project name */}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 20 }}>
                {activeProject.name}
              </div>
              {/* Filename */}
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeProject.original_filename}
              </div>
              {/* Stats row */}
              <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                {activeProject.has_model && (
                  <span style={{ fontSize: 9, background: 'rgba(16,232,126,0.12)', color: 'var(--green)', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                    {activeProject.leaderboard_count} model run{activeProject.leaderboard_count !== 1 ? 's' : ''}
                  </span>
                )}
                {Object.keys(activeProject.added_features || {}).length > 0 && (
                  <span style={{ fontSize: 9, background: 'rgba(0,212,255,0.1)', color: 'var(--cyan)', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                    {Object.keys(activeProject.added_features).length} feat
                  </span>
                )}
                {activeProject.has_profile && (
                  <span style={{ fontSize: 9, background: 'rgba(245,166,35,0.1)', color: 'var(--amber)', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                    profile
                  </span>
                )}
              </div>

              {/* Delete button — top-right */}
              <button
                onClick={(e) => handleDelete(e, activeProject.id)}
                disabled={deletingId === activeProject.id}
                title={training_status === 'training' ? 'Cancel training before deleting' : 'Delete this project'}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-3)', padding: 3, borderRadius: 4,
                  opacity: 0.55, transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.opacity = '1' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.opacity = '0.55' }}
              >
                {deletingId === activeProject.id
                  ? <Loader2 size={11} className="spin" />
                  : <Trash2 size={11} />
                }
              </button>
            </div>
          ) : (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface)', border: '1px dashed var(--border)', fontSize: 11, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.5 }}>
              No active session.<br />
              <NavLink to="/upload" style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 600 }}>
                Upload a CSV to start →
              </NavLink>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* ── Background Tasks Panel ── */}
        <AnimatePresence>
          {showTaskPanel && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              style={{ padding: '10px 12px', margin: '0 8px 8px', borderRadius: 8, background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.18)' }}
            >
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Activity size={9} />
                Background Tasks
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <TaskRow label="AutoML Training"  status={training_status}  color="var(--amber)" delay={0}   />
                <TaskRow label="AutoFeat"         status={autofeat_status}  color="var(--cyan)"  delay={0.3} />
                <TaskRow label="Profile Report"   status={profiling_status} color="var(--green)" delay={0.6} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Bot size={12} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Powered by AutoGluon</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>© 2026 Data Alchemy v4.0</div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">{children}</main>

      {/* ── Chatbot ── */}
      <ChatBot />
    </div>
  )
}
