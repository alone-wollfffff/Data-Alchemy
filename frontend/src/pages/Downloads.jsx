import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Cpu,
  Download,
  FileBarChart,
  FileSpreadsheet,
  Home,
  Info,
  Lock,
  Package,
  RefreshCw,
  Square,
  Target,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { downloadsApi } from '../api/client'
import DeployAlchemyTeaser from '../components/DeployAlchemyTeaser'
import PageTransition from '../components/PageTransition'
import { useProjects } from '../context/ProjectContext'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

function fmtBytes(bytes) {
  if (!bytes || bytes === 0) return '-'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fmtScore(value, metric) {
  if (value == null) return '-'
  const numeric = typeof value === 'number' ? value : parseFloat(value)
  if (Number.isNaN(numeric)) return String(value)
  const isErrorMetric = metric && /rmse|mae|mse|error/i.test(metric)
  return (isErrorMetric ? Math.abs(numeric) : numeric).toFixed(5)
}

function modelTypeTag(name) {
  if (/WeightedEnsemble/i.test(name)) return { label: 'Ensemble', color: 'var(--amber)' }
  if (/RandomForest/i.test(name)) return { label: 'RF', color: '#10e87e' }
  if (/ExtraTrees/i.test(name)) return { label: 'ET', color: '#10e87e' }
  if (/LightGBM/i.test(name)) return { label: 'LGBM', color: '#a78bfa' }
  if (/XGBoost|XGB/i.test(name)) return { label: 'XGB', color: '#f97316' }
  if (/CatBoost/i.test(name)) return { label: 'CAT', color: '#ec4899' }
  if (/Neural|NN/i.test(name)) return { label: 'NN', color: '#06b6d4' }
  if (/KNeighbors/i.test(name)) return { label: 'KNN', color: '#64748b' }
  return { label: 'ML', color: 'var(--text-3)' }
}

function parseDownloadFilename(contentDisposition, fallbackName) {
  if (!contentDisposition) return fallbackName
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])
  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
  return plainMatch?.[1] || fallbackName
}

async function readDownloadError(response) {
  try {
    const payload = await response.clone().json()
    return payload?.error?.message || `Download failed (${response.status}).`
  } catch {
    const text = await response.text()
    return text || `Download failed (${response.status}).`
  }
}

async function downloadFile(url, fallbackName) {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await readDownloadError(response))
  }

  const blob = await response.blob()
  if (!blob.size) {
    throw new Error('The ZIP was empty, so the browser did not save a file.')
  }

  const filename = parseDownloadFilename(
    response.headers.get('content-disposition'),
    fallbackName
  )
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000)

  return { filename, size: blob.size }
}

function startBrowserDownload(url, fallbackName) {
  const link = document.createElement('a')
  link.href = url
  if (fallbackName) link.download = fallbackName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function SimpleDownloadCard({
  icon: Icon,
  title,
  desc,
  available,
  downloadUrl,
  downloadName,
  accentColor,
}) {
  const lastDot = downloadName.lastIndexOf('.')
  const base = downloadName.substring(0, lastDot)
  const ext = downloadName.substring(lastDot)
  const [name, setName] = useState(base)

  useEffect(() => {
    setName(base)
  }, [base])

  const finalUrl = `${downloadUrl}?filename=${encodeURIComponent(name || base)}`

  return (
    <motion.div
      variants={fadeUp}
      whileHover={available ? { y: -4, boxShadow: `0 12px 32px ${accentColor}22` } : {}}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${available ? accentColor : 'var(--border)'}`,
        borderRadius: 16,
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 14,
        transition: 'all 0.2s',
        opacity: available ? 1 : 0.6,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {available && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 140,
            height: 140,
            background: `radial-gradient(circle at top right, ${accentColor}18 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: available ? `${accentColor}18` : 'var(--surface-2)',
          border: `1px solid ${available ? accentColor : 'var(--border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: available ? accentColor : 'var(--text-3)',
        }}
      >
        {available ? <Icon size={26} strokeWidth={1.5} /> : <Lock size={22} strokeWidth={1.5} />}
      </div>

      <div style={{ flex: 1 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, marginBottom: 6 }}>
          {title}
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{desc}</p>
      </div>

      {available ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="File name"
              style={{
                width: '100%',
                padding: '8px 44px 8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-2)',
                color: 'var(--text-1)',
                fontSize: 12,
                outline: 'none',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <span style={{ position: 'absolute', right: 10, fontSize: 11, color: 'var(--text-3)' }}>{ext}</span>
          </div>
          <a
            href={finalUrl}
            download={`${name || base}${ext}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '9px 18px',
              background: `${accentColor}18`,
              color: accentColor,
              border: `1px solid ${accentColor}`,
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = accentColor
              event.currentTarget.style.color = '#070d1a'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = `${accentColor}18`
              event.currentTarget.style.color = accentColor
            }}
          >
            <Download size={14} />
            Download {ext.toUpperCase().replace('.', '')}
          </a>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>Not yet available</div>
      )}
    </motion.div>
  )
}

function ModelSelectModal({ run, safeModelName, onClose }) {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState(null)
  const [selected, setSelected] = useState([])
  const [downloading, setDownloading] = useState(false)
  const [customName, setCustomName] = useState(`${safeModelName}_Run${run.run}_selective`)
  const [showInfo, setShowInfo] = useState(false)
  const MAX = 5

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    setFetchErr(null)

    downloadsApi.getRunModels(run.run)
      .then((res) => {
        const rows = res.data?.models || []
        setModels(rows)
        const best = rows.find((model) => model.is_best)
        if (best) setSelected([best.model])
      })
      .catch((error) => {
        setFetchErr(error.message || 'Failed to load model list')
      })
      .finally(() => setLoading(false))
  }, [run.run])

  function toggle(modelName) {
    setSelected((previous) => {
      if (previous.includes(modelName)) {
        return previous.filter((model) => model !== modelName)
      }

      if (previous.length >= MAX) {
        toast.error(`Max ${MAX} models per ZIP`)
        return previous
      }

      return [...previous, modelName]
    })
  }

  const autoIncluded = []
  for (const selectedModel of selected) {
    const info = models.find((model) => model.model === selectedModel)
    if (!info?.deps) continue

    for (const dependency of info.deps) {
      if (!selected.includes(dependency) && !autoIncluded.includes(dependency)) {
        autoIncluded.push(dependency)
      }
    }
  }

  const estBytes = models.filter((model) => selected.includes(model.model)).reduce((sum, model) => sum + (model.size_bytes || 0), 0)
  const metric = run.metric || ''

  async function handleDownload() {
    if (!selected.length) {
      toast.error('Select at least one model')
      return
    }
    setDownloading(true)
    try {
      const downloadUrl = downloadsApi.selectiveDownloadUrl(run.run, selected, customName || undefined)
      const fallbackName = `${customName || 'model_selective'}.zip`
      startBrowserDownload(downloadUrl, fallbackName)
      toast.success(`Download started: ${fallbackName}`)
      onClose()
    } catch (error) {
      toast.error(error.message || 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(7,13,26,0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          width: '100%',
          maxWidth: 740,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
        }}
      >
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(0,212,255,0.1)',
              border: '1px solid var(--cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Package size={18} color="var(--cyan)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: 0 }}>
              Select Models to Download
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '2px 0 0' }}>
              {run.label || `Run ${run.run}`}{' '}
              - metric:{' '}
              <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                {metric || '-'}
              </span>
              {' '} - max {MAX} models per ZIP
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-3)',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = 'var(--text-1)'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = 'var(--text-3)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            padding: '10px 24px',
            background: 'var(--bg-2)',
            borderBottom: '1px solid var(--border)',
            fontSize: 12,
            color: 'var(--text-2)',
            flexShrink: 0,
          }}
        >
          <div
            onClick={() => setShowInfo((value) => !value)}
            role="button"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8 }}
          >
            <Info size={13} color="var(--cyan)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ flex: 1 }}>
              <strong style={{ color: 'var(--text-1)' }}>Storage-efficient download</strong> - only selected models are bundled.
              Ensemble base-model deps are auto-included.
            </span>
            <span style={{ color: 'var(--cyan)', flexShrink: 0 }}>
              {showInfo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </span>
          </div>
          {showInfo && (
            <div style={{ marginTop: 8, paddingLeft: 21, lineHeight: 1.7, color: 'var(--text-3)' }}>
              {'*'} The <strong>best model</strong> is pre-selected by default.<br />
              {'*'} Ensemble models (WeightedEnsemble) usually have the highest score.<br />
              {'*'} Sizes include all required dependency dirs. Actual ZIP may be smaller.<br />
              {'*'} <code style={{ color: 'var(--cyan)' }}>feature_engineering.json</code>, processed CSV and AutoFeat model are always included.
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px' }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 200,
                gap: 10,
                color: 'var(--text-3)',
              }}
            >
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <RefreshCw size={18} color="var(--cyan)" />
              </motion.div>
              Loading model list...
            </div>
          ) : fetchErr ? (
            <div style={{ color: 'var(--red)', textAlign: 'center', padding: '40px 0', fontSize: 13 }}>
              {fetchErr}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 85px 75px 58px 68px',
                  gap: 6,
                  padding: '0 8px 6px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 10,
                  color: 'var(--text-3)',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                <div />
                <div>Model</div>
                <div style={{ textAlign: 'right' }}>Score</div>
                <div style={{ textAlign: 'right' }}>Pred ms</div>
                <div style={{ textAlign: 'right' }}>Type</div>
                <div style={{ textAlign: 'right' }}>Size</div>
              </div>

              {models.map((model) => {
                const isSelected = selected.includes(model.model)
                const isAutoIncluded = autoIncluded.includes(model.model)
                const canToggle = isSelected || selected.length < MAX
                const tag = modelTypeTag(model.model)

                return (
                  <motion.div
                    key={model.model}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
                    onClick={() => {
                      if (!isAutoIncluded && canToggle) toggle(model.model)
                    }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 1fr 85px 75px 58px 68px',
                      gap: 6,
                      padding: '9px 8px',
                      borderRadius: 8,
                      cursor: isAutoIncluded ? 'default' : canToggle ? 'pointer' : 'not-allowed',
                      border: isSelected
                        ? '1px solid var(--cyan)'
                        : isAutoIncluded
                          ? '1px solid var(--green)'
                          : '1px solid transparent',
                      background: isSelected
                        ? 'rgba(0,212,255,0.06)'
                        : isAutoIncluded
                          ? 'rgba(16,232,126,0.04)'
                          : 'transparent',
                      transition: 'all 0.1s',
                      opacity: !canToggle && !isSelected && !isAutoIncluded ? 0.45 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: 1 }}>
                      {isAutoIncluded ? (
                        <Zap size={13} color="var(--green)" title="Auto-included dependency" />
                      ) : isSelected ? (
                        <CheckSquare size={15} color="var(--cyan)" />
                      ) : (
                        <Square size={15} color="var(--text-3)" />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            fontWeight: 600,
                            color: isSelected
                              ? 'var(--cyan)'
                              : isAutoIncluded
                                ? 'var(--green)'
                                : 'var(--text-1)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 240,
                          }}
                          title={model.model}
                        >
                          {model.model}
                        </span>
                        {model.is_best && (
                          <span
                            style={{
                              fontSize: 9,
                              background: 'rgba(245,166,35,0.15)',
                              color: 'var(--amber)',
                              border: '1px solid var(--amber)',
                              borderRadius: 4,
                              padding: '1px 5px',
                              fontWeight: 700,
                            }}
                          >
                            BEST
                          </span>
                        )}
                        {isAutoIncluded && (
                          <span
                            style={{
                              fontSize: 9,
                              background: 'rgba(16,232,126,0.12)',
                              color: 'var(--green)',
                              border: '1px solid var(--green)',
                              borderRadius: 4,
                              padding: '1px 5px',
                              fontWeight: 700,
                            }}
                          >
                            AUTO
                          </span>
                        )}
                      </div>
                      {model.deps?.length > 0 && (
                        <div
                          style={{
                            fontSize: 9,
                            color: 'var(--text-3)',
                            marginTop: 2,
                            fontFamily: 'var(--font-mono)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          needs: {model.deps.join(', ')}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)', fontWeight: 700, alignSelf: 'center' }}>
                      {fmtScore(model.score_val, metric)}
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', alignSelf: 'center' }}>
                      {model.pred_time_val != null ? `${(model.pred_time_val * 1000).toFixed(1)}` : '-'}
                    </div>
                    <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                      <span
                        style={{
                          fontSize: 9,
                          background: `${tag.color}18`,
                          color: tag.color,
                          border: `1px solid ${tag.color}`,
                          borderRadius: 4,
                          padding: '1px 5px',
                          fontWeight: 700,
                        }}
                      >
                        {tag.label}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', alignSelf: 'center' }}>
                      {fmtBytes(model.size_bytes)}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>
                <span style={{ color: selected.length >= MAX ? 'var(--amber)' : 'var(--cyan)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {selected.length}/{MAX}
                </span>{' '}
                selected
                {autoIncluded.length > 0 && (
                  <span style={{ color: 'var(--green)' }}>
                    {' '}+{autoIncluded.length} auto dep{autoIncluded.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${(selected.length / MAX) * 100}%` }}
                  style={{
                    height: '100%',
                    borderRadius: 2,
                    background: selected.length >= MAX
                      ? 'linear-gradient(90deg,var(--amber),var(--red))'
                      : 'linear-gradient(90deg,var(--cyan),var(--green))',
                  }}
                />
              </div>
            </div>
            {estBytes > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right', flexShrink: 0 }}>
                Est. ZIP:{' '}
                <span style={{ color: 'var(--text-1)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {fmtBytes(estBytes)}
                </span>
                <span style={{ fontSize: 10, display: 'block' }}>&le; actual (shared deps)</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                placeholder="filename (without .zip)"
                style={{
                  width: '100%',
                  padding: '9px 44px 9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-1)',
                  fontSize: 12,
                  outline: 'none',
                  fontFamily: 'var(--font-mono)',
                  boxSizing: 'border-box',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 11,
                  color: 'var(--text-3)',
                  pointerEvents: 'none',
                }}
              >
                .zip
              </span>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading || !selected.length || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 22px',
                background: downloading || !selected.length ? 'var(--bg-2)' : 'var(--cyan)',
                color: downloading || !selected.length ? 'var(--text-3)' : '#070d1a',
                border: '1px solid var(--cyan)',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: downloading || !selected.length ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {downloading ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
                    <RefreshCw size={13} />
                  </motion.div>
                  Building...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Download {selected.length > 0 ? `(${selected.length})` : ''}
                </>
              )}
            </button>
          </div>

          <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center' }}>
            ZIP always includes <code>feature_engineering.json</code> · <code>processed_data.csv</code> · AutoFeat model · README
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function RunModelRow({ run, safeModelName }) {
  const [showModal, setShowModal] = useState(false)
  const metric = run.metric || ''
  const scoreDisplay = run.best_score != null ? fmtScore(run.best_score, metric) : '-'

  return (
    <>
      <motion.div
        variants={fadeUp}
        style={{
          border: `1px solid ${run.available ? 'var(--cyan)' : 'var(--border)'}`,
          borderRadius: 12,
          overflow: 'hidden',
          background: 'var(--surface)',
          opacity: run.available ? 1 : 0.55,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            background: run.available ? 'var(--cyan-dim)' : 'var(--bg-2)',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Trophy size={15} color="var(--amber)" />
            <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-display)' }}>
              {run.label || `Run ${run.run}`}
            </span>
            {run.best_model && (
              <span
                style={{
                  fontSize: 11,
                  background: 'rgba(245,166,35,0.12)',
                  color: 'var(--amber)',
                  borderRadius: 5,
                  padding: '2px 8px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {`🏅 ${run.best_model}`}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {metric && <span className="badge badge-green" style={{ fontSize: 10 }}>{metric}</span>}
            {run.best_score != null && (
              <span
                style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: 'var(--green)',
                  background: 'var(--bg-2)',
                  borderRadius: 6,
                  padding: '2px 10px',
                }}
              >
                {scoreDisplay}
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 24,
            padding: '10px 18px',
            borderBottom: '1px solid var(--border)',
            flexWrap: 'wrap',
          }}
        >
          {[
            { icon: <Target size={11} />, label: 'Best Score', value: scoreDisplay, color: 'var(--green)' },
            { icon: <TrendingUp size={11} />, label: 'Metric', value: metric || '-', color: 'var(--cyan)' },
            { icon: <Trophy size={11} />, label: 'Best Model', value: run.best_model || '-', color: 'var(--amber)' },
            {
              icon: <Cpu size={11} />,
              label: 'Models trained',
              value: run.leaderboard?.length ? `${run.leaderboard.length}` : '-',
              color: 'var(--text-2)',
            },
          ].map(({ icon, label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ color: 'var(--text-3)' }}>{icon}</span>
              <span style={{ color: 'var(--text-3)' }}>{label}:</span>
              <span
                style={{
                  color,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 18px' }}>
          {run.available ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 20px',
                  width: '100%',
                  background: 'linear-gradient(135deg,rgba(0,212,255,0.12),rgba(0,212,255,0.05))',
                  color: 'var(--cyan)',
                  border: '1px solid var(--cyan)',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = 'var(--cyan)'
                  event.currentTarget.style.color = '#070d1a'
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'linear-gradient(135deg,rgba(0,212,255,0.12),rgba(0,212,255,0.05))'
                  event.currentTarget.style.color = 'var(--cyan)'
                }}
              >
                <Package size={15} />
                Choose Models &amp; Download ZIP
              </button>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.5 }}>
                Pick up to 5 of {run.leaderboard?.length || '?'} trained models
                {' '}·{' '}Ensemble deps auto-included
                {' '}·{' '}Dramatically smaller ZIP
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
              Model files not found for this run
            </div>
          )}
        </div>
      </motion.div>

      {showModal && createPortal(
        <ModelSelectModal
          run={run}
          safeModelName={safeModelName}
          onClose={() => setShowModal(false)}
        />,
        document.body
      )}
    </>
  )
}

export default function Downloads() {
  const navigate = useNavigate()
  const { activeProject } = useProjects()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchStatus() {
    setLoading(true)
    try {
      const res = await downloadsApi.status()
      setStatus(res.data)
    } catch {}
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const modelName = status?.model_name || activeProject?.name || 'model'
  const safeModelName = modelName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const addedFeatures = status?.added_features || {}
  const hasFeatures = Object.keys(addedFeatures).length > 0
  const runs = status?.runs || []
  const artifactCount = [status?.has_data, status?.has_model, status?.has_profile].filter(Boolean).length

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '60vh' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <RefreshCw size={24} color="var(--cyan)" />
        </motion.div>
      </div>
    )
  }

  return (
    <PageTransition key="downloads">
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1 className="page-title">The Vault</h1>
            <p className="page-subtitle">
              {activeProject ? (
                <span>
                  Session: <strong style={{ color: 'var(--cyan)' }}>{activeProject.name}</strong>
                </span>
              ) : (
                'Download your artifacts.'
              )}
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchStatus} title="Refresh">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 20px',
          marginBottom: 32,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          {artifactCount === 3 ? '🎉 All artifacts ready!' : `${artifactCount} of 3 artifacts available`}
        </div>
        <div className="progress-bar-wrap" style={{ flex: 1 }}>
          <motion.div
            className="progress-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: `${(artifactCount / 3) * 100}%` }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            style={{ background: artifactCount === 3 ? 'linear-gradient(90deg,var(--green),var(--cyan))' : undefined }}
          />
        </div>
        <span className="badge badge-green" style={{ fontFamily: 'var(--font-mono)' }}>
          {artifactCount}/3
        </span>
      </motion.div>

      {hasFeatures && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card"
          style={{ marginBottom: 24, borderColor: 'var(--green)', padding: '14px 20px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Zap size={14} color="var(--green)" />
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>
              AutoFeat features included in every model ZIP
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>
            Bundled as <code style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>autofeat_model.pkl</code>
            {' '}and <code style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>feature_engineering.json</code>:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.keys(addedFeatures).map((feature) => (
              <code
                key={feature}
                style={{
                  fontSize: 11,
                  background: 'var(--bg-2)',
                  color: 'var(--green)',
                  border: '1px solid var(--green)',
                  borderRadius: 5,
                  padding: '2px 8px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {feature}
              </code>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}
      >
        <SimpleDownloadCard
          icon={FileSpreadsheet}
          title="Processed Dataset"
          desc="Cleaned CSV with dropped columns and AutoFeat features applied."
          available={status?.has_data}
          downloadUrl={downloadsApi.csvUrl()}
          downloadName={`${safeModelName}_data.csv`}
          accentColor="#10e87e"
        />
        <SimpleDownloadCard
          icon={FileBarChart}
          title="Profiling Report"
          desc="Standalone HTML with distributions, correlations, missing value heatmaps."
          available={status?.has_profile}
          downloadUrl={downloadsApi.profileUrl()}
          downloadName={`${safeModelName}_profile.html`}
          accentColor="#f5a623"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="card"
        style={{ marginBottom: 32 }}
      >
        <div className="card-glow" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'rgba(0,212,255,0.12)',
              border: '1px solid var(--cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BrainCircuit size={20} color="var(--cyan)" strokeWidth={1.5} />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>
              AutoGluon Models
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
              {runs.length > 0
                ? `${runs.length} run${runs.length !== 1 ? 's' : ''} - click a run to pick which models to include in the ZIP`
                : 'Train a model in AutoML Forge to unlock downloads'}
            </p>
          </div>
          {runs.length > 0 && (
            <span className="badge badge-cyan" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
              {runs.filter((run) => run.available).length}/{runs.length} ready
            </span>
          )}
        </div>

        {runs.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '40px 20px',
              gap: 12,
              color: 'var(--text-3)',
            }}
          >
            <Lock size={32} style={{ opacity: 0.35 }} />
            <div style={{ fontSize: 14 }}>No training runs yet</div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/automl')}>
              Go to AutoML Forge
            </button>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {runs.map((run) => (
              <RunModelRow key={run.run} run={run} safeModelName={safeModelName} />
            ))}
          </motion.div>
        )}
      </motion.div>

      {status?.has_model && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="card"
          style={{ marginBottom: 32 }}
        >
          <div className="card-glow" />
          <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 12 }}>
            📦 What's inside every model ZIP?
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['autogluon_model/', 'Pruned AutoGluon predictor - only your selected models, not all 50+'],
              ['feature_engineering.json', 'All metadata Deploy Alchemy needs (target, types, scores, leaderboard)'],
              ['autofeat_model.pkl', 'Fitted AutoFeat transformer - apply to new data before prediction'],
              ['processed_data.csv', 'Exact dataset snapshot used for training'],
              ['profile_report.html', 'YData Profiling report - open in any browser (if generated)'],
              ['README.md', 'Usage instructions, included model list, and code snippet'],
            ].map(([name, desc]) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '10px 14px',
                  background: 'var(--bg-2)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              >
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', flexShrink: 0 }}>
                  {name}
                </code>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{desc}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              background: 'var(--surface-2)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--text-2)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            from autogluon.tabular import TabularPredictor<br />
            predictor = TabularPredictor.load(<span style={{ color: 'var(--amber)' }}>"autogluon_model/"</span>)<br />
            predictions = predictor.predict(new_data)
          </div>
        </motion.div>
      )}

      <DeployAlchemyTeaser hasModel={status?.has_model} />

      <div className="flex-between">
        <button className="btn btn-secondary" onClick={() => navigate('/automl')}>
          <ArrowLeft size={14} /> Back to AutoML
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          <Home size={14} /> Back to Welcome
        </button>
      </div>
    </PageTransition>
  )
}
