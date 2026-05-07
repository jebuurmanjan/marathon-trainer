'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { EquipmentType, RaceType } from '@/lib/plan-generator'
import { RACE_TYPE_LABELS, PLAN_WEEKS_RANGE } from '@/lib/plan-generator'

// ─── Goal time presets per race type ─────────────────────────────────────────

const GOAL_PRESETS: Record<RaceType, { label: string; seconds: number }[]> = {
  '5k': [
    { label: 'Sub 15:00', seconds: 900  },
    { label: 'Sub 17:00', seconds: 1020 },
    { label: 'Sub 20:00', seconds: 1200 },
    { label: 'Sub 23:00', seconds: 1380 },
    { label: 'Sub 25:00', seconds: 1500 },
    { label: 'Sub 30:00', seconds: 1800 },
  ],
  '10k': [
    { label: 'Sub 30:00', seconds: 1800  },
    { label: 'Sub 35:00', seconds: 2100  },
    { label: 'Sub 40:00', seconds: 2400  },
    { label: 'Sub 45:00', seconds: 2700  },
    { label: 'Sub 50:00', seconds: 3000  },
    { label: 'Sub 60:00', seconds: 3600  },
  ],
  'half': [
    { label: 'Sub 1:30', seconds: 5400  },
    { label: 'Sub 1:45', seconds: 6300  },
    { label: 'Sub 2:00', seconds: 7200  },
    { label: 'Sub 2:15', seconds: 8100  },
    { label: 'Sub 2:30', seconds: 9000  },
  ],
  'marathon': [
    { label: 'Sub 2:30', seconds: 9000  },
    { label: 'Sub 2:45', seconds: 9900  },
    { label: 'Sub 3:00', seconds: 10800 },
    { label: 'Sub 3:15', seconds: 11700 },
    { label: 'Sub 3:30', seconds: 12600 },
    { label: 'Sub 3:45', seconds: 13500 },
    { label: 'Sub 4:00', seconds: 14400 },
    { label: 'Sub 4:15', seconds: 15300 },
    { label: 'Sub 4:30', seconds: 16200 },
  ],
  'ultra': [
    { label: 'Finish strong',  seconds: 18000 },
    { label: 'Top half',       seconds: 14400 },
    { label: 'Top 25%',        seconds: 10800 },
    { label: 'Podium / win',   seconds: 7200  },
  ],
}

const RACE_TYPE_OPTIONS: { type: RaceType; emoji: string; weeks: string }[] = [
  { type: '5k',       emoji: '🏃', weeks: '6–10 wk'  },
  { type: '10k',      emoji: '🏃', weeks: '8–12 wk'  },
  { type: 'half',     emoji: '🏅', weeks: '10–16 wk' },
  { type: 'marathon', emoji: '🏆', weeks: '16–27 wk' },
  { type: 'ultra',    emoji: '🗻', weeks: '20–30 wk' },
]

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 28)
  return d.toISOString().slice(0, 10)
}

function weeksUntilRace(raceDate: string): number {
  if (!raceDate) return 27
  return Math.floor((new Date(raceDate + 'T12:00:00Z').getTime() - Date.now()) / (7 * 86_400_000))
}

// Total steps: 9 always + 1 if strengthDays > 0
function totalSteps(strengthDays: number | null): number {
  return (strengthDays ?? 1) > 0 ? 10 : 9
}

const card = {
  background:   'var(--surface)',
  border:       '1px solid rgba(var(--tint),0.08)',
  borderRadius: '12px',
  padding:      '20px',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()

  const [step,             setStep]             = useState(1)
  const [raceType,         setRaceType]         = useState<RaceType | null>(null)
  const [raceDate,         setRaceDate]         = useState('')
  const [planWeeks,        setPlanWeeks]        = useState(27)
  const [goalSecs,         setGoalSecs]         = useState<number | null>(null)
  const [weeklyKm,         setWeeklyKm]         = useState(40)
  const [runsPerWeek,      setRunsPerWeek]      = useState<number | null>(null)
  const [unavailableDays,  setUnavailableDays]  = useState<number[]>([4]) // Thu default
  const [strengthDays,     setStrengthDays]     = useState<number | null>(null)
  const [equipmentType,    setEquipmentType]    = useState<EquipmentType | null>(null)
  const [injuryNotes,      setInjuryNotes]      = useState('')
  const [saving,           setSaving]           = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  const weeksRange  = raceType ? PLAN_WEEKS_RANGE[raceType] : { min: 12, max: 27 }
  const maxWeeks    = Math.min(weeksRange.max, weeksUntilRace(raceDate))
  const displayMax  = totalSteps(strengthDays)

  // When race type or date changes, clamp planWeeks
  useEffect(() => {
    if (raceDate) setPlanWeeks((w) => Math.max(weeksRange.min, Math.min(maxWeeks, w)))
  }, [raceDate, raceType, maxWeeks, weeksRange.min])

  // Default planWeeks when race type selected
  useEffect(() => {
    if (raceType) {
      const r = PLAN_WEEKS_RANGE[raceType]
      setPlanWeeks(Math.min(r.max, Math.max(r.min, planWeeks)))
    }
  }, [raceType]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ─────────────────────────────────────────────────────────────

  function nextStep() {
    setError(null)
    if (step === 1 && !raceType)            { setError('Please choose a race distance.'); return }
    if (step === 2 && !raceDate)            { setError('Please pick a race date.');        return }
    if (step === 6 && !runsPerWeek)         { setError('Please choose runs per week.');    return }
    if (step === 8 && strengthDays === null){ setError('Please choose a number.');         return }
    // Step 8 with 0 strength → skip equipment step
    if (step === 8 && strengthDays === 0)   { submit(); return }
    if (step === displayMax)                { submit(); return }
    setStep((s) => s + 1)
  }

  function prevStep() {
    setError(null)
    setStep((s) => Math.max(1, s - 1))
  }

  function toggleUnavailableDay(day: number) {
    setUnavailableDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          raceDate,
          goalSeconds:     goalSecs,
          weeklyKm,
          runsPerWeek:     runsPerWeek    ?? 4,
          strengthDays:    strengthDays   ?? 0,
          equipmentType:   equipmentType  ?? 'bodyweight',
          planWeeks,
          raceType:        raceType       ?? 'marathon',
          injuryNotes:     injuryNotes.trim() || null,
          unavailableDays,
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

  // ── Shared option button ───────────────────────────────────────────────────

  function OptionBtn({
    active, onClick, children,
  }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button
        onClick={onClick}
        className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
        style={
          active
            ? { background: 'var(--accent)', color: '#fff' }
            : { background: 'var(--bg-base)', border: '1px solid rgba(var(--tint),0.10)', color: 'var(--text-primary)' }
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

  const isLastStep = step === displayMax || (step === 8 && strengthDays === 0)

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl mx-auto mb-4"
            style={{ background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.08)' }}
          >
            ⏱
          </div>
          <h1
            className="text-2xl mb-1"
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
          >
            Set up your plan
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>A few quick questions — 60 seconds</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-8 justify-center">
          {Array.from({ length: displayMax }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              className="rounded-full transition-all"
              style={{
                width:      step === n ? '20px' : '6px',
                height:     '6px',
                background: step >= n ? 'var(--accent)' : 'rgba(var(--tint),0.12)',
              }}
            />
          ))}
        </div>

        {/* ── Step 1: Race type ── */}
        {step === 1 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 1 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
              What are you training for?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-dim)' }}>
              Your race distance shapes every phase of your plan.
            </p>
            <div className="flex flex-col gap-2">
              {RACE_TYPE_OPTIONS.map(({ type, emoji, weeks }) => (
                <OptionBtn
                  key={type}
                  active={raceType === type}
                  onClick={() => { setRaceType(type); setGoalSecs(null); setError(null) }}
                >
                  <span className="flex items-center gap-2">
                    <span>{emoji}</span>
                    <span>{RACE_TYPE_LABELS[type]}</span>
                    <span className="text-[11px] font-normal opacity-60">· {weeks}</span>
                  </span>
                </OptionBtn>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Race date ── */}
        {step === 2 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 2 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
              When is your {raceType ? RACE_TYPE_LABELS[raceType] : 'race'}?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-dim)' }}>
              Pick your race date — the plan works backwards from there.
            </p>
            <input
              type="date" min={minDate()} value={raceDate}
              onChange={(e) => { setRaceDate(e.target.value); setError(null) }}
              className="w-full px-4 py-3 rounded-lg text-sm font-medium outline-none"
              style={{ background: 'var(--bg-base)', border: '1px solid rgba(var(--tint),0.12)', color: 'var(--text-primary)', fontFamily: 'Nohemi, Inter, sans-serif' }}
            />
          </div>
        )}

        {/* ── Step 3: Plan duration ── */}
        {step === 3 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 3 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
              How many weeks to train?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-dim)' }}>
              {maxWeeks >= weeksRange.max
                ? `A full ${weeksRange.max}-week plan is available. Shorter options build the same phases, more compressed.`
                : `Your race is ${maxWeeks} weeks away. ${weeksRange.min} weeks is the minimum for a complete plan.`}
            </p>
            <div className="text-center mb-4">
              <span
                className="text-5xl tabular-nums"
                style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--accent)' }}
              >
                {planWeeks}
              </span>
              <span className="text-lg ml-1.5" style={{ color: 'var(--text-dim)' }}>weeks</span>
            </div>
            <input
              type="range" min={weeksRange.min} max={maxWeeks} step={1} value={planWeeks}
              onChange={(e) => setPlanWeeks(Number(e.target.value))}
              className="w-full accent-orange-500 mb-4"
            />
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>{weeksRange.min} wk</span>
              <span>{maxWeeks} wk</span>
            </div>
          </div>
        )}

        {/* ── Step 4: Goal time ── */}
        {step === 4 && raceType && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 4 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
              What&apos;s your goal?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-dim)' }}>
              {raceType === 'ultra'
                ? 'Pick your ambition level. This shapes your peak training intensity.'
                : 'Your target affects the paces in every single training session.'}
            </p>
            <div className="flex flex-col gap-2">
              {GOAL_PRESETS[raceType].map((p) => (
                <OptionBtn key={p.seconds} active={goalSecs === p.seconds} onClick={() => { setGoalSecs(p.seconds); setError(null) }}>
                  {p.label}
                </OptionBtn>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 5: Weekly km ── */}
        {step === 5 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 5 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
              How much do you run per week now?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-dim)' }}>
              Week 1 of your plan starts here — the plan builds from this point.
            </p>
            <div className="text-center mb-4">
              <span
                className="text-5xl tabular-nums"
                style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--accent)' }}
              >
                {weeklyKm}
              </span>
              <span className="text-lg ml-1.5" style={{ color: 'var(--text-dim)' }}>km/week</span>
            </div>
            <input
              type="range" min={10} max={100} step={5} value={weeklyKm}
              onChange={(e) => setWeeklyKm(Number(e.target.value))}
              className="w-full accent-orange-500 mb-4"
            />
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>10 km</span><span>100 km</span>
            </div>
            <div className="mt-4 px-3 py-2.5 rounded-lg text-xs leading-relaxed" style={{ background: 'rgba(var(--accent-rgb),0.08)', color: 'var(--text-dim)' }}>
              {weeklyKm < 30  && 'Good starting point — the plan builds safely from week 1 at your current load.'}
              {weeklyKm >= 30 && weeklyKm < 50 && 'Solid base. The plan will push your volume through the build and peak phases.'}
              {weeklyKm >= 50 && weeklyKm < 70 && "Strong base. You're well-placed to hit the peak training weeks comfortably."}
              {weeklyKm >= 70 && 'High volume athlete. The plan will peak at elite training loads — make recovery a priority.'}
            </div>
          </div>
        )}

        {/* ── Step 6: Runs per week ── */}
        {step === 6 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 6 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
              How many days a week can you run?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-dim)' }}>
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
              <div className="mt-4 px-3 py-2.5 rounded-lg text-xs leading-relaxed" style={{ background: 'rgba(var(--accent-rgb),0.08)', color: 'var(--text-dim)' }}>
                {runsPerWeek === 3 && "3 focused sessions with good recovery. Perfect alongside strength training or if managing injury risk."}
                {runsPerWeek === 4 && 'The sweet spot for most runners — enough volume without burning out.'}
                {runsPerWeek === 5 && 'High frequency. The extra easy run adds meaningful aerobic base. Prioritise recovery.'}
              </div>
            )}
          </div>
        )}

        {/* ── Step 7: Rest days ── */}
        {step === 7 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 7 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
              Which days can&apos;t you train?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-dim)' }}>
              Sessions will be scheduled around these days. Select all that apply.
            </p>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {DAYS.map((day, idx) => (
                <button
                  key={day}
                  onClick={() => toggleUnavailableDay(idx)}
                  className="py-2.5 rounded-lg text-xs font-bold transition-colors"
                  style={
                    unavailableDays.includes(idx)
                      ? { background: 'var(--accent)', color: '#fff' }
                      : { background: 'var(--bg-base)', border: '1px solid rgba(var(--tint),0.10)', color: 'var(--text-secondary)' }
                  }
                >
                  {day}
                </button>
              ))}
            </div>
            <div className="px-3 py-2.5 rounded-lg text-xs leading-relaxed" style={{ background: 'rgba(var(--accent-rgb),0.08)', color: 'var(--text-dim)' }}>
              {unavailableDays.length === 0
                ? 'No rest days selected — make sure you leave enough gaps for recovery.'
                : `Rest days: ${unavailableDays.map(d => DAYS[d]).join(', ')}. Runs and strength sessions will be placed on the remaining days.`}
            </div>
          </div>
        )}

        {/* ── Step 8: Strength days ── */}
        {step === 8 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 8 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
              Strength training sessions?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-dim)' }}>
              Strength work prevents injury and improves running economy. It shows up inside your week cards.
            </p>
            <div className="flex flex-col gap-2">
              <OptionBtn active={strengthDays === 0} onClick={() => { setStrengthDays(0); setEquipmentType('bodyweight'); setError(null) }}>
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
              <div className="mt-4 px-3 py-2.5 rounded-lg text-xs leading-relaxed" style={{ background: 'rgba(var(--accent-rgb),0.08)', color: 'var(--text-dim)' }}>
                Sessions sit on rest days for maximum recovery. 25–45 min per session, adapted per phase.
              </div>
            )}
          </div>
        )}

        {/* ── Step 9: Equipment (only if strength > 0) ── */}
        {step === 9 && strengthDays !== null && strengthDays > 0 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 9 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
              What equipment do you have?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-dim)' }}>
              This shapes the exercises in your strength sessions.
            </p>
            <div className="flex flex-col gap-2">
              <OptionBtn active={equipmentType === 'bodyweight'} onClick={() => { setEquipmentType('bodyweight'); setError(null) }}>
                Bodyweight — no equipment needed
              </OptionBtn>
              <OptionBtn active={equipmentType === 'gym'} onClick={() => { setEquipmentType('gym'); setError(null) }}>
                Gym — barbells, machines, cables
              </OptionBtn>
              <OptionBtn active={equipmentType === 'both'} onClick={() => { setEquipmentType('both'); setError(null) }}>
                Both — alternate gym and bodyweight weeks
              </OptionBtn>
            </div>
            {equipmentType && (
              <div className="mt-4 px-3 py-2.5 rounded-lg text-xs leading-relaxed" style={{ background: 'rgba(var(--accent-rgb),0.08)', color: 'var(--text-dim)' }}>
                {equipmentType === 'bodyweight' && 'Glutes, single-leg stability, and core — the stuff that keeps runners injury free.'}
                {equipmentType === 'gym' && 'Compound lifts (squats, deadlifts, hip thrusts) that build real running strength.'}
                {equipmentType === 'both' && 'Gym weeks and bodyweight weeks alternate, keeping variety without overloading any one stimulus.'}
              </div>
            )}
          </div>
        )}

        {/* ── Step 10: Injuries / constraints (always last) ── */}
        {step === displayMax && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step {displayMax} of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
              Any injuries or constraints? <span className="font-normal text-sm" style={{ color: 'var(--text-dim)' }}>(optional)</span>
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-dim)' }}>
              The plan will avoid sessions that could aggravate existing issues.
            </p>
            <textarea
              value={injuryNotes}
              onChange={(e) => setInjuryNotes(e.target.value)}
              placeholder='e.g. "knee pain, no hills" or "plantar fasciitis, no speed work"'
              rows={3}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none"
              style={{ background: 'var(--bg-base)', border: '1px solid rgba(var(--tint),0.12)', color: 'var(--text-primary)' }}
            />
            <p className="mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
              Leave blank if you&apos;re starting healthy.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="mt-3 rounded-lg px-4 py-3 text-sm"
            style={{ background: 'rgba(var(--accent-rgb),0.10)', border: '1px solid rgba(var(--accent-rgb),0.25)', color: 'var(--accent)' }}
          >
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className={`flex mt-4 gap-3 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
          {step > 1 && (
            <button
              onClick={prevStep}
              className="px-5 py-3 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.10)', color: 'var(--text-secondary)' }}
            >
              Back
            </button>
          )}
          <button
            onClick={nextStep}
            disabled={saving}
            className="flex-1 py-3 rounded-lg text-sm font-bold text-white disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {saving ? 'Setting up your plan…' : isLastStep ? 'Build my plan →' : 'Continue →'}
          </button>
        </div>
      </div>
    </main>
  )
}
