'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Goal time presets ────────────────────────────────────────────────────────

const GOAL_PRESETS = [
  { label: 'Sub 3:00', seconds: 10800 },
  { label: 'Sub 3:30', seconds: 12600 },
  { label: 'Sub 4:00', seconds: 14400 },
  { label: 'Sub 4:30', seconds: 16200 },
  { label: 'Sub 5:00', seconds: 18000 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 28) // at least 4 weeks away
  return d.toISOString().slice(0, 10)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()

  const [step,      setStep]      = useState<1 | 2 | 3>(1)
  const [raceDate,  setRaceDate]  = useState('')
  const [goalSecs,  setGoalSecs]  = useState<number | null>(null)
  const [weeklyKm,  setWeeklyKm]  = useState(40)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // ── Step navigation ───────────────────────────────────────────────────────

  function nextStep() {
    if (step === 1 && !raceDate) { setError('Please pick a race date.'); return }
    if (step === 2 && !goalSecs) { setError('Please select a goal time.'); return }
    setError(null)
    setStep((s) => Math.min(3, s + 1) as 1 | 2 | 3)
  }

  async function finish() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ raceDate, goalSeconds: goalSecs, weeklyKm }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to save')
      }
      router.push('/plan')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const card = {
    background: '#EDE9DE',
    border:     '1px solid rgba(43,49,23,0.08)',
    borderRadius: '20px',
    padding:    '20px',
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#F5F3EC' }}
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4"
            style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
          >
            ⏱
          </div>
          <h1
            className="text-2xl mb-1"
            style={{ fontFamily:'Nohemi, Inter, sans-serif', fontWeight:600, letterSpacing:'-0.03em', color:'#1E1611' }}
          >
            Set up your plan
          </h1>
          <p className="text-sm" style={{ color:'#736554' }}>3 quick questions — takes 30 seconds</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1,2,3].map((n) => (
            <div
              key={n}
              className="rounded-full transition-all"
              style={{
                width:      step === n ? '24px' : '8px',
                height:     '8px',
                background: step >= n ? '#EE6B17' : 'rgba(43,49,23,0.12)',
              }}
            />
          ))}
        </div>

        {/* ── Step 1: Race date ── */}
        {step === 1 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color:'#A09880' }}>Step 1 of 3</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily:'Nohemi, Inter, sans-serif', color:'#1E1611' }}>
              When is your marathon?
            </h2>
            <p className="text-sm mb-5" style={{ color:'#736554' }}>
              Pick your race date — the plan works backwards from there.
            </p>
            <input
              type="date"
              min={minDate()}
              value={raceDate}
              onChange={(e) => { setRaceDate(e.target.value); setError(null) }}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
              style={{
                background:   '#F5F3EC',
                border:       '1px solid rgba(43,49,23,0.12)',
                color:        '#1E1611',
                fontFamily:   'Nohemi, Inter, sans-serif',
              }}
            />
          </div>
        )}

        {/* ── Step 2: Goal time ── */}
        {step === 2 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color:'#A09880' }}>Step 2 of 3</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily:'Nohemi, Inter, sans-serif', color:'#1E1611' }}>
              What's your goal time?
            </h2>
            <p className="text-sm mb-5" style={{ color:'#736554' }}>
              Your target affects the paces in every single training session.
            </p>
            <div className="flex flex-col gap-2">
              {GOAL_PRESETS.map((p) => (
                <button
                  key={p.seconds}
                  onClick={() => { setGoalSecs(p.seconds); setError(null) }}
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
                  style={
                    goalSecs === p.seconds
                      ? { background:'#EE6B17', color:'#fff' }
                      : { background:'#F5F3EC', border:'1px solid rgba(43,49,23,0.10)', color:'#1E1611' }
                  }
                >
                  <span>{p.label}</span>
                  {goalSecs === p.seconds && (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Weekly km ── */}
        {step === 3 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color:'#A09880' }}>Step 3 of 3</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily:'Nohemi, Inter, sans-serif', color:'#1E1611' }}>
              How much do you run per week now?
            </h2>
            <p className="text-sm mb-5" style={{ color:'#736554' }}>
              Your current load is the starting point — the plan builds from here.
            </p>

            {/* Current value display */}
            <div className="text-center mb-4">
              <span
                className="text-5xl tabular-nums"
                style={{ fontFamily:'Nohemi, Inter, sans-serif', fontWeight:600, letterSpacing:'-0.04em', color:'#EE6B17' }}
              >
                {weeklyKm}
              </span>
              <span className="text-lg ml-1.5" style={{ color:'#736554' }}>km/week</span>
            </div>

            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={weeklyKm}
              onChange={(e) => setWeeklyKm(Number(e.target.value))}
              className="w-full accent-orange-500 mb-4"
            />

            <div className="flex justify-between text-xs" style={{ color:'#A09880' }}>
              <span>10 km</span>
              <span>100 km</span>
            </div>

            {/* Hint */}
            <div
              className="mt-4 px-3 py-2.5 rounded-xl text-xs leading-relaxed"
              style={{ background:'rgba(238,107,23,0.08)', color:'#736554' }}
            >
              {weeklyKm < 30 && 'Good starting point — the plan will build your volume gradually and safely.'}
              {weeklyKm >= 30 && weeklyKm < 50 && 'Solid base. The plan will push your weekly volume through the build and peak phases.'}
              {weeklyKm >= 50 && weeklyKm < 70 && 'Strong base. You\'re well-placed to hit the peak training weeks comfortably.'}
              {weeklyKm >= 70 && 'High volume athlete. The plan will peak at elite training loads — make sure recovery is a priority.'}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="mt-3 rounded-xl px-4 py-3 text-sm"
            style={{ background:'rgba(238,107,23,0.10)', border:'1px solid rgba(238,107,23,0.25)', color:'#EE6B17' }}
          >
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className={`flex mt-4 gap-3 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
          {step > 1 && (
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3)}
              className="px-5 py-3 rounded-xl text-sm font-semibold"
              style={{ background:'#EDE9DE', border:'1px solid rgba(43,49,23,0.10)', color:'#4A5427' }}
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={nextStep}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background:'#EE6B17' }}
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background:'#EE6B17' }}
            >
              {saving ? 'Setting up your plan…' : 'Build my plan →'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
