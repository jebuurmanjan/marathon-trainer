import { Week, PlannedRun, Phase, RunType } from '@/types'

// ─── Config ───────────────────────────────────────────────────────────────────

export interface UserPlanConfig {
  raceDate:     string   // YYYY-MM-DD
  goalSeconds:  number   // e.g. 12600 for 3:30:00
  weeklyKm:     number   // current weekly running load
  runsPerWeek:  number   // 3, 4, or 5
  strengthDays: number   // 0, 1, or 2
  hasGym:       boolean  // affects exercise selection
}

// ─── Paces ────────────────────────────────────────────────────────────────────

export interface PlanPaces {
  mp:        number  // marathon pace (min/km)
  threshold: number  // lactate threshold
  interval:  number  // VO2max / 5K effort
  easy:      number  // conversational
  hill:      number  // hill flat-equivalent
}

export function calcPaces(goalSeconds: number): PlanPaces {
  const mp = goalSeconds / 42.195 / 60
  return {
    mp:        Math.round(mp * 100) / 100,
    threshold: Math.round(mp * 0.92 * 100) / 100,
    interval:  Math.round(mp * 0.85 * 100) / 100,
    easy:      Math.round((mp + 1.20) * 100) / 100,
    hill:      Math.round(mp * 0.93 * 100) / 100,
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
    dayOfWeek: dowLabel(date),
    type, targetDistanceKm: km,
    targetPaceMinPerKm: pace,
    description: desc,
    isOptional: optional || undefined,
  }
}

// ─── Volume progression (10% rule enforced) ───────────────────────────────────

function buildVolumes(weeklyKm: number): number[] {
  const MAX = 75
  const cap  = (v: number) => Math.max(15, Math.min(MAX, Math.round(v)))
  const grow = (from: number, pct = 0.09) => cap(from * (1 + pct))
  const step = (peak: number) => cap(peak * 0.75)

  const v: number[] = new Array(27).fill(0)
  let lastPeak = weeklyKm

  // Base (W1–6): build 5, cutback W6
  v[0] = cap(weeklyKm);  v[1] = grow(v[0]);  v[2] = grow(v[1])
  v[3] = grow(v[2]);     v[4] = grow(v[3])
  lastPeak = v[4];       v[5] = step(lastPeak)

  // Endurance (W7–13): restart from W5 peak, cutback W12
  v[6]  = grow(lastPeak, 0.05); v[7]  = grow(v[6])
  v[8]  = grow(v[7]);           v[9]  = grow(v[8])
  v[10] = grow(v[9]);           lastPeak = v[10]
  v[11] = step(lastPeak);       v[12] = grow(lastPeak, 0.05)
  lastPeak = Math.max(lastPeak, v[12])

  // Strength & Speed (W14–19): 4 build, cutback W18, race sim W19
  v[13] = grow(lastPeak, 0.07); v[14] = grow(v[13], 0.07)
  v[15] = grow(v[14], 0.07);    v[16] = grow(v[15], 0.06)
  lastPeak = v[16];              v[17] = step(lastPeak)
  v[18] = grow(lastPeak, 0.04); lastPeak = Math.max(lastPeak, v[18])

  // Race Prep (W20–24): maintain near peak
  v[19] = cap(lastPeak * 1.01); v[20] = cap(lastPeak * 1.00)
  v[21] = cap(lastPeak * 0.88); v[22] = cap(lastPeak * 0.98)
  v[23] = cap(lastPeak * 0.92)
  const finalPeak = Math.max(...v.slice(0, 24))

  // Taper (W25–27)
  v[24] = cap(finalPeak * 0.75)
  v[25] = cap(finalPeak * 0.60)
  v[26] = cap(finalPeak * 0.40)

  return v
}

// ─── Strength sessions ────────────────────────────────────────────────────────

// Phase-appropriate exercises, bodyweight or gym
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

// Strength day offsets from Monday (week start)
// 4/3-run: free days are Mon(0), Wed(2), Fri(4)  → 1 day = Mon, 2 days = Mon+Wed
// 5-run:   free days are Mon(0), Fri(4)           → 1 day = Mon, 2 days = Mon+Fri
function strengthOffsets(runsPerWeek: number, strengthDays: number): number[] {
  if (strengthDays === 0) return []
  if (runsPerWeek === 5)  return strengthDays === 1 ? [0] : [0, 4]
  return strengthDays === 1 ? [0] : [0, 2]
}

function buildStrengthSession(
  wk: number, phase: Phase, date: string, hasGym: boolean, isRaceWeek: boolean,
): PlannedRun | null {
  if (isRaceWeek) return null  // no strength in race week
  const key = hasGym ? 'gym' : 'bw'
  const s = STRENGTH[phase][key]
  return {
    weekNumber: wk, phase, date,
    dayOfWeek: dowLabel(date),
    type: 'strength',
    targetDistanceKm: 0,
    targetPaceMinPerKm: undefined,
    description: strengthDescription(phase),
    durationMinutes: s.duration,
    exercises: s.exercises,
  }
}

function strengthDescription(phase: Phase): string {
  switch (phase) {
    case 'base':    return 'Activation & foundation — movement quality and glute activation. Keep loads light; focus on form.'
    case 'build':   return 'Progressive runner strength — single-leg stability and posterior chain. Build load gradually.'
    case 'peak':    return 'Peak strength — power and resilience. Most demanding strength session; allow 24h before quality runs.'
    case 'sharpen': return 'Maintenance strength — lighter loads, sharp movement patterns. Protect fitness, don\'t add stress.'
    case 'taper':   return 'Activation only — keep muscles awake before race day. Light and brief; no fatigue.'
  }
}

// ─── Week template ────────────────────────────────────────────────────────────

type QKey =
  | 'none'            // Base phase: Thu is a second easy run
  | 'progression'     // Easy → controlled MP effort in final 25%
  | 'hills'           // Uphill fast bursts in easy run
  | 'tempo'           // WU + threshold middle + CD
  | 'fartlek'         // Easy with unstructured fast bursts
  | 'mp'              // Marathon pace quality session
  | 'race_sim'        // Extended MP block
  | 'tune_up'         // Tune-up race week
  | 'dress_rehearsal' // WU + 20 min at MP + CD

type LongStyle = 'easy' | 'mp_finish'

interface WeekTmpl {
  phase:      Phase
  isCutback:  boolean
  quality:    QKey
  longStyle?: LongStyle
  notes:      string
}

const WEEK_TMPLS: WeekTmpl[] = [
  // BASE (W1–6)
  { phase:'base', isCutback:false, quality:'none',
    notes:'First week of the plan. Establish the rhythm — all runs fully conversational. If you can\'t hold a conversation, slow down.' },
  { phase:'base', isCutback:false, quality:'none',
    notes:'10% rule in action — a small step up. Keep HR under 145 bpm throughout. Aerobic development happens even when it feels easy.' },
  { phase:'base', isCutback:false, quality:'none',
    notes:'Steady base building. Focus on feel, not pace. The long run is your weekend anchor.' },
  { phase:'base', isCutback:false, quality:'none',
    notes:'Aerobic engine building. Every run should feel sustainable for hours. No ego in base phase.' },
  { phase:'base', isCutback:false, quality:'none',
    notes:'Final push of the base block — still fully aerobic. Time on feet is the goal.' },
  { phase:'base', isCutback:true,  quality:'none',
    notes:'Cutback week. Reduce volume by ~25%. Recovery is where adaptation happens.' },

  // BUILD / ENDURANCE (W7–13)
  { phase:'build', isCutback:false, quality:'progression',
    notes:'Endurance phase begins. Volume returns. Thursday introduces a controlled progression finish — stay well within yourself.' },
  { phase:'build', isCutback:false, quality:'progression',
    notes:'Volume ticks up. Practise fuelling every 40 min on the long run — this is a skill that needs training.' },
  { phase:'build', isCutback:false, quality:'progression',
    notes:'Long run getting serious. Aerobic base from the first 6 weeks is now paying dividends.' },
  { phase:'build', isCutback:false, quality:'progression',
    notes:'Building time on feet. The long run should feel comfortably challenging — not a struggle.' },
  { phase:'build', isCutback:false, quality:'progression',
    notes:'Biggest endurance week so far. Sleep and eat well — recovery is training too.' },
  { phase:'build', isCutback:true,  quality:'progression',
    notes:'Cutback — absorb 5 weeks of endurance work. Short and easy, no exceptions.' },
  { phase:'build', isCutback:false, quality:'progression',
    notes:'Bridge week into strength and speed. Volume returns; legs feel fresh from the cutback.' },

  // PEAK / STRENGTH & SPEED (W14–19)
  { phase:'peak', isCutback:false, quality:'hills',
    notes:'Hill work begins. Strong legs mean better form and resilience in the late miles. Uphill fast, downhill easy.' },
  { phase:'peak', isCutback:false, quality:'tempo',
    notes:'First tempo run. Comfortably hard — short phrases only, not free conversation. Builds lactate threshold.' },
  { phase:'peak', isCutback:false, quality:'fartlek',
    notes:'Fartlek — unstructured speed within an easy run. Pick landmarks, accelerate, recover. Builds speed variety.' },
  { phase:'peak', isCutback:false, quality:'hills',
    notes:'Hill repeats again. You should feel noticeably stronger than week 14. Form is everything.' },
  { phase:'peak', isCutback:true,  quality:'tempo',
    notes:'Cutback with a shorter tempo. Consolidate the strength gains. Quality over quantity this week.' },
  { phase:'peak', isCutback:false, quality:'race_sim', longStyle:'mp_finish',
    notes:'Race simulation — the most demanding session of the plan. This week proves you are ready.' },

  // SHARPEN / RACE PREP (W20–24)
  { phase:'sharpen', isCutback:false, quality:'mp', longStyle:'mp_finish',
    notes:'Race preparation begins. Long runs now include sustained marathon-pace sections. Your body learns what race day demands.' },
  { phase:'sharpen', isCutback:false, quality:'tempo', longStyle:'mp_finish',
    notes:'Tune-up race preparation. Stay sharp on Thursday, nail the goal-pace section of the long run.' },
  { phase:'sharpen', isCutback:false, quality:'tune_up',
    notes:'Tune-up race week! Run a half marathon — first 10 miles at goal pace, pick it up in the final 5K.' },
  { phase:'sharpen', isCutback:false, quality:'mp', longStyle:'mp_finish',
    notes:'Back to training after the tune-up race. Marathon-specific fitness is peaking. Every run has a purpose.' },
  { phase:'sharpen', isCutback:false, quality:'tempo',
    notes:'Last major quality session before the taper. Run it well — the hay is almost in the barn.' },

  // TAPER (W25–27)
  { phase:'taper', isCutback:true, quality:'dress_rehearsal',
    notes:'Taper begins — volume drops 25%. One dress-rehearsal session. Do not add extra miles. Trust the process.' },
  { phase:'taper', isCutback:true, quality:'mp',
    notes:'Volume drops 40%. Short and sharp — one quality session, the rest easy. Legs start feeling bouncy. That\'s the taper working.' },
  { phase:'taper', isCutback:false, quality:'none',
    notes:'Race week. Three short easy runs, then go get it. Hydrate now. Eat breakfast 2 hours before the start. You are ready.' },
]

// ─── Run builders ─────────────────────────────────────────────────────────────

function buildThursdayRun(
  wk: number, phase: Phase, date: string,
  km: number, quality: QKey, paces: PlanPaces,
  optional = false,
): PlannedRun {
  const wu   = Math.max(2, Math.round(km * 0.25))
  const cd   = wu
  const main = Math.max(1, km - wu - cd)

  switch (quality) {
    case 'none':
      return mkRun(wk, phase, date, 'easy', km, undefined,
        `Easy ${km} km. Fully conversational (${fmtPace(paces.easy)}), HR under 145 bpm throughout.`, optional)

    case 'progression': {
      const ep = Math.round(km * 0.75), fp = km - ep
      return mkRun(wk, phase, date, 'easy', km, undefined,
        `Progression ${km} km. First ${ep} km fully easy → final ${fp} km at a controlled effort (~${fmtPace(paces.mp)}). Never a hard push.`, optional)
    }

    case 'hills':
      return mkRun(wk, phase, date, 'quality', km, paces.hill,
        `Hill workout ${km} km. Easy on flat sections (${fmtPace(paces.easy)}). On uphills, drive knees and run strong — 6–10 climbs of 60–90s each. Total ~60 min.`, optional)

    case 'tempo':
      return mkRun(wk, phase, date, 'quality', km, paces.threshold,
        `Tempo ${km} km. ${wu} km easy warm-up → ${main} km at threshold pace (${fmtPace(paces.threshold)}) — comfortably hard, short phrases only → ${cd} km easy cool-down.`, optional)

    case 'fartlek':
      return mkRun(wk, phase, date, 'easy', km, undefined,
        `Fartlek ${km} km. Mostly easy (${fmtPace(paces.easy)}) with 6–10 fast bursts of 60–90s scattered throughout. Pick landmarks, run hard, recover fully. Run by feel.`, optional)

    case 'mp':
      return mkRun(wk, phase, date, 'quality', km, paces.mp,
        `Marathon pace ${km} km. ${wu} km easy warm-up → ${main} km at marathon pace (${fmtPace(paces.mp)}) → ${cd} km easy cool-down. Should feel like a controlled 7/10 effort.`, optional)

    case 'race_sim': {
      const mpSec = Math.max(3, Math.round(main * 0.8))
      return mkRun(wk, phase, date, 'quality', km, paces.mp,
        `Race simulation ${km} km. ${wu} km easy → ${mpSec} km at marathon pace (${fmtPace(paces.mp)}) → ${cd} km cool-down. Practise race-day nutrition and gear. Most important workout of the plan.`, optional)
    }

    case 'dress_rehearsal':
      return mkRun(wk, phase, date, 'quality', km, paces.mp,
        `Dress rehearsal ${km} km. 15 min easy → 20 min at marathon pace (${fmtPace(paces.mp)}) → 15 min easy. Use exact race kit, shoes, and nutrition. Nothing new on race day.`, optional)

    case 'tune_up':
      return mkRun(wk, phase, date, 'easy', Math.max(5, Math.round(km * 0.7)), undefined,
        `Pre-race shakeout. Very easy 30–40 min to loosen up. No effort — just move. Rest up this evening.`, optional)
  }
}

function buildLongRun(
  wk: number, phase: Phase, date: string,
  km: number, style: LongStyle | undefined, paces: PlanPaces,
  optional = false,
): PlannedRun {
  if (style === 'mp_finish') {
    const eKm = Math.max(10, Math.round(km * 0.55))
    const mKm = km - eKm
    return mkRun(wk, phase, date, 'long', km, paces.mp,
      `Long run ${km} km with marathon-pace finish. First ${eKm} km easy (${fmtPace(paces.easy)}) → final ${mKm} km at marathon pace (${fmtPace(paces.mp)}). Fuel every 40 min.`, optional)
  }
  return mkRun(wk, phase, date, 'long', km, undefined,
    `Long run ${km} km. Easy aerobic effort throughout (${fmtPace(paces.easy)}). Practise race nutrition every 40 min. Most important run of the week.`, optional)
}

// ─── Volume splits by run count ───────────────────────────────────────────────

function splitVolume(targetKm: number, runs: number) {
  if (runs === 3) {
    // No medium-long — bigger long run
    return {
      easy:     Math.max(5,  Math.round(targetKm * 0.22)),
      qual:     Math.max(6,  Math.round(targetKm * 0.25)),
      ml:       0,
      long:     Math.min(38, Math.max(14, Math.round(targetKm * 0.53))),
      extraEasy: Math.max(6,  Math.round(targetKm * 0.22)), // 5th run (5-plan only)
    }
  }
  if (runs === 5) {
    return {
      easy:      Math.max(5,  Math.round(targetKm * 0.13)),
      qual:      Math.max(6,  Math.round(targetKm * 0.18)),
      ml:        Math.max(8,  Math.round(targetKm * 0.22)),
      long:      Math.min(38, Math.max(14, Math.round(targetKm * 0.36))),
      extraEasy: Math.max(5,  Math.round(targetKm * 0.11)), // Wed easy
    }
  }
  // 4 runs (default)
  return {
    easy:      Math.max(5,  Math.round(targetKm * 0.17)),
    qual:      Math.max(6,  Math.round(targetKm * 0.21)),
    ml:        Math.max(8,  Math.round(targetKm * 0.26)),
    long:      Math.min(38, Math.max(14, Math.round(targetKm * 0.36))),
    extraEasy: 0,
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generatePlan(config: UserPlanConfig): Week[] {
  const paces   = calcPaces(config.goalSeconds)
  const volumes = buildVolumes(config.weeklyKm)
  const rpw     = config.runsPerWeek ?? 4
  const sOffsets = strengthOffsets(rpw, config.strengthDays ?? 0)
  const gym     = config.hasGym ?? false

  // Plan starts exactly 27 weeks before race date, snapped to Monday
  const raceDateObj = new Date(config.raceDate + 'T12:00:00Z')
  const startApprox = new Date(raceDateObj.getTime() - 188 * 86_400_000)
  const dow = startApprox.getUTCDay()
  startApprox.setUTCDate(startApprox.getUTCDate() + (dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow))
  const planStart = startApprox.toISOString().slice(0, 10)

  return WEEK_TMPLS.map((tmpl, i) => {
    const wk         = i + 1
    const weekStart  = addDays(planStart, i * 7)
    const weekEnd    = addDays(weekStart, 6)
    const targetKm   = volumes[i]
    const isRaceWeek = wk === 27
    const split      = splitVolume(targetKm, rpw)

    let runs: PlannedRun[] = []

    // ── Race week ─────────────────────────────────────────────────────────────
    if (isRaceWeek) {
      const eKm = Math.max(4, Math.round(targetKm * 0.28))
      runs = [
        mkRun(wk, tmpl.phase, addDays(weekStart, 1), 'easy', eKm, undefined,
          `Easy shakeout ${eKm} km. Relaxed and loose — legs only, no effort.`),
        mkRun(wk, tmpl.phase, addDays(weekStart, 3), 'easy', eKm, undefined,
          `Easy shakeout ${eKm} km. Same as Tuesday — stay relaxed.`),
        mkRun(wk, tmpl.phase, addDays(weekStart, 4), 'easy', eKm, paces.mp,
          `Pre-race shakeout ${eKm} km. 15 min easy → 10 min at marathon pace (${fmtPace(paces.mp)}) → 10 min easy. Wake the legs up. Sleep well tonight.`),
        mkRun(wk, tmpl.phase, config.raceDate, 'race', 42, paces.mp,
          `Race day — 42.195 km at ${fmtPace(paces.mp)}. Conservative first 10 km, trust training in the middle, give everything in the final 10 km. You are ready.`),
      ]

    // ── Tune-up race week (W22) ───────────────────────────────────────────────
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
      // Tue: easy
      runs.push(mkRun(wk, tmpl.phase, addDays(weekStart, 1), 'easy', split.easy, undefined,
        `Easy ${split.easy} km. Fully conversational (${fmtPace(paces.easy)}). HR under 145 bpm.`))

      // Wed: extra easy (5-run only)
      if (rpw === 5) {
        runs.push(mkRun(wk, tmpl.phase, addDays(weekStart, 2), 'easy', split.extraEasy, undefined,
          `Easy ${split.extraEasy} km. Second easy run of the week — keep it relaxed and short.`))
      }

      // Thu: quality
      runs.push(buildThursdayRun(wk, tmpl.phase, addDays(weekStart, 3), split.qual, tmpl.quality, paces))

      // Sat: medium-long (mandatory for 4/5-run; optional from W7+ for 3-run)
      if (rpw >= 4) {
        runs.push(mkRun(wk, tmpl.phase, addDays(weekStart, 5), 'medium_long', split.ml, undefined,
          `Medium-long ${split.ml} km. Easy aerobic effort (${fmtPace(paces.easy)}). Comfortable time on feet.`))
      } else if (rpw === 3 && wk >= 7) {
        // 3-run plan: add optional Sat from W7
        runs.push(mkRun(wk, tmpl.phase, addDays(weekStart, 5), 'medium_long', split.ml ?? Math.round(targetKm * 0.22), undefined,
          `Optional medium-long run. Complete this if you're feeling good and have the time — it builds volume without pressure.`,
          true))
      }

      // Sun: long
      runs.push(buildLongRun(wk, tmpl.phase, addDays(weekStart, 6), split.long, tmpl.longStyle, paces))
    }

    // ── Strength sessions ─────────────────────────────────────────────────────
    for (const offset of sOffsets) {
      const session = buildStrengthSession(wk, tmpl.phase, addDays(weekStart, offset), gym, isRaceWeek)
      if (session) runs.push(session)
    }

    // Sort all sessions by date
    runs.sort((a, b) => a.date.localeCompare(b.date))

    return {
      weekNumber: wk,
      phase:      tmpl.phase,
      startDate:  weekStart,
      endDate:    weekEnd,
      targetKm,
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
  if (today > raceDate)      return 28
  const diffDays = Math.floor(
    (new Date(today + 'T12:00:00Z').getTime() - new Date(planStartDate + 'T12:00:00Z').getTime())
    / 86_400_000
  )
  return Math.min(27, Math.floor(diffDays / 7) + 1)
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
