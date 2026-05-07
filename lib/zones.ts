// ─── Intensity Zone Definitions ───────────────────────────────────────────────
// Aligned with the running-plan skill's 5-zone model.

export interface Zone {
  id:    number   // 1–5
  name:  string
  rpe:   string   // e.g. "3–4"
  hrPct: string   // e.g. "65–75%"
  feel:  string
}

export const ZONES: Zone[] = [
  { id: 1, name: 'Recovery',         rpe: '1–2',  hrPct: '<65%',   feel: 'Very easy, fully conversational'    },
  { id: 2, name: 'Easy / aerobic',   rpe: '3–4',  hrPct: '65–75%', feel: 'Easy, can hold full sentences'      },
  { id: 3, name: 'Moderate',         rpe: '5–6',  hrPct: '75–85%', feel: 'Comfortably hard'                   },
  { id: 4, name: 'Threshold',        rpe: '7–8',  hrPct: '85–92%', feel: 'Hard, few words only'               },
  { id: 5, name: 'VO₂max',           rpe: '9–10', hrPct: '>92%',   feel: 'Very hard, short bursts only'       },
]

// Primary zone for each run type
export const SESSION_ZONE: Record<string, number> = {
  easy:        2,
  medium_long: 2,
  long:        2,   // base Z2; MP-finish segments reach Z3
  tempo:       4,   // threshold
  interval:    5,   // VO2max
  quality:     4,   // legacy alias for tempo
  race:        4,   // marathon effort ≈ threshold
}

export function zoneLabel(zoneId: number): string {
  return `Z${zoneId}`
}

export function zoneForType(runType: string): number | undefined {
  return SESSION_ZONE[runType]
}
