import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ─────────────────────────────────────────────────────────────────
   The Story Sequence  — each step has a line & a tap label
   ───────────────────────────────────────────────────────────────── */
const STORY = [
  {
    id: 0,
    top: 'Your model is downloaded.',
    main: 'But... a ZIP file sitting\non your desktop,\nis just a ZIP file.',
    sub: 'It’s not an API. It’s not a product. It’s not something you can share with the world.',
    cta: 'I know, so what do I do with it ??',
    color: '#00d4ff',
  },
  {
    id: 1,
    top: 'Good question..',
    main: 'What if anyone could \nsee your model,\n from a simple URL ?',
    sub: 'No Python. No setup. No code... Just your model, live on the internet.',
    cta: 'That sounds impossible.',
    color: '#9b6dff',
  },
  {
    id: 2,
    top: "It's not..",
    main: 'Drop the ZIP and Get \nlive prediction API,\nin under 60 seconds.',
    sub: 'Your model. Running. On the internet. Right now.',
    cta: 'Wait — seriously ?',
    color: '#10e87e',
  },
  {
    id: 3,
    top: 'Seriously.',
    main: 'Data Alchemy built the\nIntelligence,\nDeploy Alchemy gives it a\nVoice.',
    sub: 'Your model + our hosting = instant API. It’s that simple.',
    cta: 'Show me Deploy Alchemy →',
    color: '#f5a623',
    isFinal: true,
  },
]

/* ─── Floating particle canvas ─────────────────────────────────── */
function ParticleField({ color }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const particles = useRef([])
  const colorRef  = useRef(color)

  useEffect(() => { colorRef.current = color }, [color])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    canvas.width  = W
    canvas.height = H

    // Build particles
    particles.current = Array.from({ length: 38 }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      o:  Math.random() * 0.5 + 0.15,
    }))

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const c = colorRef.current
      particles.current.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = c + Math.round(p.o * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })
      // Draw connecting lines between nearby particles
      for (let i = 0; i < particles.current.length; i++) {
        for (let j = i + 1; j < particles.current.length; j++) {
          const a = particles.current[i], b = particles.current[j]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          if (dist < 90) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = c + Math.round((1 - dist / 90) * 0.18 * 255).toString(16).padStart(2, '0')
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
}

/* ─── Orbiting ring ────────────────────────────────────────────── */
function OrbitRing({ color, size, duration, reverse = false }) {
  return (
    <motion.div
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
      style={{
        position: 'absolute',
        width: size, height: size,
        borderRadius: '50%',
        border: `1px solid ${color}22`,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    >
      {/* dot on the ring */}
      <div style={{
        position: 'absolute',
        top: -3, left: '50%',
        transform: 'translateX(-50%)',
        width: 5, height: 5,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}`,
      }} />
    </motion.div>
  )
}

/* ─── Main Export ──────────────────────────────────────────────── */
export default function DeployAlchemyTeaser({ hasModel = false }) {
  const [step,        setStep]        = useState(0)
  const [launched,    setLaunched]    = useState(false)
  const [glowPulse,   setGlowPulse]   = useState(false)
  const DEPLOY_URL = 'https://lonewollff-deploy-alchemy.hf.space/' 

  const current = STORY[step]

  // Glow pulse on mount
  useEffect(() => {
    const t = setTimeout(() => setGlowPulse(true), 800)
    return () => clearTimeout(t)
  }, [])

  function advance() {
    if (current.isFinal) { setLaunched(true); return }
    setStep(s => Math.min(s + 1, STORY.length - 1))
  }

  if (!hasModel) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{ marginTop: 56, marginBottom: 16, position: 'relative' }}
    >
      {/* Section label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
        fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-3)',
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span>What's Next?</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {/* Portal container */}
      <div
        style={{
          position: 'relative',
          borderRadius: 24,
          overflow: 'hidden',
          background: 'var(--bg-2)',
          border: `1px solid ${current.color}33`,
          minHeight: 340,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
          cursor: 'default',
          transition: 'border-color 0.6s ease',
          boxShadow: `0 0 60px ${current.color}0d, inset 0 0 60px ${current.color}06`,
        }}
      >
        {/* Particle field */}
        <ParticleField color={current.color} />

        {/* Orbit rings */}
        <OrbitRing color={current.color} size={260} duration={22} />
        <OrbitRing color={current.color} size={360} duration={34} reverse />
        <OrbitRing color={current.color} size={460} duration={50} />

        {/* Glow core */}
        <motion.div
          animate={{ scale: glowPulse ? [1, 1.15, 1] : 1, opacity: glowPulse ? [0.25, 0.5, 0.25] : 0.25 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: 180, height: 180,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${current.color}30 0%, transparent 70%)`,
            transition: 'background 0.6s ease',
            pointerEvents: 'none',
          }}
        />

        {/* Content */}
        <AnimatePresence mode="wait">
          {!launched ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(6px)' }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 900 }}
            >
              {/* Step top label */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: current.color,
                  marginBottom: 18, fontFamily: 'var(--font-mono)',
                  transition: 'color 0.4s',
                }}
              >
                {current.top}
              </motion.div>

              {/* Main text */}
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(22px, 3vw, 30px)',
                  fontWeight: 800,
                  lineHeight: 1.25,
                  color: 'var(--text)',
                  marginBottom: current.sub ? 14 : 32,
                  whiteSpace: 'pre-line',
                  letterSpacing: '-0.025em',
                }}
              >
                {current.main}
              </motion.h2>

              {/* Sub text */}
              {current.sub && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.28 }}
                  style={{
                    fontSize: 14, color: 'var(--text-2)',
                    lineHeight: 1.6, marginBottom: 32,
                  }}
                >
                  {current.sub}
                </motion.p>
              )}

              {/* Progress dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
                {STORY.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      width:   i === step ? 24 : 6,
                      background: i <= step ? current.color : '#1e2f50',
                      opacity: i < step ? 0.4 : 1,
                    }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    style={{ height: 6, borderRadius: 3 }}
                  />
                ))}
              </div>

              {/* CTA button */}
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: `0 0 40px ${current.color}55` }}
                whileTap={{ scale: 0.97 }}
                onClick={advance}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  padding: '14px 32px',
                  borderRadius: 12,
                  border: `1.5px solid ${current.color}`,
                  background: `${current.color}14`,
                  color: current.color,
                  fontFamily: 'var(--font-display)',
                  fontSize: 15, fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  letterSpacing: '-0.01em',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Shimmer sweep */}
                <motion.div
                  animate={{ x: ['-120%', '220%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                  style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(90deg, transparent, ${current.color}22, transparent)`,
                    pointerEvents: 'none',
                  }}
                />
                {current.cta}
                {!current.isFinal && (
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ display: 'inline-block' }}
                  >
                    →
                  </motion.span>
                )}
              </motion.button>
            </motion.div>
          ) : (
            /* ── LAUNCHED STATE ── */
            <motion.div
              key="launched"
              initial={{ opacity: 0, scale: 0.85, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 560 }}
            >
              {/* Starburst icon */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                style={{ fontSize: 48, marginBottom: 20, display: 'inline-block' }}
              >
                ✦
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: '#f5a623',
                  marginBottom: 16, fontFamily: 'var(--font-mono)',
                }}
              >
                Your next stop
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(24px, 3vw, 32px)',
                  fontWeight: 800,
                  color: 'var(--text)',
                  marginBottom: 12,
                  letterSpacing: '-0.03em',
                }}
              >
                ✦ DEPLOY ALCHEMY ✦
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.7 }}
              >
                You built the intelligence.
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 32, lineHeight: 1.7 }}
              >
                We give it a voice.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
              >
                <motion.a
                  href={DEPLOY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05, boxShadow: '0 0 50px #f5a62355' }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 12,
                    padding: '16px 40px',
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #f5a62322, #00d4ff11)',
                    border: '1.5px solid #f5a623',
                    color: '#f5a623',
                    fontFamily: 'var(--font-display)',
                    fontSize: 17, fontWeight: 800,
                    textDecoration: 'none',
                    letterSpacing: '-0.02em',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                  }}
                >
                  <motion.div
                    animate={{ x: ['-120%', '220%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.5 }}
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(90deg, transparent, #f5a62322, transparent)',
                      pointerEvents: 'none',
                    }}
                  />
                  Drop your ZIP → Get an API
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    ⚡
                  </motion.span>
                </motion.a>

                <button
                  onClick={() => { setLaunched(false); setStep(0) }}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-3)', fontSize: 12,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}
                >
                  ← Read again
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step counter — bottom right */}
        {!launched && (
          <div style={{
            position: 'absolute', bottom: 16, right: 20,
            fontSize: 10, fontFamily: 'var(--font-mono)',
            color: 'var(--text-3)',
          }}>
            {step + 1} / {STORY.length}
          </div>
        )}
      </div>
    </motion.div>
  )
}
