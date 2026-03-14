import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Settings2, BarChart3, Cpu, Download, ArrowRight, Sparkles, Zap, FlaskConical, BrainCircuit, Database, Layers, ChevronRight } from 'lucide-react'

const STORY = [
  {
    eyebrow: 'Hello, Data Scientist.',
    headline: 'A Lonely CSV awaits.',
    body: "Rows and columns. Numbers staring back, daring you to make sense of them.",
    cta: 'So… what now ?',
    color: '#00d4ff',
  },
  {
    eyebrow: 'look closer.',
    headline: 'What the Numbers Hide..',
    body: "Patterns hide in plain sight. Answers to questions you haven't even thought to ask.",
    cta: "But I can't see them..",
    color: '#9b6dff',
  },
  {
    eyebrow: "that's the catch.",
    headline: 'Data Science takes Time.',
    body: "AutoML, feature engineering, hyperparameter tuning… it's practically a Career.",
    cta: "I don't have months...",
    color: '#10e87e',
  },
  {
    eyebrow: 'We get it.',
    headline: 'You have Minutes...',
    body: 'Upload your CSV. We clean, profile, engineer, train dozens of models, and hand you the champion.',
    cta: 'Minutes ? Really ??',
    color: '#f5a623',
  },
  {
    eyebrow: 'Really.',
    headline: 'Welcome to Data Alchemy.',
    body: 'Raw data in. Trained intelligence out. No PhD required.',
    cta: 'Begin the Transformation →',
    color: '#00d4ff',
    isFinal: true,
  },
]

const PIPELINE = [
  { icon: Upload,    label: 'Upload',  sub: 'CSV or Excel',          color: '#00d4ff', step: '01' },
  { icon: Settings2, label: 'Operate', sub: 'Clean & shape',          color: '#9b6dff', step: '02' },
  { icon: BarChart3, label: 'Explore', sub: 'Profile & visualise',    color: '#10e87e', step: '03' },
  { icon: Cpu,       label: 'Forge',   sub: 'AutoGluon trains models', color: '#f5a623', step: '04' },
  { icon: Download,  label: 'Vault',   sub: 'Download your model',    color: '#ff6b9d', step: '05' },
]

const FEATURES = [
  { icon: BrainCircuit, label: 'AutoGluon',     desc: '50+ models, one winner',          color: '#00d4ff' },
  { icon: Layers,       label: 'AutoFeat',       desc: 'AI-crafted feature engineering',  color: '#9b6dff' },
  { icon: BarChart3,    label: 'YData Profiling',desc: 'Deep dataset intelligence',        color: '#10e87e' },
  { icon: Database,     label: 'D-Tale',         desc: 'Interactive data explorer',        color: '#f5a623' },
]

// ── Microchip SVG — evolves across 5 slides ───────────────────────
function MicroChip({ step, color }) {
  const C = color

  if (step === 0) return (
    // Slide 0 — bare chip, isolated, dim
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
      <rect x="26" y="26" width="58" height="58" rx="6" stroke={C} strokeWidth="1.4" opacity="0.45"/>
      <rect x="34" y="34" width="42" height="42" rx="3" stroke={C} strokeWidth="0.8" opacity="0.25" strokeDasharray="3 3"/>
      {[38,48,58,68].map(y=>(<g key={y}><line x1="14" y1={y} x2="26" y2={y} stroke={C} strokeWidth="1.4" opacity="0.3"/><line x1="84" y1={y} x2="96" y2={y} stroke={C} strokeWidth="1.4" opacity="0.3"/></g>))}
      {[38,48,58,68].map(x=>(<g key={x+'v'}><line x1={x} y1="14" x2={x} y2="26" stroke={C} strokeWidth="1.4" opacity="0.3"/><line x1={x} y1="84" x2={x} y2="96" stroke={C} strokeWidth="1.4" opacity="0.3"/></g>))}
      <text x="55" y="61" textAnchor="middle" fill={C} fontSize="18" opacity="0.3" fontFamily="monospace">?</text>
    </svg>
  )

  if (step === 1) return (
    // Slide 1 — data nodes waking up
    <svg width="116" height="116" viewBox="0 0 116 116" fill="none">
      <rect x="24" y="24" width="68" height="68" rx="7" stroke={C} strokeWidth="1.8" opacity="0.75"/>
      <rect x="32" y="32" width="52" height="52" rx="4" stroke={C} strokeWidth="1" opacity="0.35" strokeDasharray="4 3"/>
      {[38,52,66,80].map(y=>(<g key={y}><line x1="10" y1={y} x2="24" y2={y} stroke={C} strokeWidth="1.6" opacity="0.6"/><line x1="92" y1={y} x2="106" y2={y} stroke={C} strokeWidth="1.6" opacity="0.6"/></g>))}
      {[38,52,66,80].map(x=>(<g key={x+'v'}><line x1={x} y1="10" x2={x} y2="24" stroke={C} strokeWidth="1.6" opacity="0.6"/><line x1={x} y1="92" x2={x} y2="106" stroke={C} strokeWidth="1.6" opacity="0.6"/></g>))}
      {[[42,42],[74,42],[58,58],[42,74],[74,74]].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="3.5" fill={C} opacity={i < 3 ? "0.8" : "0.2"}/>
      ))}
      <line x1="42" y1="42" x2="74" y2="42" stroke={C} strokeWidth="1.2" opacity="0.6"/>
      <line x1="42" y1="42" x2="58" y2="58" stroke={C} strokeWidth="1.2" opacity="0.5"/>
      <line x1="74" y1="42" x2="58" y2="58" stroke={C} strokeWidth="1.2" opacity="0.4"/>
    </svg>
  )

  if (step === 2) return (
    // Slide 2 — processing clock
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <rect x="22" y="22" width="76" height="76" rx="8" stroke={C} strokeWidth="2" opacity="0.85"/>
      {[36,50,64,78,92].map(y=>(<g key={y}><line x1="8" y1={y} x2="22" y2={y} stroke={C} strokeWidth="2" opacity="0.7"/><line x1="98" y1={y} x2="112" y2={y} stroke={C} strokeWidth="2" opacity="0.7"/></g>))}
      {[36,50,64,78,92].map(x=>(<g key={x+'v'}><line x1={x} y1="8" x2={x} y2="22" stroke={C} strokeWidth="2" opacity="0.7"/><line x1={x} y1="98" x2={x} y2="112" stroke={C} strokeWidth="2" opacity="0.7"/></g>))}
      <circle cx="60" cy="60" r="20" stroke={C} strokeWidth="1.3" opacity="0.5" strokeDasharray="5 3"/>
      <circle cx="60" cy="60" r="12" stroke={C} strokeWidth="1.2" opacity="0.8"/>
      <line x1="60" y1="60" x2="60" y2="50" stroke={C} strokeWidth="2" opacity="1" strokeLinecap="round"/>
      <line x1="60" y1="60" x2="68" y2="60" stroke={C} strokeWidth="2" opacity="1" strokeLinecap="round"/>
      <circle cx="60" cy="60" r="2.5" fill={C}/>
      {[0,60,120,180,240,300].map(deg=>{
        const r=20, rad=deg*Math.PI/180
        return <circle key={deg} cx={60+r*Math.cos(rad)} cy={60+r*Math.sin(rad)} r="1.5" fill={C} opacity="0.6"/>
      })}
    </svg>
  )

  if (step === 3) return (
    // Slide 3 — high throughput, speed lines + AI core
    <svg width="124" height="124" viewBox="0 0 124 124" fill="none">
      <rect x="20" y="20" width="84" height="84" rx="9" stroke={C} strokeWidth="2.2"/>
      <rect x="28" y="28" width="68" height="68" rx="6" stroke={C} strokeWidth="1" opacity="0.35"/>
      {[32,46,62,78,92].map(y=>(<g key={y}><line x1="6" y1={y} x2="20" y2={y} stroke={C} strokeWidth="2.2"/><line x1="104" y1={y} x2="118" y2={y} stroke={C} strokeWidth="2.2"/></g>))}
      {[32,46,62,78,92].map(x=>(<g key={x+'v'}><line x1={x} y1="6" x2={x} y2="20" stroke={C} strokeWidth="2.2"/><line x1={x} y1="104" x2={x} y2="118" stroke={C} strokeWidth="2.2"/></g>))}
      <line x1="30" y1="55" x2="50" y2="55" stroke={C} strokeWidth="1.5" opacity="0.7"/>
      <line x1="30" y1="62" x2="68" y2="62" stroke={C} strokeWidth="2.2" opacity="0.9"/>
      <line x1="30" y1="69" x2="52" y2="69" stroke={C} strokeWidth="1.5" opacity="0.7"/>
      <rect x="50" y="46" width="24" height="24" rx="4" fill={`${C}25`} stroke={C} strokeWidth="1.8"/>
      <text x="62" y="63" textAnchor="middle" fill={C} fontSize="12" fontWeight="bold" fontFamily="monospace">AI</text>
      {[32,62,92].map(x=><circle key={x} cx={x} cy="6" r="3" fill={C} opacity="0.9"/>)}
      {[46,78].map(x=><circle key={x} cx={x} cy="118" r="3" fill={C} opacity="0.75"/>)}
    </svg>
  )

  // Slide 4 — FINAL: fully lit advanced chip
  return (
    <svg width="148" height="148" viewBox="0 0 148 148" fill="none">
      {/* Orbit rings */}
      <circle cx="74" cy="74" r="70" stroke={C} strokeWidth="0.5" opacity="0.12" strokeDasharray="2 5"/>
      <circle cx="74" cy="74" r="62" stroke={C} strokeWidth="0.5" opacity="0.18" strokeDasharray="3 6"/>
      {/* Main body */}
      <rect x="22" y="22" width="104" height="104" rx="11" stroke={C} strokeWidth="2.2" fill={`${C}07`}/>
      <rect x="30" y="30" width="88" height="88" rx="7" stroke={C} strokeWidth="1" opacity="0.45"/>
      {/* Pins — 8 per side */}
      {[34,46,58,70,82,94,106,118].map(y=>(<g key={y}>
        <line x1="6"   y1={y} x2="22"  y2={y} stroke={C} strokeWidth="2" opacity="0.9"/>
        <circle cx="6" cy={y} r="2.2" fill={C} opacity="0.85"/>
        <line x1="126" y1={y} x2="142" y2={y} stroke={C} strokeWidth="2" opacity="0.9"/>
        <circle cx="142" cy={y} r="2.2" fill={C} opacity="0.85"/>
      </g>))}
      {[34,46,58,70,82,94,106,118].map(x=>(<g key={x+'v'}>
        <line x1={x} y1="6"   x2={x} y2="22"  stroke={C} strokeWidth="2" opacity="0.9"/>
        <circle cx={x} cy="6"   r="2.2" fill={C} opacity="0.85"/>
        <line x1={x} y1="126" x2={x} y2="142" stroke={C} strokeWidth="2" opacity="0.9"/>
        <circle cx={x} cy="142" r="2.2" fill={C} opacity="0.85"/>
      </g>))}
      {/* Circuit traces */}
      <polyline points="30,58 48,58 48,46 58,46"  stroke={C} strokeWidth="1.2" opacity="0.7" fill="none"/>
      <polyline points="90,46 100,46 100,58 118,58" stroke={C} strokeWidth="1.2" opacity="0.7" fill="none"/>
      <polyline points="30,94 48,94 48,102 58,102"  stroke={C} strokeWidth="1.2" opacity="0.7" fill="none"/>
      <polyline points="90,102 100,102 100,94 118,94" stroke={C} strokeWidth="1.2" opacity="0.7" fill="none"/>
      {/* Sub-cells */}
      {[[40,40,22,22],[86,40,22,22],[40,86,22,22],[86,86,22,22]].map(([x,y,w,h],i)=>(
        <rect key={i} x={x} y={y} width={w} height={h} rx="3.5" stroke={C} strokeWidth="1" opacity="0.55" fill={`${C}10`}/>
      ))}
      {/* Core */}
      <rect x="58" y="58" width="32" height="32" rx="6" fill={`${C}28`} stroke={C} strokeWidth="2"/>
      <text x="74" y="79" textAnchor="middle" fill={C} fontSize="14" fontWeight="bold" fontFamily="monospace">DA</text>
      {/* Junction dots */}
      {[[48,58],[100,58],[48,94],[100,94],[58,48],[90,48],[58,100],[90,100]].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="3" fill={C} opacity="0.9"/>
      ))}
    </svg>
  )
}

// ── Horizontal data-flow streaks shown on final slide ─────────────
function DataFlowLines({ color }) {
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
      {[...Array(7)].map((_,i) => (
        <motion.div
          key={i}
          animate={{ x: ['-120%', '220%'] }}
          transition={{ duration: 2.0 + i * 0.35, delay: i * 0.28, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            top: `${12 + i * 12}%`,
            left: 0,
            width: 70 + i * 18,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${color}66, ${color}cc, ${color}66, transparent)`,
          }}
        />
      ))}
    </div>
  )
}

function AlchemyParticles({ color }) {
  const canvasRef = useRef(null), rafRef = useRef(null), ptsRef = useRef([]), colorRef = useRef(color)
  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    const resize = () => {
      cv.width = cv.offsetWidth; cv.height = cv.offsetHeight
      ptsRef.current = Array.from({ length: 60 }, () => ({ x: Math.random()*cv.width, y: Math.random()*cv.height, r: Math.random()*2+0.4, vx: (Math.random()-.5)*.4, vy: (Math.random()-.5)*.4, o: Math.random()*.55+.1 }))
    }
    resize(); window.addEventListener('resize', resize)
    const draw = () => {
      const W=cv.width, H=cv.height, c=colorRef.current; ctx.clearRect(0,0,W,H)
      ptsRef.current.forEach(p => {
        p.x+=p.vx; p.y+=p.vy
        if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2)
        ctx.fillStyle = c+Math.round(p.o*255).toString(16).padStart(2,'0'); ctx.fill()
      })
      const pts=ptsRef.current
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
        const a=pts[i],b=pts[j],d=Math.hypot(a.x-b.x,a.y-b.y)
        if(d<100){ ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.strokeStyle=c+Math.round((1-d/100)*.15*255).toString(16).padStart(2,'0'); ctx.lineWidth=.6; ctx.stroke() }
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none' }} />
}

function Typewriter({ text, color }) {
  const [shown,setShown] = useState('')
  useEffect(() => {
    setShown(''); let i=0
    const iv = setInterval(() => { i++; setShown(text.slice(0,i)); if(i>=text.length)clearInterval(iv) }, 22)
    return () => clearInterval(iv)
  }, [text])
  return (
    <span style={{ color, fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', transition:'color 0.8s' }}>
      {shown}<motion.span animate={{ opacity:[1,0] }} transition={{ duration:.55, repeat:Infinity }}>_</motion.span>
    </span>
  )
}

function IntroOverlay({ onDone }) {
  const [step,setStep] = useState(0), [exiting,setExit] = useState(false)
  const cur = STORY[step]
  const isFinal = step === STORY.length - 1
  const advance = () => { if(cur.isFinal){ setExit(true); setTimeout(onDone,900); return }; setStep(s=>s+1) }

  return (
    <motion.div
      initial={{ opacity:1 }} animate={{ opacity: exiting ? 0 : 1 }} transition={{ duration: exiting ? .9 : .01 }}
      style={{ position:'fixed', inset:0, zIndex:999, background:'#070d1a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, overflow:'hidden' }}
    >
      <AlchemyParticles color={cur.color}/>
      <div style={{ position:'absolute', inset:0, zIndex:1, pointerEvents:'none', backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 4px)' }}/>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', opacity:.04, backgroundImage:'radial-gradient(circle,#dce8ff 1px,transparent 1px)', backgroundSize:'32px 32px' }}/>
      <motion.div animate={{ opacity:[.4,.75,.4] }} transition={{ duration:4.5, repeat:Infinity, ease:'easeInOut' }}
        style={{ position:'absolute', inset:0, pointerEvents:'none', background:`radial-gradient(ellipse 65% 65% at 50% 50%, ${cur.color}09 0%, transparent 70%)`, transition:'background .8s ease' }}/>
      {isFinal && <DataFlowLines color={cur.color}/>}
      <div style={{ position:'absolute', top:24, left:32, zIndex:2, fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)' }}>DATA-ALCHEMY // v4.0</div>
      <div style={{ position:'absolute', top:24, right:32, zIndex:2, fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)' }}>{String(step+1).padStart(2,'0')} / {String(STORY.length).padStart(2,'0')}</div>

      <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:32, maxWidth:640, width:'100%' }}>

        {/* ── Microchip visual ── */}
        <div style={{ position:'relative', flexShrink:0, marginBottom: 80 }}>
          {/* Glow halo */}
          <motion.div
            animate={{ scale:[1,1.2,1], opacity:[0.2, isFinal ? 0.65 : 0.4, 0.2] }}
            transition={{ duration: isFinal ? 2.2 : 4, repeat:Infinity, ease:'easeInOut' }}
            style={{ position:'absolute', inset:-44, borderRadius:'50%', background:`radial-gradient(circle,${cur.color}33 0%,transparent 70%)`, filter:'blur(20px)', pointerEvents:'none' }}
          />
          {/* Spinning orbit ring */}
          <motion.div
            animate={{ rotate:360 }}
            transition={{ duration: isFinal ? 5 : 22, repeat:Infinity, ease:'linear' }}
            style={{ position:'absolute', inset: isFinal ? -30 : -22, borderRadius:'50%', border:`1px dashed ${cur.color}${isFinal ? '55' : '22'}`, pointerEvents:'none' }}
          />
          {/* Counter ring (final only) */}
          {isFinal && (
            <motion.div
              animate={{ rotate:-360 }}
              transition={{ duration:9, repeat:Infinity, ease:'linear' }}
              style={{ position:'absolute', inset:-48, borderRadius:'50%', border:`1px solid ${cur.color}28`, pointerEvents:'none' }}
            />
          )}
          {/* Chip sphere */}
          <motion.div
            animate={isFinal ? {
              boxShadow:[`0 0 20px ${cur.color}44,inset 0 0 20px ${cur.color}22`,`0 0 60px ${cur.color}88,inset 0 0 40px ${cur.color}44`,`0 0 20px ${cur.color}44,inset 0 0 20px ${cur.color}22`]
            } : {
              boxShadow:[`0 0 0px ${cur.color}00,inset 0 0 10px ${cur.color}18`,`0 0 28px ${cur.color}33,inset 0 0 20px ${cur.color}30`,`0 0 0px ${cur.color}00,inset 0 0 10px ${cur.color}18`]
            }}
            transition={{ duration: isFinal ? 2 : 3.5, repeat:Infinity, ease:'easeInOut' }}
            style={{
              width: isFinal ? 168 : 155,
              height: isFinal ? 168 : 155,
              borderRadius: '50%',
              border: `${isFinal ? 2 : 1.5}px solid ${cur.color}${isFinal ? 'cc' : '55'}`,
              background: `radial-gradient(circle at 35% 35%, ${cur.color}18 0%, #070d1a 65%)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'border-color .8s, width .4s, height .4s',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity:0, scale:.45, filter:'blur(14px)', rotate:-12 }}
                animate={{ opacity:1, scale:1,   filter:'blur(0px)',  rotate:0  }}
                exit={{   opacity:0, scale:1.5,  filter:'blur(14px)', rotate:12 }}
                transition={{ duration:.52, ease:[.22,1,.36,1] }}
                style={{ display:'flex', alignItems:'center', justifyContent:'center' }}
              >
                <MicroChip step={step} color={cur.color}/>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{opacity:0,y:32,filter:'blur(10px)'}} animate={{opacity:1,y:0,filter:'blur(0px)'}} exit={{opacity:0,y:-24,filter:'blur(10px)'}} transition={{duration:.48,ease:[.22,1,.36,1]}}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
            <Typewriter text={cur.eyebrow} color={cur.color}/>
            <motion.h1 initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:.16,duration:.5}}
              style={{ fontFamily:'var(--font-display)', fontSize:'clamp(28px,5vw,52px)', fontWeight:800, lineHeight:1.1, letterSpacing:'-.035em', color:'var(--text)', margin:0 }}>{cur.headline}</motion.h1>
            <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.3,duration:.6}}
              style={{ fontSize:16, color:'var(--text-2)', lineHeight:1.78, maxWidth:460, margin:0 }}>{cur.body}</motion.p>
          </motion.div>
        </AnimatePresence>

        {/* Step dots */}
        <div style={{ display:'flex', gap:8 }}>
          {STORY.map((s,i)=>(<motion.div key={i} animate={{ width:i===step?32:8, background:i<step?s.color+'55':i===step?cur.color:'#1e2f50' }} transition={{ duration:.4, ease:[.22,1,.36,1] }} style={{ height:4, borderRadius:2 }}/>))}
        </div>

        {/* CTA button */}
        <motion.button key={'cta-'+step} initial={{opacity:0,y:20,scale:.88}} animate={{opacity:1,y:0,scale:1}} transition={{delay:.44,type:'spring',stiffness:280,damping:22}}
          whileHover={{scale:1.06,boxShadow:`0 0 50px ${cur.color}55,0 0 100px ${cur.color}1a`}} whileTap={{scale:.96}} onClick={advance}
          style={{ padding:cur.isFinal?'18px 56px':'14px 42px', borderRadius:cur.isFinal?16:12, border:`1.5px solid ${cur.color}`, background:cur.isFinal?`linear-gradient(135deg,${cur.color}30,${cur.color}16)`:`${cur.color}16`, color:cur.color, fontFamily:'var(--font-display)', fontSize:cur.isFinal?18:15, fontWeight:800, letterSpacing:'-.02em', cursor:'pointer', position:'relative', overflow:'hidden', transition:'all .35s', display:'flex', alignItems:'center', gap:12 }}>
          <motion.div animate={{x:['-130%','230%']}} transition={{duration:2.8,repeat:Infinity,ease:'easeInOut',repeatDelay:.8}} style={{position:'absolute',inset:0,background:`linear-gradient(90deg,transparent,${cur.color}22,transparent)`,pointerEvents:'none'}}/>
          {cur.cta}
          {!cur.isFinal && <motion.span animate={{x:[0,5,0]}} transition={{duration:1.1,repeat:Infinity}} style={{display:'inline-block',fontSize:18}}>→</motion.span>}
          {cur.isFinal && <Zap size={18}/>}
        </motion.button>
      </div>

      <motion.div initial={{opacity:0}} animate={{opacity:.35}} transition={{delay:1.4}}
        style={{ position:'absolute', bottom:28, zIndex:2, fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)', letterSpacing:'.15em', textTransform:'uppercase' }}>
        raw data → trained intelligence
      </motion.div>
    </motion.div>
  )
}

const stagger  = { hidden:{}, show:{ transition:{ staggerChildren:.08 } } }
const fadeUp   = { hidden:{ opacity:0, y:28, filter:'blur(6px)' }, show:{ opacity:1, y:0, filter:'blur(0px)', transition:{ duration:.55, ease:[.22,1,.36,1] } } }

function PipelineStep({ icon:Icon, label, sub, color, step:num, index, total }) {
  return (
    <motion.div variants={fadeUp} style={{ display:'flex', alignItems:'center', flex:1, minWidth:0 }}>
      <motion.div whileHover={{ y:-6, boxShadow:`0 18px 44px ${color}22` }} transition={{ type:'spring', stiffness:300, damping:22 }}
        style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'22px 12px', background:'var(--surface)', borderRadius:16, border:`1px solid ${color}33`, position:'relative', overflow:'hidden', cursor:'default' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${color},transparent)` }}/>
        <div style={{ width:44, height:44, borderRadius:12, background:`${color}16`, border:`1px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center', color }} className="icon-glow"><Icon size={20} strokeWidth={1.8}/></div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:3 }}>{label}</div>
          <div style={{ fontSize:11, color:'var(--text-3)' }}>{sub}</div>
        </div>
        <div style={{ position:'absolute', bottom:8, right:10, fontFamily:'var(--font-mono)', fontSize:9, color:`${color}66`, fontWeight:700 }}>{num}</div>
      </motion.div>
      {index<total-1 && <div style={{ color:'var(--text-3)', padding:'0 4px', flexShrink:0 }}><ChevronRight size={14}/></div>}
    </motion.div>
  )
}

function FeatureCard({ icon:Icon, label, desc, color }) {
  return (
    <motion.div variants={fadeUp} whileHover={{ y:-5, borderColor:`${color}66` }}
      style={{ padding:'20px', borderRadius:14, background:'var(--surface)', border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:10, transition:'border-color .3s', cursor:'default' }}>
      <div style={{ width:38, height:38, borderRadius:10, background:`${color}16`, border:`1px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center', color }} className="icon-glow"><Icon size={18} strokeWidth={1.8}/></div>
      <div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:4 }}>{label}</div>
        <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.5 }}>{desc}</div>
      </div>
    </motion.div>
  )
}

function WelcomeDashboard() {
  const navigate = useNavigate()
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ maxWidth:900, margin:'0 auto' }}>
      <motion.div variants={fadeUp} style={{ marginBottom:52, position:'relative' }}>
        <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:600, height:260, borderRadius:'50%', background:'radial-gradient(ellipse,#00d4ff08 0%,transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:99, background:'var(--cyan-dim)', border:'1px solid var(--border-2)', marginBottom:20 }}>
          <motion.div animate={{ rotate:360 }} transition={{ duration:12, repeat:Infinity, ease:'linear' }}><FlaskConical size={12} color="var(--cyan)" strokeWidth={2.5}/></motion.div>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:10, fontWeight:700, color:'var(--cyan)', letterSpacing:'.1em', textTransform:'uppercase' }}>AutoML Platform — v4.0</span>
        </div>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(36px,6vw,68px)', fontWeight:800, lineHeight:1.0, letterSpacing:'-.04em', color:'var(--text)', marginBottom:18 }}>
          Raw data.{' '}<span style={{ background:'linear-gradient(135deg,#00d4ff,#9b6dff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Trained</span>{' '}intelligence.
        </h1>
        <p style={{ fontSize:17, color:'var(--text-2)', lineHeight:1.75, maxWidth:540, marginBottom:36 }}>
          Upload a CSV. We profile it, clean it, engineer features with AI, and train dozens of models. You get the best one — download-ready in minutes.
        </p>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <motion.button whileHover={{ scale:1.04, boxShadow:'0 0 50px #00d4ff33' }} whileTap={{ scale:.97 }} onClick={()=>navigate('/upload')}
            style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'14px 36px', borderRadius:12, background:'linear-gradient(135deg,#00d4ff22,#9b6dff11)', border:'1.5px solid var(--cyan)', color:'var(--cyan)', fontFamily:'var(--font-display)', fontSize:16, fontWeight:800, cursor:'pointer', letterSpacing:'-.02em', transition:'all .3s', position:'relative', overflow:'hidden' }}>
            <motion.div animate={{x:['-130%','230%']}} transition={{duration:3,repeat:Infinity,ease:'easeInOut',repeatDelay:1}} style={{position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,#00d4ff18,transparent)',pointerEvents:'none'}}/>
            <Upload size={16}/> Upload your CSV <ArrowRight size={16}/>
          </motion.button>
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }} onClick={()=>navigate('/exploration')}
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 28px', borderRadius:12, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-2)', fontFamily:'var(--font-sans)', fontSize:14, fontWeight:500, cursor:'pointer', transition:'all .2s' }}>
            <Sparkles size={14}/> See how it works
          </motion.button>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} style={{ marginBottom:48 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--text-3)', marginBottom:16 }}>The Pipeline — 5 steps</div>
        <motion.div variants={stagger} style={{ display:'flex', gap:6, alignItems:'center' }}>
          {PIPELINE.map((s,i)=><PipelineStep key={s.label} {...s} index={i} total={PIPELINE.length}/>)}
        </motion.div>
      </motion.div>

      <motion.div variants={fadeUp} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
        <div style={{ flex:1, height:1, background:'var(--border)' }}/><span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)', letterSpacing:'.1em', textTransform:'uppercase' }}>Powered by</span><div style={{ flex:1, height:1, background:'var(--border)' }}/>
      </motion.div>

      <motion.div variants={stagger} style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:52 }}>
        {FEATURES.map(f=><FeatureCard key={f.label} {...f}/>)}
      </motion.div>

      <motion.div variants={fadeUp} whileHover={{ borderColor:'#00d4ff44' }}
        style={{ borderRadius:20, border:'1px solid var(--border)', background:'var(--surface)', padding:'32px 36px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:24, flexWrap:'wrap', position:'relative', overflow:'hidden', transition:'border-color .3s' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle,#00d4ff0a 0%,transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:'var(--text)', marginBottom:6, letterSpacing:'-.025em' }}>Ready to transform your data?</div>
          <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.6 }}>Upload any CSV or Excel — classification, regression, or let us detect it.</div>
        </div>
        <motion.button whileHover={{ scale:1.05, boxShadow:'0 0 40px #00d4ff33' }} whileTap={{ scale:.97 }} onClick={()=>navigate('/upload')}
          style={{ flexShrink:0, display:'inline-flex', alignItems:'center', gap:10, padding:'13px 32px', borderRadius:12, background:'var(--cyan-dim)', border:'1.5px solid var(--cyan)', color:'var(--cyan)', fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, cursor:'pointer', transition:'all .3s', letterSpacing:'-.02em', position:'relative', overflow:'hidden', zIndex:1 }}>
          <motion.div animate={{x:['-130%','230%']}} transition={{duration:2.5,repeat:Infinity,ease:'easeInOut',repeatDelay:1}} style={{position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,#00d4ff1a,transparent)',pointerEvents:'none'}}/>
          Start the Alchemy <Zap size={15}/>
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

export default function Welcome() {
  const [phase, setPhase] = useState(() =>
    sessionStorage.getItem('alchemyIntroSeen') ? 'reveal' : 'intro'
  )
  const handleIntroDone = () => {
    sessionStorage.setItem('alchemyIntroSeen', 'true')
    setPhase('reveal')
    // Tell ChatBot it can now appear
    window.dispatchEvent(new Event('alchemyIntroDone'))
  }
  return (
    <>
      <AnimatePresence>
        {phase === 'intro' && <IntroOverlay onDone={handleIntroDone}/>}
      </AnimatePresence>
      <AnimatePresence>
        {phase === 'reveal' && (
          <motion.div initial={{ opacity:0, filter:'blur(14px)' }} animate={{ opacity:1, filter:'blur(0px)' }} transition={{ duration:.85, ease:[.22,1,.36,1] }} style={{ minHeight:'100%' }}>
            <WelcomeDashboard/>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
