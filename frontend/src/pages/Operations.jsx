import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trash2, RotateCcw, Zap, Plus, ArrowLeft, ArrowRight,
  AlertTriangle, CheckCircle2, RefreshCw, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageTransition from '../components/PageTransition'
import DataTable from '../components/DataTable'
import { dataApi, featuresApi } from '../api/client'
import { useProjects } from '../context/ProjectContext'

export default function Operations() {
  const navigate = useNavigate()
  const { refresh: refreshProjects } = useProjects()
  const [preview, setPreview]             = useState(null)
  const [loading, setLoading]             = useState(true)
  const [selected, setSelected]           = useState([])
  const [dropping, setDropping]           = useState(false)
  const [resetting, setResetting]         = useState(false)
  const [analyzing, setAnalyzing]         = useState(false)
  const [suggestions, setSuggestions]     = useState([])
  const [addingFeat, setAddingFeat]       = useState(null)
  const [validErrors, setValidErrors]     = useState({})

  const fetchData = useCallback(async () => {
    try {
      const res = await dataApi.get()
      setPreview(res.data.preview)
    } catch (err) {
      if (err.code === 422 || err.type === 'DatasetNotLoaded' || err.type === 'NoActiveProject') {
        toast.error('No dataset loaded — upload a file first.')
        navigate('/upload')
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => { fetchData() }, [fetchData])

  function toggleCol(col) {
    setSelected(s => s.includes(col) ? s.filter(c => c !== col) : [...s, col])
  }

  async function dropCols() {
    if (!selected.length) {
      toast.error('Select at least one column to remove.')
      return
    }
    setDropping(true)
    setValidErrors({})
    try {
      const res = await dataApi.dropColumns(selected)
      setPreview(res.data.preview)
      setSelected([])
      setSuggestions([])
      toast.success(res.message)
    } catch (err) {
      if (err.code === 422) {
        setValidErrors(err.details)
        toast.error(err.message)
      }
    } finally {
      setDropping(false)
    }
  }

  async function resetData() {
    setResetting(true)
    try {
      const res = await dataApi.reset()
      setPreview(res.data.preview)
      setSelected([])
      setSuggestions([])
      toast.success(res.message)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setResetting(false)
    }
  }

  async function analyze() {
    setAnalyzing(true)
    setSuggestions([])
    try {
      const res = await featuresApi.analyze()
      setSuggestions(res.data.suggestions)
      toast.success(res.message)
    } catch (err) {
      if (err.code === 422) toast.error(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  async function addFeature(feat) {
    setAddingFeat(feat)
    try {
      const res = await featuresApi.add(feat)
      setPreview(res.data.preview)
      setSuggestions(s => s.filter(f => f !== feat))
      toast.success(res.message)
      refreshProjects()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAddingFeat(null)
    }
  }

  if (loading) return (
    <div className="flex-center" style={{ height: '60vh' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <RefreshCw size={24} color="var(--cyan)" />
      </motion.div>
    </div>
  )

  const cols = preview?.columns ?? []
  const nullCols = preview?.null_counts ? Object.entries(preview.null_counts) : []

  return (
    <PageTransition key="operations">
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1 className="page-title">Operations</h1>
            <p className="page-subtitle">Clean columns, engineer features, and prepare data for training.</p>
          </div>
          {preview && (
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge-cyan">{preview.shape.rows.toLocaleString()} rows</span>
              <span className="badge badge-muted">{preview.shape.cols} cols</span>
            </div>
          )}
        </div>
      </div>

      {/* Null Warning */}
      <AnimatePresence>
        {nullCols.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="null-warning" style={{ marginBottom: 24 }}
          >
            <div className="flex" style={{ gap: 6, marginBottom: 6 }}>
              <AlertTriangle size={14} />
              <strong>{nullCols.length} column(s) with missing values detected</strong>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {nullCols.map(([col, cnt]) => (
                <span key={col} style={{ fontSize: 12 }}>
                  <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>{col}</code>
                  <span style={{ color: 'var(--text-3)' }}> ({cnt} nulls)</span>
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>

        {/* Column Removal */}
        <div className="card">
          <div className="card-glow" />
          <div className="flex-between mb-16">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              <Trash2 size={15} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--red)' }} />
              Remove Columns
            </h3>
            {selected.length > 0 && (
              <span className="badge badge-red">{selected.length} selected</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto', marginBottom: 16 }}>
            {cols.map(col => (
              <motion.div
                key={col}
                onClick={() => toggleCol(col)}
                whileHover={{ x: 2 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: selected.includes(col) ? 'var(--red-dim)' : 'var(--bg-2)',
                  border: `1px solid ${selected.includes(col) ? 'var(--red)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: 4,
                  background: selected.includes(col) ? 'var(--red)' : 'transparent',
                  border: `1.5px solid ${selected.includes(col) ? 'var(--red)' : 'var(--border-2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {selected.includes(col) && <CheckCircle2 size={10} color="white" />}
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: selected.includes(col) ? 'var(--red)' : 'var(--text-2)',
                }}>
                  {col}
                </span>
                {preview?.null_counts?.[col] && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--amber)' }}>
                    {preview.null_counts[col]} nulls
                  </span>
                )}
              </motion.div>
            ))}
          </div>

          {validErrors.columns && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{validErrors.columns}</div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-danger"
              style={{ flex: 1 }}
              onClick={dropCols}
              disabled={dropping || selected.length === 0}
            >
              {dropping ? <span className="spinner" /> : <Trash2 size={14} />}
              Remove {selected.length > 0 ? `(${selected.length})` : ''}
            </button>
            <button
              className="btn btn-secondary"
              onClick={resetData}
              disabled={resetting}
              title="Restore original upload"
            >
              {resetting ? <span className="spinner" /> : <RotateCcw size={14} />}
              Reset
            </button>
          </div>
        </div>

        {/* Feature Genius */}
        <div className="card">
          <div className="card-glow" style={{ background: 'radial-gradient(circle at top right, var(--cyan-dim) 0%, transparent 70%)' }} />
          <div className="flex-between mb-16">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              <Zap size={15} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--cyan)' }} />
              Feature Genius
            </h3>
            <span className="badge badge-cyan">AutoFeat</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.6 }}>
            Discovers symbolic math relationships (e.g.{' '}
            <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 11 }}>age²</code>,{' '}
            <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 11 }}>income×rooms</code>)
            hidden in your numeric columns. Requires ≥ 2 numeric feature columns.
          </p>

          <button
            className="btn btn-primary btn-full"
            onClick={analyze}
            disabled={analyzing}
            style={{ marginBottom: 20 }}
          >
            {analyzing ? (
              <>
                <span className="spinner" />
                Running AutoFeat...
              </>
            ) : (
              <>
                <Zap size={14} />
                Run AutoFeat Analysis
              </>
            )}
          </button>

          <AnimatePresence>
            {analyzing && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ marginBottom: 16 }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>Discovering patterns...</div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: '100%' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {suggestions.length === 0 && !analyzing && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>
              Run the analysis to discover potential new features
            </div>
          )}

          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, marginBottom: 4 }}>
                  ✨ {suggestions.length} suggested feature(s)
                </div>
                {suggestions.map(feat => (
                  <motion.div
                    key={feat}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'var(--bg-2)', border: '1px solid var(--green)',
                      borderRadius: 10, padding: '10px 14px',
                    }}
                  >
                    <code style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)', wordBreak: 'break-all' }}>
                      {feat}
                    </code>
                    <button
                      className="btn btn-green btn-sm"
                      onClick={() => addFeature(feat)}
                      disabled={addingFeat === feat}
                    >
                      {addingFeat === feat ? <span className="spinner" /> : <Plus size={12} />}
                      Add
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Data Preview */}
      {preview && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16 }}>Dataset Preview</h3>
          <DataTable preview={preview} maxHeight={280} />
        </div>
      )}

      <div className="flex-between mt-32">
        <button className="btn btn-secondary" onClick={() => navigate('/upload')}>
          <ArrowLeft size={14} /> Back to Upload
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/exploration')}>
          Next: Exploration <ArrowRight size={14} />
        </button>
      </div>
    </PageTransition>
  )
}
