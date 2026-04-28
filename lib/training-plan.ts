import { Week, PlannedRun, Phase, RunType } from '@/types'

// ─── Run override type ────────────────────────────────────────────────────────

export interface RunOverride {
  originalDate: string  // ISO YYYY-MM-DD
  runType:      string
  newDate:      string  // ISO YYYY-MM-DD
}

/**
 * Apply saved drag-and-drop overrides to a set of weeks.
 * Returns new Week/PlannedRun objects — does not mutate inputs.
 */
export function applyOverrides(weeks: Week[], overrides: RunOverride[]): Week[] {
  if (overrides.length === 0) return weeks
  return weeks.map((week) => {
    const runs = week.runs.map((run) => {
      const override = overrides.find(
        (o) => o.originalDate === run.date && o.runType === run.type
      )
      if (!override) return run
      const newDate = new Date(override.newDate + 'T12:00:00Z')
      const dayName = newDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
      return { ...run, date: override.newDate, dayOfWeek: dayName }
    })
    runs.sort((a, b) => a.date.localeCompare(b.date))
    return { ...week, runs }
  })
}

// Week 1 starts Monday April 27, 2026
// Race day: Sunday November 1, 2026 (27 weeks later)
export const PLAN_START_DATE = '2026-04-27'
export const RACE_DATE = '2026-11-01'

// Target paces (min/km)
export const PACES = {
  easy: undefined,            // no target — go by feel
  mp: 4.97,                   // Marathon Pace — sub 3:30 = 4:58/km
  threshold: 4.58,            // Threshold / tempo
  interval: 4.25,             // Interval / VO2max
}

interface RunDef {
  dayOffset: number           // days from Monday: 1=Tue, 3=Thu, 5=Sat, 6=Sun
  type: RunType
  km: number
  pace?: number               // min/km target — undefined = easy
  description: string
}

interface WeekDef {
  phase: Phase
  notes: string
  isCutback?: boolean
  runs: RunDef[]
}

// ─── 26-week plan definition ──────────────────────────────────────────────────

const weekDefs: WeekDef[] = [
  // ── PHASE 1: BASE (Weeks 1–6) ──────────────────────────────────────────────
  {
    // Week 1 — Apr 28
    phase: 'base',
    notes: 'First week back to structure. Run everything easy. Establish the rhythm of 4 days/week.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 7, description: 'Easy 7 km. No pace target — fully conversational.' },
      { dayOffset: 3, type: 'quality', km: 9, pace: PACES.mp, description: 'Progression: 5 km easy warm-up, then 4 km at marathon pace (4:58/km).' },
      { dayOffset: 5, type: 'medium_long', km: 11, description: 'Easy 11 km. Keep HR under 150. Flat route.' },
      { dayOffset: 6, type: 'long', km: 15, description: 'Easy long run 15 km. Eat and drink every 40 min — practice race nutrition.' },
    ],
  },
  {
    // Week 2 — May 5
    phase: 'base',
    notes: 'Build to 42 km. Introduce first proper tempo session.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 7, description: 'Easy 7 km recovery run.' },
      { dayOffset: 3, type: 'quality', km: 10, pace: PACES.threshold, description: 'Tempo: 2 km warm-up + 6 km continuous at threshold (4:35/km) + 2 km cool-down.' },
      { dayOffset: 5, type: 'medium_long', km: 12, description: 'Easy 12 km at comfortable effort. HR 135–148.' },
      { dayOffset: 6, type: 'long', km: 17, description: 'Easy long run 17 km. Last 2 km at marathon pace to finish strong.' },
    ],
  },
  {
    // Week 3 — May 12
    phase: 'base',
    notes: 'First intervals week. Keep recovery days truly easy.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 7, description: 'Easy 7 km. Recovery from long run.' },
      { dayOffset: 3, type: 'quality', km: 10, pace: PACES.interval, description: 'Intervals: 2 km warm-up + 3×2 km at interval pace (4:20/km) with 90 s rest + 2 km cool-down.' },
      { dayOffset: 5, type: 'medium_long', km: 13, description: 'Easy-moderate 13 km. Comfortable effort throughout.' },
      { dayOffset: 6, type: 'long', km: 18, description: 'Easy long run 18 km. New longest run of this block — take it easy.' },
    ],
  },
  {
    // Week 4 — May 19
    phase: 'base',
    notes: 'Biggest base week. Marathon pace starts to feel natural.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 8, description: 'Easy 8 km. Keep it very relaxed.' },
      { dayOffset: 3, type: 'quality', km: 11, pace: PACES.mp, description: 'Marathon pace run: 3 km warm-up + 6 km at MP (4:58/km) + 2 km cool-down. Focus on feeling controlled.' },
      { dayOffset: 5, type: 'medium_long', km: 13, description: 'Easy-moderate 13 km. Practice running at 5:30–6:00/km without watching pace.' },
      { dayOffset: 6, type: 'long', km: 20, description: 'Long run 20 km. Last 3 km at marathon pace. First 20-km run of the plan — big milestone.' },
    ],
  },
  {
    // Week 5 — May 26
    phase: 'base',
    notes: 'Peak base week. High volume for this phase. Long run hits 22 km.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 8, description: 'Easy 8 km. Do not push — you have a hard session Thursday.' },
      { dayOffset: 3, type: 'quality', km: 11, pace: PACES.interval, description: 'Intervals: 2 km warm-up + 4×2 km at 4:20/km with 2 min rest + 2 km cool-down.' },
      { dayOffset: 5, type: 'medium_long', km: 14, description: 'Easy-moderate 14 km. Small negative split — start slower than you want to finish.' },
      { dayOffset: 6, type: 'long', km: 22, description: 'Easy long run 22 km. Keep HR under 150 throughout. Gels/drink every 40 min.' },
    ],
  },
  {
    // Week 6 — Jun 2 — CUTBACK
    phase: 'base',
    notes: 'Cutback week — drop to 40% less volume. Let the last 5 weeks consolidate. No quality session.',
    isCutback: true,
    runs: [
      { dayOffset: 1, type: 'easy', km: 6, description: 'Easy 6 km. Very relaxed. This is recovery.' },
      { dayOffset: 3, type: 'easy', km: 8, description: 'Easy-moderate 8 km. A gentle progression — nothing hard.' },
      { dayOffset: 5, type: 'medium_long', km: 10, description: 'Easy 10 km. Enjoy it — no pressure.' },
      { dayOffset: 6, type: 'long', km: 15, description: 'Easy long run 15 km. Legs should feel fresh after the lighter week.' },
    ],
  },

  // ── PHASE 2: BUILD (Weeks 7–14) ────────────────────────────────────────────
  {
    // Week 7 — Jun 9
    phase: 'build',
    notes: 'Enter build phase. Quality sessions get harder. Long runs over 22 km.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 8, description: 'Easy 8 km. Controlled effort to prepare for Thursday.' },
      { dayOffset: 3, type: 'quality', km: 11, pace: PACES.threshold, description: 'Tempo: 2 km warm-up + 7 km at threshold (4:35/km) + 2 km cool-down. Longest continuous tempo yet.' },
      { dayOffset: 5, type: 'medium_long', km: 14, description: 'Easy 14 km with last 4 km at marathon pace (4:58/km) to practice race-day feeling on tired legs.' },
      { dayOffset: 6, type: 'long', km: 23, description: 'Easy long run 23 km. Build on last block. Steady aerobic effort.' },
    ],
  },
  {
    // Week 8 — Jun 16
    phase: 'build',
    notes: 'Cruise interval week. Long run has a marathon pace section.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 9, description: 'Easy 9 km. Comfortable. HR under 145.' },
      { dayOffset: 3, type: 'quality', km: 12, pace: PACES.threshold, description: 'Cruise intervals: 2 km warm-up + 2×5 km at threshold (4:35/km) with 3 min rest + 2 km cool-down.' },
      { dayOffset: 5, type: 'medium_long', km: 15, description: 'Easy-moderate 15 km. Controlled aerobic effort.' },
      { dayOffset: 6, type: 'long', km: 24, description: 'Long run 24 km with last 5 km at marathon pace. This trains your body to push when fatigued.' },
    ],
  },
  {
    // Week 9 — Jun 23
    phase: 'build',
    notes: 'VO2max week. Sharp intervals build raw speed that underpins marathon fitness.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 9, description: 'Easy 9 km. Gentle recovery after last week\'s long run.' },
      { dayOffset: 3, type: 'quality', km: 12, pace: PACES.interval, description: 'VO2max: 2 km warm-up + 5×1.6 km at interval pace (4:20/km) with 90 s rest + 2 km cool-down.' },
      { dayOffset: 5, type: 'medium_long', km: 15, description: 'Easy-moderate 15 km. Last 3 km slightly faster.' },
      { dayOffset: 6, type: 'long', km: 24, description: 'Easy long run 24 km. Keep it honest — truly easy. Today is about time on feet.' },
    ],
  },
  {
    // Week 10 — Jun 30 — CUTBACK
    phase: 'build',
    notes: 'Cutback week. Absorb the last 3 hard weeks. Short MP run to stay sharp.',
    isCutback: true,
    runs: [
      { dayOffset: 1, type: 'easy', km: 7, description: 'Easy 7 km recovery.' },
      { dayOffset: 3, type: 'quality', km: 9, pace: PACES.mp, description: 'Confidence MP run: 2 km warm-up + 5 km at marathon pace (4:58/km) + 2 km cool-down. Should feel controlled and sustainable.' },
      { dayOffset: 5, type: 'medium_long', km: 12, description: 'Easy 12 km. Enjoy the lower volume.' },
      { dayOffset: 6, type: 'long', km: 18, description: 'Long run 18 km with last 4 km at marathon pace.' },
    ],
  },
  {
    // Week 11 — Jul 7
    phase: 'build',
    notes: 'Volume surge. Long run hits 26 km. Threshold blocks.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 10, description: 'Easy 10 km. Legs should feel fresh from cutback week.' },
      { dayOffset: 3, type: 'quality', km: 13, pace: PACES.threshold, description: 'Threshold blocks: 2 km warm-up + 3×3 km at threshold (4:35/km) with 90 s rest + 2 km cool-down.' },
      { dayOffset: 5, type: 'medium_long', km: 16, description: 'Easy 16 km with last 5 km at marathon pace. Strong finish practice.' },
      { dayOffset: 6, type: 'long', km: 26, description: 'Long run 26 km — first time this far. Easy throughout. Carry gels. Landmark run.' },
    ],
  },
  {
    // Week 12 — Jul 14
    phase: 'build',
    notes: 'Biggest build week so far. Cruise intervals step up. Long run 28 km.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 10, description: 'Easy 10 km. Well-earned after 26 km last Sunday.' },
      { dayOffset: 3, type: 'quality', km: 13, pace: PACES.threshold, description: 'Cruise intervals: 2 km warm-up + 2×6 km at threshold (4:40/km) with 3 min rest + 1 km cool-down.' },
      { dayOffset: 5, type: 'medium_long', km: 16, description: 'Easy-moderate 16 km. Aerobic base run at comfortable effort.' },
      { dayOffset: 6, type: 'long', km: 28, description: 'Long run 28 km. This is serious now. Easy effort — stay in zone 2. Eat and drink on schedule.' },
    ],
  },
  {
    // Week 13 — Jul 21
    phase: 'build',
    notes: 'Peak of build phase. Marathon-specific Saturday. Race-simulation long run.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 10, description: 'Easy 10 km. Slow and steady. HR under 140.' },
      { dayOffset: 3, type: 'quality', km: 13, pace: PACES.interval, description: 'Sharpener: 2 km warm-up + 6×1 km at interval pace (4:15/km) with 90 s rest + 2 km cool-down.' },
      { dayOffset: 5, type: 'medium_long', km: 17, description: 'Marathon-pace Saturday: 4 km easy + 10 km at MP (4:58/km) + 3 km easy. First significant MP block on a medium long day.' },
      { dayOffset: 6, type: 'long', km: 28, description: 'Long run 28 km with last 8 km at marathon pace. This is your hardest session of the build phase. Earn it.' },
    ],
  },
  {
    // Week 14 — Jul 28 — CUTBACK
    phase: 'build',
    notes: 'Cutback before peak block. Rest is training. Bounce back strong.',
    isCutback: true,
    runs: [
      { dayOffset: 1, type: 'easy', km: 8, description: 'Easy 8 km. Body is adapting — let it.' },
      { dayOffset: 3, type: 'quality', km: 10, pace: PACES.mp, description: 'MP confidence run: 3 km warm-up + 5 km at marathon pace (4:58/km) + 2 km cool-down. Should feel easy now.' },
      { dayOffset: 5, type: 'medium_long', km: 12, description: 'Easy 12 km. No pressure. Enjoy the lower volume.' },
      { dayOffset: 6, type: 'long', km: 20, description: 'Easy long run 20 km. Finish feeling you could have gone further.' },
    ],
  },

  // ── PHASE 3: PEAK (Weeks 15–20) ────────────────────────────────────────────
  {
    // Week 15 — Aug 4
    phase: 'peak',
    notes: 'Welcome to peak phase. Volume climbs to 65+ km/week. Grit required.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 10, description: 'Easy 10 km. Legs should feel bouncy after cutback.' },
      { dayOffset: 3, type: 'quality', km: 14, pace: PACES.threshold, description: 'Long threshold: 2 km warm-up + 3×4 km at threshold (4:35/km) with 2 min rest + 2 km cool-down.' },
      { dayOffset: 5, type: 'medium_long', km: 16, description: 'Marathon day simulation: 4 km easy + 8 km at MP (4:58/km) + 4 km easy. Practice race-morning routine.' },
      { dayOffset: 6, type: 'long', km: 28, description: 'Easy long run 28 km. Steady zone 2. Nutrition every 40 min.' },
    ],
  },
  {
    // Week 16 — Aug 11
    phase: 'peak',
    notes: 'Peak block week 2. First 30 km long run. This is a landmark.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 11, description: 'Easy 11 km. Mind the fatigue building up.' },
      { dayOffset: 3, type: 'quality', km: 14, pace: PACES.threshold, description: 'Cruise intervals: 2 km warm-up + 2×6 km at threshold (4:40/km) with 3 min rest + 2 km cool-down.' },
      { dayOffset: 5, type: 'medium_long', km: 17, description: 'Easy-moderate 17 km. Controlled. Heart rate is your guide, not pace.' },
      { dayOffset: 6, type: 'long', km: 30, description: 'Long run 30 km with last 8 km at marathon pace. Biggest day of training. Stay calm, eat early, finish strong.' },
    ],
  },
  {
    // Week 17 — Aug 18
    phase: 'peak',
    notes: 'The hardest week is approaching. Biggest MP block so far on Saturday.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 11, description: 'Easy 11 km. You earned a gentle day.' },
      { dayOffset: 3, type: 'quality', km: 15, pace: PACES.threshold, description: 'Long threshold: 2 km warm-up + 3×5 km at threshold (4:40/km) with 2 min rest + 2 km cool-down.' },
      { dayOffset: 5, type: 'medium_long', km: 18, description: 'Marathon simulation: 5 km easy + 10 km at MP (4:58/km) + 3 km easy. This teaches your body to hold pace when tired.' },
      { dayOffset: 6, type: 'long', km: 30, description: 'Easy long run 30 km. Mostly zone 2. The double 30 km weekend is the core of peak training.' },
    ],
  },
  {
    // Week 18 — Aug 25 — PEAK WEEK
    phase: 'peak',
    notes: 'PEAK WEEK — highest volume of the entire plan. You will be tired. That is the point.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 12, description: 'Easy 12 km. Slow, patient, relaxed.' },
      { dayOffset: 3, type: 'quality', km: 16, pace: PACES.interval, description: 'Peak quality: 2 km warm-up + 5×2 km at interval pace (4:20/km) with 90 s rest + 2 km cool-down. Hardest session of the plan.' },
      { dayOffset: 5, type: 'medium_long', km: 18, description: 'MP Saturday: 6 km easy + 10 km at MP (4:58/km) + 2 km cool-down. Running MP on tired legs is exactly the point.' },
      { dayOffset: 6, type: 'long', km: 32, description: 'Long run 32 km — your longest training run ever. Easy pace. Treat it like a race in terms of nutrition and mindset. This is where the sub-3:30 is built.' },
    ],
  },
  {
    // Week 19 — Sep 1
    phase: 'peak',
    notes: 'Slight volume reduction after peak week. Long run has a significant MP finish.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 11, description: 'Easy 11 km. Probably tired — that is fine. Keep it easy.' },
      { dayOffset: 3, type: 'quality', km: 14, pace: PACES.threshold, description: 'Threshold: 2 km warm-up + 4×3 km at threshold (4:35/km) with 2 min rest + 2 km cool-down.' },
      { dayOffset: 5, type: 'medium_long', km: 17, description: 'Easy-moderate 17 km. Aerobic base run — no quality goals.' },
      { dayOffset: 6, type: 'long', km: 28, description: 'Long run 28 km with last 10 km at marathon pace. This is the closest thing to a race simulation you will do.' },
    ],
  },
  {
    // Week 20 — Sep 8 — CUTBACK
    phase: 'peak',
    notes: 'Post-peak cutback. You have done the hard work. Now absorb it.',
    isCutback: true,
    runs: [
      { dayOffset: 1, type: 'easy', km: 8, description: 'Easy 8 km. Full recovery pace.' },
      { dayOffset: 3, type: 'quality', km: 10, pace: PACES.mp, description: 'MP check-in: 3 km warm-up + 5 km at marathon pace (4:58/km) + 2 km cool-down. Check how MP feels — it should feel manageable.' },
      { dayOffset: 5, type: 'medium_long', km: 13, description: 'Easy 13 km. Relaxed and controlled.' },
      { dayOffset: 6, type: 'long', km: 20, description: 'Easy long run 20 km. Enjoy the drop in distance. Body is adapting.' },
    ],
  },

  // ── PHASE 4: SHARPEN (Weeks 21–24) ─────────────────────────────────────────
  {
    // Week 21 — Sep 15
    phase: 'sharpen',
    notes: 'Sharpen phase — volume drops, sharpness stays. Race specific. Mind gets focused.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 9, description: 'Easy 9 km. Legs feeling fresh after cutback.' },
      { dayOffset: 3, type: 'quality', km: 12, pace: PACES.interval, description: 'Sharpener: 2 km warm-up + 5×1 km at interval pace (4:10/km) with 90 s rest + 2 km cool-down. Short but sharp.' },
      { dayOffset: 5, type: 'medium_long', km: 14, description: 'MP Saturday: 4 km easy + 8 km at MP (4:58/km) + 2 km easy. Feeling comfortable at race pace is the goal.' },
      { dayOffset: 6, type: 'long', km: 24, description: 'Easy long run 24 km. Last very long run of the plan. Enjoy it.' },
    ],
  },
  {
    // Week 22 — Sep 22
    phase: 'sharpen',
    notes: 'Consider a tune-up half marathon race this weekend instead of the long run. It is ideal preparation.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 8, description: 'Easy 8 km. Light legs — big weekend coming.' },
      { dayOffset: 3, type: 'quality', km: 11, pace: PACES.mp, description: 'MP tempo: 3 km warm-up + 6 km at marathon pace (4:58/km) + 2 km cool-down. Smooth and controlled.' },
      { dayOffset: 5, type: 'medium_long', km: 13, description: 'Easy 13 km. Save energy for Sunday.' },
      { dayOffset: 6, type: 'long', km: 22, description: 'Long run 22 km with last 8 km at MP — OR run a half marathon race instead. A race gives you real feedback on fitness and race-day execution.' },
    ],
  },
  {
    // Week 23 — Sep 29
    phase: 'sharpen',
    notes: 'Final hard week. Keep quality sharp but volume continues dropping.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 8, description: 'Easy 8 km.' },
      { dayOffset: 3, type: 'quality', km: 12, pace: PACES.interval, description: 'Final interval session: 2 km warm-up + 4×2 km at interval pace (4:20/km) with 2 min rest + 2 km cool-down.' },
      { dayOffset: 5, type: 'medium_long', km: 13, description: 'Easy 13 km. Relaxed aerobic run.' },
      { dayOffset: 6, type: 'long', km: 20, description: 'Long run 20 km. Fully easy. No MP sections. Just cover the distance comfortably.' },
    ],
  },
  {
    // Week 24 — Oct 6
    phase: 'sharpen',
    notes: 'Taper begins. Confidence runs only. Volume drops sharply.',
    isCutback: true,
    runs: [
      { dayOffset: 1, type: 'easy', km: 8, description: 'Easy 8 km. Light and bouncy.' },
      { dayOffset: 3, type: 'quality', km: 10, pace: PACES.mp, description: 'Race pace confidence: 2 km warm-up + 3×3 km at MP (4:58/km) with 2 min rest + 1 km cool-down. This pace should feel easy.' },
      { dayOffset: 5, type: 'medium_long', km: 10, description: 'Easy 10 km. No pressure. The work is done.' },
      { dayOffset: 6, type: 'long', km: 18, description: 'Long run 18 km. Fully easy. Last proper long run before the race.' },
    ],
  },

  // ── PHASE 5: TAPER (Weeks 25–27) ───────────────────────────────────────────
  {
    // Week 25 — Oct 13
    phase: 'taper',
    notes: 'Deep taper. Legs may feel heavy or restless — that is normal. Trust the process.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 6, description: 'Easy 6 km. Keep it slow and short.' },
      { dayOffset: 3, type: 'quality', km: 8, pace: PACES.mp, description: 'MP tune-up: 2 km warm-up + 3 km at MP + 2 km easy + 4×100 m strides. Remind your legs what race pace feels like.' },
      { dayOffset: 5, type: 'medium_long', km: 7, description: 'Easy 7 km. Nothing heroic. Stay off your feet otherwise.' },
      { dayOffset: 6, type: 'long', km: 14, description: 'Long run 14 km, fully easy. Resist all urge to push. The race is 16 days away.' },
    ],
  },
  {
    // Week 26 — Oct 19 — PRE-RACE WEEK
    phase: 'taper',
    notes: 'Final week before race week. Very light — keep the legs ticking over but nothing that causes fatigue. Sleep is your best training now.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 5, description: 'Easy 5 km + 4×100 m strides. Keep the engine ticking. Race is 10 days away.' },
      { dayOffset: 3, type: 'easy', km: 4, description: 'Easy 4 km. Gentle jog. Nothing more. Stay off your feet the rest of the day.' },
      { dayOffset: 5, type: 'easy', km: 6, description: 'Easy 6 km with 4×100 m strides at the end. Wear your race kit and race shoes — do a quick systems check.' },
      { dayOffset: 6, type: 'easy', km: 4, description: 'Easy 4 km. Last run with any real substance. Enjoy it — next Sunday is the big one.' },
    ],
  },
  {
    // Week 27 — Oct 26 — RACE WEEK (race Sunday November 1)
    phase: 'taper',
    notes: 'Race week. Sleep, eat well, rest. Everything this week is just maintenance. The work is done — trust it.',
    runs: [
      { dayOffset: 1, type: 'easy', km: 4, description: 'Easy 4 km + 4×100 m strides. Keep the engine warm. Race is 5 days away.' },
      { dayOffset: 3, type: 'easy', km: 3, description: 'Easy 3 km. Gentle jog only. Stay loose, stay calm.' },
      { dayOffset: 5, type: 'easy', km: 2, description: 'Pre-race shake-out: easy 2 km + 4×100 m strides. Wear race kit, run 60 sec at race pace to feel ready. Then rest completely.' },
      { dayOffset: 6, type: 'race', km: 42.2, pace: PACES.mp, description: '🏁 RACE DAY — November 1 — Sub 3:30 target. Start conservative (first 5 km at 5:05/km), lock into 4:58/km from km 5–35, then empty the tank. You are ready.' },
    ],
  },
]

// ─── Date helpers ─────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// ─── Build the full plan ──────────────────────────────────────────────────────

export const trainingPlan: Week[] = weekDefs.map((def, i) => {
  const weekNumber = i + 1
  const startDate = addDays(PLAN_START_DATE, i * 7)
  const endDate = addDays(startDate, 6)

  const runs: PlannedRun[] = def.runs.map((r) => {
    const date = addDays(startDate, r.dayOffset)
    const dayOfWeek = DAY_NAMES[r.dayOffset]
    return {
      weekNumber,
      phase: def.phase,
      date,
      dayOfWeek,
      type: r.type,
      targetDistanceKm: r.km,
      targetPaceMinPerKm: r.pace,
      description: r.description,
    }
  })

  const targetKm = runs.reduce((sum, r) => sum + r.targetDistanceKm, 0)

  return {
    weekNumber,
    phase: def.phase,
    startDate,
    endDate,
    targetKm: Math.round(targetKm),
    notes: def.notes,
    runs,
    isCutback: def.isCutback ?? false,
  }
})

// Get the current week number based on today's date
export function getCurrentWeekNumber(): number {
  const today = new Date().toISOString().slice(0, 10)
  if (today < PLAN_START_DATE) return 0
  if (today > RACE_DATE) return 27

  const start = new Date(PLAN_START_DATE)
  const now = new Date(today)
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.floor(diffDays / 7) + 1
}

// Format pace for display e.g. 4.97 → "4:58/km"
export function formatPaceDisplay(paceMinPerKm: number): string {
  const min = Math.floor(paceMinPerKm)
  const sec = Math.round((paceMinPerKm - min) * 60)
  return `${min}:${String(sec).padStart(2, '0')}/km`
}

// Format a distance value respecting the user's preferred units
export function formatDistance(km: number, units: 'km' | 'miles' = 'km'): string {
  if (units === 'miles') return `${(km * 0.621371).toFixed(1)} mi`
  return `${Math.round(km)} km`
}

// Format a distance value with one decimal place (for logged km)
export function formatDistanceExact(km: number, units: 'km' | 'miles' = 'km'): string {
  if (units === 'miles') return `${(km * 0.621371).toFixed(1)} mi`
  return `${km.toFixed(1)} km`
}

export const PHASE_LABELS: Record<string, string> = {
  base: 'Base',
  build: 'Build',
  peak: 'Peak',
  sharpen: 'Sharpen',
  taper: 'Taper',
}

export const RUN_TYPE_LABELS: Record<string, string> = {
  easy:        'Easy',
  quality:     'Quality',
  medium_long: 'Medium Long',
  long:        'Long Run',
  race:        'RACE',
  strength:    'Strength',
}
