import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileSpreadsheet, BrainCircuit, FileBarChart,
  Download, ArrowLeft, Home, RefreshCw, Lock,
  Trophy, Zap, Target, TrendingUp
} from 'lucide-react'
import PageTransition from '../components/PageTransition'
import DeployAlchemyTeaser from '../components/DeployAlchemyTeaser'
import { downloadsApi } from '../api/client'
import { useProjects } from '../context/ProjectContext'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }

function SimpleDownloadCard({ icon: Icon, title, desc, available, unavailableMsg, downloadUrl, downloadName, accentColor }) {
  const lastDot = downloadName.lastIndexOf('.')
  const defaultBase = downloadName.substring(0, lastDot)
  const extension = downloadName.substring(lastDot)
  const [customName, setCustomName] = useState(defaultBase)
  useEffect(() => { setCustomName(defaultBase) }, [defaultBase])
  const finalUrl = `${downloadUrl}?filename=${encodeURIComponent(customName || defaultBase)}`

  return (
    <motion.div
      variants={fadeUp}
      whileHover={available ? { y: -4, boxShadow: `0 12px 32px ${accentColor}22` } : {}}
      style={{
        background: 'var(--surface)', border: `1px solid ${available ? accentColor : 'var(--border)'}`,
        borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', textAlign: 'center', gap: 14,
        transition: 'all 0.2s', opacity: available ? 1 : 0.6,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {available && (
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 140, height: 140,
          background: `radial-gradient(circle at top right, ${accentColor}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
      )}
      <div
        className="icon-glow"
        style={{
          width: 56, height: 56, borderRadius: 14,
          background: available ? `${accentColor}18` : 'var(--surface-2)',
          border: `1px solid ${available ? accentColor : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: available ? accentColor : 'var(--text-3)',
        }}>
        {available ? <Icon size={26} strokeWidth={1.5} /> : <Lock size={22} strokeWidth={1.5} />}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{title}</h3>
        <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{desc}</p>
      </div>
      {available ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="File name"
              style={{
                width: '100%', padding: '8px 12px', paddingRight: 45, borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-2)',
                color: 'var(--text-1)', fontSize: 12, outline: 'none', fontFamily: 'var(--font-mono)',
              }}
            />
            <span style={{ position: 'absolute', right: 10, fontSize: 11, color: 'var(--text-3)', pointerEvents: 'none' }}>{extension}</span>
          </div>
          <a
            href={finalUrl} download={`${customName || defaultBase}${extension}`} className="btn btn-full"
            style={{
              background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}`,
              borderRadius: 8, padding: '9px 18px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = accentColor; e.currentTarget.style.color = '#070d1a' }}
            onMouseLeave={e => { e.currentTarget.style.background = `${accentColor}18`; e.currentTarget.style.color = accentColor }}
          >
            <Download size={14} /> Download
          </a>
        </div>
      ) : (
        <div style={{
          width: '100%', padding: '9px 18px', marginTop: 6,
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 8, fontSize: 12, color: 'var(--text-3)', textAlign: 'center',
        }}>
          {unavailableMsg}
        </div>
      )}
    </motion.div>
  )
}

function RunModelRow({ run, safeModelName }) {
  const runLabel = (run.label || `Run ${run.run}`).replace(/[^a-zA-Z0-9_\-]/g, '_')
  const defaultName = `${safeModelName}_${runLabel}`
  const [customName, setCustomName] = useState(defaultName)
  useEffect(() => { setCustomName(defaultName) }, [defaultName])
  const finalUrl = `/api/download/model/${run.run}?filename=${encodeURIComponent(customName || defaultName)}`
  const scoreDisplay = run.best_score != null
    ? (typeof run.best_score === 'number' ? run.best_score.toFixed(5) : String(run.best_score))
    : '—'

  return (
    <motion.div
      variants={fadeUp}
      style={{
        border: `1px solid ${run.available ? 'var(--cyan)' : 'var(--border)'}`,
        borderRadius: 12, overflow: 'hidden',
        opacity: run.available ? 1 : 0.55,
        background: 'var(--surface)',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 18px', background: run.available ? 'var(--cyan-dim)' : 'var(--bg-2)',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Trophy size={15} color="var(--amber)" />
          <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-display)' }}>
            {run.label || `Run ${run.run}`}
          </span>
          {run.best_model && (
            <span style={{ fontSize: 11, background: 'rgba(245,166,35,0.12)', color: 'var(--amber)', borderRadius: 5, padding: '2px 8px', fontWeight: 600 }}>
              🏅 {run.best_model}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {run.metric && <span className="badge badge-green" style={{ fontSize: 10 }}>{run.metric}</span>}
          {run.best_score != null && (
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)', background: 'var(--bg-2)', borderRadius: 6, padding: '2px 10px' }}>
              {scoreDisplay}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, padding: '10px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {[
          { icon: <Target size={11} />, label: 'Best Score', value: scoreDisplay, color: 'var(--green)' },
          { icon: <TrendingUp size={11} />, label: 'Metric', value: run.metric || '—', color: 'var(--cyan)' },
          { icon: <Trophy size={11} />, label: 'Best Model', value: run.best_model || '—', color: 'var(--amber)' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--text-3)' }}>{icon}</span>
            <span style={{ color: 'var(--text-3)' }}>{label}:</span>
            <span style={{ color, fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {run.available ? (
          <>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 160 }}>
              <input
                type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="File name"
                style={{
                  width: '100%', padding: '7px 48px 7px 12px', borderRadius: 7,
                  border: '1px solid var(--border)', background: 'var(--bg-2)',
                  color: 'var(--text-1)', fontSize: 12, outline: 'none', fontFamily: 'var(--font-mono)',
                }}
              />
              <span style={{ position: 'absolute', right: 10, fontSize: 11, color: 'var(--text-3)', pointerEvents: 'none' }}>.zip</span>
            </div>
            <a
              href={finalUrl} download={`${customName || defaultName}.zip`}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px',
                background: 'var(--cyan-dim)', color: 'var(--cyan)',
                border: '1px solid var(--cyan)', borderRadius: 8,
                fontWeight: 600, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--cyan)'; e.currentTarget.style.color = '#070d1a' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--cyan-dim)'; e.currentTarget.style.color = 'var(--cyan)' }}
            >
              <Download size={14} /> Download ZIP
            </a>
          </>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
            Model files not found for this run
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function Downloads() {
  const navigate = useNavigate()
  const { activeProject } = useProjects()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchStatus() {
    setLoading(true)
    try { const res = await downloadsApi.status(); setStatus(res.data) }
    catch { }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchStatus() }, [])

  const modelName     = status?.model_name || activeProject?.name || 'model'
  const safeModelName = modelName.replace(/[^a-zA-Z0-9_\-]/g, '_')
  const addedFeatures = status?.added_features || {}
  const hasFeatures   = Object.keys(addedFeatures).length > 0
  const runs          = status?.runs || []
  const artifactCount = [status?.has_data, status?.has_model, status?.has_profile].filter(Boolean).length

  if (loading) return (
    <div className="flex-center" style={{ height: '60vh' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <RefreshCw size={24} color="var(--cyan)" />
      </motion.div>
    </div>
  )

  return (
    <PageTransition key="downloads">
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1 className="page-title">The Vault</h1>
            <p className="page-subtitle">
              {activeProject
                ? <span>Session: <strong style={{ color: 'var(--cyan)' }}>{activeProject.name}</strong></span>
                : 'Download your artifacts.'}
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchStatus} title="Refresh">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Status bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', marginBottom: 32, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          {artifactCount === 3 ? '🎉 All artifacts ready!' : `${artifactCount} of 3 artifacts available`}
        </div>
        <div className="progress-bar-wrap" style={{ flex: 1 }}>
          <motion.div className="progress-bar-fill"
            initial={{ width: 0 }} animate={{ width: `${(artifactCount / 3) * 100}%` }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            style={{ background: artifactCount === 3 ? 'linear-gradient(90deg, var(--green), var(--cyan))' : undefined }}
          />
        </div>
        <span className="badge badge-green" style={{ fontFamily: 'var(--font-mono)' }}>{artifactCount}/3</span>
      </motion.div>

      {/* AutoFeat banner */}
      {hasFeatures && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ marginBottom: 24, borderColor: 'var(--green)', padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Zap size={14} color="var(--green)" />
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>AutoFeat features are included in each model ZIP</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>
            Engineered features bundled with <code style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>autofeat_model.pkl</code> and <code style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>feature_engineering.json</code>:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.keys(addedFeatures).map(f => (
              <code key={f} style={{ fontSize: 11, background: 'var(--bg-2)', color: 'var(--green)', border: '1px solid var(--green)', borderRadius: 5, padding: '2px 8px', fontFamily: 'var(--font-mono)' }}>{f}</code>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Row 1: Processed Data + Profile Report side by side ── */}
      <motion.div variants={stagger} initial="hidden" animate="show"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}
      >
        <SimpleDownloadCard
          icon={FileSpreadsheet} title="Processed Dataset"
          desc="Cleaned CSV with dropped columns and AutoFeat features applied."
          available={status?.has_data} unavailableMsg="Upload a dataset first"
          downloadUrl={downloadsApi.csvUrl()} downloadName={`${safeModelName}_data.csv`} accentColor="#10e87e"
        />
        <SimpleDownloadCard
          icon={FileBarChart} title="Profiling Report"
          desc="Standalone HTML with distributions, correlations, missing value heatmaps."
          available={status?.has_profile} unavailableMsg="Generate report in Exploration"
          downloadUrl={downloadsApi.profileUrl()} downloadName={`${safeModelName}_profile.html`} accentColor="#f5a623"
        />
      </motion.div>

      {/* ── Row 2: Model Downloads per run ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
        className="card" style={{ marginBottom: 32 }}
      >
        <div className="card-glow" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div className="icon-glow" style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(0,212,255,0.12)', border: '1px solid var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BrainCircuit size={20} color="var(--cyan)" strokeWidth={1.5} />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>AutoGluon Models</h3>
            <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
              {runs.length > 0
                ? `${runs.length} training run${runs.length !== 1 ? 's' : ''} — each saved separately, download the one you want`
                : 'Train a model in AutoML Forge to unlock downloads'}
            </p>
          </div>
          {runs.length > 0 && (
            <span className="badge badge-cyan" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
              {runs.filter(r => r.available).length}/{runs.length} ready
            </span>
          )}
        </div>

        {runs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', gap: 12, color: 'var(--text-3)' }}>
            <Lock size={32} style={{ opacity: 0.35 }} />
            <div style={{ fontSize: 14 }}>No training runs yet</div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/automl')}>Go to AutoML Forge</button>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {runs.map((run) => (
              <RunModelRow key={run.run} run={run} safeModelName={safeModelName} />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* ZIP contents info */}
      {status?.has_model && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="card" style={{ marginBottom: 32 }}>
          <div className="card-glow" />
          <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 12 }}>📦 What's inside each model ZIP?</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['autogluon_model/', 'AutoGluon predictor — TabularPredictor.load()'],
              ['feature_engineering.json', 'Added AutoFeat feature formulas & usage guide'],
              ['autofeat_model.pkl', 'Fitted AutoFeat model — apply to new data before prediction'],
              ['processed_data.csv', 'Cleaned & feature-engineered dataset used for training'],
              ['profile_report.html', 'YData Profiling report — open in any browser (if generated)'],
              ['README.md', 'Complete usage instructions and code snippet'],
            ].map(([name, desc]) => (
              <div key={name} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', flexShrink: 0 }}>{name}</code>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{desc}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
            from autogluon.tabular import TabularPredictor<br />
            predictor = TabularPredictor.load(<span style={{ color: 'var(--amber)' }}>"autogluon_model/"</span>)<br />
            predictions = predictor.predict(new_data)
          </div>
        </motion.div>
      )}

      {/* ── Deploy Alchemy Teaser ── */}
      <DeployAlchemyTeaser hasModel={status?.has_model} />

      <div className="flex-between">
        <button className="btn btn-secondary" onClick={() => navigate('/automl')}><ArrowLeft size={14} /> Back to AutoML</button>
        <button className="btn btn-ghost" onClick={() => navigate('/')}><Home size={14} /> Back to Welcome</button>
      </div>
    </PageTransition>
  )
}
