import Navigation from '@/components/Navigation'
import PlanTabs from '@/components/PlanTabs'
import { getSession } from '@/lib/session'
import { getActualRuns } from '@/lib/strava'
import { trainingPlan, getCurrentWeekNumber, PLAN_START_DATE, RACE_DATE, formatPaceDisplay } from '@/lib/training-plan'
import { redirect } from 'next/navigation'

export default async function ProgressPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const currentWeek = getCurrentWeekNumber()
  const endDate = currentWeek > 0 ? trainingPlan[Math.min(currentWeek, 26) - 1].endDate : RACE_DATE
  const allRuns = await getActualRuns(session.userId, PLAN_START_DATE, endDate)

  const weekSummaries = trainingPlan
    .filter((w) => w.weekNumber <= currentWeek)
    .map((week) => {
      const weekRuns = allRuns.filter((r) => r.runDate >= week.startDate && r.runDate <= week.endDate)
      const actualKm = weekRuns.reduce((s, r) => s + r.distanceKm, 0)
      const completedCount = week.runs.filter((planned) => {
        const pd = new Date(planned.date).getTime()
        return weekRuns.some((a) => Math.abs(new Date(a.runDate).getTime() - pd) <= 86400000 * 1.5)
      }).length
      const avgPace = weekRuns.length > 0
        ? weekRuns.reduce((s, r) => s + r.paceMinPerKm, 0) / weekRuns.length
        : null
      return {
        week,
        actualKm: Math.round(actualKm * 10) / 10,
        plannedKm: week.targetKm,
        completedCount,
        plannedCount: week.runs.length,
        avgPace,
        pct: Math.min(100, Math.round((actualKm / week.targetKm) * 100)),
      }
    })

  const totalPlanned = weekSummaries.reduce((s, w) => s + w.plannedKm, 0)
  const totalActual = weekSummaries.reduce((s, w) => s + w.actualKm, 0)
  const totalPlannedRuns = weekSummaries.reduce((s, w) => s + w.plannedCount, 0)
  const totalCompletedRuns = weekSummaries.reduce((s, w) => s + w.completedCount, 0)
  const overallPct = Math.round((totalActual / totalPlanned) * 100) || 0
  const runCompliancePct = Math.round((totalCompletedRuns / totalPlannedRuns) * 100) || 0
  const longestRun = allRuns.reduce((max, r) => (r.distanceKm > max ? r.distanceKm : max), 0)
  const bestPaceRun = allRuns.filter((r) => r.distanceKm >= 5).sort((a, b) => a.paceMinPerKm - b.paceMinPerKm)[0]

  const topStats = [
    { label: 'Km logged',       value: String(totalActual),         sub: `of ${totalPlanned} km`,                       accent: false },
    { label: 'Volume',          value: `${overallPct}%`,            sub: 'of plan completed',                           accent: true  },
    { label: 'Run compliance',  value: `${runCompliancePct}%`,      sub: `${totalCompletedRuns}/${totalPlannedRuns} sessions`, accent: false },
    { label: 'Longest run',     value: `${longestRun} km`,          sub: bestPaceRun ? `Best ${formatPaceDisplay(bestPaceRun.paceMinPerKm)}` : '—', accent: false },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F5F3EC' }}>
      <Navigation userName={session.name} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Page title */}
        <div className="mb-5">
          <h1
            className="text-2xl"
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: '#1E1611' }}
          >
            Marathon Plan
          </h1>
          <p className="text-sm mt-1" style={{ color: '#4A5427' }}>27 weeks · sub 3:30 goal</p>
        </div>

        <PlanTabs />
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {topStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{
                background: '#EDE9DE',
                border: stat.accent ? '1px solid rgba(238,107,23,0.30)' : '1px solid rgba(43,49,23,0.08)',
              }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#4A5427' }}>
                {stat.label}
              </div>
              <div
                className="text-3xl leading-none mb-1"
                style={{
                  fontFamily: 'Nohemi, Inter, sans-serif',
                  fontWeight: 600,
                  letterSpacing: '-0.04em',
                  color: stat.accent ? '#EE6B17' : '#1E1611',
                }}
              >
                {stat.value}
              </div>
              <div className="text-[11px]" style={{ color: '#736554' }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Weekly chart */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
        >
          <h2
            className="text-base font-semibold mb-4"
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, color: '#1E1611' }}
          >
            Weekly volume — planned vs actual
          </h2>
          <div className="space-y-2.5">
            {weekSummaries.map(({ week, plannedKm, actualKm, completedCount, plannedCount, avgPace, pct }) => (
              <div key={week.weekNumber} className="flex items-center gap-3">
                <div
                  className="text-xs w-8 shrink-0 font-semibold"
                  style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#736554' }}
                >
                  W{week.weekNumber}
                </div>
                <div
                  className="flex-1 relative h-6 rounded-lg overflow-hidden"
                  style={{ background: 'rgba(43,49,23,0.08)' }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg transition-all"
                    style={{
                      width: `${pct}%`,
                      background: pct >= 90 ? '#4A5427' : pct >= 60 ? '#EE6B17' : 'rgba(238,107,23,0.5)',
                    }}
                  />
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-xs font-semibold" style={{ color: pct > 20 ? '#F5F3EC' : '#1E1611' }}>
                      {actualKm} km
                    </span>
                  </div>
                </div>
                <div className="text-xs w-28 shrink-0 text-right" style={{ color: '#736554' }}>
                  {plannedKm} km · {completedCount}/{plannedCount}
                </div>
                <div className="text-xs w-16 shrink-0 text-right" style={{ color: '#736554' }}>
                  {avgPace ? formatPaceDisplay(avgPace) : '—'}
                </div>
              </div>
            ))}
            {weekSummaries.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: '#736554' }}>
                No completed weeks yet. Start running!
              </p>
            )}
          </div>
        </div>

        {/* Runs table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(43,49,23,0.08)' }}>
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, color: '#1E1611' }}
            >
              All runs ({allRuns.length})
            </h2>
          </div>
          {allRuns.length === 0 ? (
            <p className="px-5 py-6 text-sm" style={{ color: '#736554' }}>
              No runs synced yet. Go to Plan and click "Sync Strava".
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#F5F4F2', borderBottom: '1px solid rgba(43,49,23,0.08)' }}>
                    {['Date','Name','km','Pace','HR'].map((h, i) => (
                      <th
                        key={h}
                        className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider ${i >= 2 ? 'text-right' : 'text-left'}`}
                        style={{ color: '#4A5427' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...allRuns].reverse().map((run) => (
                    <tr
                      key={run.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid rgba(43,49,23,0.05)' }}
                    >
                      <td className="py-3 px-4 text-xs" style={{ color: '#4A5427' }}>
                        {new Date(run.runDate + 'T00:00:00').toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short',
                        })}
                      </td>
                      <td className="py-3 px-4 max-w-[180px] truncate text-xs" style={{ color: '#1E1611' }}>
                        {run.name}
                      </td>
                      <td
                        className="py-3 px-4 text-right font-semibold"
                        style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}
                      >
                        {run.distanceKm}
                      </td>
                      <td
                        className="py-3 px-4 text-right font-semibold text-xs"
                        style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}
                      >
                        {formatPaceDisplay(run.paceMinPerKm)}
                      </td>
                      <td className="py-3 px-4 text-right text-xs" style={{ color: '#736554' }}>
                        {run.averageHeartrate ? `${Math.round(run.averageHeartrate)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
