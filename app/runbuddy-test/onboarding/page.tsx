'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { EquipmentType } from '@/lib/plan-generator'

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

function minDate(): string {
  const d = new Date(); d.setDate(d.getDate() + 28); return d.toISOString().slice(0, 10)
}

function weeksUntilRace(raceDate: string): number {
  if (!raceDate) return 27
  return Math.floor((new Date(raceDate + 'T12:00:00Z').getTime() - Date.now()) / (7 * 86_400_000))
}

function totalSteps(strengthDays: number | null): number {
  return (strengthDays ?? 1) > 0 ? 7 : 6
}

const card = {
  background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)',
  borderRadius: '20px', padding: '20px',
}

export default function RunBuddyTestOnboarding() {
  const router = useRouter()

  const [step,          setStep]          = useState(1)
  const [raceDate,      setRaceDate]      = useState('')
  const [planWeeks,     setPlanWeeks]     = useState(27)
  const [goalSecs,      setGoalSecs]      = useState<number | null>(null)
  const [weeklyKm,      setWeeklyKm]      = useState(40)
  const [runsPerWeek,   setRunsPerWeek]   = useState<number | null>(null)
  const [strengthDays,  setStrengthDays]  = useState<number | null>(null)
  const [equipmentType, setEquipmentType] = useState<EquipmentType | null>(null)
  const [error,         setError]         = useState<string | null>(null)

  const maxWeeks   = Math.min(27, weeksUntilRace(raceDate))
  const displayMax = totalSteps(strengthDays)

  useEffect(() => {
    if (raceDate) setPlanWeeks((w) => Math.max(12, Math.min(maxWeeks, w)))
  }, [raceDate, maxWeeks])

  function nextStep() {
    setError(null)
    if (step === 1 && !raceDate)            { setError('Please pick a race date.');     return }
    if (step === 5 && !runsPerWeek)         { setError('Please choose runs per week.'); return }
    if (step === 6 && strengthDays === null){ setError('Please choose a number.');      return }
    if (step === 6 && strengthDays === 0)   { save(); return }
    if (step === displayMax)                { save(); return }
    setStep((s) => s + 1)
  }

  function save() {
    sessionStorage.setItem('runbuddy-test-config', JSON.stringify({
      raceDate,
      goalSeconds:   goalSecs,
      weeklyKm,
      runsPerWeek:   runsPerWeek   ?? 4,
      strengthDays:  strengthDays  ?? 0,
      equipmentType: equipmentType ?? 'bodyweight',
      planWeeks,
    }))
    router.push('/runbuddy-test/plan')
  }

  function OptionBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button
        onClick={onClick}
        className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
        style={active ? { background: '#EE6B17', color: '#fff' } : { background: '#F5F3EC', border: '1px solid rgba(43,49,23,0.10)', color: '#1E1611' }}
      >
        <span>{children}</span>
        {active && <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
      </button>
    )
  }

  const isLastStep = step === displayMax || (step === 6 && strengthDays === 0)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: '#F5F3EC' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4" style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}>⏱</div>
          <h1 className="text-2xl mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: '#1E1611' }}>Set up your plan</h1>
          <p className="text-sm mb-2" style={{ color: '#736554' }}>A few quick questions — 60 seconds</p>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: 'rgba(238,107,23,0.12)', color: '#EE6B17' }}>Test preview — no data saved</span>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {Array.from({ length: displayMax }, (_, i) => i + 1).map((n) => (
            <div key={n} className="rounded-full transition-all" style={{ width: step === n ? '24px' : '8px', height: '8px', background: step >= n ? '#EE6B17' : 'rgba(43,49,23,0.12)' }} />
          ))}
        </div>

        {/* Step 1 – Race date */}
        {step === 1 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 1 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>When is your marathon?</h2>
            <p className="text-sm mb-5" style={{ color: '#736554' }}>Pick your race date — the plan works backwards from there.</p>
            <input type="date" min={minDate()} value={raceDate} onChange={(e) => { setRaceDate(e.target.value); setError(null) }}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
              style={{ background: '#F5F3EC', border: '1px solid rgba(43,49,23,0.12)', color: '#1E1611', fontFamily: 'Nohemi, Inter, sans-serif' }} />
          </div>
        )}

        {/* Step 2 – Plan duration */}
        {step === 2 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 2 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>How many weeks do you want to train?</h2>
            <p className="text-sm mb-5" style={{ color: '#736554' }}>
              {maxWeeks >= 27 ? 'A full 27-week plan is available.' : `Your race is ${maxWeeks} weeks away — that's your maximum. 12 is the minimum.`}
            </p>
            <div className="text-center mb-4">
              <span className="text-5xl tabular-nums" style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.04em', color: '#EE6B17' }}>{planWeeks}</span>
              <span className="text-lg ml-1.5" style={{ color: '#736554' }}>weeks</span>
            </div>
            <input type="range" min={12} max={maxWeeks} step={1} value={planWeeks} onChange={(e) => setPlanWeeks(Number(e.target.value))} className="w-full accent-orange-500 mb-4" />
            <div className="flex justify-between text-xs" style={{ color: '#A09880' }}><span>12 wk</span><span>{maxWeeks} wk</span></div>
            <div className="mt-4 px-3 py-2.5 rounded-xl text-xs leading-relaxed" style={{ background: 'rgba(238,107,23,0.08)', color: '#736554' }}>
              {planWeeks <= 14 && 'Short block — Base + Build + combined Peak/Sharpen + 2-week taper.'}
              {planWeeks > 14 && planWeeks <= 20 && 'Moderate plan — all 5 phases compressed.'}
              {planWeeks > 20 && planWeeks < 27 && 'Full plan structure, a bit more compressed in the middle phases.'}
              {planWeeks === 27 && 'Full 27-week plan — maximum time to build aerobic base and peak properly.'}
            </div>
          </div>
        )}

        {/* Step 3 – Goal time */}
        {step === 3 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 3 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>What's your goal time?</h2>
            <p className="text-sm mb-5" style={{ color: '#736554' }}>Your target affects the paces in every single training session.</p>
            <div className="flex flex-col gap-2">
              {GOAL_PRESETS.map((p) => <OptionBtn key={p.seconds} active={goalSecs === p.seconds} onClick={() => { setGoalSecs(p.seconds); setError(null) }}>{p.label}</OptionBtn>)}
            </div>
          </div>
        )}

        {/* Step 4 – Weekly km */}
        {step === 4 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 4 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>How much do you run per week now?</h2>
            <p className="text-sm mb-5" style={{ color: '#736554' }}>Week 1 starts here — the plan builds from this point.</p>
            <div className="text-center mb-4">
              <span className="text-5xl tabular-nums" style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.04em', color: '#EE6B17' }}>{weeklyKm}</span>
              <span className="text-lg ml-1.5" style={{ color: '#736554' }}>km/week</span>
            </div>
            <input type="range" min={10} max={100} step={5} value={weeklyKm} onChange={(e) => setWeeklyKm(Number(e.target.value))} className="w-full accent-orange-500 mb-4" />
            <div className="flex justify-between text-xs" style={{ color: '#A09880' }}><span>10 km</span><span>100 km</span></div>
            <div className="mt-4 px-3 py-2.5 rounded-xl text-xs leading-relaxed" style={{ background: 'rgba(238,107,23,0.08)', color: '#736554' }}>
              {weeklyKm < 30  && 'Good starting point — the plan builds safely from week 1 at your current load.'}
              {weeklyKm >= 30 && weeklyKm < 50 && 'Solid base. The plan will push your volume through the build and peak phases.'}
              {weeklyKm >= 50 && weeklyKm < 70 && "Strong base. You're well-placed to hit the peak training weeks comfortably."}
              {weeklyKm >= 70 && 'High volume athlete. The plan peaks at elite loads — make recovery a priority.'}
            </div>
          </div>
        )}

        {/* Step 5 – Runs per week */}
        {step === 5 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 5 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>How many days a week can you run?</h2>
            <p className="text-sm mb-5" style={{ color: '#736554' }}>This shapes the structure of every training week.</p>
            <div className="flex flex-col gap-2">
              <OptionBtn active={runsPerWeek === 3} onClick={() => { setRunsPerWeek(3); setError(null) }}>3 days — Tue · Thu · Sun (+ optional Sat from week 7)</OptionBtn>
              <OptionBtn active={runsPerWeek === 4} onClick={() => { setRunsPerWeek(4); setError(null) }}>4 days — Tue · Thu · Sat · Sun</OptionBtn>
              <OptionBtn active={runsPerWeek === 5} onClick={() => { setRunsPerWeek(5); setError(null) }}>5 days — Tue · Wed · Thu · Sat · Sun</OptionBtn>
            </div>
          </div>
        )}

        {/* Step 6 – Strength days */}
        {step === 6 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 6 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>Strength training sessions?</h2>
            <p className="text-sm mb-5" style={{ color: '#736554' }}>Strength work prevents injury and improves running economy.</p>
            <div className="flex flex-col gap-2">
              <OptionBtn active={strengthDays === 0} onClick={() => { setStrengthDays(0); setEquipmentType('bodyweight'); setError(null) }}>0 — no strength training</OptionBtn>
              <OptionBtn active={strengthDays === 1} onClick={() => { setStrengthDays(1); setError(null) }}>1 day — Monday</OptionBtn>
              <OptionBtn active={strengthDays === 2} onClick={() => { setStrengthDays(2); setError(null) }}>2 days — Mon + {runsPerWeek === 5 ? 'Fri' : 'Wed'}</OptionBtn>
            </div>
          </div>
        )}

        {/* Step 7 – Equipment */}
        {step === 7 && (
          <div style={card}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#A09880' }}>Step 7 of {displayMax}</p>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>What equipment do you have?</h2>
            <p className="text-sm mb-5" style={{ color: '#736554' }}>This shapes the exercises in your strength sessions.</p>
            <div className="flex flex-col gap-2">
              <OptionBtn active={equipmentType === 'bodyweight'} onClick={() => { setEquipmentType('bodyweight'); setError(null) }}>Bodyweight — no equipment needed</OptionBtn>
              <OptionBtn active={equipmentType === 'gym'} onClick={() => { setEquipmentType('gym'); setError(null) }}>Gym — barbells, machines, cables</OptionBtn>
              <OptionBtn active={equipmentType === 'both'} onClick={() => { setEquipmentType('both'); setError(null) }}>Both — alternate gym and bodyweight weeks</OptionBtn>
            </div>
            {equipmentType && (
              <div className="mt-4 px-3 py-2.5 rounded-xl text-xs leading-relaxed" style={{ background: 'rgba(238,107,23,0.08)', color: '#736554' }}>
                {equipmentType === 'bodyweight' && 'Glutes, single-leg stability, and core — keeps runners injury free.'}
                {equipmentType === 'gym' && 'Compound lifts (squats, deadlifts, hip thrusts) that build real running strength.'}
                {equipmentType === 'both' && 'Gym and bodyweight weeks alternate — variety without overloading any stimulus.'}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(238,107,23,0.10)', border: '1px solid rgba(238,107,23,0.25)', color: '#EE6B17' }}>{error}</div>
        )}

        <div className={`flex mt-4 gap-3 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
          {step > 1 && (
            <button onClick={() => { setError(null); setStep((s) => Math.max(1, s - 1)) }} className="px-5 py-3 rounded-xl text-sm font-semibold" style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.10)', color: '#4A5427' }}>Back</button>
          )}
          <button onClick={nextStep} className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#EE6B17' }}>
            {isLastStep ? 'Build my plan →' : 'Continue →'}
          </button>
        </div>
      </div>
    </main>
  )
}
