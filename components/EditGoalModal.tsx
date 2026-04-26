'use client'

import { useState, useEffect, useCallback } from 'react'
import type { UserPlanConfig, EquipmentType } from '@/lib/plan-generator'

// ─── Goal time presets (every 15 min, 2:30–4:30) ─────────────────────────────

const GOAL_PRESETS = [
  { label: 'Sub 2:30', seconds: 9000  },
  { label: 'Sub 2:45', seconds: 9900  },
  { label: 'Sub 3:00', seconds: 10800 },
  { label: 'Sub 3:15', seconds: 11700 },
  { label: 'Sub 3:30', seconds: 12600 },
  { label: 'Sub 3:45', seconds: 13500 },
  { label: 'Sub 4:00', seconds: 14400 },
  { label: 'Sub 4:15', seconds: 15300 },
  { label: 'Sub 4:30', seconds: 16200 },
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

function totalSteps(strengthDays: number | null): number {
  return (strengthDays ?? 1) > 0 ? 7 : 6
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
          ? { background: '#EE6B17', color: '#fff' }
          : { background: '#F5F3EC', border: '1px solid rgba(43,49,23,0.10)', color: '#1E1611' }
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
  const [step,          setStep]          = useState(1)
  const [raceDate,      setRaceDate]      = useState(currentConfig.raceDate)
  const [planWeeks,     setPlanWeeks]     = useState(currentConfig.planWeeks)
  const [goalSecs,      setGoalSecs]      = useState<number | null>(currentConfig.goalSeconds)
  const [weeklyKm,      setWeeklyKm]      = useState(currentConfig.weeklyKm)
  const [runsPerWeek,   setRunsPerWeek]   = useState<number | null>(currentConfig.runsPerWeek)
  const [strengthDays,  setStrengthDays]  = useState<number | null>(currentConfig.strengthDays)
  const [equipmentType, setEquipmentType] = useState<EquipmentType | null>(currentConfig.equipmentType)

  const [confirming, setConfirming] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const maxWeeks   = Math.min(27, weeksUntilRace(raceDate))
  const displayMax = totalSteps(strengthDays)
  const isLastStep = step === displayMax || (step === 6 && strengthDays === 0)

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !saving) onClose()
  }, [onClose, saving])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Clamp planWeeks if raceDate changes
  useEffect(() => {
    if (raceDate) setPlanWeeks((w) => Math.max(12, Math.min(maxWeeks, w)))
  }, [raceDate, maxWeeks])

  // ── Navigation ──────────────────────────────────────────────────────────────

  function nextStep() {
    setError(null)
    if (step === 1 && !raceDate)           { setError('Please pick a race date.');     return }
    if (step === 5 && !runsPerWeek)        { setError('Please choose runs per week.'); return }
    if (step === 6 && strengthDays === null){ setError('Please choose a number.');     return }
    // Step 6 with 0 strength → skip equipment, go to confirm
    if (step === 6 && strengthDays === 0)  { setConfirming(true); return }
    if (step === displayMax)               { setConfirming(true); return }
    setStep((s) => s + 1)
  }

  function prevStep() {
    setError(null)
    setStep((s) => Math.max(1, s - 1))
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
          goalSeconds:   goalSecs,
          weeklyKm,
          runsPerWeek:   runsPerWeek   ?? 4,
          strengthDays:  strengthDays  ?? 0,
          equipmentType: equipmentType ?? 'bodyweight',
          planWeeks,
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
    background:   '#EDE9DE',
    border:       '1px solid rgba(43,49,23,0.08)',
    borderRadius: '12px',
    padding:      '20px',
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(30,22,17,0.50)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: '#F5F3EC' }}
      >
        <div className="p-6">

          {/* ── Confirmation screen ──────────────────────────────────────────── */}
          {confirming ? (
            <div>
              <div className="text-center mb-6">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl mx-auto mb-4"
                  style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
                >
                  ✏️
                </div>
                <h2
                  className="text-xl mb-2"
                  style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: '#1E1611' }}
                >
                  Update your plan?
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: '#736554' }}>
                  Your plan will be recalculated with the new settings. All your Strava runs and completed weeks stay exactly as they are — only future sessions will change.
                </p>
              </div>

              {error && (
                <div
                  className="mb-4 rounded-lg px-4 py-3 text-sm"
                  style={{ background: 'rgba(238,107,23,0.10)', border: '1px solid rgba(238,107,23,0.25)', color: '#EE6B17' }}
                >
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full py-3 rounded-lg text-sm font-bold text-white disabled:opacity-60 transition-opacity"
                  style={{ background: '#EE6B17' }}
                >
                  {saving ? 'Updating plan…' : 'Yes, update my plan →'}
                </button>
                <button
                  onClick={() => { setConfirming(false); setError(null) }}
                  disabled={saving}
                  className="w-full py-3 rounded-lg text-sm font-semibold transition-colors"
                  style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.10)', color: '#4A5427' }}
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
                    style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: '#1E1611' }}
                  >
                    Edit goal
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: '#736554' }}>Update your plan settings</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: '#A09880', background: '#EDE9DE' }}
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
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>
                    When is your marathon?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: '#736554' }}>
                    The plan works backwards from your race date.
                  </p>
                  <input
                    type="date" min={minDate()} value={raceDate}
                    onChange={(e) => { setRaceDate(e.target.value); setError(null) }}
                    className="w-full px-4 py-3 rounded-lg text-sm font-medium outline-none"
                    style={{ background: '#F5F3EC', border: '1px solid rgba(43,49,23,0.12)', color: '#1E1611', fontFamily: 'Nohemi, Inter, sans-serif' }}
                  />
                </div>
              )}

              {/* ── Step 2: Plan duration ── */}
              {step === 2 && (
                <div style={card}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 2 of {displayMax}</p>
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>
                    How many weeks do you want to train?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: '#736554' }}>
                    {maxWeeks >= 27
                      ? 'A full 27-week plan is available. Shorter options build all the same phases, just more compressed.'
                      : `Your race is ${maxWeeks} weeks away — that's your maximum. 12 weeks is the minimum.`}
                  </p>
                  <div className="text-center mb-4">
                    <span
                      className="text-5xl tabular-nums"
                      style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.04em', color: '#EE6B17' }}
                    >
                      {planWeeks}
                    </span>
                    <span className="text-lg ml-1.5" style={{ color: '#736554' }}>weeks</span>
                  </div>
                  <input
                    type="range" min={12} max={maxWeeks} step={1} value={planWeeks}
                    onChange={(e) => setPlanWeeks(Number(e.target.value))}
                    className="w-full accent-orange-500 mb-4"
                  />
                  <div className="flex justify-between text-xs" style={{ color: '#A09880' }}>
                    <span>12 wk</span>
                    <span>{maxWeeks} wk</span>
                  </div>
                  <div className="mt-4 px-3 py-2.5 rounded-lg text-xs leading-relaxed" style={{ background: 'rgba(238,107,23,0.08)', color: '#736554' }}>
                    {planWeeks <= 14 && 'Short block — Base + Build + combined Peak/Sharpen + 2-week taper.'}
                    {planWeeks > 14 && planWeeks <= 20 && 'Moderate plan — all 5 phases compressed. Good balance of build-up and recovery.'}
                    {planWeeks > 20 && planWeeks < 27 && 'Full plan structure with a bit less volume in the middle phases. Solid preparation.'}
                    {planWeeks === 27 && 'Full 27-week plan — the gold standard. Maximum time to build aerobic base and peak properly.'}
                  </div>
                </div>
              )}

              {/* ── Step 3: Goal time ── */}
              {step === 3 && (
                <div style={card}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 3 of {displayMax}</p>
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>
                    What's your goal time?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: '#736554' }}>
                    Your target affects the paces in every training session.
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

              {/* ── Step 4: Weekly km ── */}
              {step === 4 && (
                <div style={card}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 4 of {displayMax}</p>
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>
                    How much are you running per week now?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: '#736554' }}>
                    Week 1 of your plan starts here — volume builds from this point.
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
                    type="range" min={10} max={100} step={5} value={weeklyKm}
                    onChange={(e) => setWeeklyKm(Number(e.target.value))}
                    className="w-full accent-orange-500 mb-4"
                  />
                  <div className="flex justify-between text-xs" style={{ color: '#A09880' }}>
                    <span>10 km</span><span>100 km</span>
                  </div>
                  <div className="mt-4 px-3 py-2.5 rounded-lg text-xs leading-relaxed" style={{ background: 'rgba(238,107,23,0.08)', color: '#736554' }}>
                    {weeklyKm < 30  && 'Good starting point — the plan builds safely from week 1 at your current load.'}
                    {weeklyKm >= 30 && weeklyKm < 50 && 'Solid base. The plan will push your volume through the build and peak phases.'}
                    {weeklyKm >= 50 && weeklyKm < 70 && "Strong base. You're well-placed to hit the peak training weeks comfortably."}
                    {weeklyKm >= 70 && 'High volume athlete. Make recovery a priority.'}
                  </div>
                </div>
              )}

              {/* ── Step 5: Runs per week ── */}
              {step === 5 && (
                <div style={card}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 5 of {displayMax}</p>
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>
                    How many days a week can you run?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: '#736554' }}>
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
                    <div className="mt-4 px-3 py-2.5 rounded-lg text-xs leading-relaxed" style={{ background: 'rgba(238,107,23,0.08)', color: '#736554' }}>
                      {runsPerWeek === 3 && '3 focused sessions with good recovery. Perfect alongside strength training or if managing injury risk.'}
                      {runsPerWeek === 4 && 'The sweet spot for most marathon runners — enough volume without burning out.'}
                      {runsPerWeek === 5 && 'High frequency. The extra Wednesday easy run adds meaningful aerobic base. Prioritise recovery.'}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 6: Strength days ── */}
              {step === 6 && (
                <div style={card}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 6 of {displayMax}</p>
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>
                    Strength training sessions?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: '#736554' }}>
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
                    <div className="mt-4 px-3 py-2.5 rounded-lg text-xs leading-relaxed" style={{ background: 'rgba(238,107,23,0.08)', color: '#736554' }}>
                      Sessions sit on rest days for maximum recovery. 25–45 min per session, adapted per phase.
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 7: Equipment (only if strength > 0) ── */}
              {step === 7 && (
                <div style={card}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 7 of {displayMax}</p>
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>
                    What equipment do you have?
                  </h3>
                  <p className="text-sm mb-4" style={{ color: '#736554' }}>
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
                    <div className="mt-4 px-3 py-2.5 rounded-lg text-xs leading-relaxed" style={{ background: 'rgba(238,107,23,0.08)', color: '#736554' }}>
                      {equipmentType === 'bodyweight' && 'Glutes, single-leg stability, and core — the stuff that keeps runners injury free.'}
                      {equipmentType === 'gym'        && 'Compound lifts (squats, deadlifts, hip thrusts) that build real running strength.'}
                      {equipmentType === 'both'       && 'Gym weeks and bodyweight weeks alternate, keeping variety without overloading any one stimulus.'}
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div
                  className="mt-3 rounded-lg px-4 py-3 text-sm"
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
                    className="px-5 py-3 rounded-lg text-sm font-semibold"
                    style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.10)', color: '#4A5427' }}
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={nextStep}
                  className="flex-1 py-3 rounded-lg text-sm font-bold text-white"
                  style={{ background: '#EE6B17' }}
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
