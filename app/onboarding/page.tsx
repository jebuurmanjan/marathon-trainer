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
  d.setDate(d.getDate() + 28)
  return d.toISOString().slice(0, 10)
}

// Max step depends on whether strength > 0 (gym question only shown then)
function totalSteps(strengthDays: number): number {
  return strengthDays > 0 ? 6 : 5
}

// ─── Shared card style ────────────────────────────────────────────────────────

const card = {
  background:   '#EDE9DE',
  border:       '1px solid rgba(43,49,23,0.08)',
  borderRadius: '20px',
  padding:      '20px',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()

  const [step,         setStep]         = useState(1)
  const [raceDate,     setRaceDate]     = useState('')
  const [goalSecs,     setGoalSecs]     = useState<number | null>(null)
  const [weeklyKm,     setWeeklyKm]     = useState(40)
  const [runsPerWeek,  setRunsPerWeek]  = useState<number | null>(null)
  const [strengthDays, setStrengthDays] = useState<number | null>(null)
  const [hasGym,       setHasGym]       = useState<boolean | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const maxStep = strengthDays !== null ? totalSteps(strengthDays) : 6

  // ── Validate + advance ─────────────────────────────────────────────────────

  function nextStep() {
    setError(null)
    if (step === 1 && !raceDate)       { setError('Please pick a race date.');      return }
    if (step === 2 && !goalSecs)       { setError('Please select a goal time.');    return }
    if (step === 4 && !runsPerWeek)    { setError('Please choose runs per week.');  return }
    if (step === 5 && strengthDays === null) { setError('Please choose a number.'); return }
    // Step 5 → step 6 only if strength > 0, otherwise finish
    if (step === 5 && strengthDays === 0) { finish(strengthDays, false); return }
    if (step === maxStep) { finish(strengthDays ?? 0, hasGym ?? false); return }
    setStep((s) => s + 1)
  }

  function prevStep() {
    setError(null)
    // Going back from step 6 when strength was reduced to 0 (edge case)
    setStep((s) => Math.max(1, s - 1))
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function finish(sd: number, gym: boolean) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          raceDate,
          goalSeconds:  goalSecs,
          weeklyKm,
          runsPerWeek:  runsPerWeek ?? 4,
          strengthDays: sd,
          hasGym:       gym,
        }),
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

  // ── Option button helper ───────────────────────────────────────────────────

  function OptionBtn({
    active, onClick, children,
  }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button
        onClick={onClick}
        className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
        style={
          active
            ? { background: '#EE6B17', color: '#fff' }
            : { background: '#F5F3EC', border: '1px solid rgba(43,49,23,0.10)', color: '#1E1611' }
        }
      >
        <span>{children}</span>
        {active && (
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
    )
  }

  // ── Label for step indicator ───────────────────────────────────────────────

  const displayMax = strengthDays !== null ? totalSteps(strengthDays) : 6

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
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: '#1E1611' }}
          >
            Set up your plan
          </h1>
          <p className="text-sm" style={{ color: '#736554' }}>A few quick questions — 60 seconds</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {Array.from({ length: displayMax }, (_, i) => i + 1).map((n) => (
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
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 1 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>
              When is your marathon?
            </h2>
            <p className="text-sm mb-5" style={{ color: '#736554' }}>
              Pick your race date — the plan works backwards from there.
            </p>
            <input
              type="date"
              min={minDate()}
              value={raceDate}
              onChange={(e) => { setRaceDate(e.target.value); setError(null) }}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
              style={{
                background: '#F5F3EC',
                border:     '1px solid rgba(43,49,23,0.12)',
                color:      '#1E1611',
                fontFamily: 'Nohemi, Inter, sans-serif',
              }}
            />
          </div>
        )}

        {/* ── Step 2: Goal time ── */}
        {step === 2 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 2 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>
              What's your goal time?
            </h2>
            <p className="text-sm mb-5" style={{ color: '#736554' }}>
              Your target affects the paces in every single training session.
            </p>
            <div className="flex flex-col gap-2">
              {GOAL_PRESETS.map((p) => (
                <OptionBtn key={p.seconds} active={goalSecs === p.seconds} onClick={() => { setGoalSecs(p.seconds); setError(null) }}>
                  {p.label}
                </OptionBtn>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Weekly km ── */}
        {step === 3 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 3 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>
              How much do you run per week now?
            </h2>
            <p className="text-sm mb-5" style={{ color: '#736554' }}>
              Your current load is the starting point — the plan builds from here.
            </p>

            <div className="text-center mb-4">
              <span
                className="text-5xl tabular-nums"
                style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.04em', color: '#EE6B17' }}
              >
                {weeklyKm}
              </span>
              <span className="text-lg ml-1.5" style={{ color: '#736554' }}>km/week</span>
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

            <div className="flex justify-between text-xs" style={{ color: '#A09880' }}>
              <span>10 km</span>
              <span>100 km</span>
            </div>

            <div
              className="mt-4 px-3 py-2.5 rounded-xl text-xs leading-relaxed"
              style={{ background: 'rgba(238,107,23,0.08)', color: '#736554' }}
            >
              {weeklyKm < 30 && 'Good starting point — the plan will build your volume gradually and safely.'}
              {weeklyKm >= 30 && weeklyKm < 50 && 'Solid base. The plan will push your volume through the build and peak phases.'}
              {weeklyKm >= 50 && weeklyKm < 70 && "Strong base. You're well-placed to hit the peak training weeks comfortably."}
              {weeklyKm >= 70 && 'High volume athlete. The plan will peak at elite training loads — make sure recovery is a priority.'}
            </div>
          </div>
        )}

        {/* ── Step 4: Runs per week ── */}
        {step === 4 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 4 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>
              How many days a week can you run?
            </h2>
            <p className="text-sm mb-5" style={{ color: '#736554' }}>
              This shapes the structure of every training week.
            </p>
            <div className="flex flex-col gap-2">
              <OptionBtn active={runsPerWeek === 3} onClick={() => { setRunsPerWeek(3); setError(null) }}>
                3 days — Tue · Thu · Sun (+ optional Sat from week 7)
              </OptionBtn>
              <OptionBtn active={runsPerWeek === 4} onClick={() => { setRunsPerWeek(4); setError(null) }}>
                4 days — Tue · Thu · Sat · Sun
              </OptionBtn>
              <OptionBtn active={runsPerWeek === 5} onClick={() => { setRunsPerWeek(5); setError(null) }}>
                5 days — Tue · Wed · Thu · Sat · Sun
              </OptionBtn>
            </div>

            {runsPerWeek && (
              <div
                className="mt-4 px-3 py-2.5 rounded-xl text-xs leading-relaxed"
                style={{ background: 'rgba(238,107,23,0.08)', color: '#736554' }}
              >
                {runsPerWeek === 3 && '3 focused sessions per week with good recovery. Perfect if you\'re also strength training or managing injury risk.'}
                {runsPerWeek === 4 && 'The sweet spot for most marathon runners — enough volume to build fitness without burning out.'}
                {runsPerWeek === 5 && 'High frequency training. The extra Wednesday easy run adds meaningful aerobic base. Make sure recovery is a priority.'}
              </div>
            )}
          </div>
        )}

        {/* ── Step 5: Strength days ── */}
        {step === 5 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 5 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>
              Strength training sessions?
            </h2>
            <p className="text-sm mb-5" style={{ color: '#736554' }}>
              Strength work prevents injury and improves running economy. It shows up inside your week cards.
            </p>
            <div className="flex flex-col gap-2">
              <OptionBtn active={strengthDays === 0} onClick={() => { setStrengthDays(0); setHasGym(false); setError(null) }}>
                0 — no strength training
              </OptionBtn>
              <OptionBtn active={strengthDays === 1} onClick={() => { setStrengthDays(1); setError(null) }}>
                1 day — Monday
              </OptionBtn>
              <OptionBtn active={strengthDays === 2} onClick={() => { setStrengthDays(2); setError(null) }}>
                2 days — Mon + {runsPerWeek === 5 ? 'Fri' : 'Wed'}
              </OptionBtn>
            </div>

            {strengthDays !== null && strengthDays > 0 && (
              <div
                className="mt-4 px-3 py-2.5 rounded-xl text-xs leading-relaxed"
                style={{ background: 'rgba(238,107,23,0.08)', color: '#736554' }}
              >
                Sessions are placed on rest days for maximum recovery. Each session is 30–45 min, adapted to your training phase.
              </div>
            )}
          </div>
        )}

        {/* ── Step 6: Gym or bodyweight (only if strength > 0) ── */}
        {step === 6 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 6 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>
              Gym access or bodyweight?
            </h2>
            <p className="text-sm mb-5" style={{ color: '#736554' }}>
              This affects the exercises recommended — both options are equally effective for runners.
            </p>
            <div className="flex flex-col gap-2">
              <OptionBtn active={hasGym === false} onClick={() => { setHasGym(false); setError(null) }}>
                Bodyweight — no equipment needed
              </OptionBtn>
              <OptionBtn active={hasGym === true} onClick={() => { setHasGym(true); setError(null) }}>
                Gym — barbells, machines, cables
              </OptionBtn>
            </div>

            {hasGym !== null && (
              <div
                className="mt-4 px-3 py-2.5 rounded-xl text-xs leading-relaxed"
                style={{ background: 'rgba(238,107,23,0.08)', color: '#736554' }}
              >
                {hasGym
                  ? 'Gym sessions use compound lifts (squats, deadlifts, hip thrusts) that build real running strength.'
                  : 'Bodyweight sessions focus on glutes, single-leg stability, and core — all the stuff that keeps runners injury free.'}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="mt-3 rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(238,107,23,0.10)', border: '1px solid rgba(238,107,23,0.25)', color: '#EE6B17' }}
          >
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className={`flex mt-4 gap-3 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
          {step > 1 && (
            <button
              onClick={prevStep}
              className="px-5 py-3 rounded-xl text-sm font-semibold"
              style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.10)', color: '#4A5427' }}
            >
              Back
            </button>
          )}
          <button
            onClick={nextStep}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: '#EE6B17' }}
          >
            {saving
              ? 'Setting up your plan…'
              : step === displayMax || (step === 5 && strengthDays === 0)
              ? 'Build my plan →'
              : 'Continue →'}
          </button>
        </div>
      </div>
    </main>
  )
}
