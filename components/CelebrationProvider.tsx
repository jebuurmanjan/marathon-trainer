'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'

// ─── Celebration content ──────────────────────────────────────────────────────

interface CelebrationMeta {
  emoji: string
  title: string
  body: string
}

const CELEBRATION_META: Record<string, CelebrationMeta> = {
  daily_run: {
    emoji: '🏃',
    title: 'Session complete!',
    body: "You nailed today's planned run. That's how consistency is built.",
  },
  good_week: {
    emoji: '⭐',
    title: 'Great week!',
    body: 'Performance score above 65 — solid execution. Marathons are won in weeks like this.',
  },
  yearly_1000: {
    emoji: '🏆',
    title: '1,000 km!',
    body: "You've hit your yearly distance goal. Absolutely legendary.",
  },
  full_plan: {
    emoji: '🏁',
    title: '27 weeks done!',
    body: 'The full training plan is complete. Race day is going to be incredible.',
  },
  marathon_sub330: {
    emoji: '🥇',
    title: 'Sub 3:30!',
    body: 'You ran a marathon in under three and a half hours. Goal achieved.',
  },
}

const ALL_TYPES = Object.keys(CELEBRATION_META)

// ─── Context ──────────────────────────────────────────────────────────────────

interface CelebrationContextValue {
  triggerTest: () => void
}

const CelebrationContext = createContext<CelebrationContextValue>({
  triggerTest: () => {},
})

export function useCelebration() {
  return useContext(CelebrationContext)
}

// ─── Active celebration state ─────────────────────────────────────────────────

interface ActiveCelebration {
  id?: string // undefined = test mode (not persisted)
  type: string
}

// ─── Provider ────────────────────────────────────────────────────────────────

export default function CelebrationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [active, setActive]   = useState<ActiveCelebration | null>(null)
  const [visible, setVisible] = useState(false)
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)
  const testIndexRef          = useRef(0)

  // ── Fire canvas-confetti (dynamic import — browser only) ───────────────────
  const fireConfetti = useCallback(async () => {
    try {
      const confetti = (await import('canvas-confetti')).default
      const colors   = ['#EE6B17', '#E8C02E', '#4A5427', '#EDE9DE', '#D63232', '#39C57B']

      // Main burst from bottom-right
      confetti({ particleCount: 120, spread: 80, origin: { x: 0.85, y: 0.75 }, colors, scalar: 1.1 })
      // Secondary burst
      setTimeout(() =>
        confetti({ particleCount: 70, spread: 65, origin: { x: 0.75, y: 0.60 }, colors, angle: 110 }),
        220
      )
      // Surprise burst from the left
      setTimeout(() =>
        confetti({ particleCount: 50, spread: 70, origin: { x: 0.15, y: 0.55 }, colors, angle: 70 }),
        480
      )
    } catch {
      // canvas-confetti is an enhancement — fail silently
    }
  }, [])

  // ── Close / dismiss ────────────────────────────────────────────────────────
  const closePanel = useCallback(
    (celebrationId?: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setVisible(false)

      // Mark as shown in DB (fire-and-forget)
      if (celebrationId) {
        fetch('/api/celebrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: celebrationId }),
        }).catch(() => {})
      }

      // Remove from DOM after slide-out animation
      setTimeout(() => setActive(null), 380)
    },
    []
  )

  // ── Show a celebration ────────────────────────────────────────────────────
  const show = useCallback(
    (cel: ActiveCelebration) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setActive(cel)
      setVisible(false)
      // One frame delay so the mount transition fires
      setTimeout(() => setVisible(true), 20)
      fireConfetti()
      // Auto-dismiss after 7 seconds
      timerRef.current = setTimeout(() => closePanel(cel.id), 7000)
    },
    [fireConfetti, closePanel]
  )

  // ── Check for pending celebrations on every page mount ────────────────────
  useEffect(() => {
    fetch('/api/celebrations')
      .then((r) => r.json())
      .then(({ celebration }) => {
        if (celebration) {
          show({ id: celebration.id, type: celebration.celebration_type })
        }
      })
      .catch(() => {})
  }, [show])

  // ── Test trigger (cycles through all 5 types) ─────────────────────────────
  const triggerTest = useCallback(() => {
    const type = ALL_TYPES[testIndexRef.current % ALL_TYPES.length]
    testIndexRef.current++
    show({ type }) // no id → not persisted
  }, [show])

  const meta = active
    ? (CELEBRATION_META[active.type] ?? CELEBRATION_META.daily_run)
    : null

  return (
    <CelebrationContext.Provider value={{ triggerTest }}>
      {children}

      {/* ── Notification banner — fixed bottom-right ── */}
      {active && meta && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position:   'fixed',
            bottom:     '20px',
            right:      '20px',
            zIndex:     9999,
            maxWidth:   '320px',
            width:      'calc(100vw - 40px)',
            transform:  visible
              ? 'translateY(0) scale(1)'
              : 'translateY(24px) scale(0.95)',
            opacity:    visible ? 1 : 0,
            transition: 'transform 0.38s cubic-bezier(0.34,1.56,0.64,1), opacity 0.30s ease',
          }}
        >
          <div
            style={{
              background:   '#F5F3EC',
              border:       '1.5px solid rgba(238,107,23,0.28)',
              borderRadius: '20px',
              padding:      '16px',
              boxShadow:    '0 8px 40px rgba(30,22,17,0.22), 0 0 0 1px rgba(238,107,23,0.08)',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              {/* Emoji badge */}
              <div
                style={{
                  width:          '42px',
                  height:         '42px',
                  borderRadius:   '13px',
                  background:     '#EE6B17',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize:       '22px',
                  flexShrink:     0,
                }}
              >
                {meta.emoji}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
                <div
                  style={{
                    fontFamily:    'Nohemi, Inter, sans-serif',
                    fontWeight:    600,
                    fontSize:      '14px',
                    color:         '#1E1611',
                    letterSpacing: '-0.02em',
                    lineHeight:    1.3,
                  }}
                >
                  {meta.title}
                </div>
                <div
                  style={{
                    fontSize:   '12px',
                    color:      '#736554',
                    marginTop:  '4px',
                    lineHeight: 1.55,
                  }}
                >
                  {meta.body}
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => closePanel(active.id)}
                aria-label="Dismiss"
                style={{
                  width:      '26px',
                  height:     '26px',
                  display:    'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  flexShrink: 0,
                  color:      '#A09880',
                  marginTop:  '1px',
                  background: 'transparent',
                  border:     'none',
                  cursor:     'pointer',
                  padding:    0,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drain bar — shrinks to 0 over 7 s */}
            <DrainBar active={visible} duration={7000} />
          </div>
        </div>
      )}
    </CelebrationContext.Provider>
  )
}

// ─── Drain bar (separate component so it can own its own effect) ──────────────

function DrainBar({ active, duration }: { active: boolean; duration: number }) {
  const [width, setWidth] = useState('100%')

  useEffect(() => {
    if (!active) { setWidth('100%'); return }
    // Let the bar render at 100% first, then animate to 0
    const raf = requestAnimationFrame(() => setWidth('0%'))
    return () => cancelAnimationFrame(raf)
  }, [active])

  return (
    <div
      style={{
        marginTop:    '14px',
        height:       '3px',
        borderRadius: '99px',
        background:   'rgba(43,49,23,0.08)',
        overflow:     'hidden',
      }}
    >
      <div
        style={{
          height:     '100%',
          width,
          borderRadius: '99px',
          background:   '#EE6B17',
          transition:   active ? `width ${duration}ms linear` : 'none',
        }}
      />
    </div>
  )
}
