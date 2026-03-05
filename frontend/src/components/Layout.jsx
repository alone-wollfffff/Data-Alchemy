import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FlaskConical, Upload, Settings2, BarChart3,
  Bot, Download, Sparkles, Cpu, Plus, Trash2,
  ChevronDown, ChevronUp, Loader2, FolderOpen
} from 'lucide-react'
import ChatBot from './ChatBot'
import { useProjects } from '../context/ProjectContext'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/',            icon: Sparkles,   label: 'Welcome',     step: '00' },
  { to: '/upload',      icon: Upload,     label: 'Upload',      step: '01' },
  { to: '/operations',  icon: Settings2,  label: 'Operations',  step: '02' },
  { to: '/exploration', icon: BarChart3,  label: 'Exploration', step: '03' },
  { to: '/automl',      icon: Cpu,        label: 'AutoML Forge',step: '04' },
  { to: '/downloads',   icon: Download,   label: 'Downloads',   step: '05' },
]

function StatusDot({ status }) {
  if (status === 'training') return (
    <motion.div
      animate={{ opacity: [1, 0.3, 1] }}
      transition={{ duration: 1.2, repeat: Infinity }}
      style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }}
    />
  )
  if (status === 'done') return <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
  if (status === 'error') return <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }} />
}

// ── Orbit ring (same as DeployAlchemyTeaser) ────────────────────
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
        // Use hex-based opacity like DeployAlchemyTeaser
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
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed', inset: 0, zIndex: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* Dot-grid overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(0,212,255,0.18) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
        opacity: 0.70,
      }} />

      {/* Orbit rings centred on viewport */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none', overflow: 'hidden',
      }}>
        <OrbitRing color="#00d4ff" size={420}  duration={28} />
        <OrbitRing color="#9b6dff" size={620}  duration={44} reverse />
        <OrbitRing color="#00d4ff" size={820}  duration={62} />
        <OrbitRing color="#9b6dff" size={1060} duration={80} reverse />

        {/* Breathing glow core */}
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.18, 0.35, 0.18] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: 220, height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #00d4ff28 0%, transparent 70%)',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </>
  )
}

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { projects, activeId, switchProject, deleteProject, refresh } = useProjects()
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  async function handleSwitch(id) {
    if (id === activeId) return
    await switchProject(id)
    await refresh()
    toast.success('Project switched!')
    navigate('/operations')
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this project and all its files?')) return
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

        {/* Projects Panel */}
        <div style={{ padding: '0 8px' }}>
          <button
            onClick={() => setProjectsOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 6px', borderRadius: 6, color: 'var(--text-3)',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <FolderOpen size={11} />
              Model Sessions
              <span style={{
                background: 'var(--cyan-dim)', color: 'var(--cyan)',
                borderRadius: 99, padding: '1px 6px', fontSize: 9, fontWeight: 700,
              }}>
                {projects.length}
              </span>
            </span>
            {projectsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          <AnimatePresence>
            {projectsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                {/* New Project button */}
                <button
                  onClick={() => navigate('/upload')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    width: '100%', padding: '7px 10px', borderRadius: 7,
                    background: 'var(--cyan-dim)', border: '1px dashed var(--cyan)',
                    color: 'var(--cyan)', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', marginBottom: 6, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--cyan-dim)'}
                >
                  <Plus size={13} />
                  New Model Session
                </button>

                {/* Project list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
                  {projects.length === 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '8px 10px', textAlign: 'center' }}>
                      No projects yet. Upload a CSV to start.
                    </div>
                  )}
                  {projects.map(p => {
                    const isActive = p.id === activeId
                    return (
                      <motion.div
                        key={p.id}
                        layout
                        onClick={() => handleSwitch(p.id)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 8,
                          padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                          background: isActive ? 'var(--cyan-dim)' : 'var(--surface)',
                          border: `1px solid ${isActive ? 'var(--cyan)' : 'var(--border)'}`,
                          transition: 'all 0.15s',
                          position: 'relative',
                        }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <StatusDot status={p.training_status} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12, fontWeight: 600,
                            color: isActive ? 'var(--cyan)' : 'var(--text)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>
                            {p.original_filename}
                          </div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                            {p.has_model && (
                              <span style={{ fontSize: 9, background: 'var(--green-dim, rgba(16,232,126,0.12))', color: 'var(--green)', borderRadius: 4, padding: '1px 5px' }}>
                                {p.leaderboard_count} run{p.leaderboard_count !== 1 ? 's' : ''}
                              </span>
                            )}
                            {p.training_status === 'training' && (
                              <span style={{ fontSize: 9, background: 'rgba(245,166,35,0.12)', color: 'var(--amber)', borderRadius: 4, padding: '1px 5px' }}>
                                training...
                              </span>
                            )}
                            {Object.keys(p.added_features || {}).length > 0 && (
                              <span style={{ fontSize: 9, background: 'rgba(0,212,255,0.1)', color: 'var(--cyan)', borderRadius: 4, padding: '1px 5px' }}>
                                {Object.keys(p.added_features).length} feat
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, p.id)}
                          disabled={deletingId === p.id}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-3)', padding: 2, borderRadius: 4,
                            opacity: 0.6, transition: 'all 0.15s', flexShrink: 0,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.opacity = '1' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.opacity = '0.6' }}
                          title="Delete project"
                        >
                          {deletingId === p.id ? <Loader2 size={11} className="spin" /> : <Trash2 size={11} />}
                        </button>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ flex: 1 }} />
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Bot size={12} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Powered by AutoGluon</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>© 2026 Data Alchemy v3.2</div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">{children}</main>

      {/* ── Chatbot ── */}
      <ChatBot />
    </div>
  )
}
