import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react'

const ACCEPTED = {
  'text/csv':                                  ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel':                  ['.xls'],
}

export default function DropZone({ onFileAccepted, isUploading, uploadProgress, compact = false }) {
  const [rejected, setRejected] = useState(null)
  const [accepted, setAccepted] = useState(null)

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setRejected(null)
    if (rejectedFiles.length > 0) {
      const err = rejectedFiles[0].errors[0]
      setRejected(
        err.code === 'file-too-large'
          ? 'File exceeds 200MB limit.'
          : err.code === 'file-invalid-type'
          ? 'Only .csv, .xlsx, and .xls files are accepted.'
          : err.message
      )
      setAccepted(null)
      return
    }
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setAccepted(file)
      onFileAccepted(file)
    }
  }, [onFileAccepted])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    maxSize: 200 * 1024 * 1024, // 200MB
    disabled: isUploading,
  })

  const getBorderColor = () => {
    if (isDragReject || rejected) return 'var(--red)'
    if (isDragActive)             return 'var(--cyan)'
    if (accepted && !isUploading) return 'var(--green)'
    return 'var(--border-2)'
  }

  const getBg = () => {
    if (isDragReject || rejected) return 'var(--red-dim)'
    if (isDragActive)             return 'var(--cyan-dim)'
    if (accepted && !isUploading) return 'var(--green-dim)'
    return 'var(--surface)'
  }

  return (
    <div>
      <motion.div
        {...getRootProps()}
        animate={{ borderColor: getBorderColor(), backgroundColor: getBg() }}
        transition={{ duration: 0.2 }}
        style={{
          border: `2px dashed`,
          borderColor: getBorderColor(),
          borderRadius: compact ? 10 : 16,
          padding: compact ? '20px 20px' : '48px 32px',
          textAlign: 'center',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          background: getBg(),
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <input {...getInputProps()} />

        {/* Animated glow */}
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1.2 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle, var(--cyan-dim) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
          )}
        </AnimatePresence>

        <motion.div
          animate={{ scale: isDragActive ? 1.1 : 1, y: isDragActive ? -4 : 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {isUploading ? (
            <div style={{ color: 'var(--cyan)' }}>
              <div style={{ marginBottom: 16 }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ display: 'inline-block' }}
                >
                  <Upload size={40} strokeWidth={1.5} />
                </motion.div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
                Uploading...
              </div>
              <div style={{ maxWidth: 240, margin: '0 auto' }}>
                <div className="progress-bar-wrap">
                  <motion.div
                    className="progress-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-2)' }}>
                  {uploadProgress}%
                </div>
              </div>
            </div>
          ) : accepted && !rejected ? (
            <div style={{ color: 'var(--green)' }}>
              <CheckCircle2 size={44} strokeWidth={1.5} style={{ marginBottom: 12 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
                {accepted.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                {(accepted.size / 1024 / 1024).toFixed(2)} MB — click or drop to replace
              </div>
            </div>
          ) : (
            <div>
              <div style={{ color: isDragReject ? 'var(--red)' : 'var(--text-3)', marginBottom: compact ? 8 : 16 }}>
                <FileSpreadsheet size={compact ? 26 : 44} strokeWidth={1} />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: compact ? 14 : 20, fontWeight: 700, color: 'var(--text)', marginBottom: compact ? 4 : 8 }}>
                {isDragActive ? 'Drop it here!' : compact ? 'Drop file or click to browse' : 'Drag & drop your dataset'}
              </div>
              {!compact && (
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
                  or click to browse
                </div>
              )}
              <div style={{ display: 'inline-flex', gap: 8, marginTop: compact ? 4 : 0 }}>
                {['.csv', '.xlsx', '.xls'].map(ext => (
                  <span key={ext} className="badge badge-muted">{ext}</span>
                ))}
                <span className="badge badge-muted">≤ 200MB</span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Error message */}
      <AnimatePresence>
        {rejected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginTop: 10, padding: '10px 14px',
              background: 'var(--red-dim)', border: '1px solid var(--red)',
              borderRadius: 8, color: 'var(--red)', fontSize: 13,
            }}
          >
            <AlertCircle size={14} />
            {rejected}
            <button
              onClick={() => setRejected(null)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
