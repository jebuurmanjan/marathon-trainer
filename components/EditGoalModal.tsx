'use client'

import { useState, useEffect, useCallback } from 'react'
import type { UserPlanConfig, EquipmentType, RaceType } from '@/lib/plan-generator'
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
    { label: 'Finish strong', seconds: 18000 },
    { label: 'Top half',      seconds: 14400 },
    { label: 'Top 25%',       seconds: 10800 },
    { label: 'Podium / win',  seconds: 7200  },
  ],
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const RACE_TYPE_OPTIONS: { type: RaceType; emoji: string; weeks: string }[] = [
  { type: '5k',       emoji: '🏃', weeks: '6–10 wk'  },
  { type: '10k',      emoji: '🏃', weeks: '8–12 wk'  },
  { type: 'half',     emoji: '🏅', weeks: '10–16 wk' },
  { type: 'marathon', emoji: '🏆', weeks: '16–27 wk' },
  { type: 'ultra',    emoji: '🗻', weeks: '20–30 wk' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 28)
  return d.toISOString().slice(0, 10)
}

function weeksUntilRace(raceDate: string): number {
  if (!raceDate) return 27
  return Math.floor(
    (new Date(raceDate + 'T12:00:00Z').getTime() - Date.now()) / (7 * 86_400_000)
  )
}

// Steps: 1-8 always, 9=equipment (only if strength>0), 10=injury notes (always)
// When strength=0: step 8 → skip to step 10; display collapses to 9 steps
function totalSteps(strengthDays: number | null): number {
  return (strengthDays ?? 1) > 0 ? 10 : 9
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  planId:        string
  currentConfig: UserPlanConfig
  onClose:       () => void
  onSaved:       () => void
}

// ─── Shared sub-components ────────────────────────────────────────────────────

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
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2 shrink-0" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EditGoalModal({ planId, currentConfig, onClose, onSaved }: Props) {
  // Pre-fill every field from the current plan config
  const [step,           setStep]          = useState(1)
  const [raceType,       setRaceType]      = useState<RaceType>(currentConfig.raceType       ?? 'marathon')
  const [raceDate,       setRaceDate]      = useState(currentConfig.raceDate)
  const [planWeeks,      setPlanWeeks]     = useState(currentConfig.planWeeks)
  const [goalSecs,       setGoalSecs]      = useState<number | null>(currentConfig.goalSeconds)
  const [weeklyKm,       setWeeklyKm]      = useState(currentConfig.weeklyKm)
  const [runsPerWeek,    setRunsPerWeek]   = useState<number | null>(currentConfig.runsPerWeek)
  const [unavailableDays,setUnavailableDays] = useState<number[]>(currentConfig.unavailableDays ?? [4])
  const [strengthDays,   setStrengthDays]  = useState<number | null>(currentConfig.strengthDays)
  const [equipmentType,  setEquipmentType] = useState<EquipmentType | null>(currentConfig.equipmentType)
  const [injuryNotes,    setInjuryNotes]   = useState(currentConfig.injuryNotes ?? '')

  const [confirming, setConfirming] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const weeksRange   = PLAN_WEEKS_RANGE[raceType]
  const maxWeeks     = Math.min(weeksRange.max, weeksUntilRace(raceDate))
  const effectiveMin = weeksRange.min
  const displayMax   = totalSteps(strengthDays)

  // When strength=0, step 10 maps to visual step 9 in the dot indicator
  const effectiveStep = (step === 10 && strengthDays === 0) ? 9 : step
  const isLastStep    = effectiveStep === displayMax

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !saving) onClose()
  }, [onClose, saving])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Clamp planWeeks when raceDate or raceType changes
  useEffect(() => {
    if (raceDate) setPlanWeeks((w) => Math.max(effectiveMin, Math.min(maxWeeks, w)))
  }, [raceDate, maxWeeks, effectiveMin])

  // ── Navigation ──────────────────────────────────────────────────────────────

  function nextStep() {
    setError(null)
    if (step === 2 && !raceDate)           { setError('Please pick a race date.');     return }
    if (step === 6 && !runsPerWeek)        { setError('Please choose runs per week.'); return }
    if (step === 8 && strengthDays === null){ setError('Please choose a number.');     return }
    // Step 8 with 0 strength → skip equipment (step 9), jump to injury notes (step 10)
    if (step === 8 && strengthDays === 0)  { setStep(10); return }
    if (isLastStep)                        { setConfirming(true); return }
    setStep((s) => s + 1)
  }

  function prevStep() {
    setError(null)
    // Step 10 with no strength → skip equipment back, go to step 8
    if (step === 10 && strengthDays === 0) { setStep(8); return }
    setStep((s) => Math.max(1, s - 1))
  }

  function toggleDay(d: number) {
    setUnavailableDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    )
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/plans', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          planId,
          raceDate,
          goalSeconds:    goalSecs,
          weeklyKm,
          runsPerWeek:    runsPerWeek    ?? 4,
          strengthDays:   strengthDays   ?? 0,
          equipmentType:  equipmentType  ?? 'bodyweight',
          planWeeks,
          raceType:       raceType       ?? 'marathon',
          injuryNotes:    injuryNotes    || null,
          unavailableDays,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to update plan')
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
      setConfirming(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background:   'var(--surface)',
    border:       '1px solid rgba(var(--tint),0.08)',
    borderRadius: '12px',
    padding:      '20px',
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(16,24,40,0.50)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: 'var(--bg-base)' }}
      >
        <div className="p-6">

          {/* ── Confirmation screen ──────────────────────────────────────────── */}
          {confirming ? (
            <div>
              <div className="text-center mb-6">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl mx-auto mb-4"
                  style={{ background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.08)' }}
                >
                  ✏️
                </div>
                <h2
                  className="text-xl mb-2"
                  style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
                >
                  Update your plan?
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                  Your plan will be recalculated with the new settings. All your Strava runs and completed weeks stay exactly as they are — only future sessions will change.
                </p>
              </div>

              {error && (
                <div
                  className="mb-4 rounded-lg px-4 py-3 text-sm"
                  style={{ background: 'rgba(var(--accent-rgb),0.10)', border: '1px solid rgba(var(--accent-rgb),0.25)', color: 'var(--accent)' }}
                >
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full py-3 rounded-lg text-sm font-bold text-white disabled:opacity-60 transition-opacity"
                  style={{ background: 'var(--accent)' }}
                >
                  {saving ? 'Updating plan…' : 'Yes, update my plan →'}
                </button>
                <button
                  onClick={() => { setConfirming(false); setError(null) }}
                  disabled={saving}
                  className="w-full py-3 rounded-lg text-sm font-semibold transition-colors"
                  style={{ background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.10)', color: 'var(--text-secondary)' }}
                >
                  Go back
                </button>
              </div>
            </div>
          ) : (
            /* ── Wizard ─────────────────────────────────────────────────────── */
            <div>
              {/* Header row */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2
                    className="text-xl"
                    style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
                  >
                    Edit goal
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-dim)' }}>Update your plan settings</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)', background: 'var(--surface)' }}
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6 justify-center">
                {Array.from({ length: displayMax }, (_, i) => i + 1).map((n) => (
                  <div
                    key={n}
                    className="rounded-full transition-all"
                    style={{
                      width:      effectiveStep === n ? '24px' : '8px',
                      height:     '8px',
                      background: effectiveStep >= n ? 'var(--accent)' : 'rgba(var(--tint),0.12)',
                    }}
                  />
                ))}
              </div>

              {/* ── Step 1: Race type ── */}
              {step === 1 && (
                <div style={card}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 1 of {displayMax}</p>
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
                    What are you training for?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
                    This shapes your plan structure, paces, and training phases.
                  </p>
                  <div className="flex flex-col gap-2">
                    {RACE_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.type}
                        onClick={() => { setRaceType(opt.type); setGoalSecs(null); setError(null) }}
                        className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
                        style={
                          raceType === opt.type
                            ? { background: 'var(--accent)', color: '#fff' }
                            : { background: 'var(--bg-base)', border: '1px solid rgba(var(--tint),0.10)', color: 'var(--text-primary)' }
                        }
                      >
                        <span>{opt.emoji} {RACE_TYPE_LABELS[opt.type]}</span>
                        <span className="text-xs opacity-70">{opt.weeks}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 2: Race date ── */}
              {step === 2 && (
                <div style={card}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 2 of {displayMax}</p>
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
                    When is your {RACE_TYPE_LABELS[raceType]}?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
                    The plan works backwards from your race date.
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
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
                    How many weeks do you want to train?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
                    {maxWeeks >= weeksRange.max
                      ? `A full ${weeksRange.max}-week plan is available. Shorter options build all the same phases, just more compressed.`
                      : `Your race is ${maxWeeks} weeks away — that's your maximum. ${weeksRange.min} weeks is the minimum.`}
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
                    type="range" min={effectiveMin} max={maxWeeks} step={1} value={planWeeks}
                    onChange={(e) => setPlanWeeks(Number(e.target.value))}
                    className="w-full accent-orange-500 mb-4"
                  />
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{effectiveMin} wk</span>
                    <span>{maxWeeks} wk</span>
                  </div>
                  <div className="mt-4 px-3 py-2.5 rounded-lg text-xs leading-relaxed" style={{ background: 'rgba(var(--accent-rgb),0.08)', color: 'var(--text-dim)' }}>
                    {planWeeks <= 10 && 'Short block — compressed phases. Every week counts.'}
                    {planWeeks > 10 && planWeeks <= 16 && 'Solid plan — all key phases covered with good progression.'}
                    {planWeeks > 16 && planWeeks <= 20 && 'Moderate plan — all phases balanced. Good build-up and recovery.'}
                    {planWeeks > 20 && planWeeks < 27 && 'Full plan structure with solid volume in the middle phases.'}
                    {planWeeks >= 27 && 'Full 27-week plan — maximum time to build aerobic base and peak properly.'}
                  </div>
                </div>
              )}

              {/* ── Step 4: Goal time ── */}
              {step === 4 && (
                <div style={card}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 4 of {displayMax}</p>
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
                    What's your goal time?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
                    Your target affects the paces in every training session.
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
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
                    How much are you running per week now?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
                    Week 1 of your plan starts here — volume builds from this point.
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
                    {weeklyKm >= 70 && 'High volume athlete. Make recovery a priority.'}
                  </div>
                </div>
              )}

              {/* ── Step 6: Runs per week ── */}
              {step === 6 && (
                <div style={card}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 6 of {displayMax}</p>
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
                    How many days a week can you run?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
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
                      {runsPerWeek === 3 && '3 focused sessions with good recovery. Perfect alongside strength training or if managing injury risk.'}
                      {runsPerWeek === 4 && 'The sweet spot for most runners — enough volume without burning out.'}
                      {runsPerWeek === 5 && 'High frequency. The extra Wednesday easy run adds meaningful aerobic base. Prioritise recovery.'}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 7: Rest days ── */}
              {step === 7 && (
                <div style={card}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 7 of {displayMax}</p>
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
                    Any days you can't train?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
                    The plan will avoid scheduling sessions on these days.
                  </p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS.map((day, i) => {
                      const blocked = unavailableDays.includes(i)
                      return (
                        <button
                          key={day}
                          onClick={() => toggleDay(i)}
                          className="flex flex-col items-center py-2.5 rounded-lg text-xs font-semibold transition-colors"
                          style={
                            blocked
                              ? { background: 'var(--accent)', color: '#fff' }
                              : { background: 'var(--bg-base)', border: '1px solid rgba(var(--tint),0.10)', color: 'var(--text-primary)' }
                          }
                        >
                          <span>{day.slice(0, 3)}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {unavailableDays.length === 0
                      ? 'No blocked days — the plan can schedule sessions any day.'
                      : `Blocked: ${unavailableDays.map((d) => DAYS[d]).join(', ')}`}
                  </p>
                </div>
              )}

              {/* ── Step 8: Strength days ── */}
              {step === 8 && (
                <div style={card}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 8 of {displayMax}</p>
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
                    Strength training sessions?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
                    Strength work prevents injury and improves running economy.
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
              {step === 9 && (
                <div style={card}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step 9 of {displayMax}</p>
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
                    What equipment do you have?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
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
                      {equipmentType === 'gym'        && 'Compound lifts (squats, deadlifts, hip thrusts) that build real running strength.'}
                      {equipmentType === 'both'       && 'Gym weeks and bodyweight weeks alternate, keeping variety without overloading any one stimulus.'}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 10: Injury notes ── */}
              {step === 10 && (
                <div style={card}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Step {effectiveStep} of {displayMax}</p>
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
                    Any injuries or things to avoid?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
                    Optional — if you have something specific, the plan adapts accordingly.
                  </p>
                  <textarea
                    value={injuryNotes}
                    onChange={(e) => setInjuryNotes(e.target.value)}
                    placeholder={'e.g. "knee pain, no hills" or "plantar fasciitis, no speed work"'}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none"
                    style={{
                      background: 'var(--bg-base)',
                      border:     '1px solid rgba(var(--tint),0.12)',
                      color:      'var(--text-primary)',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  />
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Leave blank if nothing to flag. The plan will include all session types.
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
                  className="flex-1 py-3 rounded-lg text-sm font-bold text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  {isLastStep ? 'Save changes →' : 'Continue →'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
