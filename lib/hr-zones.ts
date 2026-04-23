// ─── Types ────────────────────────────────────────────────────────────────────

export interface ZoneConfig {
  zone1Max: number // Recovery upper bound (default 136 → zone is < 137)
  zone2Max: number // Aerobic Endurance upper bound
  zone3Max: number // Aerobic Power upper bound
  zone4Max: number // Threshold upper bound
  zone5Max: number // Anaerobic Endurance upper bound
  // Zone 6 (Anaerobic Power) = everything above zone5Max
}

export const DEFAULT_ZONES: ZoneConfig = {
  zone1Max: 136, // < 137
  zone2Max: 154, // 137–154
  zone3Max: 162, // 155–162
  zone4Max: 174, // 163–174
  zone5Max: 181, // 175–181
  // > 181 = Zone 6
}

export interface ZoneMeta {
  name:  string
  pct:   string   // percentage label (e.g. "< 80%")
  color: string   // display colour
}

export const ZONE_META: ZoneMeta[] = [
  { name: 'Recovery',            pct: '< 80%',      color: '#2ABFDB' },
  { name: 'Aerobic Endurance',   pct: '80–90%',     color: '#39C57B' },
  { name: 'Aerobic Power',       pct: '91–95%',     color: '#A8C62E' },
  { name: 'Threshold',           pct: '96–102%',    color: '#E8C02E' },
  { name: 'Anaerobic Endurance', pct: '103–106%',   color: '#EE6B17' },
  { name: 'Anaerobic Power',     pct: '> 106%',     color: '#D63232' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Which zone index (0–5) does a given HR value fall into? */
export function zoneIndex(hr: number, cfg: ZoneConfig): number {
  if (hr <= cfg.zone1Max) return 0
  if (hr <= cfg.zone2Max) return 1
  if (hr <= cfg.zone3Max) return 2
  if (hr <= cfg.zone4Max) return 3
  if (hr <= cfg.zone5Max) return 4
  return 5
}

/**
 * Compute seconds spent in each of the 6 zones from raw Strava stream data.
 * hrData and timeData must be parallel arrays (elapsed seconds & bpm at each point).
 */
export function computeZoneSeconds(
  hrData: number[],
  timeData: number[],
  cfg: ZoneConfig,
): number[] {
  const zones = [0, 0, 0, 0, 0, 0]
  for (let i = 1; i < hrData.length; i++) {
    const hr = hrData[i]
    if (!hr || hr < 30 || hr > 250) continue          // skip invalid readings
    const dt = timeData[i] - timeData[i - 1]
    if (dt <= 0 || dt > 300) continue                  // skip pauses / bad data
    zones[zoneIndex(hr, cfg)] += dt
  }
  return zones
}

/** Format seconds as "2h 34m" or "44m" */
export function fmtZoneTime(seconds: number): string {
  if (seconds <= 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/** Human-readable HR range label, e.g. "137–154" or "< 137" or "> 181" */
export function zoneBoundaryLabel(zoneIdx: number, cfg: ZoneConfig): string {
  const lo = [0, cfg.zone1Max + 1, cfg.zone2Max + 1, cfg.zone3Max + 1, cfg.zone4Max + 1, cfg.zone5Max + 1]
  const hi = [cfg.zone1Max, cfg.zone2Max, cfg.zone3Max, cfg.zone4Max, cfg.zone5Max, 999]
  if (zoneIdx === 0)   return `< ${cfg.zone1Max + 1} bpm`
  if (zoneIdx === 5)   return `> ${cfg.zone5Max} bpm`
  return `${lo[zoneIdx]}–${hi[zoneIdx]} bpm`
}

/** ISO week key from a date string: "2026-W04" */
export function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  // ISO week: Thursday of the week determines the year
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const wk = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`
}
