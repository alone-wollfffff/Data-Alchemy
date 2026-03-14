import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, Info, CheckCircle2, AlertTriangle, Tag,
  ChevronDown, ChevronUp, Plus, AlertOctagon, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageTransition from '../components/PageTransition'
import DropZone from '../components/DropZone'
import DataTable from '../components/DataTable'
import { uploadApi, dataApi } from '../api/client'
import { useProjects } from '../context/ProjectContext'

export default function Upload() {
  const navigate    = useNavigate()
  const { refresh, activeProject, taskStatus } = useProjects()

  const [uploading,       setUploading]       = useState(false)
  const [progress,        setProgress]        = useState(0)
  const [preview,         setPreview]         = useState(null)
  const [filename,        setFilename]        = useState('')
  const [modelName,       setModelName]       = useState('')
  const [validErr,        setValidErr]        = useState(null)
  const [projectName,     setProjectName]     = useState('')
  const [nullExpanded,    setNullExpanded]    = useState(true)
  // Controls the "replace existing session?" warning overlay
  const [showReplaceWarn, setShowReplaceWarn] = useState(false)
  const [pendingFile,     setPendingFile]     = useState(null)

  const { training_status, autofeat_status, profiling_status } = taskStatus
  const hasActiveTasks = training_status === 'training' || autofeat_status === 'running' || profiling_status === 'running'

  // On mount / project change: restore preview for already-active project
  useEffect(() => {
    async function restore() {
      try {
        const res = await dataApi.get()
        const proj = res.data?.project
        const prev = res.data?.preview
        if (prev) {
          setPreview(prev)
          setFilename(proj?.original_filename || '')
          setProjectName(proj?.name || '')
          setModelName('')   // clear so name field is fresh for any new session
        }
      } catch {
        // No active project yet — start empty
        setPreview(null)
        setFilename('')
        setProjectName('')
      }
    }
    restore()
  }, [activeProject?.id]) // re-run when active project changes

  // Called by DropZone — intercept if a session already exists
  function handleFileDrop(file) {
    if (preview) {
      // Already have an active session — ask first
      setPendingFile(file)
      setShowReplaceWarn(true)
    } else {
      doUpload(file)
    }
  }

  // User confirmed they want to replace
  function confirmReplace() {
    setShowReplaceWarn(false)
    if (pendingFile) doUpload(pendingFile)
    setPendingFile(null)
  }

  function cancelReplace() {
    setShowReplaceWarn(false)
    setPendingFile(null)
  }

  async function doUpload(file) {
    setUploading(true)
    setProgress(0)
    setValidErr(null)
    setNullExpanded(true)
    const nameToUse = modelName.trim() || file.name.replace(/\.[^.]+$/, '')
    try {
      const res = await uploadApi.upload(file, nameToUse, setProgress)
      setPreview(res.data.preview)
      setFilename(res.data.filename)
      setProjectName(res.data.model_name)
      setModelName('')
      await refresh()
      toast.success(res.message)
    } catch (err) {
      if (err.code === 422) {
        setValidErr(err.message)
        toast.error(err.message)
      }
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  // Sort null cols by count descending — worst offenders first
  const nullCols   = preview?.null_counts
    ? Object.entries(preview.null_counts).sort((a, b) => b[1] - a[1])
    : []
  const totalRows  = preview?.shape?.rows || 1
  const hasPreview = !!preview

  return (
    <PageTransition key="upload">
      <div className="page-header">
        <h1 className="page-title">Upload Dataset</h1>
        <p className="page-subtitle">
          {hasPreview
            ? 'Dataset loaded. Continue through the pipeline or start a new session below.'
            : 'Name your model session, then drop your file — CSV, XLSX, or XLS up to 200 MB.'}
        </p>
      </div>

      {/* ── Replace Warning Modal ── */}
      <AnimatePresence>
        {showReplaceWarn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 16 }}
              animate={{ scale: 1,   opacity: 1, y: 0  }}
              exit={   { scale: 0.9, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              style={{
                background: 'var(--surface)', border: '1px solid var(--red)',
                borderRadius: 16, padding: '28px 32px', maxWidth: 460, width: '100%',
                boxShadow: '0 0 60px rgba(231,76,60,0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                <div style={{ background: 'rgba(231,76,60,0.12)', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                  <AlertOctagon size={22} color="var(--red)" />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
                    Replace current session?
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}>
                    You have an active session <strong style={{ color: 'var(--cyan)' }}>"{projectName}"</strong>.
                    Uploading a new file will <strong style={{ color: 'var(--red)' }}>permanently delete</strong> all
                    associated data including:
                  </div>
                </div>
              </div>

              {/* What gets wiped */}
              <div style={{
                background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.25)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              }}>
                {[
                  'Processed dataset & column operations',
                  'AutoFeat engineered features',
                  'Profile report',
                  'All trained AutoML models',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-2)', marginBottom: i < 3 ? 6 : 0 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
                    {item}
                  </div>
                ))}
              </div>

              {hasActiveTasks && (
                <div style={{
                  display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                  background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.4)',
                  fontSize: 12, color: 'var(--amber)',
                }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  Background tasks are currently running and will be cancelled.
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={cancelReplace}
                >
                  <X size={14} /> Keep Current
                </button>
                <button
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  onClick={confirmReplace}
                >
                  <AlertOctagon size={14} /> Yes, Replace
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid-2" style={{ gap: 32, alignItems: 'start' }}>

        {/* ── Left column ── */}
        <div>
          {!hasPreview ? (
            /* ── Empty state: show name input + dropzone ── */
            <>
              <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
                <div className="card-glow" />
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Tag size={13} color="var(--cyan)" />
                  Model Session Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={modelName}
                  onChange={e => setModelName(e.target.value)}
                  placeholder="e.g. Titanic Survival, House Price v2…"
                  style={{ width: '100%' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                  Leave blank to use the filename.
                </div>
              </div>

              <DropZone onFileAccepted={handleFileDrop} isUploading={uploading} uploadProgress={progress} />

              <AnimatePresence>
                {validErr && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ marginTop: 16, padding: '12px 16px', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 10, color: 'var(--red)', fontSize: 13, display: 'flex', gap: 8 }}
                  >
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div><strong>Upload Error</strong><div style={{ marginTop: 4, color: 'var(--text-2)' }}>{validErr}</div></div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ marginTop: 20, padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.8 }}>
                <div className="flex" style={{ gap: 6, alignItems: 'center', marginBottom: 8, color: 'var(--cyan)' }}>
                  <Info size={13} /><strong>How it works</strong>
                </div>
                {[
                  'A named model session is created for your file',
                  'Column names are sanitized for the ML pipeline',
                  'A pristine backup is saved for the Reset feature',
                  'All operations, features & models are saved with the session',
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 1, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* ── Loaded state: show session summary + new-session button ── */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Session locked card */}
              <div className="card" style={{ marginBottom: 20, borderColor: 'var(--green)' }}>
                <div className="card-glow" style={{ background: 'radial-gradient(circle at top left, rgba(46,204,113,0.1) 0%, transparent 70%)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ background: 'rgba(46,204,113,0.12)', borderRadius: 8, padding: 8 }}>
                    <CheckCircle2 size={18} color="var(--green)" />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
                      Upload Complete
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      Session is active and ready for the pipeline
                    </div>
                  </div>
                </div>

                <div style={{ padding: '10px 14px', background: 'var(--cyan-dim)', borderRadius: 8, border: '1px solid var(--cyan)', marginBottom: 14, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-3)', fontSize: 11 }}>Session: </span>
                  <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{projectName}</span>
                </div>

                <div style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 16 }}>
                  <span style={{ background: 'var(--cyan-dim)', color: 'var(--cyan)', borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>
                    {preview?.shape?.rows?.toLocaleString()} rows
                  </span>
                  <span style={{ background: 'var(--surface)', color: 'var(--text-2)', borderRadius: 6, padding: '3px 10px', border: '1px solid var(--border)' }}>
                    {preview?.shape?.cols} columns
                  </span>
                  <span style={{ background: 'var(--surface)', color: 'var(--text-3)', borderRadius: 6, padding: '3px 10px', border: '1px solid var(--border)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                    {filename}
                  </span>
                </div>

                <button
                  className="btn btn-primary btn-full"
                  onClick={() => navigate('/operations')}
                >
                  Continue to Operations <ArrowRight size={14} />
                </button>
              </div>

              {/* New session button */}
              <div style={{ padding: '14px 18px', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={13} color="var(--cyan)" />
                  Start a new model session
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.6 }}>
                  Upload a different file to train a new model. Your current session will be replaced — download your models first if needed.
                </p>

                {/* Name input for the new session */}
                <input
                  type="text"
                  className="form-input"
                  value={modelName}
                  onChange={e => setModelName(e.target.value)}
                  placeholder="New session name (optional)…"
                  style={{ width: '100%', marginBottom: 12, fontSize: 12 }}
                />

                <DropZone
                  onFileAccepted={handleFileDrop}
                  isUploading={uploading}
                  uploadProgress={progress}
                  compact
                />

                <AnimatePresence>
                  {validErr && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ marginTop: 12, padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', fontSize: 12, display: 'flex', gap: 8 }}
                    >
                      <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>{validErr}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Right column ── */}
        <div>
          {preview ? (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>

              {/* Dataset summary card */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-glow" />
                <div className="flex-between mb-16">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>
                    <CheckCircle2 size={16} color="var(--green)" style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    {filename}
                  </h3>
                  <span className="badge badge-green">Ready</span>
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="stat-block">
                    <div className="stat-label">Rows</div>
                    <div className="stat-value">{preview.shape.rows.toLocaleString()}</div>
                  </div>
                  <div className="stat-block">
                    <div className="stat-label">Columns</div>
                    <div className="stat-value">{preview.shape.cols}</div>
                  </div>
                </div>
              </div>

              {/* Null values panel */}
              {nullCols.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ marginBottom: 16, border: '1px solid rgba(245,166,35,0.35)', borderRadius: 10, overflow: 'hidden', background: 'rgba(245,166,35,0.04)' }}
                >
                  <div
                    onClick={() => setNullExpanded(e => !e)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', borderBottom: nullExpanded ? '1px solid rgba(245,166,35,0.2)' : 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <AlertTriangle size={13} color="var(--amber)" />
                      <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--amber)' }}>
                        {nullCols.length} column{nullCols.length > 1 ? 's' : ''} with missing values
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>— handle in Operations</span>
                    </div>
                    <span style={{ color: 'var(--text-3)' }}>
                      {nullExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </span>
                  </div>

                  <AnimatePresence initial={false}>
                    {nullExpanded && (
                      <motion.div
                        key="nullbody"
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '8px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 80px', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Column</span>
                            <span style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nulls</span>
                            <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Share</span>
                          </div>
                          {nullCols.map(([col, cnt]) => {
                            const pct = Math.round((cnt / totalRows) * 100)
                            const barColor = pct > 50 ? '#e74c3c' : pct > 20 ? '#f39c12' : '#f5a623'
                            return (
                              <div key={col} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 80px', alignItems: 'center', gap: 8 }}>
                                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {col}
                                </code>
                                <span style={{ fontSize: 11, color: 'var(--text-2)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                  {cnt.toLocaleString()}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
                                  </div>
                                  <span style={{ fontSize: 10, color: barColor, fontWeight: 700, minWidth: 26, textAlign: 'right' }}>{pct}%</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <div style={{ marginBottom: 16, padding: '9px 14px', border: '1px solid rgba(46,204,113,0.3)', borderRadius: 10, background: 'rgba(46,204,113,0.06)', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--green)' }}>
                  <CheckCircle2 size={13} />
                  <span>No missing values — dataset is complete.</span>
                </div>
              )}

            </motion.div>
          ) : (
            <div className="card" style={{ height: '100%', minHeight: 220 }}>
              <div className="card-glow" />
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-2)', marginBottom: 12 }}>
                  What happens after upload?
                </div>
                {[
                  'A named model session is created and saved',
                  'Column names are sanitized for the ML pipeline',
                  'A pristine backup is saved for the Reset feature',
                  'All models, features and reports stay linked to this session',
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 1, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data preview table */}
      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ marginTop: 36 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16 }}>Data Preview</h3>
            <DataTable preview={preview} maxHeight={320} />
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
