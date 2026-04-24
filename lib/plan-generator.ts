import { Week, PlannedRun, Phase, RunType } from '@/types'

// ─── Public config type ───────────────────────────────────────────────────────

export interface UserPlanConfig {
  raceDate:     string  // YYYY-MM-DD
  goalSeconds:  number  // e.g. 12600 for 3:30:00
  weeklyKm:     number  // athlete's current weekly training load
}

// ─── Pace calculations ────────────────────────────────────────────────────────

export interface PlanPaces {
  mp:        number  // marathon pace (min/km)
  threshold: number  // ~lactate threshold
  interval:  number  // ~VO2max effort
  easy:      number  // easy / recovery
}

export function calcPaces(goalSeconds: number): PlanPaces {
  const mp = goalSeconds / 42.195 / 60
  return {
    mp:        Math.round(mp * 100) / 100,
    threshold: Math.round(mp * 0.92 * 100) / 100,
    interval:  Math.round(mp * 0.85 * 100) / 100,
    easy:      Math.round((mp + 1.15) * 100) / 100,
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

function describe(type: RunType, km: number, pace?: number): string {
  switch (type) {
    case 'easy':
      return `Easy ${km} km. Fully conversational pace — HR under 145 bpm throughout.`
    case 'quality':
      if (!pace) return `Progression ${km} km. Start easy, build to a strong marathon effort in the final third.`
      const wu = Math.max(2, Math.round(km * 0.25))
      const main = km - wu * 2
      return `Quality ${km} km. ${wu} km warm-up → ${main} km at marathon pace (${fmtPace(pace)}) → ${wu} km cool-down.`
    case 'medium_long':
      return `Medium-long ${km} km. Easy aerobic effort. Build your comfort at distance.`
    case 'long':
      return `Long run ${km} km. Easy pace throughout. Practise race nutrition every 40 min.`
    case 'race':
      return `Race day — go get it! Start conservatively for the first 10 km, then trust your training.`
  }
}

// ─── 27-week periodisation template ──────────────────────────────────────────
// mult: weekly volume relative to user's weeklyKm baseline

type QKey = 'mp' | 'threshold' | 'interval' | 'race_sim'

interface WeekTmpl {
  phase:      Phase
  isCutback:  boolean
  mult:       number
  quality:    QKey
  notes:      string
}

const WEEK_TMPLS: WeekTmpl[] = [
  // ── BASE (W1–6) ────────────────────────────────────────────────────────────
  { phase:'base',    isCutback:false, mult:0.85, quality:'mp',
    notes:'First week of the plan. Find the rhythm of 4 runs a week — everything easy.' },
  { phase:'base',    isCutback:false, mult:0.92, quality:'mp',
    notes:'Build the aerobic base. First proper marathon-pace work on Thursday.' },
  { phase:'base',    isCutback:false, mult:1.00, quality:'mp',
    notes:'Steady base week. The long run is your weekend anchor — fuel every 40 min.' },
  { phase:'base',    isCutback:false, mult:1.08, quality:'mp',
    notes:'Biggest base week yet. Keep all runs controlled — aerobic only.' },
  { phase:'base',    isCutback:false, mult:1.15, quality:'mp',
    notes:'Final base push. You have built a solid aerobic foundation.' },
  { phase:'base',    isCutback:true,  mult:0.80, quality:'mp',
    notes:'Cutback — recover and consolidate. Legs will thank you next week.' },
  // ── BUILD (W7–12) ──────────────────────────────────────────────────────────
  { phase:'build',   isCutback:false, mult:1.10, quality:'threshold',
    notes:'Threshold work begins. Comfortably hard — you should be able to say a short sentence.' },
  { phase:'build',   isCutback:false, mult:1.18, quality:'threshold',
    notes:'Volume climbs. Threshold pace should feel controlled and purposeful.' },
  { phase:'build',   isCutback:false, mult:1.25, quality:'threshold',
    notes:'Long runs getting serious now. Fuel every 40 min without fail.' },
  { phase:'build',   isCutback:false, mult:1.32, quality:'threshold',
    notes:'Big build week — sleep and eat well this week. Recovery is training too.' },
  { phase:'build',   isCutback:false, mult:1.38, quality:'threshold',
    notes:'Near-peak build volume. You are getting stronger week by week.' },
  { phase:'build',   isCutback:true,  mult:1.02, quality:'threshold',
    notes:'Cutback. Let the build work sink in before the peak block.' },
  // ── PEAK (W13–18) ──────────────────────────────────────────────────────────
  { phase:'peak',    isCutback:false, mult:1.42, quality:'interval',
    notes:'Interval work starts. Speed makes marathon pace feel comfortable come race day.' },
  { phase:'peak',    isCutback:false, mult:1.48, quality:'interval',
    notes:'High volume and quality combined. Your biggest training block.' },
  { phase:'peak',    isCutback:false, mult:1.52, quality:'interval',
    notes:'35+ km long runs. Practise everything exactly as you will on race day.' },
  { phase:'peak',    isCutback:false, mult:1.55, quality:'interval',
    notes:'Maximum volume week. Almost through the hardest part of the plan.' },
  { phase:'peak',    isCutback:true,  mult:1.15, quality:'interval',
    notes:'Cutback before your final peak block. Active recovery.' },
  { phase:'peak',    isCutback:false, mult:1.55, quality:'race_sim',
    notes:'Race simulation — 25 km at goal marathon pace. Your final dress rehearsal.' },
  // ── SHARPEN (W19–24) ───────────────────────────────────────────────────────
  { phase:'sharpen', isCutback:false, mult:1.58, quality:'threshold',
    notes:'Sharpen phase. Quality over quantity — every run has a purpose.' },
  { phase:'sharpen', isCutback:false, mult:1.60, quality:'threshold',
    notes:'Final big week. After Sunday\'s long run you officially enter the taper.' },
  { phase:'sharpen', isCutback:true,  mult:1.18, quality:'mp',
    notes:'Taper begins. Reduce volume, keep your sharpness — do not add extra miles.' },
  { phase:'sharpen', isCutback:false, mult:1.50, quality:'threshold',
    notes:'Stay consistent. The fitness is already banked — protect it.' },
  { phase:'sharpen', isCutback:false, mult:1.55, quality:'mp',
    notes:'Last substantial long effort before the taper really bites.' },
  { phase:'taper',   isCutback:true,  mult:1.10, quality:'mp',
    notes:'Volume drops significantly. Trust the process — hay is in the barn.' },
  // ── TAPER (W25–26) ─────────────────────────────────────────────────────────
  { phase:'taper',   isCutback:false, mult:0.70, quality:'mp',
    notes:'Light and sharp. Add a few strides after easy runs to stay bouncy.' },
  { phase:'taper',   isCutback:false, mult:0.45, quality:'mp',
    notes:'Race week prep. Short easy runs, stay off your feet, sleep well.' },
  // ── RACE WEEK (W27) ────────────────────────────────────────────────────────
  { phase:'taper',   isCutback:false, mult:0.22, quality:'mp',
    notes:'Race week. Everything you have done has prepared you for this. Go get it.' },
]

// ─── Main generator ───────────────────────────────────────────────────────────

export function generatePlan(config: UserPlanConfig): Week[] {
  const paces = calcPaces(config.goalSeconds)

  // Plan starts exactly 27 weeks before race date (snapped to Monday)
  const raceDateObj = new Date(config.raceDate + 'T12:00:00Z')
  const startApprox = new Date(raceDateObj.getTime() - 188 * 86_400_000) // 188 = 27*7-1
  const dow = startApprox.getUTCDay() // 0=Sun 1=Mon …
  const toMon = dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow
  startApprox.setUTCDate(startApprox.getUTCDate() + toMon)
  const planStart = startApprox.toISOString().slice(0, 10)

  // Volume cap: never exceed ~120 km/week regardless of inputs
  const capKm = Math.min(config.weeklyKm, 75)

  return WEEK_TMPLS.map((tmpl, i) => {
    const weekNumber  = i + 1
    const weekStart   = addDays(planStart, i * 7)
    const weekEnd     = addDays(weekStart, 6)
    const targetKm    = Math.max(15, Math.round(capKm * tmpl.mult))
    const isRaceWeek  = weekNumber === 27

    let runs: PlannedRun[]

    if (isRaceWeek) {
      // Race week: Mon easy + Wed easy + Fri easy + Race on exact race date
      const easyKm = Math.max(4, Math.round(targetKm * 0.30))
      const slots: [number, RunType][] = [[1,'easy'],[3,'easy'],[5,'easy']]
      runs = [
        ...slots.map(([off, type]) => ({
          weekNumber,
          phase: tmpl.phase,
          date: addDays(weekStart, off),
          dayOfWeek: DOW[off],
          type,
          targetDistanceKm: easyKm,
          targetPaceMinPerKm: undefined,
          description: describe(type, easyKm),
        })),
        {
          weekNumber,
          phase: tmpl.phase,
          date: config.raceDate,
          dayOfWeek: DOW[new Date(config.raceDate + 'T12:00:00Z').getUTCDay() === 0 ? 6 : new Date(config.raceDate + 'T12:00:00Z').getUTCDay() - 1],
          type: 'race',
          targetDistanceKm: 42,
          targetPaceMinPerKm: paces.mp,
          description: describe('race', 42, paces.mp),
        },
      ]
    } else {
      // Standard 4-run week: Tue easy · Thu quality · Sat medium-long · Sun long
      const qPace = qualityPace(tmpl.quality, paces)
      const qType = tmpl.quality === 'interval' ? 'quality' : 'quality'

      const longKm   = Math.min(38, Math.max(14, Math.round(targetKm * 0.36)))
      const mlKm     = Math.max(8,  Math.round(targetKm * 0.26))
      const qualKm   = Math.max(6,  Math.round(targetKm * 0.21))
      const easyKm   = Math.max(5,  Math.round(targetKm * 0.17))

      runs = [
        {
          weekNumber, phase: tmpl.phase,
          date: addDays(weekStart, 1), dayOfWeek: DOW[1],
          type: 'easy', targetDistanceKm: easyKm, targetPaceMinPerKm: undefined,
          description: describe('easy', easyKm),
        },
        {
          weekNumber, phase: tmpl.phase,
          date: addDays(weekStart, 3), dayOfWeek: DOW[3],
          type: qType, targetDistanceKm: qualKm, targetPaceMinPerKm: qPace,
          description: describeQuality(tmpl.quality, qualKm, paces),
        },
        {
          weekNumber, phase: tmpl.phase,
          date: addDays(weekStart, 5), dayOfWeek: DOW[5],
          type: 'medium_long', targetDistanceKm: mlKm, targetPaceMinPerKm: undefined,
          description: describe('medium_long', mlKm),
        },
        {
          weekNumber, phase: tmpl.phase,
          date: addDays(weekStart, 6), dayOfWeek: DOW[6],
          type: 'long', targetDistanceKm: longKm, targetPaceMinPerKm: undefined,
          description: describe('long', longKm),
        },
      ]
    }

    return {
      weekNumber,
      phase: tmpl.phase,
      startDate: weekStart,
      endDate: weekEnd,
      targetKm,
      notes: tmpl.notes,
      runs,
      isCutback: tmpl.isCutback,
    }
  })
}

function qualityPace(key: QKey, paces: PlanPaces): number {
  if (key === 'threshold') return paces.threshold
  if (key === 'interval')  return paces.interval
  return paces.mp // mp or race_sim
}

function describeQuality(key: QKey, km: number, paces: PlanPaces): string {
  const wu = Math.max(2, Math.round(km * 0.25))
  const main = km - wu * 2
  switch (key) {
    case 'threshold':
      return `Threshold ${km} km. ${wu} km warm-up → ${main} km at threshold pace (${fmtPace(paces.threshold)}) → ${wu} km cool-down.`
    case 'interval':
      return `Intervals ${km} km. ${wu} km warm-up → ${Math.floor(main / 1)} km of 1 km reps at ${fmtPace(paces.interval)} with 90s jog recovery → ${wu} km cool-down.`
    case 'race_sim':
      return `Race simulation ${km} km. ${wu} km warm-up → ${main} km at marathon pace (${fmtPace(paces.mp)}) → ${wu} km cool-down. Treat it like race day.`
    default:
      return `Quality ${km} km. ${wu} km warm-up → ${main} km at marathon pace (${fmtPace(paces.mp)}) → ${wu} km cool-down.`
  }
}

// ─── Utility exports ──────────────────────────────────────────────────────────

/** Current week number (1–27) for a generated plan; 0 = before start; 28 = after race */
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
