import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, ExternalLink, FileBarChart, ArrowLeft, ArrowRight, RefreshCw, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import PageTransition from '../components/PageTransition'
import DataTable from '../components/DataTable'
import { dataApi, exploreApi, downloadsApi } from '../api/client'

export default function Exploration() {
  const navigate = useNavigate()
  const [preview,        setPreview]        = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [dtaleUrl,       setDtaleUrl]       = useState(null)
  const [dtaleLoading,   setDtaleLoading]   = useState(false)
  const [profileReady,   setProfileReady]   = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  
  // --- CACHE BUSTING STATE ---
  // This unique timestamp ensures the browser always fetches the latest report
  const [reportKey,      setReportKey]      = useState(Date.now())

  useEffect(() => {
    async function init() {
      try {
        const res = await dataApi.get()
        setPreview(res.data.preview)
        // Check if profile already generated
        const status = await downloadsApi.status()
        if (status.data.has_profile) setProfileReady(true)
      } catch (err) {
        if (err.type === 'DatasetNotLoaded' || err.type === 'NoActiveProject') {
          toast.error('No dataset loaded.')
          navigate('/upload')
        }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [navigate])

  async function startDtale() {
    setDtaleLoading(true)
    try {
      const res = await exploreApi.startDtale()
      const url = res.data.url
      setDtaleUrl(url)
      window.open(url, '_blank', 'noopener,noreferrer')
      toast.success('D-Tale opened in a new tab!')
    } catch (err) {
      toast.error(`D-Tale failed: ${err.message}`)
    } finally {
      setDtaleLoading(false)
    }
  }

  async function generateProfile() {
    setProfileLoading(true)
    toast.loading('Generating profiling report — this may take 1-3 minutes...', { id: 'profile' })
    try {
      await exploreApi.generateProfile()
      
      // --- FORCE IFRAME REFRESH ---
      setReportKey(Date.now()) 
      
      setProfileReady(true)
      toast.success('Profiling report ready!', { id: 'profile' })
    } catch (err) {
      toast.error(`Profiling failed: ${err.message}`, { id: 'profile' })
    } finally {
      setProfileLoading(false)
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

      <div className="grid-2" style={{ gap: 24, marginBottom: 32 }}>

        {/* D-Tale */}
        <div className="card" style={{ borderColor: dtaleUrl ? 'var(--cyan)' : 'var(--border)' }}>
          <div className="card-glow" />
          <div className="flex" style={{ gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
            <div className="icon-wrap icon-wrap-cyan">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>D-Tale Explorer</h3>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>
                Interactive spreadsheet-like interface. Filter rows, build charts, detect outliers — opens in a new tab.
              </p>
            </div>
          </div>

          {dtaleUrl && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'var(--cyan-dim)', border: '1px solid var(--cyan)',
                fontSize: 12, color: 'var(--cyan)', marginBottom: 14,
                wordBreak: 'break-all', fontFamily: 'var(--font-mono)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span style={{ flex: 1 }}>{dtaleUrl}</span>
              <a href={dtaleUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)' }}>
                <ExternalLink size={12} />
              </a>
            </motion.div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={`btn ${dtaleUrl ? 'btn-secondary' : 'btn-primary'} btn-full`}
              onClick={startDtale}
              disabled={dtaleLoading}
            >
              {dtaleLoading
                ? <><span className="spinner" /> Starting...</>
                : dtaleUrl
                ? <><ExternalLink size={14} /> Reopen D-Tale</>
                : <><BarChart3 size={14} /> Start D-Tale Engine</>
              }
            </button>
          </div>
        </div>

        {/* YData Profiling */}
        <div className="card" style={{ borderColor: profileReady ? 'var(--amber)' : 'var(--border)' }}>
          <div className="card-glow" style={{ background: 'radial-gradient(circle at top right, var(--amber-dim) 0%, transparent 70%)' }} />
          <div className="flex" style={{ gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
            <div className="icon-wrap icon-wrap-amber">
              <FileBarChart size={20} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>YData Profiling</h3>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>
                Auto-generates a comprehensive HTML report: distributions, correlations, missing values, duplicates.
              </p>
            </div>
          </div>

          {profileLoading && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ marginBottom: 14 }}
            >
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>Analyzing dataset...</div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: '100%', background: 'linear-gradient(90deg, var(--amber), var(--red))' }} />
              </div>
            </motion.div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={`btn ${profileReady ? 'btn-amber' : 'btn-primary'} btn-full`}
              onClick={generateProfile}
              disabled={profileLoading}
            >
              {profileLoading
                ? <><span className="spinner" /> Generating...</>
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ marginBottom: 32 }}
          >
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Profiling Report</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  // Automatically append the timestamp to bypass the cache when opening in a new tab
                  href={`${exploreApi.profileViewUrl()}?t=${reportKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  <ExternalLink size={12} /> Open in New Tab
                </a>
                <a href="/api/download/profile" className="btn btn-amber btn-sm">
                  <Download size={12} /> Download
                </a>
              </div>
            </div>
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <iframe
                // Automatically append the timestamp here to bypass the iframe cache!
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