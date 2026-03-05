import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Info, CheckCircle2, AlertTriangle, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import PageTransition from '../components/PageTransition'
import DropZone from '../components/DropZone'
import DataTable from '../components/DataTable'
import { uploadApi } from '../api/client'
import { useProjects } from '../context/ProjectContext'

export default function Upload() {
  const navigate = useNavigate()
  const { refresh } = useProjects()
  const [uploading,   setUploading]  = useState(false)
  const [progress,    setProgress]   = useState(0)
  const [preview,     setPreview]    = useState(null)
  const [filename,    setFilename]   = useState('')
  const [modelName,   setModelName]  = useState('')
  const [validErr,    setValidErr]   = useState(null)
  const [projectName, setProjectName]= useState('')

  async function handleFile(file) {
    setUploading(true)
    setProgress(0)
    setValidErr(null)
    setPreview(null)

    // Use current modelName state or default to file stem
    const nameToUse = modelName.trim() || file.name.replace(/\.[^.]+$/, '')

    try {
      const res = await uploadApi.upload(file, nameToUse, setProgress)
      setPreview(res.data.preview)
      setFilename(res.data.filename)
      setProjectName(res.data.model_name)
      await refresh()  // update sidebar project list
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

  const nullCols = preview?.null_counts ? Object.entries(preview.null_counts) : []

  return (
    <PageTransition key="upload">
      <div className="page-header">
        <h1 className="page-title">Upload Dataset</h1>
        <p className="page-subtitle">Name your model session, then drop your file — CSV, XLSX, or XLS up to 200 MB.</p>
      </div>

      <div className="grid-2" style={{ gap: 32, alignItems: 'start' }}>
        {/* Left */}
        <div>
          {/* Model Name Input */}
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
              placeholder="e.g. Titanic Survival, House Price v2..."
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
              This name will be used for the downloaded model ZIP. Leave blank to use the filename.
            </div>
          </div>

          <DropZone
            onFileAccepted={handleFile}
            isUploading={uploading}
            uploadProgress={progress}
          />

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
              <span className="icon-glow"><Info size={13} /></span><strong>Multi-Session Support</strong>
            </div>
            Each upload creates a separate model session. Switch between sessions in the left sidebar.
            All sessions are independent — CSV, features, model and leaderboards are separate.
          </div>
        </div>

        {/* Right */}
        <div>
          {preview ? (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-glow" />
                <div className="flex-between mb-16">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>
                    <CheckCircle2 size={16} color="var(--green)" style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    {filename}
                  </h3>
                  <span className="badge badge-green">Ready</span>
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--cyan-dim)', borderRadius: 8, border: '1px solid var(--cyan)', marginBottom: 12, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-3)' }}>Session: </span>
                  <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{projectName}</span>
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

              {nullCols.length > 0 && (
                <div className="null-warning" style={{ marginBottom: 20 }}>
                  <div className="flex" style={{ gap: 6, marginBottom: 8 }}>
                    <AlertTriangle size={13} />
                    <strong>{nullCols.length} column(s) have missing values</strong>
                  </div>
                  {nullCols.map(([col, cnt]) => (
                    <div key={col} style={{ fontSize: 12, marginTop: 2 }}>
                      <code style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>{col}</code>
                      {' → '}{cnt} null{cnt > 1 ? 's' : ''}
                    </div>
                  ))}
                </div>
              )}

              <motion.button className="btn btn-primary btn-full" onClick={() => navigate('/operations')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                Continue to Operations <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          ) : (
            <div className="card" style={{ height: '100%', minHeight: 220 }}>
              <div className="card-glow" />
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-2)', marginBottom: 12 }}>
                  What happens after upload?
                </div>
                {['A named model session is created and added to the sidebar','Column names are sanitized for the ML pipeline','A pristine backup is saved for the Reset feature','You can create multiple sessions and switch between them'].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 1, flexShrink: 0 }}>{String(i+1).padStart(2,'0')}</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
