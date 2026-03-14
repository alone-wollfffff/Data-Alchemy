import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu, Trophy, ArrowLeft, ArrowRight, RefreshCw,
  Target, TrendingUp, Sliders, Timer, Award,
  Plus, History, X, Tag, ChevronDown, ChevronUp,
  BarChart2, Layers, Info, Zap, CheckCircle2, AlertTriangle,
  BrainCircuit, FlaskConical, GitBranch
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageTransition from '../components/PageTransition'
import { dataApi, automlApi } from '../api/client'
import { useProjects } from '../context/ProjectContext'

const PROBLEM_TYPES = [
  { value: 'auto',       label: 'Auto-detect', desc: 'Let AutoGluon decide' },
  { value: 'binary',     label: 'Binary',      desc: '2-class (Yes/No)' },
  { value: 'multiclass', label: 'Multiclass',  desc: '3+ categories' },
  { value: 'regression', label: 'Regression',  desc: 'Continuous numbers' },
]
const METRICS = [
  { value: 'auto',                    label: 'Default (Auto)',  group: null },
  { value: 'accuracy',                label: 'Accuracy',        group: 'Classification' },
  { value: 'f1',                      label: 'F1 Score',        group: 'Classification' },
  { value: 'roc_auc',                 label: 'ROC AUC',         group: 'Classification' },
  { value: 'root_mean_squared_error', label: 'RMSE',            group: 'Regression' },
  { value: 'mean_absolute_error',     label: 'MAE',             group: 'Regression' },
  { value: 'r2',                      label: 'R²',              group: 'Regression' },
]
const PRESETS = [
  { value: 'optimize_for_deployment', label: '🌱 Very Light',   desc: 'Fastest, smallest export' },
  { value: 'medium_quality',          label: '⚪ Medium',       desc: 'Default baseline' },
  { value: 'good_quality',            label: '🟢 Good',         desc: 'Better than medium' },
  { value: 'high_quality',            label: '🔵 High',         desc: 'Balanced' },
  { value: 'high_quality_v150',       label: '🔷 High v1.5',    desc: 'Optimized balanced' },
  { value: 'best_quality',            label: '🥇 Best',         desc: 'Broadest CPU-friendly search' },
  { value: 'best_quality_v150',       label: '🏆 Best v1.5',    desc: 'Faster modern best preset' },
  { value: 'extreme_quality',         label: '⚡ Extreme',      desc: 'GPU-first; falls back to Best on CPU' },
  { value: 'interpretable',           label: '🔍 Interpretable',desc: 'Safe fallback on this build' },
]

// DEFAULT_CONFIG is defined outside the component so it is a stable reference
// and does not get recreated on every render (prevents unnecessary effect triggers).
const DEFAULT_CONFIG = {
  problem_type: 'auto',
  eval_metric: 'auto',
  presets: 'medium_quality',
  time_limit: 300,
  holdout_frac: 0.2,
}
const TRAINING_STATUSES = [
  'Ingesting dataset…',
  'Training LightGBM, XGBoost, CatBoost…',
  'Training Neural Network…',
  'Building weighted ensemble…',
  'Running hyperparameter search…',
  'Evaluating on holdout set…',
  'Finalizing leaderboard…',
]

// ── Feature Importance Bar Chart ──────────────────────────────────
function FeatureImportanceChart({ data }) {
  if (!data || data.length === 0) return null
  const maxVal = Math.max(...data.map(d => Math.abs(parseFloat(d.importance) || 0)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.slice(0, 15).map((row, i) => {
        const val = parseFloat(row.importance) || 0
        const pct = maxVal > 0 ? (Math.abs(val) / maxVal) * 100 : 0
        const feature = row.feature || row[Object.keys(row)[0]] || `feat_${i}`
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 130, fontSize: 11, color: 'var(--text-2)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
              {feature}
            </div>
            <div style={{ flex: 1, background: 'var(--bg-2)', borderRadius: 4, height: 16, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: i * 0.04, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  height: '100%',
                  background: i === 0
                    ? 'linear-gradient(90deg, var(--cyan), var(--green))'
                    : `hsl(${180 - i * 10}, 70%, ${55 - i * 1.5}%)`,
                  borderRadius: 4,
                }}
              />
            </div>
            <div style={{ width: 60, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
              {val.toFixed(4)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Single Run Card ───────────────────────────────────────────────
// ── Single Run Card ───────────────────────────────────────────────
function RunCard({ entry, index }) {
  const [open, setOpen] = useState(index === 0)
  const [activeTab, setActiveTab] = useState('leaderboard')
  const { label, config, leaderboard, best_model, best_score, metric, feat_importance, model_info, trained_at } = entry

  const tabs = [
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'features',    label: 'Feature Importance', icon: BarChart2 },
    { id: 'info',        label: 'Model Info', icon: Info },
  ]

  const numModels = leaderboard?.length || 0
  const scoreDisplay = best_score != null ? (typeof best_score === 'number' ? best_score.toFixed(5) : best_score) : '—'

  // --- BULLETPROOF LEADERBOARD FORMATTING LOGIC ---
  const availableKeys = leaderboard?.[0] ? Object.keys(leaderboard[0]) : [];
  
  // 1. The ideal hierarchy
  const IDEAL_ORDER = [
    'model', 'score_val', 'score_test', 'eval_metric',
    'pred_time_val', 'pred_time_test', 'fit_time',
    'stack_level', 'fit_time_marginal', 'pred_time_val_marginal',
    'pred_time_test_marginal', 'fit_order', 'can_infer'
  ];

  // 2. Helper to normalize spaces and underscores so 'score val' matches 'score_val'
  const norm = (str) => str.replace(/ /g, '_').toLowerCase();

  // 3. Match available keys to our ideal order
  const orderedKeys = [];
  IDEAL_ORDER.forEach(idealKey => {
    const found = availableKeys.find(k => norm(k) === norm(idealKey));
    if (found) orderedKeys.push(found);
  });

  // 4. Catch any leftover/new columns AutoGluon adds
  const extraKeys = availableKeys.filter(k => !orderedKeys.includes(k));
  const finalKeys = [...orderedKeys, ...extraKeys];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      style={{ marginBottom: 24 }}
    >
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          background: open ? 'var(--cyan-dim)' : 'var(--surface)',
          border: `1px solid ${open ? 'var(--cyan)' : 'var(--border)'}`,
          borderRadius: open ? '14px 14px 0 0' : 14,
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Trophy size={16} color="var(--amber)" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{label}</span>
          <span className="badge badge-cyan">{config?.target}</span>
          <span className="badge badge-green">{metric}</span>
          {best_model && (
            <span style={{ fontSize: 11, background: 'rgba(245,166,35,0.12)', color: 'var(--amber)', borderRadius: 5, padding: '2px 8px', fontWeight: 600 }}>
              🏅 {best_model}
            </span>
          )}
          {best_score != null && (
            <span style={{ fontSize: 11, background: 'var(--bg-2)', color: 'var(--green)', borderRadius: 5, padding: '2px 8px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {scoreDisplay}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-3)' }}>
            <span>{numModels} models</span>
            {trained_at && <span>{new Date(trained_at).toLocaleTimeString()}</span>}
          </div>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Body */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden', border: '1px solid var(--cyan)', borderTop: 'none', borderRadius: '0 0 14px 14px', background: 'var(--surface)' }}
          >
            {/* Summary Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '16px 18px 0' }}>
              {[
                { label: 'Best Score', value: scoreDisplay, color: 'var(--green)', icon: '🎯' },
                { label: 'Models Trained', value: numModels, color: 'var(--cyan)', icon: '🧠' },
                { label: 'Best Model', value: best_model || '—', color: 'var(--amber)', icon: '🏅', small: true },
                { label: 'Preset', value: config?.presets?.replace(/_/g, ' ') || '—', color: 'var(--text-2)', icon: '⚙️', small: true },
              ].map(({ label: l, value, color, icon, small }) => (
                <div key={l} style={{ padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: small ? 11 : 18, fontWeight: 700, color, fontFamily: small ? 'inherit' : 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '12px 18px 0', borderBottom: '1px solid var(--border)' }}>
              {tabs.map(({ id, label: tl, icon: TIcon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: '8px 8px 0 0',
                    border: '1px solid transparent',
                    borderBottom: 'none',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: activeTab === id ? 'var(--bg-2)' : 'none',
                    color: activeTab === id ? 'var(--cyan)' : 'var(--text-3)',
                    borderColor: activeTab === id ? 'var(--border)' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <TIcon size={12} />
                  {tl}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ padding: '16px 18px 18px' }}>

              {/* ── Leaderboard Tab ── */}
              {activeTab === 'leaderboard' && (
                <div className="data-table-wrapper" style={{ maxHeight: 360 }}>
                  <table className="data-table leaderboard-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        {finalKeys.map(k => (
                          <th key={k} style={{ textTransform: 'capitalize' }}>
                            {k.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard?.map((row, i) => (
                        <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className={i === 0 ? 'rank-1' : ''}>
                          <td>
                            {i === 0
                              ? <Award size={14} color="var(--amber)" />
                              : <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontSize: 11 }}>{i + 1}</span>}
                          </td>
                          {finalKeys.map(k => {
                            const v = row[k];
                            let displayVal = String(v ?? '—');
                            
                            // Format numbers and add 's' for any column that has 'time' in the name
                            if (typeof v === 'number') {
                              displayVal = Number.isInteger(v) ? v : v.toFixed(4);
                              if (norm(k).includes('time')) displayVal += ' s';
                            } else if (typeof v === 'boolean') {
                              displayVal = v ? 'Yes' : 'No';
                            }

                            return <td key={k}>{displayVal}</td>
                          })}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Feature Importance Tab ── */}
              {activeTab === 'features' && (
                <div>
                  {feat_importance && feat_importance.length > 0 ? (
                    <>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Zap size={12} color="var(--cyan)" />
                        Showing top {Math.min(feat_importance.length, 15)} features by importance (higher = more predictive)
                      </div>
                      <FeatureImportanceChart data={feat_importance} />

                      {/* Top feature callout */}
                      {feat_importance[0] && (
                        <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--cyan-dim)', border: '1px solid var(--cyan)', borderRadius: 10, fontSize: 12 }}>
                          <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>Most important feature: </span>
                          <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', fontSize: 12 }}>
                            {feat_importance[0].feature || feat_importance[0][Object.keys(feat_importance[0])[0]]}
                          </code>
                          <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>
                            (importance: {parseFloat(feat_importance[0].importance || 0).toFixed(4)})
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
                      <BarChart2 size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                      <div>Feature importance not available for this run</div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Model Info Tab ── */}
              {activeTab === 'info' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    {[
                      { label: 'Problem Type', value: model_info?.problem_type || config?.problem_type || '—', icon: <Target size={14} /> },
                      { label: 'Eval Metric', value: model_info?.eval_metric || metric || '—', icon: <TrendingUp size={14} /> },
                      { label: 'Models Trained', value: model_info?.num_models_trained || numModels, icon: <Layers size={14} /> },
                      { label: 'Features Used', value: model_info?.features_used || '—', icon: <FlaskConical size={14} /> },
                      { label: 'Time Limit', value: `${config?.time_limit}s`, icon: <Timer size={14} /> },
                      { label: 'Holdout %', value: `${((config?.holdout_frac || 0) * 100).toFixed(0)}%`, icon: <GitBranch size={14} /> },
                    ].map(({ label: l, value, icon }) => (
                      <div key={l} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--border)', alignItems: 'center' }}>
                        <div style={{ color: 'var(--cyan)', flexShrink: 0 }}>{icon}</div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>{l}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{String(value)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Training Config */}
                  <div style={{ padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Training Config
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.9 }}>
                      {Object.entries(config || {}).map(([k, v]) => (
                        <div key={k}>
                          <span style={{ color: 'var(--cyan)' }}>{k}</span>
                          <span style={{ color: 'var(--text-3)' }}> = </span>
                          <span style={{ color: 'var(--amber)' }}>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Models breakdown */}
                  {leaderboard && leaderboard.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Models in Ensemble
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {leaderboard.map((row, i) => {
                          const name = row.model || row[Object.keys(row)[0]] || `Model ${i+1}`
                          return (
                            <span key={i} style={{
                              fontSize: 11, padding: '3px 10px', borderRadius: 20,
                              background: i === 0 ? 'var(--cyan-dim)' : 'var(--bg-2)',
                              color: i === 0 ? 'var(--cyan)' : 'var(--text-2)',
                              border: `1px solid ${i === 0 ? 'var(--cyan)' : 'var(--border)'}`,
                              fontFamily: 'var(--font-mono)',
                            }}>
                              {i === 0 ? '🏅 ' : ''}{name}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main AutoML Page ─────────────────────────────────────────────
export default function AutoML() {
  const navigate = useNavigate()
  const {
    refresh: refreshProjects,
    taskStatus,
    startFastPolling,
    refreshTaskStatus,
    getPageSettings,
    setPageSetting,
    activeId,
  } = useProjects()

  const {
    training_status: trainingStatus,
    leaderboards,
  } = taskStatus

  const training = trainingStatus === 'training'

  // ── Page-persisted state ──────────────────────────────────────
  const saved = getPageSettings('automl')
  // DEFAULT_CONFIG is now module-level — stable reference, no re-creation on render

  const [columns,     setColumns]    = useState([])
  const [loading,     setLoading]    = useState(true)
  const [statusIdx,   setStatusIdx]  = useState(0)
  const [validErrors, setValidErrors]= useState({})
  const [targetWarn,  setTargetWarn] = useState(false)

  // These three are persisted in context across navigation
  const [target,    setTargetLocal]   = useState(saved.target   ?? '')
  const [config,    setConfigLocal]   = useState(saved.config   ?? DEFAULT_CONFIG)
  const [runLabel,  setRunLabelLocal] = useState(saved.runLabel ?? '')

  function setTarget(v) {
    setTargetLocal(v)
    setPageSetting('automl', 'target', v)
    if (v) setTargetWarn(false)
  }
  function setConfig(fn) {
    setConfigLocal(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      setPageSetting('automl', 'config', next)
      return next
    })
  }
  function setRunLabel(v) {
    setRunLabelLocal(v)
    setPageSetting('automl', 'runLabel', v)
  }

  useEffect(() => {
    async function init() {
      try {
        const res = await dataApi.get()
        setColumns(res.data.preview.columns)
      } catch (err) {
        if (err.type === 'DatasetNotLoaded' || err.type === 'NoActiveProject') {
          toast.error('Upload a dataset first.')
          navigate('/upload')
        }
      } finally {
        setLoading(false)
      }
      refreshTaskStatus()
    }
    init()
  }, [navigate, refreshTaskStatus])

  // Sync persisted settings back to local state when the active project changes.
  // Depends on activeId — NOT on getPageSettings — so it only fires when the
  // user switches projects, not on every keystroke that updates pageSettings.
  useEffect(() => {
    const s = getPageSettings('automl')
    setTargetLocal(s.target   ?? '')
    setConfigLocal(s.config   ?? DEFAULT_CONFIG)
    setRunLabelLocal(s.runLabel ?? '')
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rotating status messages while training
  useEffect(() => {
    let iv
    if (training) iv = setInterval(() => setStatusIdx(i => (i + 1) % TRAINING_STATUSES.length), 12000)
    return () => clearInterval(iv)
  }, [training])

  // Refresh project list when training transitions
  const prevTrainingRef = useRef(trainingStatus)
  useEffect(() => {
    const prev = prevTrainingRef.current
    prevTrainingRef.current = trainingStatus
    if (prev === 'training' && (trainingStatus === 'done' || trainingStatus === 'error')) {
      refreshProjects()
    }
  }, [trainingStatus, refreshProjects])

  function setCfg(key, value) {
    setConfig(c => ({ ...c, [key]: value }))
    setValidErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  async function train() {
    setValidErrors({})
    // Validate: must select a target
    if (!target) {
      setTargetWarn(true)
      toast.error('Please select a target column before starting training.')
      return
    }
    setTargetWarn(false)
    setStatusIdx(0)
    try {
      const nextRun = leaderboards.length + 1
      const label = runLabel.trim() || `Run ${nextRun}`
      await automlApi.train({ target_column: target, ...config, run_label: label })
      toast.success('Training started in background!')
      startFastPolling()
      setRunLabel(`Run ${nextRun + 1}`)
    } catch (err) {
      if (err.code === 422) { setValidErrors(err.details ?? {}); toast.error(err.message) }
    }
  }

  async function cancelTraining() {
    try {
      await automlApi.cancel()
      toast.success('Training cancelled.')
      startFastPolling()
    } catch { toast.error('Could not cancel.') }
  }

  if (loading) return (
    <div className="flex-center" style={{ height: '60vh' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <RefreshCw size={24} color="var(--cyan)" />
      </motion.div>
    </div>
  )

  return (
    <PageTransition key="automl">
      <div className="page-header">
        <h1 className="page-title">
          <Cpu size={28} style={{ marginRight: 10, verticalAlign: 'middle', color: 'var(--cyan)' }} />
          AutoML Forge
        </h1>
        <p className="page-subtitle">
          Configure AutoGluon and launch training. Runs in background — navigate freely, you'll be notified when done.
        </p>
      </div>

      {/* Config + Controls Grid */}
      <div className="grid-2" style={{ gap: 24, marginBottom: 32, alignItems: 'start' }}>

        {/* Left: Config Form */}
        <div className="card">
          <div className="card-glow" />
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 20 }}>Training Configuration</h3>

          <div className="form-group">
            <label className="form-label"><Tag size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Run Label</label>
            <input type="text" className="form-input" value={runLabel}
              onChange={e => setRunLabel(e.target.value)}
              placeholder={`Run ${leaderboards.length + 1}`} disabled={training} />
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Label for this training run (optional)</div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Target size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Target Column <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>
            </label>
            <select
              className="form-select" value={target}
              onChange={e => setTarget(e.target.value)} disabled={training}
              style={{ borderColor: (targetWarn || validErrors.target_column) ? 'var(--red)' : undefined }}
            >
              <option value="">— Select target column —</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <AnimatePresence>
              {(targetWarn || validErrors.target_column) && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, color: 'var(--red)' }}>
                  <AlertTriangle size={11} />
                  {validErrors.target_column || 'Please select a target column before training.'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="form-group">
            <label className="form-label">Problem Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {PROBLEM_TYPES.map(pt => (
                <motion.div key={pt.value} whileHover={training ? {} : { scale: 1.02 }} whileTap={training ? {} : { scale: 0.98 }}
                  onClick={() => !training && setCfg('problem_type', pt.value)}
                  style={{
                    padding: '10px 12px', borderRadius: 8, cursor: training ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s', opacity: training ? 0.6 : 1,
                    background: config.problem_type === pt.value ? 'var(--cyan-dim)' : 'var(--bg-2)',
                    border: `1px solid ${config.problem_type === pt.value ? 'var(--cyan)' : 'var(--border)'}`,
                  }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: config.problem_type === pt.value ? 'var(--cyan)' : 'var(--text)' }}>{pt.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{pt.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label"><TrendingUp size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Evaluation Metric</label>
            <select className="form-select" value={config.eval_metric} onChange={e => setCfg('eval_metric', e.target.value)} disabled={training}>
              {METRICS.filter(m => !m.group).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              {['Classification', 'Regression'].map(g => (
                <optgroup key={g} label={g}>
                  {METRICS.filter(m => m.group === g).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label"><Sliders size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Model Quality Preset</label>
            <select className="form-select" value={config.presets} onChange={e => setCfg('presets', e.target.value)} disabled={training}>
              {PRESETS.map(p => <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>)}
            </select>
          </div>
        </div>

        {/* Right: Sliders + Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-glow" />
            <label className="form-label"><Timer size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Time Limit</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <input type="number" className="form-input" value={config.time_limit} min={30}
                onChange={e => setCfg('time_limit', parseInt(e.target.value) || 30)}
                disabled={training}
                style={{ width: 100, borderColor: validErrors.time_limit ? 'var(--red)' : undefined }} />
              <div style={{ flex: 1, fontSize: 13, color: 'var(--text-2)' }}>
                seconds — <strong>{(config.time_limit / 60).toFixed(1)} min</strong>
              </div>
            </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Increase to 1800–3600 s for Best Quality. Extreme uses that same broad search on CPU.</div>
          </div>

          <div className="card">
            <div className="card-glow" />
            <label className="form-label">Holdout Fraction (Validation Split)</label>
            <input type="range" className="form-range" min={0.05} max={0.5} step={0.05}
              value={config.holdout_frac} onChange={e => setCfg('holdout_frac', parseFloat(e.target.value))}
              disabled={training} style={{ marginBottom: 10 }} />
            <div className="flex-between">
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)', fontSize: 18, fontWeight: 700 }}>
                  {(config.holdout_frac * 100).toFixed(0)}%
                </span>{' '}validation
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Train: {(100 - config.holdout_frac * 100).toFixed(0)}%</div>
            </div>
          </div>

          {leaderboards.length > 0 && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div className="card-glow" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <History size={14} color="var(--amber)" />
                <span style={{ fontWeight: 700, fontSize: 13 }}>{leaderboards.length} run{leaderboards.length !== 1 ? 's' : ''} completed</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                Change config and click "Train New Run" to compare models across runs.
              </div>
            </div>
          )}

          {!training ? (
            <motion.button className="btn btn-primary btn-full btn-lg" onClick={train}
              whileHover={{ scale: 1.02, boxShadow: '0 0 32px var(--cyan-glow)' }} whileTap={{ scale: 0.98 }}
              style={{ position: 'relative', overflow: 'hidden' }}>
              <Cpu size={16} />
              {leaderboards.length > 0 ? <><span>Train New Run</span><Plus size={14} /></> : 'Start AutoML Training'}
            </motion.button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <motion.button className="btn btn-primary btn-full btn-lg" disabled style={{ position: 'relative', overflow: 'hidden' }}>
                <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }}
                  animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.5, repeat: Infinity }} />
                <span className="spinner" /> Training in background…
              </motion.button>
              <button className="btn btn-secondary btn-full" onClick={cancelTraining}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <X size={14} /> Cancel Training
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Training Progress */}
      <AnimatePresence>
        {training && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="card" style={{ marginBottom: 32, borderColor: 'var(--cyan)' }}>
            <div className="card-glow" />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <motion.div key={statusIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--cyan)' }}>
                {TRAINING_STATUSES[statusIdx]}
              </motion.div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
                Runs entirely in the background — navigate or close this tab, training will continue.
              </div>
            </div>
            <div className="progress-bar-wrap" style={{ height: 8 }}>
              <div className="progress-bar-fill" style={{ width: '100%' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Leaderboards / Runs */}
      <AnimatePresence>
        {leaderboards.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex-between" style={{ marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BrainCircuit size={22} color="var(--cyan)" />
                Training Results
                <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 400 }}>({leaderboards.length} run{leaderboards.length !== 1 ? 's' : ''})</span>
              </h3>
              <button className="btn btn-green btn-sm" onClick={() => navigate('/downloads')}>
                <Award size={14} /> Downloads
              </button>
            </div>
            {[...leaderboards].reverse().map((entry, i) => (
              <RunCard key={entry.run} entry={entry} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-between" style={{ marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={() => navigate('/exploration')}>
          <ArrowLeft size={14} /> Back to Exploration
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/downloads')}>
          Downloads <ArrowRight size={14} />
        </button>
      </div>
    </PageTransition>
  )
}
