import { Week, PlannedRun, Phase, RunType, WorkoutCategory, RaceType } from '@/types'

// ─── Config ───────────────────────────────────────────────────────────────────

export type EquipmentType = 'bodyweight' | 'gym' | 'both'
export type { RaceType }

export interface UserPlanConfig {
  raceDate:         string        // YYYY-MM-DD
  goalSeconds:      number        // e.g. 12600 for 3:30:00
  weeklyKm:         number        // current weekly running load
  runsPerWeek:      number        // 3, 4, or 5
  strengthDays:     number        // 0, 1, or 2
  equipmentType:    EquipmentType // 'bodyweight' | 'gym' | 'both'
  planWeeks:        number        // 6–30
  raceType?:        RaceType      // '5k'|'10k'|'half'|'marathon'|'ultra' (default: 'marathon')
  injuryNotes?:     string        // free text, e.g. "knee pain, no hills"
  unavailableDays?: number[]      // 0=Sun…6=Sat days user cannot train
}

// ─── Race-type constants ──────────────────────────────────────────────────────

/** Race distance in km for each type */
export const RACE_DISTANCE_KM: Record<RaceType, number> = {
  '5k':      5,
  '10k':     10,
  'half':    21.0975,
  'marathon':42.195,
  'ultra':   50,   // representative; plans use time not distance
}

/** Friendly display label */
export const RACE_TYPE_LABELS: Record<RaceType, string> = {
  '5k':      '5K',
  '10k':     '10K',
  'half':    'Half Marathon',
  'marathon':'Marathon',
  'ultra':   'Ultra Marathon',
}

/** Short pace label shown in the UI (e.g. "MP", "HMP", "5K pace") */
export const RACE_PACE_LABEL: Record<RaceType, string> = {
  '5k':      '5K pace',
  '10k':     '10K pace',
  'half':    'HMP',
  'marathon':'MP',
  'ultra':   'Easy',
}

/** Min/max plan weeks per race type */
export const PLAN_WEEKS_RANGE: Record<RaceType, { min: number; max: number }> = {
  '5k':      { min: 6,  max: 10 },
  '10k':     { min: 8,  max: 12 },
  'half':    { min: 10, max: 16 },
  'marathon':{ min: 12, max: 27 },
  'ultra':   { min: 20, max: 30 },
}

/** Max long run km per race type */
export const LONG_RUN_MAX: Record<RaceType, number> = {
  '5k':      16,
  '10k':     18,
  'half':    22,
  'marathon':35,
  'ultra':   999, // time-capped, not distance-capped
}

// ─── Paces ────────────────────────────────────────────────────────────────────

export interface PlanPaces {
  mp:        number
  threshold: number
  interval:  number
  easy:      number
  hill:      number
}

/** Calculate training paces from goal time and race type.
 *  Returns all values as decimal min/km (0 = "not applicable"). */
export function calcPaces(goalSeconds: number, raceType: RaceType = 'marathon'): PlanPaces {
  const r = (v: number) => Math.round(v * 100) / 100

  switch (raceType) {
    case '5k': {
      const p = goalSeconds / 5 / 60
      return { mp: r(p), threshold: r(p * 1.06), interval: r(p * 0.95), easy: r(p + 1.5), hill: r(p * 1.05) }
    }
    case '10k': {
      const p = goalSeconds / 10 / 60
      return { mp: r(p), threshold: r(p * 1.05), interval: r(p * 0.92), easy: r(p + 1.3), hill: r(p * 1.04) }
    }
    case 'half': {
      const p = goalSeconds / 21.0975 / 60
      return { mp: r(p), threshold: r(p * 1.04), interval: r(p * 0.90), easy: r(p + 1.2), hill: r(p * 1.03) }
    }
    case 'marathon': {
      const mp = goalSeconds / 42.195 / 60
      return { mp: r(mp), threshold: r(mp * 0.92), interval: r(mp * 0.85), easy: r(mp + 1.20), hill: r(mp * 0.93) }
    }
    case 'ultra': {
      // Ultra plans use time on feet — no strict pace targets
      return { mp: 0, threshold: 0, interval: 0, easy: 0, hill: 0 }
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const DOW = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

function dowLabel(dateStr: string): string {
  const idx = new Date(dateStr + 'T12:00:00Z').getUTCDay()
  return DOW[idx === 0 ? 6 : idx - 1]
}

function fmtPace(p: number): string {
  const m = Math.floor(p)
  const s = Math.round((p - m) * 60)
  return `${m}:${String(s).padStart(2,'0')}/km`
}

function mkRun(
  wk: number, phase: Phase, date: string,
  type: RunType, km: number, pace: number | undefined,
  desc: string, optional = false,
): PlannedRun {
  return {
    weekNumber: wk, phase, date,
    dayOfWeek:  dowLabel(date),
    type, targetDistanceKm: km,
    targetPaceMinPerKm: pace,
    description: desc,
    isOptional: optional || undefined,
  }
}

// ─── Phase allocation ─────────────────────────────────────────────────────────

interface PhaseBlock { phase: Phase; weeks: number }

/** Phase proportions per race type (base / build / peak ratios of non-taper weeks) */
const PHASE_RATIOS: Record<RaceType, { base: number; build: number; peak: number }> = {
  '5k':      { base: 0.20, build: 0.35, peak: 0.45 },
  '10k':     { base: 0.20, build: 0.35, peak: 0.45 },
  'half':    { base: 0.25, build: 0.45, peak: 0.30 },
  'marathon':{ base: 0.26, build: 0.35, peak: 0.39 }, // peak+sharpen combined
  'ultra':   { base: 0.25, build: 0.45, peak: 0.30 },
}

export function calcPhases(planWeeks: number, raceType: RaceType = 'marathon'): PhaseBlock[] {
  // Taper length: 1 wk for short (≤10), 2 for medium, 3 for 20+
  const taper     = planWeeks >= 20 ? 3 : planWeeks <= 10 ? 1 : 2
  const remaining = planWeeks - taper
  const r         = PHASE_RATIOS[raceType]

  // Short plans (≤ 12 wk for marathon, ≤ 10 for others): 3 phases only
  const shortThreshold = raceType === 'marathon' ? 16 : 12
  if (planWeeks <= shortThreshold) {
    const base  = Math.max(2, Math.round(remaining * r.base))
    const build = Math.max(2, Math.round(remaining * r.build))
    const peak  = Math.max(1, remaining - base - build)
    return [
      { phase: 'base',  weeks: base  },
      { phase: 'build', weeks: build },
      { phase: 'peak',  weeks: peak  },
      { phase: 'taper', weeks: taper },
    ]
  }

  // Longer plans: add sharpen sub-phase for marathon (familiar structure)
  if (raceType === 'marathon') {
    const base    = Math.max(4, Math.round(remaining * 0.26))
    const build   = Math.max(4, Math.round(remaining * 0.35))
    const peak    = Math.max(2, Math.round(remaining * 0.24))
    const sharpen = Math.max(1, remaining - base - build - peak)
    return [
      { phase: 'base',    weeks: base    },
      { phase: 'build',   weeks: build   },
      { phase: 'peak',    weeks: peak    },
      { phase: 'sharpen', weeks: sharpen },
      { phase: 'taper',   weeks: taper   },
    ]
  }

  // Other distances: 3 phases
  const base  = Math.max(2, Math.round(remaining * r.base))
  const build = Math.max(2, Math.round(remaining * r.build))
  const peak  = Math.max(1, remaining - base - build)
  return [
    { phase: 'base',  weeks: base  },
    { phase: 'build', weeks: build },
    { phase: 'peak',  weeks: peak  },
    { phase: 'taper', weeks: taper },
  ]
}

// ─── Volume progression ───────────────────────────────────────────────────────
// Enforces 10% rule from Week 1 (week 1 = user's current weeklyKm).
// Each non-cutback week grows ≤9% from the previous non-cutback week.
// Cutback weeks drop to 75% of the last peak, then the next week resumes from that peak.

function buildVolumes(weeklyKm: number, phases: PhaseBlock[]): number[] {
  // Cap peak volume at 2× starting base, ceiling 80 km/week.
  // weeklyKm * 3 (the old formula) let amateurs reach 90–100 km, which is semi-elite.
  const MAX      = Math.min(80, Math.max(40, weeklyKm * 2))
  const cap      = (v: number) => Math.max(10, Math.min(MAX, Math.round(v)))
  const grow     = (from: number) => cap(from * 1.09)
  const cutbackV = (peak: number) => Math.max(weeklyKm, Math.round(peak * 0.75))

  const totalWeeks = phases.reduce((s, p) => s + p.weeks, 0)
  const v: number[] = new Array(totalWeeks).fill(0)
  let wi          = 0
  let lastPeak    = weeklyKm
  let prevCutback = false

  for (const block of phases) {
    // ── Taper: percentage drop off final peak ────────────────────────────────
    if (block.phase === 'taper') {
      const peak = Math.max(lastPeak, ...v.slice(0, wi).filter(Boolean))
      if (block.weeks >= 3) {
        v[wi] = Math.round(peak * 0.75); v[wi+1] = Math.round(peak * 0.60); v[wi+2] = Math.round(peak * 0.40)
      } else {
        v[wi] = Math.round(peak * 0.60); v[wi+1] = Math.round(peak * 0.40)
      }
      wi += block.weeks
      continue
    }

    // ── Cutback position within this block ───────────────────────────────────
    let cutbackAt: number
    if      (block.phase === 'base')    cutbackAt = block.weeks - 1
    else if (block.phase === 'build')   cutbackAt = Math.round(block.weeks * 0.55)
    else if (block.phase === 'peak')    cutbackAt = block.weeks >= 4 ? Math.round(block.weeks * 0.6) : -1
    else                                cutbackAt = block.weeks - 1  // sharpen

    for (let j = 0; j < block.weeks; j++) {
      if (wi === 0) {
        // Week 1 always starts at the user's current weeklyKm
        v[wi] = weeklyKm; lastPeak = weeklyKm; prevCutback = false
      } else if (j === cutbackAt) {
        v[wi] = cutbackV(lastPeak); prevCutback = true
      } else if (prevCutback) {
        // Week after cutback: restart from lastPeak (not the lower cutback value)
        v[wi] = grow(lastPeak)
        if (v[wi] > lastPeak) lastPeak = v[wi]
        prevCutback = false
      } else {
        v[wi] = grow(v[wi - 1])
        if (v[wi] > lastPeak) lastPeak = v[wi]
      }
      wi++
    }
  }

  return v
}

// ─── Week template generation ─────────────────────────────────────────────────

type QKey =
  | 'none' | 'progression' | 'hills' | 'tempo'
  | 'fartlek' | 'mp' | 'race_sim' | 'tune_up' | 'dress_rehearsal'

type LongStyle = 'easy' | 'mp_finish'

interface WeekTmpl {
  phase:      Phase
  isCutback:  boolean
  quality:    QKey
  longStyle?: LongStyle
  title:      string
  notes:      string
}

const BASE_TITLES = [
  'Establish the Rhythm',
  'First Step Up',
  'Steady Base',
  'Aerobic Engine',
  'Final Base Push',
  'Cutback Week',
]
const BASE_NOTES = [
  "First week of the plan. Establish the rhythm — all runs fully conversational. If you can't hold a conversation, slow down.",
  "10% rule in action — a small step up. Keep HR under 145 bpm throughout. Aerobic development happens even when it feels easy.",
  "Steady base building. Focus on feel, not pace. The long run is your weekend anchor.",
  "Aerobic engine building. Every run should feel sustainable for hours. No ego in base phase.",
  "Final push of the base block — still fully aerobic. Time on feet is the goal.",
  "Cutback week. Reduce volume by ~25%. Recovery is where adaptation happens.",
]

const BUILD_TITLES = [
  'Volume Returns',
  'Fuelling Practice',
  'Long Run Grows',
  'Time on Feet',
  'Peak Endurance',
  'Cutback Week',
  'Fresh Legs',
  'Bridge Week',
]
const BUILD_NOTES = [
  "Volume returns. Thursday introduces a controlled progression finish — stay well within yourself.",
  "Volume ticks up. Practise fuelling every 40 min on the long run — this is a skill that needs training.",
  "Long run getting serious. Aerobic base from the base phase is now paying dividends.",
  "Building time on feet. The long run should feel comfortably challenging — not a struggle.",
  "Biggest endurance week so far. Sleep and eat well — recovery is training too.",
  "Cutback — absorb the endurance work. Short and easy, no exceptions.",
  "Volume returns; legs feel fresh from the cutback.",
  "Bridge week into the next phase. Endurance fitness is peaking.",
]

const PEAK_TITLES = [
  'Hill Work',
  'First Tempo',
  'Fartlek Session',
  'Hill Repeats',
  'Quality Cutback',
  'Race Simulation',
]
const PEAK_NOTES = [
  "Hill work begins. Strong legs mean better form and resilience in the late miles. Uphill fast, downhill easy.",
  "First tempo run. Comfortably hard — short phrases only, not free conversation. Builds lactate threshold.",
  "Fartlek — unstructured speed within an easy run. Pick landmarks, accelerate, recover. Builds speed variety.",
  "Hill repeats again. You should feel noticeably stronger than the first time. Form is everything.",
  "Cutback with a shorter tempo. Consolidate the strength gains. Quality over quantity this week.",
  "Race simulation — the most demanding session of the plan. This week proves you are ready.",
]

const SHARPEN_TITLES = [
  'Race Prep Begins',
  'Stay Sharp',
  'Tune-Up Race',
  'Back on Track',
  'Last Big Session',
]
const SHARPEN_NOTES = [
  "Race preparation begins. Long runs now include sustained marathon-pace sections. Your body learns what race day demands.",
  "Tune-up race preparation. Stay sharp, nail the goal-pace section of the long run.",
  "Tune-up race week! Run a half marathon — first 16 km at goal pace, pick it up in the final 5K.",
  "Back to training after the tune-up race. Marathon-specific fitness is peaking. Every run has a purpose.",
  "Last major quality session before the taper. Run it well — the hay is almost in the barn.",
]

const TAPER_TITLES = [
  'Taper Begins',
  'Getting Sharp',
  'Race Week',
]
const TAPER_NOTES = [
  "Taper begins. Volume drops sharply. One dress-rehearsal session. Do not add extra miles. Trust the process.",
  "Volume drops again. Short and sharp — one quality session, the rest easy. Legs start feeling bouncy. That's the taper working.",
  "Race week. Three short easy runs, then go get it. Hydrate now. Eat breakfast 2 hours before the start. You are ready.",
]

function buildWeekTemplates(phases: PhaseBlock[]): WeekTmpl[] {
  const tmpls: WeekTmpl[] = []

  for (const block of phases) {
    const { phase, weeks } = block

    switch (phase) {
      case 'base': {
        const cutbackAt = weeks - 1
        for (let i = 0; i < weeks; i++) {
          const isCutback = i === cutbackAt
          tmpls.push({
            phase: 'base', isCutback, quality: 'none',
            title: isCutback ? BASE_TITLES[5] : BASE_TITLES[Math.min(i, 4)],
            notes: isCutback ? BASE_NOTES[5]  : BASE_NOTES[Math.min(i, 4)],
          })
        }
        break
      }

      case 'build': {
        const cutbackAt = Math.round(weeks * 0.55)
        let noteIdx = 0
        for (let i = 0; i < weeks; i++) {
          const isCutback = i === cutbackAt
          tmpls.push({
            phase: 'build', isCutback, quality: 'progression',
            title: isCutback ? BUILD_TITLES[5] : BUILD_TITLES[Math.min(noteIdx, 4)],
            notes: isCutback ? BUILD_NOTES[5]  : BUILD_NOTES[Math.min(noteIdx++, 4)],
          })
          if (isCutback) noteIdx-- // don't advance note on cutback
        }
        break
      }

      case 'peak': {
        const cutbackAt      = weeks >= 4 ? Math.round(weeks * 0.6) : -1
        const qualityCycle: QKey[] = ['hills','tempo','fartlek','hills','tempo','fartlek']
        let noteIdx = 0
        for (let i = 0; i < weeks; i++) {
          const isLast    = i === weeks - 1
          const isCutback = i === cutbackAt
          let quality: QKey
          let longStyle: LongStyle | undefined
          if (isLast) {
            quality = 'race_sim'; longStyle = 'mp_finish'
          } else if (isCutback) {
            quality = 'tempo'
          } else {
            quality = qualityCycle[i % qualityCycle.length]
            if (i >= weeks - 3) longStyle = 'mp_finish'
          }
          tmpls.push({
            phase: 'peak', isCutback, quality, longStyle,
            title: isLast ? PEAK_TITLES[5] : isCutback ? PEAK_TITLES[4] : PEAK_TITLES[Math.min(noteIdx, 3)],
            notes: isLast ? PEAK_NOTES[5]  : isCutback ? PEAK_NOTES[4]  : PEAK_NOTES[Math.min(noteIdx++, 3)],
          })
          if (isCutback) noteIdx--
        }
        break
      }

      case 'sharpen': {
        const tuneUpAt  = weeks >= 3 ? Math.floor(weeks / 2) : -1
        for (let i = 0; i < weeks; i++) {
          const isCutback = i === weeks - 1
          let quality: QKey
          let longStyle: LongStyle | undefined
          if (i === tuneUpAt) {
            quality = 'tune_up'
          } else if (isCutback) {
            quality = 'tempo'
          } else {
            quality = i % 2 === 0 ? 'mp' : 'tempo'
            longStyle = 'mp_finish'
          }
          tmpls.push({
            phase: 'sharpen', isCutback, quality, longStyle,
            title: SHARPEN_TITLES[Math.min(i, SHARPEN_TITLES.length - 1)],
            notes: SHARPEN_NOTES[Math.min(i, SHARPEN_NOTES.length - 1)],
          })
        }
        break
      }

      case 'taper': {
        // 2-week taper: dress_rehearsal → race
        // 3-week taper: dress_rehearsal → mp → race
        const qualities: QKey[] = weeks >= 3
          ? ['dress_rehearsal', 'mp', 'none']
          : ['dress_rehearsal', 'none']
        const noteOffset = weeks < 3 ? 1 : 0  // skip first taper note for 2-week
        for (let i = 0; i < weeks; i++) {
          const isRaceWeek = i === weeks - 1
          tmpls.push({
            phase: 'taper',
            isCutback: !isRaceWeek,
            quality: qualities[Math.min(i, qualities.length - 1)],
            title:   TAPER_TITLES[Math.min(i + noteOffset, TAPER_TITLES.length - 1)],
            notes:   TAPER_NOTES[Math.min(i + noteOffset, TAPER_NOTES.length - 1)],
          })
        }
        break
      }
    }
  }

  return tmpls
}

// ─── Strength sessions ────────────────────────────────────────────────────────

const STRENGTH: Record<Phase, Record<'bw' | 'gym', { duration: number; exercises: string[] }>> = {
  base: {
    bw: {
      duration: 25,
      exercises: [
        'Glute Bridge — 3×15',
        'Clamshell — 3×15 each side',
        'Bird Dog — 3×10 each side',
        'Dead Bug — 3×10 each side',
        'Single-leg Calf Raise — 3×15 each leg',
        'Plank — 3×30s',
        'Side Plank — 2×20s each side',
      ],
    },
    gym: {
      duration: 30,
      exercises: [
        'Goblet Squat (light) — 3×12',
        'Dumbbell Romanian Deadlift — 3×12',
        'Glute Bridge — 3×15',
        'Clamshell — 3×15 each side',
        'Single-leg Calf Raise — 3×15 each leg',
        'Plank — 3×30s',
        'Pallof Press — 3×12 each side',
      ],
    },
  },
  build: {
    bw: {
      duration: 35,
      exercises: [
        'Bulgarian Split Squat — 3×12 each leg',
        'Single-leg Glute Bridge — 3×12 each leg',
        'Step-up — 3×15 each leg',
        'Reverse Lunge — 3×12 each leg',
        'Single-leg Calf Raise — 3×15 each leg',
        'Copenhagen Plank — 3×20s each side',
        'Dead Bug with reach — 3×10 each side',
      ],
    },
    gym: {
      duration: 40,
      exercises: [
        'Barbell Back Squat — 4×10',
        'Romanian Deadlift — 4×10',
        'Hip Thrust — 4×12',
        'Single-leg Press — 3×12 each leg',
        'Single-leg Calf Raise — 3×15 each leg',
        'Copenhagen Plank — 3×20s each side',
        'Pallof Press — 3×12 each side',
      ],
    },
  },
  peak: {
    bw: {
      duration: 40,
      exercises: [
        'Pistol Squat progression — 3×8 each leg',
        'Nordic Hamstring Curl — 3×6',
        'Plyometric Reverse Lunge — 3×10 each leg',
        'Single-leg Romanian Deadlift — 3×12 each leg',
        'Box Jump (or Squat Jump) — 3×8',
        'Copenhagen Plank — 3×30s each side',
        'Mountain Climber — 3×20 each leg',
      ],
    },
    gym: {
      duration: 45,
      exercises: [
        'Barbell Back Squat — 4×8',
        'Romanian Deadlift — 4×8',
        'Hip Thrust — 4×10',
        'Single-leg Press — 3×10 each leg',
        'Nordic Hamstring Curl — 3×6',
        'Lateral Band Walk — 3×15 each direction',
        'Pallof Press — 3×15 each side',
      ],
    },
  },
  sharpen: {
    bw: {
      duration: 30,
      exercises: [
        'Bulgarian Split Squat — 3×10 each leg',
        'Single-leg Glute Bridge — 3×12 each leg',
        'Reverse Lunge — 3×10 each leg',
        'Single-leg Calf Raise — 3×15 each leg',
        'Side Plank — 3×25s each side',
        'Dead Bug — 3×10 each side',
      ],
    },
    gym: {
      duration: 35,
      exercises: [
        'Goblet Squat (light) — 3×12',
        'Romanian Deadlift (light) — 3×12',
        'Hip Thrust (light) — 3×12',
        'Single-leg Calf Raise — 3×15 each leg',
        'Side Plank — 3×25s each side',
        'Dead Bug — 3×10 each side',
      ],
    },
  },
  taper: {
    bw: {
      duration: 20,
      exercises: [
        'Glute Bridge — 2×15',
        'Clamshell — 2×12 each side',
        'Bird Dog — 2×10 each side',
        'Single-leg Calf Raise — 2×15 each leg',
        'Plank — 2×30s',
      ],
    },
    gym: {
      duration: 20,
      exercises: [
        'Glute Bridge — 2×15',
        'Clamshell — 2×12 each side',
        'Bird Dog — 2×10 each side',
        'Single-leg Calf Raise — 2×15 each leg',
        'Plank — 2×30s',
      ],
    },
  },
}

function strengthOffsets(runsPerWeek: number, strengthDays: number): number[] {
  if (strengthDays === 0) return []
  if (runsPerWeek === 5)  return strengthDays === 1 ? [0] : [0, 4]
  return strengthDays === 1 ? [0] : [0, 2]
}

// 'both' alternates: odd weeks → gym, even weeks → bodyweight
function resolveEquipment(equipmentType: EquipmentType, weekNumber: number): 'bw' | 'gym' {
  if (equipmentType === 'gym')       return 'gym'
  if (equipmentType === 'bodyweight') return 'bw'
  return weekNumber % 2 === 1 ? 'gym' : 'bw'  // 'both': alternate
}

// Category rotation — slotIndex 0 and 1 in the same week are always 2 apart,
// guaranteeing two sessions per week are never the same category.
const CATEGORY_ROTATION: WorkoutCategory[] = [
  'core_stability', 'legs', 'plyometrics', 'upper_body',
]
function resolveCategory(weekNumber: number, slotIndex: number): WorkoutCategory {
  return CATEGORY_ROTATION[(weekNumber - 1 + slotIndex * 2) % 4]
}

function buildStrengthSession(
  wk: number, phase: Phase, date: string,
  equipmentType: EquipmentType, isRaceWeek: boolean,
  slotIndex: number,
): PlannedRun | null {
  if (isRaceWeek) return null
  const eq       = resolveEquipment(equipmentType, wk)
  const s        = STRENGTH[phase][eq]
  const category = resolveCategory(wk, slotIndex)
  return {
    weekNumber: wk, phase, date,
    dayOfWeek: dowLabel(date),
    type: 'strength',
    targetDistanceKm: 0,
    targetPaceMinPerKm: undefined,
    description: strengthDescription(phase),
    durationMinutes: s.duration,
    exercises: s.exercises,
    workoutCategory: category,
  }
}

function strengthDescription(phase: Phase): string {
  switch (phase) {
    case 'base':    return 'Activation & foundation — movement quality and glute activation. Keep loads light; focus on form.'
    case 'build':   return 'Progressive runner strength — single-leg stability and posterior chain. Build load gradually.'
    case 'peak':    return 'Peak strength — power and resilience. Most demanding strength session; allow 24h before quality runs.'
    case 'sharpen': return "Maintenance strength — lighter loads, sharp movement patterns. Protect fitness, don't add stress."
    case 'taper':   return 'Activation only — keep muscles awake before race day. Light and brief; no fatigue.'
  }
}

// ─── Run builders ─────────────────────────────────────────────────────────────

function buildThursdayRun(
  wk: number, phase: Phase, date: string,
  km: number, quality: QKey, paces: PlanPaces,
  optional = false,
): PlannedRun {
  const wu   = Math.max(2, Math.round(km * 0.25))
  const cd   = wu
  const main = Math.max(1, km - wu - cd)

  const ep = (p: number) => paces.easy > 0 ? ` (${fmtPace(p)})` : ''

  switch (quality) {
    case 'none':
      return mkRun(wk, phase, date, 'easy', km, undefined,
        `Easy ${km} km — Z2 (RPE 3–4). Fully conversational${ep(paces.easy)}, HR under 145 bpm throughout.`, optional)

    case 'progression': {
      const epKm = Math.round(km * 0.75), fpKm = km - epKm
      return mkRun(wk, phase, date, 'easy', km, undefined,
        `Progression ${km} km — Z2→Z3 (RPE 3→6). First ${epKm} km fully easy${ep(paces.easy)} → final ${fpKm} km at a controlled effort${paces.mp > 0 ? ` (~${fmtPace(paces.mp)})` : ''}. Never a hard push.`, optional)
    }

    case 'hills':
      return mkRun(wk, phase, date, 'interval', km, paces.hill > 0 ? paces.hill : undefined,
        `Hill workout ${km} km — Z3–Z4 (RPE 6–8). Easy on flat sections${ep(paces.easy)}. On uphills, drive knees and run strong — 6–10 climbs of 60–90s each.`, optional)

    case 'tempo':
      return mkRun(wk, phase, date, 'tempo', km, paces.threshold > 0 ? paces.threshold : undefined,
        `Tempo ${km} km — Z4 (RPE 7–8). ${wu} km easy warm-up → ${main} km at threshold pace${paces.threshold > 0 ? ` (${fmtPace(paces.threshold)})` : ''} — comfortably hard, short phrases only → ${cd} km easy cool-down.`, optional)

    case 'fartlek':
      return mkRun(wk, phase, date, 'interval', km, undefined,
        `Fartlek ${km} km — Z2/Z4 (RPE 3–8). Mostly easy${ep(paces.easy)} with 6–10 fast bursts of 60–90s scattered throughout. Pick landmarks, run hard, recover fully.`, optional)

    case 'mp':
      return mkRun(wk, phase, date, 'tempo', km, paces.mp > 0 ? paces.mp : undefined,
        `Race pace ${km} km — Z3–Z4 (RPE 6–8). ${wu} km easy warm-up → ${main} km at race pace${paces.mp > 0 ? ` (${fmtPace(paces.mp)})` : ''} → ${cd} km easy cool-down. Controlled 7/10 effort.`, optional)

    case 'race_sim': {
      const mpSec = Math.max(3, Math.round(main * 0.8))
      return mkRun(wk, phase, date, 'tempo', km, paces.mp > 0 ? paces.mp : undefined,
        `Race simulation ${km} km — Z4 (RPE 7–8). ${wu} km easy → ${mpSec} km at race pace${paces.mp > 0 ? ` (${fmtPace(paces.mp)})` : ''} → ${cd} km cool-down. Practise race-day nutrition and gear. Most important workout of the plan.`, optional)
    }

    case 'dress_rehearsal':
      return mkRun(wk, phase, date, 'tempo', km, paces.mp > 0 ? paces.mp : undefined,
        `Dress rehearsal ${km} km — Z3–Z4 (RPE 6–8). 15 min easy → 20 min at race pace${paces.mp > 0 ? ` (${fmtPace(paces.mp)})` : ''} → 15 min easy. Use exact race kit and nutrition. Nothing new on race day.`, optional)

    case 'tune_up':
      return mkRun(wk, phase, date, 'easy', Math.max(5, Math.round(km * 0.7)), undefined,
        `Pre-race shakeout — Z2 (RPE 3–4). Very easy 30–40 min to loosen up. No effort — just move. Rest up this evening.`, optional)
  }
}

function buildLongRun(
  wk: number, phase: Phase, date: string,
  km: number, style: LongStyle | undefined, paces: PlanPaces,
  optional = false,
): PlannedRun {
  if (style === 'mp_finish' && paces.mp > 0) {
    const eKm = Math.max(10, Math.round(km * 0.55))
    const mKm = km - eKm
    return mkRun(wk, phase, date, 'long', km, paces.mp,
      `Long run ${km} km with race-pace finish — Z2→Z3 (RPE 3→6). First ${eKm} km easy${paces.easy > 0 ? ` (${fmtPace(paces.easy)})` : ''} → final ${mKm} km at race pace (${fmtPace(paces.mp)}). Fuel every 40 min.`, optional)
  }
  return mkRun(wk, phase, date, 'long', km, undefined,
    `Long run ${km} km — Z2 (RPE 3–4). Easy aerobic effort throughout${paces.easy > 0 ? ` (${fmtPace(paces.easy)})` : ''}. Practise race nutrition every 40 min. Most important run of the week.`, optional)
}

// ─── Volume splits by run count ───────────────────────────────────────────────

/**
 * Split a target weekly km into individual run distances.
 *
 * Rules:
 *  - Each run has a percentage-based value and a sensible minimum.
 *  - If the sum of minimums exceeds targetKm (low-base runners), every value is
 *    scaled down proportionally so the total never overshoots the target.
 *    This prevents week 1 from silently delivering 55%+ more volume than intended.
 */
function splitVolume(targetKm: number, runs: number) {
  // Raw splits (percentage-based, no floors yet)
  let raw: { easy: number; qual: number; ml: number; long: number; extraEasy: number }

  if (runs === 3) {
    raw = {
      easy:      Math.round(targetKm * 0.22),
      qual:      Math.round(targetKm * 0.25),
      ml:        0,
      long:      Math.round(targetKm * 0.53),
      extraEasy: Math.round(targetKm * 0.22),
    }
  } else if (runs === 5) {
    raw = {
      easy:      Math.round(targetKm * 0.13),
      qual:      Math.round(targetKm * 0.18),
      ml:        Math.round(targetKm * 0.22),
      long:      Math.round(targetKm * 0.36),
      extraEasy: Math.round(targetKm * 0.11),
    }
  } else {
    // 4 runs (default)
    raw = {
      easy:      Math.round(targetKm * 0.17),
      qual:      Math.round(targetKm * 0.21),
      ml:        Math.round(targetKm * 0.26),
      long:      Math.round(targetKm * 0.36),
      extraEasy: 0,
    }
  }

  // Absolute minimums per run type (only applied when the raw value is below them)
  const floors = {
    easy:      runs === 5 ? 4  : 5,
    qual:      runs === 3 ? 5  : 6,
    ml:        runs === 5 ? 6  : 7,
    long:      runs === 3 ? 10 : 10,  // reduced from 12 — avoids overshoot for low-base runners
    extraEasy: runs === 3 ? 5  : 4,
  }

  // Apply floors
  const floored = {
    easy:      Math.max(floors.easy,      raw.easy),
    qual:      Math.max(floors.qual,      raw.qual),
    ml:        runs === 3 ? 0 : Math.max(floors.ml, raw.ml),
    long:      Math.max(floors.long,      raw.long),
    extraEasy: raw.extraEasy > 0 ? Math.max(floors.extraEasy, raw.extraEasy) : 0,
  }

  // Sum of the runs that actually appear in the schedule
  // (extraEasy is only added from week 7 for 3-run plans, so exclude from overshoot check)
  const scheduled = floored.easy + floored.qual + floored.ml + floored.long
  if (scheduled > targetKm) {
    // Scale each component down proportionally so the total equals targetKm.
    // Long run is protected (scaled last and floored at 8 km to keep it meaningful).
    const scale = targetKm / scheduled
    floored.easy  = Math.max(3, Math.round(floored.easy  * scale))
    floored.qual  = Math.max(3, Math.round(floored.qual  * scale))
    floored.ml    = floored.ml > 0 ? Math.max(4, Math.round(floored.ml * scale)) : 0
    floored.long  = Math.max(8, Math.round(floored.long  * scale))
    // Recalculate extraEasy at the same scale (it's optional, just keep it reasonable)
    if (floored.extraEasy > 0) floored.extraEasy = Math.max(3, Math.round(floored.extraEasy * scale))
  }

  return floored
}

// ─── Main generator ───────────────────────────────────────────────────────────

/** Returns true if a quality session key should be suppressed due to injury notes */
function isSafeQuality(quality: QKey, injuryNotes: string): boolean {
  if (!injuryNotes) return true
  const lower = injuryNotes.toLowerCase()
  if (quality === 'hills' && (lower.includes('knee') || lower.includes('hill') || lower.includes('it band'))) return false
  if (quality === 'race_sim' && lower.includes('speed')) return false
  if ((quality === 'fartlek' || quality === 'mp') && lower.includes('speed')) return false
  return true
}

export function generatePlan(config: UserPlanConfig): Week[] {
  const raceType   = config.raceType ?? 'marathon'
  const paces      = calcPaces(config.goalSeconds, raceType)
  const planWeeks  = config.planWeeks  ?? 27
  const rpw        = config.runsPerWeek ?? 4
  const eqType     = config.equipmentType ?? 'bodyweight'
  const sOffsets   = strengthOffsets(rpw, config.strengthDays ?? 0)
  const longRunCap = LONG_RUN_MAX[raceType]
  const raceDistKm = RACE_DISTANCE_KM[raceType]
  const injuryNotes = config.injuryNotes ?? ''

  const phases     = calcPhases(planWeeks, raceType)
  const volumes    = buildVolumes(config.weeklyKm, phases)
  const weekTmpls  = buildWeekTemplates(phases)

  // Plan starts planWeeks weeks before race day, snapped to Monday
  const raceDateObj = new Date(config.raceDate + 'T12:00:00Z')
  const startApprox = new Date(raceDateObj.getTime() - planWeeks * 7 * 86_400_000)
  const dow         = startApprox.getUTCDay()
  startApprox.setUTCDate(startApprox.getUTCDate() + (dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow))
  const planStart   = startApprox.toISOString().slice(0, 10)

  return weekTmpls.map((tmpl, i) => {
    const wk         = i + 1
    const weekStart  = addDays(planStart, i * 7)
    const weekEnd    = addDays(weekStart, 6)
    const targetKm   = volumes[i]
    const isRaceWeek = wk === planWeeks

    // Split volume; cap long run per race type
    const split = (() => {
      const s = splitVolume(targetKm, rpw)
      return { ...s, long: Math.min(longRunCap, s.long) }
    })()

    let runs: PlannedRun[] = []

    // ── Race week ─────────────────────────────────────────────────────────────
    if (isRaceWeek) {
      const eKm      = Math.max(3, Math.round(targetKm * 0.28))
      const paceDesc = paces.mp > 0 ? ` at ${fmtPace(paces.mp)}` : ''
      const raceKm   = Math.round(raceDistKm * 100) / 100
      runs = [
        mkRun(wk, tmpl.phase, addDays(weekStart, 1), 'easy', eKm, undefined,
          `Easy shakeout ${eKm} km — Z2 (RPE 3–4). Relaxed and loose, legs only.`),
        mkRun(wk, tmpl.phase, addDays(weekStart, 3), 'easy', eKm, undefined,
          `Easy shakeout ${eKm} km — Z2 (RPE 3–4). Same as Tuesday, stay relaxed.`),
        mkRun(wk, tmpl.phase, addDays(weekStart, 4), 'easy', eKm, paces.mp > 0 ? paces.mp : undefined,
          paces.mp > 0
            ? `Pre-race shakeout ${eKm} km. 15 min easy → 10 min${paceDesc} → 10 min easy. Wake the legs up.`
            : `Pre-race shakeout ${eKm} km — very easy. Wake the legs up, sleep well tonight.`),
        mkRun(wk, tmpl.phase, config.raceDate, 'race', raceKm, paces.mp > 0 ? paces.mp : undefined,
          `Race day — ${raceKm} km${paceDesc}. Go get it. You are ready.`),
      ]

    // ── Tune-up race week ─────────────────────────────────────────────────────
    } else if (tmpl.quality === 'tune_up') {
      const shakeKm    = Math.max(5, Math.round(targetKm * 0.14))
      const recoveryKm = Math.max(6, Math.round(targetKm * 0.18))
      const easyKm     = Math.max(8, Math.round(targetKm * 0.22))
      runs = [
        mkRun(wk, tmpl.phase, addDays(weekStart, 1), 'easy', easyKm, undefined,
          `Easy ${easyKm} km. Relaxed and controlled — save yourself for Saturday's race.`),
        mkRun(wk, tmpl.phase, addDays(weekStart, 3), 'easy', shakeKm, undefined,
          `Pre-race shakeout ${shakeKm} km. Very easy, 30–40 min. Loosen up, rest up this evening.`),
        mkRun(wk, tmpl.phase, addDays(weekStart, 5), 'race', 21, paces.mp,
          `Tune-up half marathon. First 16 km at goal marathon pace (${fmtPace(paces.mp)}), then push the final 5K. Test gear, nutrition, and race-day routine.`),
        mkRun(wk, tmpl.phase, addDays(weekStart, 6), 'easy', recoveryKm, undefined,
          `Post-race recovery ${recoveryKm} km. Very easy — flush the legs. Walk breaks are fine. Rehydrate and refuel well.`),
      ]

    // ── Standard week ─────────────────────────────────────────────────────────
    } else {
      runs.push(mkRun(wk, tmpl.phase, addDays(weekStart, 1), 'easy', split.easy, undefined,
        `Easy ${split.easy} km — Z2 (RPE 3–4). Fully conversational${paces.easy > 0 ? ` (${fmtPace(paces.easy)})` : ''}. HR under 145 bpm.`))

      if (rpw === 5) {
        runs.push(mkRun(wk, tmpl.phase, addDays(weekStart, 2), 'easy', split.extraEasy, undefined,
          `Easy ${split.extraEasy} km — Z2 (RPE 3–4). Second easy run of the week — relaxed and short.`))
      }

      // Suppress unsafe quality types (injury filter) → replace with easy run
      const safeQuality = isSafeQuality(tmpl.quality, injuryNotes) ? tmpl.quality : 'none'
      runs.push(buildThursdayRun(wk, tmpl.phase, addDays(weekStart, 3), split.qual, safeQuality, paces))

      if (rpw >= 4) {
        runs.push(mkRun(wk, tmpl.phase, addDays(weekStart, 5), 'medium_long', split.ml, undefined,
          `Medium-long ${split.ml} km — Z2 (RPE 3–4). Easy aerobic effort${paces.easy > 0 ? ` (${fmtPace(paces.easy)})` : ''}. Comfortable time on feet.`))
      } else if (rpw === 3 && wk >= 7) {
        runs.push(mkRun(wk, tmpl.phase, addDays(weekStart, 5), 'medium_long',
          Math.round(targetKm * 0.22), undefined,
          `Optional medium-long run — Z2 (RPE 3–4). Complete this if you're feeling good.`,
          true))
      }

      runs.push(buildLongRun(wk, tmpl.phase, addDays(weekStart, 6), split.long, tmpl.longStyle, paces))
    }

    // ── Strength sessions ─────────────────────────────────────────────────────
    for (let idx = 0; idx < sOffsets.length; idx++) {
      const session = buildStrengthSession(wk, tmpl.phase, addDays(weekStart, sOffsets[idx]), eqType, isRaceWeek, idx)
      if (session) runs.push(session)
    }

    runs.sort((a, b) => a.date.localeCompare(b.date))

    const runKm = runs
      .filter(r => r.type !== 'strength')
      .reduce((s, r) => s + r.targetDistanceKm, 0)

    return {
      weekNumber: wk,
      phase:      tmpl.phase,
      startDate:  weekStart,
      endDate:    weekEnd,
      targetKm:   Math.round(runKm),
      title:      tmpl.title,
      notes:      tmpl.notes,
      runs,
      isCutback:  tmpl.isCutback,
    }
  })
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function getWeekNumber(planStartDate: string, raceDate: string): number {
  const today = new Date().toISOString().slice(0, 10)
  if (today < planStartDate) return 0
  if (today > raceDate)      return 9999
  const planMs   = new Date(raceDate + 'T12:00:00Z').getTime() - new Date(planStartDate + 'T12:00:00Z').getTime()
  const planWeeks = Math.ceil(planMs / (7 * 86_400_000))
  const diffDays  = Math.floor(
    (new Date(today + 'T12:00:00Z').getTime() - new Date(planStartDate + 'T12:00:00Z').getTime()) / 86_400_000
  )
  return Math.min(planWeeks, Math.floor(diffDays / 7) + 1)
}

export function formatGoalTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (s === 0) return `${h}:${String(m).padStart(2,'0')}`
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export function parseGoalTime(str: string): number {
  const parts = str.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}
