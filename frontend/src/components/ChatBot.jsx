import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw, ChevronRight, ArrowLeft, Send } from 'lucide-react'

import { botApi } from '../api/client'

// ── Menu data ─────────────────────────────────────────────────────
const SUB_MENU = {
  'Welcome':      ['What is Hyperparameter Tuning?','Do I need coding skills?','Return to Main Menu..'],
  'Upload CSV':   ["What is 'Sanitization'?",'Why only .csv files?','Preview box is empty?','Return to Main Menu'],
  'Operations':   ['Which columns should I remove?','What does Feature Genius do?','Is the Yellow Reset button safe?','Can I download the processed data?','Return to Main Menu'],
  'Exploration':  ['What is D-Tale & How do I use it?','What is Pandas (YData) Profiling?','Can I download the Profiling Report?','Why is Exploration necessary?','Return to Main Menu'],
  'AutoML Forge': ['What is AutoGluon?','1. Choosing a Target & Problem Type?','2. What is an Evaluation Metric?','3. What is the Holdout Fraction?','4. Which Model Quality should I pick?','5. Setting the Time Limit?','Return to Main Menu'],
  'Downloads':    ['Why is the model a .zip file?','What exactly does the ZIP contain?','Why download the Processed CSV?','What do I do with the Profiling Report?','Return to Main Menu'],
  'What Next ?':  ['What is inside my Data Alchemy ZIP ?','What is in the models folder ?','What is in the .pkl and .json files ?','How do I use these files ?','Is there a simpler way to use this ?','How does Deploy Alchemy actually deploy my model ?','Return to Main Menu'],
}
const MAIN_MENU = Object.keys(SUB_MENU)
const NUDGES = ['Stuck ?','Need a hint ? 👋','Ask me anything !!','I know stuff 🧠',"Don't be shy !!",'Got questions ?',"I'm right here !!",'Try me 🚀','Hovering by...','Need AI magic ? ✨']

// ── Accent colour ─────────────────────────────────────────────────
const ACCENT = 'var(--purple-accent, #a855f7)'
const ACCENT_RGB = '168, 85, 247' // Used for rgba() shadows and gradients

// ── 3D Spaceship Avatar ───────────────────────────────────────────
function RealisticSpaceshipSVG({ isFlying, isSleeping }) {
  const accent   = ACCENT
  const hotCore  = '#ffffff'
  const darkMetal = '#0a0d14'

  const flameScaleY  = isSleeping ? 0         : (isFlying ? [1,1.6,1.2,1.8,1] : [0.4,0.6,0.4])
  const flameOpacity = isSleeping ? 0         : (isFlying ? 1 : 0.6)

  return (
    <div style={{ width:85, height:110, perspective:1000, position:'relative' }}>
      
      {/* ── Ambient Back Glow ── */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '15%',
        width: '70%',
        height: '70%',
        background: ACCENT,
        filter: 'blur(22px)',
        opacity: isSleeping ? 0.1 : (isFlying ? 0.8 : 0.45),
        borderRadius: '50%',
        transition: 'opacity 0.4s ease',
        zIndex: 0
      }} />

      <svg viewBox="0 0 100 140" style={{ width:'100%', height:'100%', overflow:'visible', position: 'relative', zIndex: 1 }}>
        <defs>
          <radialGradient id="hullGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%"   stopColor="#4a5568"/>
            <stop offset="55%"  stopColor="#1a202c"/>
            <stop offset="100%" stopColor={darkMetal}/>
          </radialGradient>
          <radialGradient id="visorGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#2d3748"/>
            <stop offset="45%"  stopColor="#05080f"/>
            <stop offset="100%" stopColor="#000000"/>
          </radialGradient>
          <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="100%">
            <stop offset="0%"   stopColor="#718096"/>
            <stop offset="100%" stopColor="#1a202c"/>
          </linearGradient>
          <linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="100%">
            <stop offset="0%"   stopColor="#ffffff"/>
            <stop offset="25%"  stopColor={ACCENT}/>
            <stop offset="100%" stopColor={`rgba(${ACCENT_RGB}, 0)`}/>
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
          <filter id="intenseGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>

        {/* Background fin */}
        <path d="M 15 35 Q 5 50 12 65 L 25 70 L 30 40 Z" fill="url(#metalGrad)" stroke={darkMetal} strokeWidth="1.5"/>
        {/* Thruster block */}
        <path d="M 30 70 C 40 78, 55 78, 62 70 L 58 85 C 50 88, 40 88, 32 85 Z" fill="url(#metalGrad)" stroke={darkMetal} strokeWidth="2"/>
        {/* Flames */}
        <motion.path d="M 30 85 Q 45 150 60 85 Z" fill={accent} filter="url(#intenseGlow)"
          opacity={isSleeping ? 0 : (isFlying ? 0.7 : 0.3)}
          animate={{ scaleY: flameScaleY }}
          transition={{ duration:0.1, repeat:Infinity, repeatType:'reverse' }}
          style={{ originX:'45px', originY:'85px' }}/>
        <motion.path d="M 35 85 Q 45 130 55 85 Z" fill="url(#flameGrad)"
          opacity={flameOpacity}
          animate={{ scaleY: flameScaleY }}
          transition={{ duration:0.15, repeat:Infinity, repeatType:'reverse' }}
          style={{ originX:'45px', originY:'85px' }}/>
        {/* Hull */}
        <circle cx="45" cy="45" r="32" fill="url(#hullGrad)" stroke={darkMetal} strokeWidth="2"/>
        <circle cx="45" cy="45" r="30.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
        {/* Panel lines */}
        <path d="M 20 25 Q 35 15 55 15" fill="none" stroke={darkMetal} strokeWidth="1.5" opacity="0.7"/>
        <path d="M 15 50 Q 30 70 55 75" fill="none" stroke={darkMetal} strokeWidth="1.5" opacity="0.7"/>
        {/* Visor */}
        <path d="M 50 22 C 78 22, 85 35, 75 55 C 65 72, 45 65, 35 55 C 25 45, 32 22, 50 22 Z" fill="url(#visorGrad)" stroke={darkMetal} strokeWidth="2"/>
        <path d="M 50 25 C 68 25, 75 32, 68 45 C 55 35, 42 35, 38 48 C 34 40, 38 25, 50 25 Z" fill="rgba(255,255,255,0.1)"/>
        {/* Eye */}
        {!isSleeping ? (
          <motion.g animate={{ x: isFlying ? 2 : 0 }} transition={{ type:'spring', stiffness:100 }}>
            <ellipse cx="58" cy="44" rx="7" ry="9" fill={accent} filter="url(#glow)" opacity="0.9"/>
            <circle  cx="60" cy="43" r="2.5" fill={hotCore} filter="url(#glow)"/>
            <line x1="38" y1="44" x2="68" y2="44" stroke={accent} strokeWidth="2" opacity="0.8" filter="url(#glow)"/>
          </motion.g>
        ) : (
          <motion.line x1="42" y1="46" x2="65" y2="46" stroke={accent} strokeWidth="2.5"
            strokeLinecap="round" opacity="0.4"
            initial={{ opacity:0 }} animate={{ opacity:[0.2,0.6,0.2] }} transition={{ duration:3, repeat:Infinity }}/>
        )}
        {/* Armour pod */}
        <path d="M 45 45 L 30 35 L 18 40 L 25 60 L 45 65 Z" fill="url(#metalGrad)" stroke={darkMetal} strokeWidth="2" opacity="0.95"/>
        <circle cx="32" cy="50" r="3" fill={darkMetal} opacity="0.6"/>
      </svg>
    </div>
  )
}

// ── Typing animation ──────────────────────────────────────────────
function TypingMessage({ html, onDone, onType }) {
  const [displayedHtml, setDisplayedHtml] = useState('')
  const [done, setDone] = useState(false)
  
  useEffect(() => {
    const tmp = document.createElement('div'); tmp.innerHTML = html
    const plain = tmp.textContent || ''
    let i = 0
    const delay = plain.length > 200 ? 15 : 25
    const iv = setInterval(() => {
      i++
      const ratio   = Math.min(i / plain.length, 1)
      const cutoff  = Math.floor(html.length * ratio)
      let safe      = cutoff
      const openTag = html.lastIndexOf('<', safe), closeTag = html.lastIndexOf('>', safe)
      if (openTag > closeTag) safe = openTag
      setDisplayedHtml(html.slice(0, safe))
      onType?.()
      if (i >= plain.length) { clearInterval(iv); setDisplayedHtml(html); setDone(true); onDone?.() }
    }, delay)
    return () => clearInterval(iv)
  }, [html, onType])

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: displayedHtml }}/>
      {!done && (
        <motion.span animate={{ opacity:[1,0] }} transition={{ duration:0.45, repeat:Infinity }}
          style={{ display:'inline-block', width:2, height:'1em', background:ACCENT, verticalAlign:'text-bottom', marginLeft:1, borderRadius:1 }}/>
      )}
    </div>
  )
}

// ── Thinking indicator ────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div style={{ display:'flex', gap:6, alignItems:'center', padding:'4px 0' }}>
      <span style={{ fontSize:11, color:ACCENT, fontFamily:'var(--font-mono)', opacity:0.7 }}>Thinking...</span>
      {[0,1,2,3].map(i => (
        <motion.div key={i}
          animate={{ scaleY:[0.4,1.4,0.4], opacity:[0.3,1,0.3] }}
          transition={{ duration:0.7, delay:i*0.12, repeat:Infinity, ease:'easeInOut' }}
          // Purplish hue shifting for the dots
          style={{ width:3, height:14, borderRadius:2, background:`hsl(${260+i*15},90%,65%)` }}/>
      ))}
    </div>
  )
}

// ── Main ChatBot ──────────────────────────────────────────────────
export default function ChatBot() {
  const [open, setOpen]           = useState(false)
  const [inputText, setInputText] = useState('')
  const [loading, setLoading]     = useState(false)
  const [typingIdx, setTypingIdx] = useState(null)
  const [visible, setVisible]     = useState(() => !!sessionStorage.getItem('alchemyIntroSeen'))

  // Flight states
  const [activityState, setActivityState] = useState('hover') // 'hover' | 'fly'
  const [isSleeping, setIsSleeping]       = useState(false)
  const [nudge, setNudge]                 = useState('')
  const [path, setPath]                   = useState({ x:0, y:0, rotateZ:0, rotateY:0 })

  const [messages, setMessages] = useState([{
    role:'bot',
    html:'<b>System Initialized.</b> Select a section or type your question below:',
    buttons:{ type:'main' },
    typed:true,
  }])

  const bottomRef = useRef(null)
  const abortRef  = useRef(null)

  // Show bot after intro fires event
  useEffect(() => {
    const onDone = () => setVisible(true)
    window.addEventListener('alchemyIntroDone', onDone)
    return () => window.removeEventListener('alchemyIntroDone', onDone)
  }, [])

  // 90s inactivity → sleep
  useEffect(() => {
  if (open) return
  const t = setTimeout(() => {
    setIsSleeping(true)
    setActivityState('hover')
    setPath({ x:-90, y:0, rotateZ:0, rotateY:0 })
  }, 90000)
  return () => clearTimeout(t)
}, [open])

  // Hover ↔ Fly cycle
  useEffect(() => {
    if (open || isSleeping || !visible) return
    let t
    if (activityState === 'hover') {
      t = setTimeout(() => {
        const max_X = Math.max(300, window.innerWidth  - 150)
        const max_Y = Math.max(300, window.innerHeight - 150)
        const rx1 = -(Math.random() * (max_X * 0.7) + 100)
        const ry1 = -(Math.random() * (max_Y * 0.8) + 100)
        const rx2 = -(Math.random() * max_X)
        const ry2 = -(Math.random() * max_Y)
        const rx3 = -(Math.random() * (max_X * 0.5) + 50)
        const ry3 = -(Math.random() * (max_Y * 0.5) + 100)
        setPath({
          x: [0, rx1, rx2, rx3, 0],
          y: [0, ry1, ry2, ry3, 0],
          rotateZ: [0, 25, -20, 30, 0],
          rotateY: [0, rx1 < -(max_X/2) ? 180 : 0, rx2 > rx1 ? 0 : 180, 0, 0],
        })
        setActivityState('fly')
        setNudge('')
      }, 15000)
    } else if (activityState === 'fly') {
      t = setTimeout(() => {
        setActivityState('hover')
        setPath({ x:0, y:0, rotateZ:0, rotateY:0 })
      }, 10000)
    }
    return () => clearTimeout(t)
  }, [activityState, open, isSleeping, visible])

  // Nudge during hover
  useEffect(() => {
    if (open || isSleeping || !visible || activityState !== 'hover') return
    const showNudge = () => {
      setNudge(NUDGES[Math.floor(Math.random() * NUDGES.length)])
      setTimeout(() => setNudge(''), 3500)
    }
    showNudge()
    const iv = setInterval(showNudge, 5000)
    return () => clearInterval(iv)
  }, [activityState, open, isSleeping, visible])

  // Reset on open
  useEffect(() => {
    if (open) {
      setIsSleeping(false)
      setActivityState('hover')
      setPath({ x:0, y:0, rotateZ:0, rotateY:0 })
      setNudge('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 50)
    }
  }, [open])

  // Scroll on new messages
  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 50)
  }, [messages, loading])

  // ── API call to bot_logic.py via /api/bot ─────────────────────
  async function send(choice) {
    if (!choice.trim()) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    
    setMessages(m => [...m, { role:'user', text:choice }])
    
    // Set loading to true to display the <ThinkingDots/>
    setLoading(true)
    const startTime = Date.now()

    try {
      const res = await botApi.ask(choice)
      
      // Enforce a minimum delay of 2.5 seconds to ensure thinking indicator is visible
      const elapsed = Date.now() - startTime
      const remainingDelay = Math.max(0, 2500 - elapsed)
      if (remainingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingDelay))
      }

      if (abortRef.current.signal.aborted) return

      const btn = choice === 'Main Menu'
        ? { type:'main' }
        : SUB_MENU[choice]
          ? { type:'sub', items:SUB_MENU[choice] }
          : { type:'back' }
          
      const msg = { role:'bot', html:res.data.response, buttons:btn, typed:false }
      setMessages(m => { const n=[...m,msg]; setTypingIdx(n.length-1); return n })
    } catch {
      if (abortRef.current?.signal.aborted) return
      const msg = { role:'bot', html:'⚠️ Could not reach the assistant. Please try again.', buttons:{ type:'back' }, typed:false }
      setMessages(m => { const n=[...m,msg]; setTypingIdx(n.length-1); return n })
    } finally {
      if (!abortRef.current?.signal.aborted) setLoading(false)
    }
  }

  function reset() {
    abortRef.current?.abort()
    setLoading(false); setInputText(''); setTypingIdx(null)
    setMessages([{ role:'bot', html:'<b>System Initialized.</b> Select a section or type your question below:', buttons:{ type:'main' }, typed:true }])
  }

  function renderButtons(buttons, msgIdx) {
    if (msgIdx === typingIdx || !buttons) return null
    if (buttons.type === 'main') return (
      <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:4 }}>
        {MAIN_MENU.map(item => (
          <button key={item} className="chat-menu-btn" onClick={()=>send(item)} disabled={loading}
            style={{ borderColor:`rgba(${ACCENT_RGB},0.3)` }}>
            <ChevronRight size={11} style={{ marginRight:4, verticalAlign:'middle' }}/>{item}
          </button>
        ))}
      </div>
    )
    if (buttons.type === 'sub') return (
      <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:4 }}>
        {buttons.items.map(item => item.startsWith('Return') || item === 'Main Menu'
          ? <button key={item} className="chat-menu-btn" onClick={()=>send('Main Menu')} disabled={loading}
              style={{ borderColor:'var(--border-2)', color:'var(--text-3)' }}>
              <ArrowLeft size={11} style={{ marginRight:4, verticalAlign:'middle' }}/>Return to Main Menu
            </button>
          : <button key={item} className="chat-menu-btn" onClick={()=>send(item)} disabled={loading}
              style={{ borderColor:`rgba(${ACCENT_RGB},0.3)` }}>
              <ChevronRight size={11} style={{ marginRight:4, verticalAlign:'middle' }}/>{item}
            </button>
        )}
      </div>
    )
    if (buttons.type === 'back') return (
      <button className="chat-menu-btn" onClick={()=>send('Main Menu')} disabled={loading}
        style={{ marginTop:8, borderColor:'var(--border-2)', color:'var(--text-3)' }}>
        <ArrowLeft size={11} style={{ marginRight:4 }}/> Main Menu
      </button>
    )
  }

  if (!visible) return null

  const isFlying    = activityState === 'fly'
  const bobDuration = isSleeping ? 1 : (isFlying ? 0.4 : 2.5)

  return (
    <div style={{ position:'fixed', bottom:28, right:28, zIndex:9999, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:12 }}>

      {/* ── Chat window ── */}
      <AnimatePresence>
        {open && (
          <motion.div className="chatbot-window"
            initial={{ opacity:0, scale:0.88, y:20 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.88, y:20 }}
            transition={{ type:'spring', stiffness:360, damping:28 }}
            style={{
              display:'flex', flexDirection:'column',
              border:`2px solid ${ACCENT}`, borderRadius:16,
              boxSizing:'border-box', overflow:'hidden',
              // boxShadow:`0 0 24px rgba(${ACCENT_RGB},0.28)`,
              boxShadow:`0 0 24px rgba(255, 0, 212, 0.88)`,
              // Prevent overflow on small screens
              maxHeight:'calc(100vh - 120px)',
              width: 460,
            }}
          >
            {/* Compact header with mini spaceship */}
            <div className="chat-header" style={{ padding:'6px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                {/* Mini spaceship scaled down in header */}
                <div style={{ transform:'scale(0.32)', transformOrigin:'top left', width:28, height:36, overflow:'visible', flexShrink:0 }}>
                  <RealisticSpaceshipSVG isFlying={false} isSleeping={false}/>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:4 }}>
                  <div className="chat-header-title" style={{ lineHeight:1, margin:0, fontSize:'0.85rem' }}>Alchemy Assistant</div>
                  <div style={{
                    fontSize: 9, 
                    fontFamily: 'var(--font-mono)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 4,
                    color: loading ? ACCENT : '#22c55e', 
                    background: loading ? `rgba(${ACCENT_RGB}, 0.10)` : 'rgba(34, 197, 94, 0.12)',
                    padding: '1px 6px', 
                    borderRadius: 10,
                    border: loading ? `1px solid rgba(${ACCENT_RGB}, 0.4)` : '1px solid rgba(34, 197, 94, 0.3)',
                  }}>
                    {!loading && (
                      <div style={{ 
                        width: 4, 
                        height: 4, 
                        borderRadius: '50%', 
                        background: '#22c55e', 
                        boxShadow: '0 0 5px #22c55e' 
                      }}/>
                    )}
                    {loading ? 'Thinking...' : 'online'}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={reset} title="Reset conversation"
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex', alignItems:'center' }}>
                  <RotateCcw size={13}/>
                </button>
                <button onClick={()=>setOpen(false)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex', alignItems:'center' }}>
                  <X size={14}/>
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="chat-messages" style={{ flex:1, overflowY:'auto', minHeight:0 }}>
              {messages.map((m,i)=>(
                <motion.div key={i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.22 }}
                  className={`chat-msg ${m.role==='user'?'chat-msg-user':'chat-msg-bot'}`}>
                  {m.role==='bot' ? (
                    <>
                      {m.typed || i !== typingIdx
                        ? <div dangerouslySetInnerHTML={{ __html:m.html }}/>
                        : <TypingMessage html={m.html}
                            onType={()=>bottomRef.current?.scrollIntoView()}
                            onDone={()=>{ setMessages(p=>p.map((x,j)=>j===i?{...x,typed:true}:x)); setTypingIdx(null) }}/>
                      }
                      {m.typed && renderButtons(m.buttons, i)}
                    </>
                  ) : m.text}
                </motion.div>
              ))}
              {loading && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="chat-msg chat-msg-bot">
                  <ThinkingDots/>
                </motion.div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Input bar */}
            <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border-2)', display:'flex', gap:8, flexShrink:0 }}>
              <input type="text" value={inputText}
                onChange={e=>setInputText(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter' && inputText.trim()){ send(inputText); setInputText('') }}}
                placeholder="Type a question..." disabled={loading}
                style={{ flex:1, padding:'8px 12px', borderRadius:6, border:'1px solid var(--border-2)', background:'var(--bg-2)', color:'var(--text)', outline:'none', fontSize:13 }}/>
              <motion.button whileTap={{ scale:0.9 }}
                onClick={()=>{ if(inputText.trim()){ send(inputText); setInputText('') }}}
                disabled={!inputText.trim() || loading}
                style={{ padding:8, background:inputText.trim()&&!loading?ACCENT:'var(--surface)', color:inputText.trim()&&!loading?'#fff':'var(--text-3)', border:'none', borderRadius:6, cursor:inputText.trim()&&!loading?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
                <Send size={15}/>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Spaceship toggle area ── */}
      {/* Width/height collapses to 58×58 when chat is open so no dead space */}
      <div style={{
        position: 'relative',
        width:  open ? 58  : 150,
        height: open ? 58  : 110,
        transition: 'width 0.3s, height 0.3s',
      }}>
        <AnimatePresence mode="wait">
          {!open ? (
            /* ── Roaming spaceship ── */
            <motion.div key="spaceship-roamer"
              initial={{ opacity:0 }}
              animate={{
                opacity: 1,
                x: isSleeping ? -90 : path.x,
                y: isSleeping ? 0   : path.y,
              }}
              exit={{ opacity:0, scale:0.5 }}
              transition={{
                opacity: { duration:0.3 },
                x: { duration:isFlying ? 10 : (isSleeping ? 2 : 0.5), ease:'easeInOut', times:isFlying ? [0,0.25,0.5,0.75,1] : undefined },
                y: { duration:isFlying ? 10 : (isSleeping ? 2 : 0.5), ease:'easeInOut', times:isFlying ? [0,0.25,0.5,0.75,1] : undefined },
              }}
              onClick={()=>{ if(isSleeping) setIsSleeping(false); setOpen(true) }}
              style={{ position:'absolute', right:0, bottom:0, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center' }}
            >
              {/* Ground shadow */}
              <motion.div
                animate={{
                  scaleX:   isSleeping ? 1.4 : (isFlying ? [0.7,1.1,0.7] : [0.6,0.9,0.6]),
                  scaleY:   isSleeping ? 1.4 : (isFlying ? [0.7,1.1,0.7] : [0.6,0.9,0.6]),
                  opacity:  isSleeping ? 0.7 : (isFlying ? [0.1,0.3,0.1] : [0.1,0.3,0.1]),
                }}
                transition={{ duration:bobDuration, repeat:Infinity, ease:'easeInOut' }}
                style={{ position:'absolute', bottom:-10, left:'50%', transform:'translateX(-50%)', width:45, height:12, background:'rgba(0,0,0,1)', borderRadius:'50%', filter:'blur(5px)', zIndex:-1 }}
              />

              {/* Sleeping Zzz */}
              <AnimatePresence>
                {isSleeping && (
                  <motion.div
                    initial={{ opacity:0, y:0 }}
                    animate={{ opacity:[0,1,0], y:-30, x:20, scale:[0.8,1.2,1] }}
                    transition={{ duration:2.5, repeat:Infinity }}
                    style={{ position:'absolute', top:-10, right:-5, color:ACCENT, fontWeight:'bold', fontSize:16, textShadow:`0 0 8px ${ACCENT}`, pointerEvents:'none', zIndex:10 }}
                  >
                    Zzz
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Nudge speech bubble */}
              <AnimatePresence>
                {!isFlying && !isSleeping && nudge && (
                  <motion.div
                    initial={{ opacity:0, y:8, scale:0.85 }}
                    animate={{ opacity:1, y:0, scale:1 }}
                    exit={{ opacity:0, y:-6, scale:0.85 }}
                    transition={{ type:'spring', stiffness:340, damping:24 }}
                    style={{
                      position:'absolute', bottom:115, right:0,
                      whiteSpace:'nowrap', background:'#0d1526',
                      border:`1px solid ${ACCENT}`, borderRadius:10,
                      padding:'6px 14px', fontSize:12, fontWeight:600,
                      color:ACCENT, fontFamily:'var(--font-sans)',
                      boxShadow:`0 0 20px rgba(${ACCENT_RGB},0.4)`,
                      pointerEvents:'none', zIndex:10,
                    }}
                  >
                    {nudge}
                    {/* Arrow pointing down */}
                    <div style={{ position:'absolute', bottom:-6, right:30, width:12, height:7, clipPath:'polygon(0 0, 100% 0, 50% 100%)', background:ACCENT, opacity:0.9 }}/>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Spaceship with physics */}
              <motion.div
                animate={{
                  y:       isSleeping ? 30         : (isFlying ? [-2,2,-2] : [0,-10,0]),
                  rotateY: isSleeping ? 180        : path.rotateY,
                  rotateZ: isSleeping ? 0          : path.rotateZ,
                }}
                transition={{
                  y:       { duration:bobDuration, repeat:Infinity, ease:'easeInOut' },
                  rotateY: { duration:isFlying ? 10 : 0.8, ease:'easeInOut', times:isFlying ? [0,0.25,0.5,0.75,1] : undefined },
                  rotateZ: { duration:isFlying ? 10 : 0.5, ease:'easeInOut', times:isFlying ? [0,0.25,0.5,0.75,1] : undefined },
                }}
                style={{ transformStyle:'preserve-3d', originX:'50%', originY:'60%' }}
              >
                <RealisticSpaceshipSVG isFlying={isFlying} isSleeping={isSleeping}/>
              </motion.div>
            </motion.div>
          ) : (
            /* ── X close button (exact same spot as spaceship home) ── */
            <motion.button key="close-btn"
              initial={{ scale:0, rotate:-90, opacity:0 }}
              animate={{ scale:1, rotate:0, opacity:1 }}
              exit={{ scale:0, rotate:90, opacity:0 }}
              transition={{ type:'spring', stiffness:420, damping:22 }}
              onClick={()=>setOpen(false)}
              title="Close Assistant"
              style={{
                width:58, height:58, borderRadius:'50%',
                background:'var(--surface)', border:`2px solid ${ACCENT}`,
                // boxShadow:`0 0 22px rgba(${ACCENT_RGB},0.45), 0 6px 20px #000a`,
                boxShadow:`0 0 24px rgba(255, 0, 212, 0.88)`,
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              }}
            >
              <X size={24} color={ACCENT}/>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
