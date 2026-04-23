import { redirect } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { getSession } from '@/lib/session'
import { getActualRuns } from '@/lib/strava'

// ─── Config ──────────────────────────────────────────────────────────────────
const YEAR        = 2026
const YEAR_START  = `${YEAR}-01-01`
const YEAR_END    = `${YEAR}-12-31`
const DAYS_IN_YEAR = 365   // 2026 is not a leap year
const GOAL_KM     = 1000

// ─── Chart geometry ───────────────────────────────────────────────────────────
const C = { left: 48, top: 16, right: 576, bottom: 140 }
const CW = C.right - C.left   // 528
const CH = C.bottom - C.top   // 124

function dayOfYear(dateStr: string): number {
  const d     = new Date(dateStr + 'T00:00:00')
  const start = new Date(`${YEAR}-01-01T00:00:00`)
  return Math.round((d.getTime() - start.getTime()) / 86_400_000)
}

function dx(day: number)              { return C.left + (day / (DAYS_IN_YEAR - 1)) * CW }
function dy(val: number, max: number) { return C.bottom - (val / max) * CH }

// Month boundaries (day-of-year for the 1st of each month, 2026)
const MONTHS = [
  { label: 'Jan', day: 0   },
  { label: 'Feb', day: 31  },
  { label: 'Mar', day: 59  },
  { label: 'Apr', day: 90  },
  { label: 'May', day: 120 },
  { label: 'Jun', day: 151 },
  { label: 'Jul', day: 181 },
  { label: 'Aug', day: 212 },
  { label: 'Sep', day: 243 },
  { label: 'Oct', day: 273 },
  { label: 'Nov', day: 304 },
  { label: 'Dec', day: 334 },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function StatisticsPage() {
  const session = await getSession()
  if (!session) redirect('/')

  // Fetch all runs for the current year (includes pre-plan runs)
  const runs = await getActualRuns(session.userId, YEAR_START, YEAR_END)

  // ── Compute cumulative points ──────────────────────────────────────────────
  const today    = new Date().toISOString().slice(0, 10)
  const todayDay = Math.min(dayOfYear(today), DAYS_IN_YEAR - 1)

  // Group by day, then build cumulative series
  const dailyKm = new Map<number, number>()
  for (const run of runs) {
    const d = dayOfYear(run.runDate)
    dailyKm.set(d, (dailyKm.get(d) ?? 0) + run.distanceKm)
  }

  // Sorted array of {day, cumKm}
  const sortedDays = [...dailyKm.entries()].sort(([a], [b]) => a - b)
  let cum = 0
  const cumulativePoints: Array<{ day: number; km: number }> = [{ day: 0, km: 0 }]
  for (const [day, km] of sortedDays) {
    cum += km
    cumulativePoints.push({ day, km: cum })
  }
  // Extend flat line to today if today is beyond last run
  const lastPoint = cumulativePoints[cumulativePoints.length - 1]
  if (lastPoint.day < todayDay) {
    cumulativePoints.push({ day: todayDay, km: lastPoint.km })
  }

  const totalKm   = Math.round(cum * 10) / 10
  const toGoKm    = Math.max(0, GOAL_KM - totalKm)
  const expectedKm = Math.round((todayDay / (DAYS_IN_YEAR - 1)) * GOAL_KM * 10) / 10
  const diffKm    = Math.round((totalKm - expectedKm) * 10) / 10
  const isAhead   = diffKm >= 0
  const pctDone   = Math.min(100, Math.round((totalKm / GOAL_KM) * 100))

  // Max Y for chart (at least the goal, or actual if over goal)
  const maxY = Math.max(GOAL_KM, totalKm * 1.05)

  // ── SVG paths ─────────────────────────────────────────────────────────────
  const plannedPath =
    `M ${dx(0).toFixed(1)} ${dy(0, maxY).toFixed(1)} ` +
    `L ${dx(DAYS_IN_YEAR - 1).toFixed(1)} ${dy(GOAL_KM, maxY).toFixed(1)}`

  const actualLinePath = cumulativePoints
    .map(({ day, km }, i) =>
      `${i === 0 ? 'M' : 'L'} ${dx(day).toFixed(1)} ${dy(km, maxY).toFixed(1)}`
    )
    .join(' ')

  const areaPath =
    actualLinePath +
    ` L ${dx(cumulativePoints[cumulativePoints.length - 1].day).toFixed(1)} ${dy(0, maxY).toFixed(1)}` +
    ` L ${dx(0).toFixed(1)} ${dy(0, maxY).toFixed(1)} Z`

  // Current dot position
  const dotX = dx(cumulativePoints[cumulativePoints.length - 1].day)
  const dotY = dy(totalKm, maxY)

  // ── Y-axis labels (0, 250, 500, 750, 1000) ────────────────────────────────
  const yLabels = [0, 250, 500, 750, 1000].filter((v) => v <= maxY + 50)

  return (
    <div style={{ minHeight: '100vh', background: '#F5F3EC' }}>
      <Navigation userName={session.name} />

      <main className="max-w-3xl mx-auto px-4 py-6">

        {/* Page title */}
        <div className="mb-6">
          <h1
            className="text-2xl"
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: '#1E1611' }}
          >
            Statistics
          </h1>
          <p className="text-sm mt-1" style={{ color: '#4A5427' }}>
            {YEAR} · Running distance goal
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {/* Current */}
          <div className="rounded-2xl p-4" style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#4A5427' }}>
              Current
            </div>
            <div
              className="text-2xl leading-none mb-1 tabular-nums"
              style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.04em', color: '#1E1611' }}
            >
              {totalKm.toLocaleString('en')}
            </div>
            <div className="text-[11px]" style={{ color: '#736554' }}>km this year</div>
          </div>

          {/* To go */}
          <div className="rounded-2xl p-4" style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#4A5427' }}>
              To Go
            </div>
            <div
              className="text-2xl leading-none mb-1 tabular-nums"
              style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.04em', color: '#1E1611' }}
            >
              {toGoKm > 0 ? toGoKm.toLocaleString('en') : '🏁'}
            </div>
            <div className="text-[11px]" style={{ color: '#736554' }}>
              {toGoKm > 0 ? `of ${GOAL_KM.toLocaleString('en')} km goal` : 'Goal reached!'}
            </div>
          </div>

          {/* Ahead / Behind */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: '#EDE9DE',
              border: isAhead ? '1px solid rgba(74,84,39,0.20)' : '1px solid rgba(238,107,23,0.25)',
            }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#4A5427' }}>
              {isAhead ? 'Ahead of plan' : 'Behind plan'}
            </div>
            <div
              className="text-2xl leading-none mb-1 tabular-nums"
              style={{
                fontFamily: 'Nohemi, Inter, sans-serif',
                fontWeight: 600,
                letterSpacing: '-0.04em',
                color: isAhead ? '#4A5427' : '#EE6B17',
              }}
            >
              {Math.abs(diffKm)}
            </div>
            <div className="text-[11px]" style={{ color: '#736554' }}>
              km vs expected pace
            </div>
          </div>
        </div>

        {/* ── Progress bar + pct ── */}
        <div className="rounded-2xl p-5 mb-5" style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}>
              Goal: {GOAL_KM.toLocaleString('en')} km
            </span>
            <span className="text-sm font-bold tabular-nums" style={{ color: pctDone >= 100 ? '#4A5427' : '#EE6B17' }}>
              {pctDone}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(43,49,23,0.08)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${pctDone}%`,
                background: pctDone >= 100 ? '#4A5427' : '#EE6B17',
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px]" style={{ color: '#736554' }}>
            <span>Jan 1</span>
            <span>Dec 31</span>
          </div>
        </div>

        {/* ── Chart ── */}
        <div className="rounded-2xl p-5" style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, color: '#1E1611' }}
            >
              Distance over {YEAR}
            </h2>
            <div className="flex items-center gap-3 text-[10px]" style={{ color: '#736554' }}>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-0.5 rounded" style={{ background: '#EE6B17' }} />
                Actual
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-0 border-t border-dashed" style={{ borderColor: '#A09880' }} />
                Goal pace
              </span>
            </div>
          </div>

          <svg
            viewBox="0 0 624 175"
            className="w-full"
            style={{ overflow: 'visible' }}
            aria-label={`Running distance chart for ${YEAR}`}
          >
            {/* Month grid lines */}
            {MONTHS.map(({ label, day }) => (
              <g key={label}>
                <line
                  x1={dx(day)} y1={C.top}
                  x2={dx(day)} y2={C.bottom}
                  stroke="rgba(43,49,23,0.06)"
                  strokeWidth="1"
                />
                <text
                  x={dx(day)} y={C.bottom + 16}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#A09880"
                  fontFamily="system-ui, sans-serif"
                >
                  {label}
                </text>
              </g>
            ))}

            {/* Y-axis labels + horizontal guides */}
            {yLabels.map((v) => (
              <g key={v}>
                <line
                  x1={C.left} y1={dy(v, maxY)}
                  x2={C.right} y2={dy(v, maxY)}
                  stroke="rgba(43,49,23,0.05)"
                  strokeWidth="1"
                />
                <text
                  x={C.left - 6} y={dy(v, maxY) + 3.5}
                  textAnchor="end"
                  fontSize="9"
                  fill="#A09880"
                  fontFamily="system-ui, sans-serif"
                >
                  {v}
                </text>
              </g>
            ))}

            {/* Planned trajectory (dashed) */}
            <path
              d={plannedPath}
              fill="none"
              stroke="#C4B99A"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />

            {/* Area fill under actual line */}
            {totalKm > 0 && (
              <path
                d={areaPath}
                fill="rgba(238,107,23,0.08)"
              />
            )}

            {/* Actual line */}
            {totalKm > 0 && (
              <path
                d={actualLinePath}
                fill="none"
                stroke="#EE6B17"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Today dot */}
            {totalKm > 0 && (
              <>
                <circle cx={dotX} cy={dotY} r="6" fill="rgba(238,107,23,0.20)" />
                <circle cx={dotX} cy={dotY} r="3.5" fill="#EE6B17" />
              </>
            )}

            {/* No-data placeholder */}
            {totalKm === 0 && (
              <text
                x={(C.left + C.right) / 2}
                y={(C.top + C.bottom) / 2}
                textAnchor="middle"
                fontSize="12"
                fill="#C4B99A"
                fontFamily="system-ui, sans-serif"
              >
                No runs synced yet
              </text>
            )}

            {/* Chart border box */}
            <rect
              x={C.left} y={C.top}
              width={CW} height={CH}
              fill="none"
              stroke="rgba(43,49,23,0.06)"
              strokeWidth="1"
              rx="2"
            />
          </svg>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs mt-4" style={{ color: '#A09880' }}>
          Based on runs synced from Strava · Goal: {GOAL_KM.toLocaleString('en')} km by 31 Dec {YEAR}
        </p>
      </main>
    </div>
  )
}
