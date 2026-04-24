import { Week, PlannedRun, Phase, RunType } from '@/types'

// ─── Public config type ───────────────────────────────────────────────────────

export interface UserPlanConfig {
  raceDate:    string  // YYYY-MM-DD
  goalSeconds: number  // e.g. 12600 for 3:30:00
  weeklyKm:   number  // athlete's current weekly training load
}

// ─── Pace calculations ────────────────────────────────────────────────────────

export interface PlanPaces {
  mp:        number  // marathon pace (min/km)
  threshold: number  // lactate threshold — slightly faster than MP
  interval:  number  // VO2max / 5K effort — significantly faster
  easy:      number  // fully conversational / recovery pace
  hill:      number  // uphill effort pace (flat equivalent ~threshold)
}

export function calcPaces(goalSeconds: number): PlanPaces {
  const mp = goalSeconds / 42.195 / 60
  return {
    mp:        Math.round(mp * 100) / 100,
    threshold: Math.round(mp * 0.92 * 100) / 100,  // ~15–20s/km faster than MP
    interval:  Math.round(mp * 0.85 * 100) / 100,  // ~5K effort
    easy:      Math.round((mp + 1.20) * 100) / 100, // truly conversational
    hill:      Math.round(mp * 0.93 * 100) / 100,   // hill flat equivalent
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const DOW = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

function fmtPace(p: number): string {
  const m = Math.floor(p)
  const s = Math.round((p - m) * 60)
  return `${m}:${String(s).padStart(2,'0')}/km`
}

// ─── Volume progression (10% rule enforced) ───────────────────────────────────
//
// Rules:
//  • Non-cutback weeks: max 9% increase over the previous non-cutback week
//  • Cutback weeks: 75% of the preceding peak week
//  • After a cutback, restart from the pre-cutback peak (not the cutback level)
//  • Hard cap: 75 km/week
//  • Taper: –25% at W25, –40% at W26, –60% at W27 (race week)

function buildVolumes(weeklyKm: number): number[] {
  const MAX_KM = 75
  const cap = (v: number) => Math.max(15, Math.min(MAX_KM, Math.round(v)))
  const grow = (from: number, pct = 0.09) => cap(from * (1 + pct))
  const step = (from: number) => cap(from * 0.75)

  const v: number[] = new Array(27).fill(0)
  let lastPeak = weeklyKm

  // ── BASE (W1–6): build 5 weeks, cutback W6 ──────────────────────────────
  v[0] = cap(weeklyKm)
  v[1] = grow(v[0])
  v[2] = grow(v[1])
  v[3] = grow(v[2])
  v[4] = grow(v[3])
  lastPeak = v[4]
  v[5] = step(lastPeak)          // W6 cutback

  // ── BUILD / ENDURANCE (W7–13): 5 build, cutback W12, bridge W13 ─────────
  v[6]  = grow(lastPeak, 0.05)   // W7: restart just above W5 peak
  v[7]  = grow(v[6])             // W8
  v[8]  = grow(v[7])             // W9
  v[9]  = grow(v[8])             // W10
  v[10] = grow(v[9])             // W11
  lastPeak = v[10]
  v[11] = step(lastPeak)         // W12 cutback
  v[12] = grow(lastPeak, 0.05)   // W13 bridge — restart from W11
  lastPeak = Math.max(lastPeak, v[12])

  // ── PEAK / STRENGTH & SPEED (W14–19): 4 build, cutback W18, race_sim W19 ─
  v[13] = grow(lastPeak, 0.07)   // W14
  v[14] = grow(v[13], 0.07)      // W15
  v[15] = grow(v[14], 0.07)      // W16
  v[16] = grow(v[15], 0.06)      // W17
  lastPeak = v[16]
  v[17] = step(lastPeak)         // W18 cutback
  v[18] = grow(lastPeak, 0.04)   // W19 race sim — back near peak
  lastPeak = Math.max(lastPeak, v[18])

  // ── SHARPEN / RACE PREP (W20–24): maintain near peak ─────────────────────
  v[19] = cap(lastPeak * 1.01)   // W20
  v[20] = cap(lastPeak * 1.00)   // W21
  v[21] = cap(lastPeak * 0.88)   // W22 tune-up race week — slightly reduced
  v[22] = cap(lastPeak * 0.98)   // W23
  v[23] = cap(lastPeak * 0.92)   // W24 pre-taper
  const finalPeak = Math.max(...v.slice(0, 24))

  // ── TAPER (W25–27) ────────────────────────────────────────────────────────
  v[24] = cap(finalPeak * 0.75)  // W25 −25%
  v[25] = cap(finalPeak * 0.60)  // W26 −40%
  v[26] = cap(finalPeak * 0.40)  // W27 −60% (race week)

  return v
}

// ─── Week template ────────────────────────────────────────────────────────────

type QKey =
  | 'none'            // Base phase — Thursday is a second easy run
  | 'progression'     // Easy start → last 25% at controlled MP effort
  | 'hills'           // Uphill fast segments within an easy run
  | 'tempo'           // WU + sustained threshold middle + CD
  | 'fartlek'         // Easy run with unstructured fast bursts
  | 'mp'              // Marathon pace quality session
  | 'race_sim'        // Extended MP block — most demanding workout
  | 'tune_up'         // Tune-up race week (half marathon)
  | 'dress_rehearsal' // Pre-race: WU + 20 min @ MP + CD

type LongStyle = 'easy' | 'mp_finish'  // Whether Sunday long run has MP section

interface WeekTmpl {
  phase:      Phase
  isCutback:  boolean
  quality:    QKey
  longStyle?: LongStyle
  notes:      string
}

const WEEK_TMPLS: WeekTmpl[] = [

  // ── BASE (W1–6): purely aerobic, conversational, NO speedwork ─────────────
  { phase:'base', isCutback:false, quality:'none',
    notes:'First week of the plan. Establish the rhythm of 4 runs a week — all fully conversational. If you can\'t hold a conversation, slow down.' },
  { phase:'base', isCutback:false, quality:'none',
    notes:'10% rule in action — a tiny step up. Keep HR under 145 bpm throughout. Aerobic development is happening even when it feels too easy.' },
  { phase:'base', isCutback:false, quality:'none',
    notes:'Steady base building. Focus on feel, not pace. The long run is your weekend anchor.' },
  { phase:'base', isCutback:false, quality:'none',
    notes:'Aerobic engine building. Every run should feel sustainable for hours. No ego in base phase.' },
  { phase:'base', isCutback:false, quality:'none',
    notes:'Final push of the base block — still fully aerobic. No speedwork. Time on feet is the goal.' },
  { phase:'base', isCutback:true,  quality:'none',
    notes:'Cutback week. Reduce volume by ~25%. Easier runs allow your body to absorb the base block. Recovery is where adaptation happens.' },

  // ── BUILD / ENDURANCE (W7–13): accumulate time on feet, add progression runs
  { phase:'build', isCutback:false, quality:'progression',
    notes:'Endurance phase begins. Volume returns. Thursday introduces a controlled progression finish — stay well within yourself.' },
  { phase:'build', isCutback:false, quality:'progression',
    notes:'Volume ticks up. Practise fuelling every 40 minutes on your long run — this is a skill that needs training.' },
  { phase:'build', isCutback:false, quality:'progression',
    notes:'Long run getting serious. Aerobic base from the first 6 weeks is now paying dividends.' },
  { phase:'build', isCutback:false, quality:'progression',
    notes:'Building time on feet. Your long run should feel comfortably challenging — not a struggle.' },
  { phase:'build', isCutback:false, quality:'progression',
    notes:'Biggest endurance week so far. Sleep and eat well — recovery is training too.' },
  { phase:'build', isCutback:true,  quality:'progression',
    notes:'Cutback — absorb 5 weeks of endurance work. Short and easy this week, no exceptions.' },
  { phase:'build', isCutback:false, quality:'progression',
    notes:'Bridge week into strength and speed. Volume returns, legs feel fresher from the cutback.' },

  // ── PEAK / STRENGTH & SPEED (W14–19): hills, tempo, fartlek ─────────────
  { phase:'peak', isCutback:false, quality:'hills',
    notes:'Hill work begins. Strong legs mean better form and resilience in the late miles of your race. Uphill fast, downhill easy.' },
  { phase:'peak', isCutback:false, quality:'tempo',
    notes:'First tempo run. Comfortably hard — you should be able to say a short phrase, but not chat freely. This builds lactate threshold.' },
  { phase:'peak', isCutback:false, quality:'fartlek',
    notes:'Fartlek session — unstructured speed within an easy run. Pick landmarks, accelerate to them, recover. Builds speed variety.' },
  { phase:'peak', isCutback:false, quality:'hills',
    notes:'Hill repeats again. You should feel noticeably stronger on the uphills than week 14. Form is everything.' },
  { phase:'peak', isCutback:true,  quality:'tempo',
    notes:'Cutback with a shorter tempo. Consolidate the strength gains from the peak block. Quality over quantity this week.' },
  { phase:'peak', isCutback:false, quality:'race_sim', longStyle:'mp_finish',
    notes:'Race simulation — the most demanding session of the plan. This week proves you are ready. Execute the long run as directed.' },

  // ── SHARPEN / RACE PREP (W20–24): goal pace in long runs, tune-up race ────
  { phase:'sharpen', isCutback:false, quality:'mp', longStyle:'mp_finish',
    notes:'Race preparation begins. Long runs now include sustained marathon-pace sections. Your body learns what race day will demand.' },
  { phase:'sharpen', isCutback:false, quality:'tempo', longStyle:'mp_finish',
    notes:'Tune-up race preparation. Stay sharp on Thursday, then nail the goal-pace section of your long run.' },
  { phase:'sharpen', isCutback:false, quality:'tune_up',
    notes:'Tune-up race week! Run a half marathon as a dress rehearsal — first 10 miles at goal pace, pick it up in the final 5K.' },
  { phase:'sharpen', isCutback:false, quality:'mp', longStyle:'mp_finish',
    notes:'Back to training after the tune-up race. Marathon-specific fitness is peaking. Every run has a purpose now.' },
  { phase:'sharpen', isCutback:false, quality:'tempo',
    notes:'Last major quality session before the taper. Run it well — the hay is almost in the barn.' },

  // ── TAPER (W25–27): reduce volume, maintain intensity ─────────────────────
  { phase:'taper', isCutback:true, quality:'dress_rehearsal',
    notes:'Taper begins — volume drops 25%. One dress-rehearsal session this week. Do not add extra miles or run extra sessions. Trust the process.' },
  { phase:'taper', isCutback:true, quality:'mp',
    notes:'Volume drops 40%. Short and sharp — one quality session, the rest easy. Legs should start feeling bouncy. That\'s the taper working.' },
  { phase:'taper', isCutback:false, quality:'none',
    notes:'Race week. Three short easy runs, then go get it. Start hydrating now. Eat breakfast 2 hours before the start. Trust your training.' },
]

// ─── Run builders ─────────────────────────────────────────────────────────────

function buildEasyRun(wk: number, phase: Phase, date: string, km: number): PlannedRun {
  return {
    weekNumber: wk, phase, date,
    dayOfWeek: DOW[new Date(date + 'T12:00:00Z').getUTCDay() === 0 ? 6 : new Date(date + 'T12:00:00Z').getUTCDay() - 1],
    type: 'easy',
    targetDistanceKm: km,
    targetPaceMinPerKm: undefined,
    description: `Easy ${km} km. Fully conversational — HR under 145 bpm throughout. If you can't hold a conversation, slow down.`,
  }
}

function buildThursdayRun(
  wk: number, phase: Phase, date: string,
  km: number, quality: QKey, paces: PlanPaces,
): PlannedRun {
  const wu  = Math.max(2, Math.round(km * 0.25))
  const cd  = wu
  const main = Math.max(1, km - wu - cd)

  let type: RunType = 'quality'
  let targetPace: number | undefined
  let desc: string

  switch (quality) {
    case 'none':
      return buildEasyRun(wk, phase, date, km)

    case 'progression': {
      const easyPart = Math.round(km * 0.75)
      const fastPart  = km - easyPart
      type = 'easy'
      desc = `Progression ${km} km. First ${easyPart} km fully easy → final ${fastPart} km at a controlled effort (around marathon pace, ${fmtPace(paces.mp)}). Never a hard push.`
      break
    }

    case 'hills': {
      targetPace = paces.hill
      desc = `Hill workout ${km} km. Run easy on flat sections (${fmtPace(paces.easy)}). On uphills, drive your knees and run at a strong effort. Find a hill that takes 60–90 seconds to climb. Repeat 6–10 times during the run. Total time 50–70 min.`
      break
    }

    case 'tempo': {
      targetPace = paces.threshold
      desc = `Tempo ${km} km. ${wu} km easy warm-up → ${main} km at threshold pace (${fmtPace(paces.threshold)}) — comfortably hard, can say a short phrase → ${cd} km easy cool-down. Consistent effort throughout the middle section.`
      break
    }

    case 'fartlek': {
      type = 'easy'
      desc = `Fartlek ${km} km. Mostly easy (${fmtPace(paces.easy)}) with 6–10 unstructured fast bursts of 60–90 seconds scattered throughout. Pick a landmark, run hard to it, recover fully. No rigid structure — run by feel.`
      break
    }

    case 'mp': {
      targetPace = paces.mp
      desc = `Marathon pace ${km} km. ${wu} km easy warm-up → ${main} km at marathon pace (${fmtPace(paces.mp)}) → ${cd} km easy cool-down. Run the MP section controlled — it should feel like a 7/10 effort.`
      break
    }

    case 'race_sim': {
      const mpSection = Math.max(3, Math.round(main * 0.8))
      targetPace = paces.mp
      desc = `Race simulation ${km} km. ${wu} km easy warm-up → ${mpSection} km at marathon pace (${fmtPace(paces.mp)}) → ${cd} km cool-down. Practise race-day nutrition and gear. This is your most important workout.`
      break
    }

    case 'dress_rehearsal': {
      targetPace = paces.mp
      desc = `Dress rehearsal ${km} km. 15 min easy warm-up → 20 min at marathon pace (${fmtPace(paces.mp)}) → 15 min easy cool-down. Use your exact race kit, shoes, and nutrition. Nothing new on race day.`
      break
    }

    case 'tune_up':
      // Handled separately as a special week — this fallback shouldn't fire
      return buildEasyRun(wk, phase, date, Math.max(5, Math.round(km * 0.7)))
  }

  return {
    weekNumber: wk, phase, date,
    dayOfWeek: DOW[new Date(date + 'T12:00:00Z').getUTCDay() === 0 ? 6 : new Date(date + 'T12:00:00Z').getUTCDay() - 1],
    type, targetDistanceKm: km, targetPaceMinPerKm: targetPace, description: desc,
  }
}

function buildLongRun(
  wk: number, phase: Phase, date: string,
  km: number, style: LongStyle | undefined, paces: PlanPaces,
): PlannedRun {
  let desc: string

  if (style === 'mp_finish') {
    const easyKm = Math.max(10, Math.round(km * 0.55))
    const mpKm   = km - easyKm
    desc = `Long run ${km} km with marathon-pace finish. First ${easyKm} km easy (${fmtPace(paces.easy)}) — conserve energy. Final ${mpKm} km at marathon pace (${fmtPace(paces.mp)}). Fuel every 40 min throughout.`
  } else {
    desc = `Long run ${km} km. Easy aerobic effort throughout (${fmtPace(paces.easy)}). Practise race nutrition every 40 min. This is the most important run of the week.`
  }

  return {
    weekNumber: wk, phase, date,
    dayOfWeek: DOW[new Date(date + 'T12:00:00Z').getUTCDay() === 0 ? 6 : new Date(date + 'T12:00:00Z').getUTCDay() - 1],
    type: 'long', targetDistanceKm: km, targetPaceMinPerKm: style === 'mp_finish' ? paces.mp : undefined,
    description: desc,
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generatePlan(config: UserPlanConfig): Week[] {
  const paces  = calcPaces(config.goalSeconds)
  const volumes = buildVolumes(config.weeklyKm)

  // Plan starts exactly 27 weeks before race date, snapped to Monday
  const raceDateObj  = new Date(config.raceDate + 'T12:00:00Z')
  const startApprox  = new Date(raceDateObj.getTime() - 188 * 86_400_000)
  const dow = startApprox.getUTCDay()
  const toMon = dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow
  startApprox.setUTCDate(startApprox.getUTCDate() + toMon)
  const planStart = startApprox.toISOString().slice(0, 10)

  return WEEK_TMPLS.map((tmpl, i) => {
    const weekNumber = i + 1
    const weekStart  = addDays(planStart, i * 7)
    const weekEnd    = addDays(weekStart, 6)
    const targetKm   = volumes[i]
    const isRaceWeek = weekNumber === 27

    let runs: PlannedRun[]

    // ── Race week (W27) ─────────────────────────────────────────────────────
    if (isRaceWeek) {
      const shakeoutKm = Math.max(4, Math.round(targetKm * 0.28))
      runs = [
        buildEasyRun(weekNumber, tmpl.phase, addDays(weekStart, 1), shakeoutKm),  // Tue
        buildEasyRun(weekNumber, tmpl.phase, addDays(weekStart, 3), shakeoutKm),  // Thu
        {
          weekNumber, phase: tmpl.phase,
          date: addDays(weekStart, 4), dayOfWeek: DOW[4],
          type: 'easy',
          targetDistanceKm: shakeoutKm,
          targetPaceMinPerKm: paces.mp,
          description: `Pre-race shakeout ${shakeoutKm} km. 15 min warm-up → 10 min at marathon pace (${fmtPace(paces.mp)}) → 10 min easy. Wake the legs up. Eat and sleep well tonight.`,
        },
        {
          weekNumber, phase: tmpl.phase,
          date: config.raceDate,
          dayOfWeek: DOW[raceDateObj.getUTCDay() === 0 ? 6 : raceDateObj.getUTCDay() - 1],
          type: 'race',
          targetDistanceKm: 42,
          targetPaceMinPerKm: paces.mp,
          description: `Race day — 42.195 km at ${fmtPace(paces.mp)}. Start conservative for the first 10 km, trust your training in the middle, give everything in the final 10 km. You are ready.`,
        },
      ]

    // ── Tune-up race week (W22) ─────────────────────────────────────────────
    } else if (tmpl.quality === 'tune_up') {
      const shakeoutKm = Math.max(5, Math.round(targetKm * 0.15))
      const recoveryKm = Math.max(6, Math.round(targetKm * 0.18))
      runs = [
        buildEasyRun(weekNumber, tmpl.phase, addDays(weekStart, 1), Math.max(8, Math.round(targetKm * 0.22))),
        {  // Thu: pre-race shakeout
          weekNumber, phase: tmpl.phase,
          date: addDays(weekStart, 3), dayOfWeek: DOW[3],
          type: 'easy',
          targetDistanceKm: shakeoutKm,
          targetPaceMinPerKm: undefined,
          description: `Pre-race shakeout ${shakeoutKm} km. Very easy and relaxed — 30–40 min. The goal is to loosen up, not train. Rest up this evening.`,
        },
        {  // Sat: half marathon tune-up race
          weekNumber, phase: tmpl.phase,
          date: addDays(weekStart, 5), dayOfWeek: DOW[5],
          type: 'race',
          targetDistanceKm: 21,
          targetPaceMinPerKm: paces.mp,
          description: `Tune-up half marathon. First 10 miles (16 km) at goal marathon pace (${fmtPace(paces.mp)}). Pick up the pace in the final 5K. This is a controlled dress rehearsal — test your gear, nutrition, and race-day routine.`,
        },
        {  // Sun: easy recovery
          weekNumber, phase: tmpl.phase,
          date: addDays(weekStart, 6), dayOfWeek: DOW[6],
          type: 'easy',
          targetDistanceKm: recoveryKm,
          targetPaceMinPerKm: undefined,
          description: `Post-race recovery ${recoveryKm} km. Very easy, the goal is flushing the legs. Walk breaks are fine. Rehydrate and refuel well today.`,
        },
      ]

    // ── Standard 4-run week ─────────────────────────────────────────────────
    } else {
      // Volume split: easy 17% · quality 21% · medium-long 26% · long 36%
      const longKm  = Math.min(38, Math.max(14, Math.round(targetKm * 0.36)))
      const mlKm    = Math.max(8,  Math.round(targetKm * 0.26))
      const qualKm  = Math.max(6,  Math.round(targetKm * 0.21))
      const easyKm  = Math.max(5,  Math.round(targetKm * 0.17))

      runs = [
        buildEasyRun(weekNumber, tmpl.phase, addDays(weekStart, 1), easyKm),     // Tue
        buildThursdayRun(weekNumber, tmpl.phase, addDays(weekStart, 3), qualKm, tmpl.quality, paces), // Thu
        {  // Sat: medium-long easy
          weekNumber, phase: tmpl.phase,
          date: addDays(weekStart, 5), dayOfWeek: DOW[5],
          type: 'medium_long',
          targetDistanceKm: mlKm,
          targetPaceMinPerKm: undefined,
          description: `Medium-long run ${mlKm} km. Easy aerobic effort throughout (${fmtPace(paces.easy)}). No pressure — just comfortable time on your feet.`,
        },
        buildLongRun(weekNumber, tmpl.phase, addDays(weekStart, 6), longKm, tmpl.longStyle, paces),  // Sun
      ]
    }

    return {
      weekNumber,
      phase:     tmpl.phase,
      startDate: weekStart,
      endDate:   weekEnd,
      targetKm,
      notes:     tmpl.notes,
      runs,
      isCutback: tmpl.isCutback,
    }
  })
}

// ─── Utility exports ──────────────────────────────────────────────────────────

/** Current week number (1–27); 0 = before start; 28 = after race */
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

/** Format seconds → "3:30" or "4:15:00" */
export function formatGoalTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (s === 0) return `${h}:${String(m).padStart(2,'0')}`
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

/** Parse "H:MM" or "H:MM:SS" → seconds */
export function parseGoalTime(str: string): number {
  const parts = str.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}
