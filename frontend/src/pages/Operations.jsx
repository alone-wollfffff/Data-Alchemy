import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trash2, RotateCcw, Zap, Plus, ArrowLeft, ArrowRight,
  AlertTriangle, CheckCircle2, RefreshCw, X, Lock
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageTransition from '../components/PageTransition'
import DataTable from '../components/DataTable'
import { dataApi, featuresApi } from '../api/client'
import { useProjects } from '../context/ProjectContext'

export default function Operations() {
  const navigate  = useNavigate()
  const {
    refresh: refreshProjects,
    activeProject,
    taskStatus,
    startFastPolling,
    refreshTaskStatus,
    getPageSettings,
    setPageSetting,
    activeId,
  } = useProjects()

  const {
    autofeat_status: afStatus,
    autofeat_suggestions: suggestions,
    autofeat_error: afError,
    training_status: trainingStatus,
  } = taskStatus

  const analyzing    = afStatus === 'running'
  const trainingLock = trainingStatus === 'training'

  // ── Page-persisted state (survives navigation) ────────────────
  // Read initial values from context (defaults: '' for target, 'regression' for type)
  const savedSettings = getPageSettings('operations')
  const [featTarget,      setFeatTargetLocal]      = useState(savedSettings.featTarget      ?? '')
  const [featProblemType, setFeatProblemTypeLocal] = useState(savedSettings.featProblemType ?? 'regression')

  // Wrap setters so every change is also persisted in context
  function setFeatTarget(v) {
    setFeatTargetLocal(v)
    setPageSetting('operations', 'featTarget', v)
  }
  function setFeatProblemType(v) {
    setFeatProblemTypeLocal(v)
    setPageSetting('operations', 'featProblemType', v)
  }

  // Local-only state (doesn't need to survive navigation)
  const [preview,      setPreview]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [selected,     setSelected]     = useState([])
  const [dropping,     setDropping]     = useState(false)
  const [resetting,    setResetting]    = useState(false)
  const [addingFeat,   setAddingFeat]   = useState(null)
  const [addedFeats,   setAddedFeats]   = useState(new Set())
  const [validErrors,  setValidErrors]  = useState({})
  // inline validation warning for target
  const [targetWarn,   setTargetWarn]   = useState(false)

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

  useEffect(() => {
    fetchData()
    refreshTaskStatus()
  }, [fetchData, refreshTaskStatus])

  // Sync saved settings back into local state when active project changes
  // (e.g. user refreshes page — context reloads defaults)
  useEffect(() => {
    const s = getPageSettings('operations')
    setFeatTargetLocal(s.featTarget ?? '')
    setFeatProblemTypeLocal(s.featProblemType ?? 'regression')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  useEffect(() => {
    const visibleColumns = new Set(preview?.columns || [])
    const persisted = new Set()
    Object.entries(activeProject?.added_features || {}).forEach(([columnName, formula]) => {
      if (visibleColumns.has(columnName)) persisted.add(formula)
    })
    setAddedFeats(persisted)
  }, [activeProject, preview])

  function toggleCol(col) {
    setSelected(s => s.includes(col) ? s.filter(c => c !== col) : [...s, col])
  }

  async function dropCols() {
    if (!selected.length) { toast.error('Select at least one column to remove.'); return }
    setDropping(true); setValidErrors({})
    try {
      const res = await dataApi.dropColumns(selected)
      setPreview(res.data.preview)
      // If dropped target column, reset selection
      if (selected.includes(featTarget)) setFeatTarget('')
      setSelected([])
      await refreshProjects()
      toast.success(res.message)
    } catch (err) {
      if (err.code === 409) toast.error(err.message)
      else if (err.code === 422) { setValidErrors(err.details); toast.error(err.message) }
    } finally { setDropping(false) }
  }

  async function resetData() {
    setResetting(true)
    try {
      const res = await dataApi.reset()
      setPreview(res.data.preview)
      setSelected([])
      setFeatTarget('')  // reset target after data reset
      await refreshProjects()
      toast.success(res.message)
    } catch (err) {
      toast.error(err.message)
    } finally { setResetting(false) }
  }

  async function analyze() {
    if (analyzing) return
    // Validate: must have a target column selected
    if (!featTarget) {
      setTargetWarn(true)
      toast.error('Please select a target column before running AutoFeat.')
      return
    }
    setTargetWarn(false)
    try {
      await featuresApi.analyze(featTarget, featProblemType)
      toast.success('AutoFeat started in background — results will appear automatically.')
      startFastPolling()
    } catch (err) {
      if (err.code === 409) {
        toast.success('AutoFeat is already running, tracking progress…')
        startFastPolling()
      } else {
        toast.error(err.message || 'AutoFeat failed to start.')
      }
    }
  }

  async function cancelAutofeat() {
    try {
      await featuresApi.cancel()
      toast.success('AutoFeat cancelled.')
      startFastPolling()
    } catch { toast.error('Failed to cancel AutoFeat.') }
  }

  async function addFeature(feat) {
    setAddingFeat(feat)
    try {
      const res = await featuresApi.add(feat)
      setPreview(res.data.preview)
      setAddedFeats(prev => new Set(prev).add(feat))
      toast.success(res.message)
      await refreshProjects()
      startFastPolling()
    } catch (err) {
      toast.error(err.message)
    } finally { setAddingFeat(null) }
  }

  if (loading) return (
    <div className="flex-center" style={{ height: '60vh' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <RefreshCw size={24} color="var(--cyan)" />
      </motion.div>
    </div>
  )

  const cols     = preview?.columns ?? []
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

      {/* Training Lock Banner */}
      <AnimatePresence>
        {trainingLock && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 10, marginBottom: 20, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.5)' }}
          >
            <Lock size={15} color="var(--amber)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--amber)' }}>AutoML training is running in the background</span>
              <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 8 }}>— Dataset is locked until training finishes or is cancelled.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Null Warning */}
      <AnimatePresence>
        {nullCols.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="null-warning" style={{ marginBottom: 24 }}>
            <div className="flex" style={{ gap: 6, marginBottom: 6 }}>
              <AlertTriangle size={14} />
              <strong>{nullCols.length} column(s) with missing values</strong>
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
        <div className="card" style={{ opacity: trainingLock ? 0.6 : 1, transition: 'opacity 0.2s' }}>
          <div className="card-glow" />
          <div className="flex-between mb-16">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              <Trash2 size={15} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--red)' }} />
              Remove Columns
            </h3>
            {selected.length > 0 && <span className="badge badge-red">{selected.length} selected</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto', marginBottom: 16 }}>
            {cols.map(col => (
              <motion.div
                key={col}
                onClick={() => !trainingLock && toggleCol(col)}
                whileHover={trainingLock ? {} : { x: 2 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: selected.includes(col) ? 'var(--red-dim)' : 'var(--bg-2)',
                  border: `1px solid ${selected.includes(col) ? 'var(--red)' : 'var(--border)'}`,
                  cursor: trainingLock ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 16, height: 16, borderRadius: 4, background: selected.includes(col) ? 'var(--red)' : 'transparent', border: `1.5px solid ${selected.includes(col) ? 'var(--red)' : 'var(--border-2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {selected.includes(col) && <CheckCircle2 size={10} color="white" />}
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: selected.includes(col) ? 'var(--red)' : col === featTarget ? 'var(--cyan)' : 'var(--text-2)' }}>
                  {col}
                  {col === featTarget && <span style={{ fontSize: 10, marginLeft: 5, opacity: 0.7 }}>(target)</span>}
                </span>
                {preview?.null_counts?.[col] && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--amber)' }}>
                    {preview.null_counts[col]} nulls
                  </span>
                )}
              </motion.div>
            ))}
          </div>

          {validErrors.columns && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{validErrors.columns}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={dropCols} disabled={dropping || selected.length === 0 || trainingLock}>
              {dropping ? <span className="spinner" /> : <Trash2 size={14} />}
              Remove {selected.length > 0 ? `(${selected.length})` : ''}
            </button>
            <button className="btn btn-secondary" onClick={resetData} disabled={resetting || trainingLock} title={trainingLock ? 'Training in progress' : 'Restore original upload'}>
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
            Discovers symbolic math relationships hidden in numeric columns. Runs in background — navigate freely.
          </p>

          {/* Target Column */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ fontSize: 11 }}>
              Target Column <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>
            </label>
            <select
              className="form-select"
              value={featTarget}
              onChange={e => { setFeatTarget(e.target.value); setTargetWarn(false) }}
              style={{ fontSize: 12, borderColor: targetWarn ? 'var(--red)' : undefined }}
              disabled={analyzing}
            >
              <option value="">— Select target column —</option>
              {cols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <AnimatePresence>
              {targetWarn && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, color: 'var(--red)' }}>
                  <AlertTriangle size={11} />
                  Please select a target column before running AutoFeat.
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Problem Type */}
          <div style={{ marginBottom: 18 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Problem Type</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {[
                { value: 'regression',     label: '📈 Regression',     desc: 'Continuous target' },
                { value: 'classification', label: '🏷️ Classification', desc: 'Categorical target' },
              ].map(pt => (
                <div
                  key={pt.value}
                  onClick={() => !analyzing && setFeatProblemType(pt.value)}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 8,
                    cursor: analyzing ? 'not-allowed' : 'pointer',
                    background: featProblemType === pt.value ? 'var(--cyan-dim)' : 'var(--bg-2)',
                    border: `1px solid ${featProblemType === pt.value ? 'var(--cyan)' : 'var(--border)'}`,
                    transition: 'all 0.15s', opacity: analyzing ? 0.6 : 1,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 12, color: featProblemType === pt.value ? 'var(--cyan)' : 'var(--text)' }}>{pt.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{pt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {!analyzing ? (
            <button className="btn btn-primary btn-full" onClick={analyze} style={{ marginBottom: 20 }}>
              <Zap size={14} /> Run AutoFeat Analysis
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <motion.button className="btn btn-primary btn-full" disabled style={{ position: 'relative', overflow: 'hidden' }}>
                <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }}
                  animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.5, repeat: Infinity }} />
                <span className="spinner" /> Running AutoFeat…
              </motion.button>
              <button className="btn btn-secondary btn-full" onClick={cancelAutofeat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <X size={14} /> Cancel AutoFeat
              </button>
            </div>
          )}

          <AnimatePresence>
            {analyzing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>
                  Discovering patterns in background — you can navigate freely…
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: '100%' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {afStatus === 'error' && afError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>
              <AlertTriangle size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {afError}
            </motion.div>
          )}

          {suggestions.length === 0 && !analyzing && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>
              {featTarget
                ? 'Run the analysis to discover potential new features'
                : 'Select a target column above, then run the analysis'}
            </div>
          )}

          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, marginBottom: 4 }}>
                  ✨ {suggestions.length} suggested feature(s)
                  {trainingLock && <span style={{ color: 'var(--amber)', fontWeight: 400, marginLeft: 8, fontSize: 11 }}>(locked — training in progress)</span>}
                </div>
                {suggestions.map(feat => {
                  const isAdded = addedFeats.has(feat)
                  return (
                  <motion.div key={feat} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-2)', border: `1px solid ${isAdded ? 'var(--cyan)' : trainingLock ? 'var(--border)' : 'var(--green)'}`, borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isAdded ? 'var(--cyan)' : trainingLock ? 'var(--text-3)' : 'var(--green)', wordBreak: 'break-all' }}>{feat}</code>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span className={isAdded ? 'badge badge-cyan' : 'badge badge-muted'} style={{ fontSize: 10 }}>
                          {isAdded ? 'Added to dataset' : 'Not added yet'}
                        </span>
                        {isAdded && (
                          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                            This status is saved with the project.
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className={isAdded ? 'btn btn-secondary btn-sm' : 'btn btn-green btn-sm'}
                      onClick={() => !isAdded && addFeature(feat)}
                      disabled={addingFeat === feat || trainingLock || isAdded}
                      title={trainingLock ? 'Training in progress' : isAdded ? 'Already added to dataset' : undefined}
                      style={isAdded ? { cursor: 'default', opacity: 0.7 } : undefined}
                    >
                      {addingFeat === feat
                        ? <span className="spinner" />
                        : isAdded
                          ? <><CheckCircle2 size={12} /> Added</>
                          : <><Plus size={12} /> Add</>
                      }
                    </button>
                  </motion.div>
                  )
                })}
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
        <button className="btn btn-secondary" onClick={() => navigate('/upload')}><ArrowLeft size={14} /> Back to Upload</button>
        <button className="btn btn-primary" onClick={() => navigate('/exploration')}>Next: Exploration <ArrowRight size={14} /></button>
      </div>
    </PageTransition>
  )
}
