import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3, ExternalLink, FileBarChart, ArrowLeft, ArrowRight,
  RefreshCw, Download, AlertTriangle, Zap, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageTransition from '../components/PageTransition'
import DataTable from '../components/DataTable'
import { dataApi, exploreApi } from '../api/client'
import { useProjects } from '../context/ProjectContext'

export default function Exploration() {
  const navigate = useNavigate()
  const { taskStatus, startFastPolling, refreshTaskStatus } = useProjects()

  // All async task states come from global context — no local polling
  const {
    profiling_status: profilingStatus,
    profiling_error:  profilingError,
    profile_ready:    profileReady,
    autofeat_status:  afStatus,
  } = taskStatus

  const profileLoading = profilingStatus === 'running'
  const afRunning      = afStatus === 'running'

  const [preview,          setPreview]          = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [dtaleUrl,         setDtaleUrl]         = useState(null)
  const [dtaleLoading,     setDtaleLoading]     = useState(false)
  const [dtaleUnavail,     setDtaleUnavail]     = useState(false)
  const [dtalePortBlocked, setDtalePortBlocked] = useState(false)
  const [dtaleReason,      setDtaleReason]      = useState('')
  const [reportKey, setReportKey] = useState(Date.now())

  // Refresh iframe whenever profile generation completes
  useEffect(() => {
    if (profilingStatus === 'done') {
      setReportKey(Date.now())
    }
  }, [profilingStatus])

  useEffect(() => {
    async function init() {
      try {
        const res = await dataApi.get()
        setPreview(res.data.preview)
        const dtale = res.data?.services?.dtale
        if (dtale) {
          setDtaleUnavail(!dtale.installed)
          setDtalePortBlocked(!dtale.supported)
          setDtaleReason(dtale.reason || '')
        }
      } catch (err) {
        if (err.type === 'DatasetNotLoaded' || err.type === 'NoActiveProject') {
          toast.error('No dataset loaded.')
          navigate('/upload')
        }
      } finally {
        setLoading(false)
      }
      // Sync task status from server on mount in case tasks are running
      refreshTaskStatus()
    }
    init()
  }, [navigate, refreshTaskStatus])

  async function startDtale() {
    setDtaleLoading(true)
    try {
      const res = await exploreApi.startDtale()
      const url = res.data.url
      setDtaleUrl(url)
      window.open(url, '_blank', 'noopener,noreferrer')
      toast.success('D-Tale opened in a new tab!')
    } catch (err) {
      if (err.type === 'DtalePortBlocked') {
        setDtalePortBlocked(true)
        setDtaleReason(err.details?.dtale?.reason || "Platform doesn't support dtale port here.")
        toast.error(err.details?.dtale?.reason || "Platform doesn't support dtale port here.", { duration: 6000 })
      } else if (err.code === 503) {
        setDtaleUnavail(true)
        setDtaleReason(err.details?.dtale?.reason || 'D-Tale not installed in this environment.')
        toast.error('D-Tale not installed.\nRun: pip install dtale', { duration: 6000 })
      } else {
        toast.error(`D-Tale failed: ${err.message}`)
      }
    } finally {
      setDtaleLoading(false)
    }
  }

  async function generateProfile() {
    if (profileLoading) return
    try {
      await exploreApi.generateProfile()
      toast.success('Profile generation started — results will appear automatically.')
      startFastPolling()
    } catch (err) {
      if (err.code === 409) {
        toast.success('Profile is already generating, tracking progress...')
        startFastPolling()
      } else if (err.code === 503) {
        toast.error('YData Profiling not installed.\nRun: pip install ydata-profiling', { duration: 6000 })
      } else {
        toast.error(`Profiling failed: ${err.message}`)
      }
    }
  }

  if (loading) return (
    <div className="flex-center" style={{ height: '60vh' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <RefreshCw size={24} color="var(--cyan)" />
      </motion.div>
    </div>
  )

  return (
    <PageTransition key="exploration">
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1 className="page-title">Exploration</h1>
            <p className="page-subtitle">Audit your data before training to prevent leakage and catch issues.</p>
          </div>
          {preview && (
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge-cyan">{preview.shape.rows.toLocaleString()} rows</span>
              <span className="badge badge-muted">{preview.shape.cols} cols</span>
            </div>
          )}
        </div>
      </div>

      {/* AutoFeat running info banner — no longer blocks anything */}
      <AnimatePresence>
        {afRunning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', borderRadius: 10, marginBottom: 20,
              background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.3)',
            }}
          >
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
              <Zap size={14} color="var(--cyan)" />
            </motion.div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
              <span style={{ fontWeight: 700, color: 'var(--cyan)' }}>AutoFeat is running in the background</span>
              {' '}— profile report will use the current dataset state. Results waiting in Operations.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid-2" style={{ gap: 24, marginBottom: 32 }}>

        {/* D-Tale */}
        <div className="card" style={{ borderColor: dtaleUrl ? 'var(--cyan)' : dtalePortBlocked ? 'rgba(231,76,60,0.4)' : 'var(--border)' }}>
          <div className="card-glow" />
          <div className="flex" style={{ gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
            <div className="icon-wrap icon-wrap-cyan"><BarChart3 size={20} /></div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>D-Tale Explorer</h3>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>
                Interactive spreadsheet-like interface. Filter rows, build charts, detect outliers — opens in a new tab.
              </p>
            </div>
          </div>

          {dtaleUrl && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--cyan-dim)', border: '1px solid var(--cyan)', fontSize: 12, color: 'var(--cyan)', marginBottom: 14, wordBreak: 'break-all', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: 1 }}>{dtaleUrl}</span>
              <a href={dtaleUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)' }}>
                <ExternalLink size={12} />
              </a>
            </motion.div>
          )}

          {dtaleUnavail && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.4)', fontSize: 12, color: '#e74c3c' }}>
              <strong>D-Tale not installed.</strong>{' '}
              <span style={{ color: 'var(--text-2)' }}>{dtaleReason || 'Install the package in this environment to enable it.'}</span>{' '}
              <code style={{ fontFamily: 'var(--font-mono)', color: '#f5a623' }}>pip install dtale</code>
            </motion.div>
          )}

          {dtalePortBlocked && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.4)', fontSize: 12, color: '#e74c3c', display: 'flex', gap: 8 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <div><strong>D-Tale is unavailable on this host.</strong><br />
                <span style={{ color: 'var(--text-2)', marginTop: 2, display: 'block' }}>{dtaleReason || 'This hosting platform exposes only one public port, so the D-Tale side window cannot be opened here.'}</span>
              </div>
            </motion.div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={`btn ${dtaleUrl ? 'btn-secondary' : 'btn-primary'} btn-full`}
              onClick={startDtale}
              disabled={dtaleLoading || dtaleUnavail || dtalePortBlocked}
            >
              {dtaleLoading
                ? <><span className="spinner" /> Starting...</>
                : dtaleUrl
                ? <><ExternalLink size={14} /> Reopen D-Tale</>
                : dtalePortBlocked
                ? <><BarChart3 size={14} /> Port Not Supported</>
                : <><BarChart3 size={14} /> Start D-Tale Engine</>
              }
            </button>
          </div>
        </div>

        {/* YData Profiling */}
        <div className="card" style={{ borderColor: profileReady ? 'var(--amber)' : profilingStatus === 'error' ? 'rgba(231,76,60,0.4)' : 'var(--border)' }}>
          <div className="card-glow" style={{ background: 'radial-gradient(circle at top right, var(--amber-dim) 0%, transparent 70%)' }} />
          <div className="flex" style={{ gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
            <div className="icon-wrap icon-wrap-amber"><FileBarChart size={20} /></div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>YData Profiling</h3>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>
                Auto-generates a comprehensive HTML report: distributions, correlations, missing values, duplicates.
              </p>
            </div>
          </div>

          {/* Running progress bar */}
          {profileLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={11} color="var(--amber)" />
                Generating report in background — navigate freely, you'll be notified when done.
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: '100%', background: 'linear-gradient(90deg, var(--amber), var(--red))' }} />
              </div>
            </motion.div>
          )}

          {/* Error state */}
          {profilingStatus === 'error' && profilingError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.4)', fontSize: 12, color: '#e74c3c' }}>
              <AlertTriangle size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {profilingError}
            </motion.div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={`btn ${profileReady ? 'btn-amber' : 'btn-primary'} btn-full`}
              onClick={generateProfile}
              disabled={profileLoading}
            >
              {profileLoading
                ? <><span className="spinner" /> Generating in background...</>
                : profileReady
                ? <><RefreshCw size={14} /> Regenerate Report</>
                : <><FileBarChart size={14} /> Generate Report</>
              }
            </button>
            {profileReady && (
              <a href="/api/download/profile" className="btn btn-secondary" title="Download HTML report">
                <Download size={14} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Profile iframe */}
      <AnimatePresence>
        {profileReady && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ marginBottom: 32 }}>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Profiling Report</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`${exploreApi.profileViewUrl()}?t=${reportKey}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                  <ExternalLink size={12} /> Open in New Tab
                </a>
                <a href="/api/download/profile" className="btn btn-amber btn-sm">
                  <Download size={12} /> Download
                </a>
              </div>
            </div>
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <iframe
                src={`${exploreApi.profileViewUrl()}?t=${reportKey}`}
                title="Profiling Report"
                style={{ width: '100%', height: 700, border: 'none', display: 'block' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Preview */}
      {preview && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16 }}>Dataset Preview</h3>
          <DataTable preview={preview} maxHeight={260} />
        </div>
      )}

      <div className="flex-between">
        <button className="btn btn-secondary" onClick={() => navigate('/operations')}>
          <ArrowLeft size={14} /> Back to Operations
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/automl')}>
          Next: AutoML Forge <ArrowRight size={14} />
        </button>
      </div>
    </PageTransition>
  )
}
