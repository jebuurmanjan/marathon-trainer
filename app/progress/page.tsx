import Navigation from '@/components/Navigation'
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

  // Build per-week summary for completed weeks
  const weekSummaries = trainingPlan
    .filter((w) => w.weekNumber <= currentWeek)
    .map((week) => {
      const weekRuns = allRuns.filter((r) => r.runDate >= week.startDate && r.runDate <= week.endDate)
      const actualKm = weekRuns.reduce((s, r) => s + r.distanceKm, 0)

      // Match actual runs to planned runs by date
      const completedCount = week.runs.filter((planned) => {
        const pd = new Date(planned.date).getTime()
        return weekRuns.some((a) => Math.abs(new Date(a.runDate).getTime() - pd) <= 86400000 * 1.5)
      }).length

      const avgPace = weekRuns.length > 0
        ? weekRuns.reduce((s, r) => s + r.paceMinPerKm, 0) / weekRuns.length
        : null

      const avgHR = weekRuns.filter((r) => r.averageHeartrate).length > 0
        ? weekRuns.filter((r) => r.averageHeartrate).reduce((s, r) => s + (r.averageHeartrate ?? 0), 0) /
          weekRuns.filter((r) => r.averageHeartrate).length
        : null

      return {
        week,
        actualKm: Math.round(actualKm * 10) / 10,
        plannedKm: week.targetKm,
        completedCount,
        plannedCount: week.runs.length,
        avgPace,
        avgHR,
        pct: Math.min(100, Math.round((actualKm / week.targetKm) * 100)),
      }
    })

  // Overall stats
  const totalPlanned = weekSummaries.reduce((s, w) => s + w.plannedKm, 0)
  const totalActual = weekSummaries.reduce((s, w) => s + w.actualKm, 0)
  const totalPlannedRuns = weekSummaries.reduce((s, w) => s + w.plannedCount, 0)
  const totalCompletedRuns = weekSummaries.reduce((s, w) => s + w.completedCount, 0)
  const overallPct = Math.round((totalActual / totalPlanned) * 100) || 0
  const runCompliancePct = Math.round((totalCompletedRuns / totalPlannedRuns) * 100) || 0

  // Longest run
  const longestRun = allRuns.reduce((max, r) => (r.distanceKm > max ? r.distanceKm : max), 0)

  // Best pace (fastest run ≥ 5 km)
  const bestPaceRun = allRuns.filter((r) => r.distanceKm >= 5).sort((a, b) => a.paceMinPerKm - b.paceMinPerKm)[0]

  return (
    <div className="min-h-screen bg-gray-950">
      <Navigation userName={session.name} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Progress</h1>
          <p className="text-gray-500 text-sm mt-1">
            Weeks 1–{currentWeek} completed · {26 - currentWeek} weeks remaining
          </p>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Km logged', value: `${totalActual}`, sub: `of ${totalPlanned} km` },
            { label: 'Volume %', value: `${overallPct}%`, sub: 'of plan completed' },
            { label: 'Run compliance', value: `${runCompliancePct}%`, sub: `${totalCompletedRuns}/${totalPlannedRuns} sessions` },
            { label: 'Longest run', value: `${longestRun} km`, sub: bestPaceRun ? `Best pace ${formatPaceDisplay(bestPaceRun.paceMinPerKm)}` : 'No races yet' },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-gray-400 text-xs font-medium mt-0.5">{stat.label}</div>
              <div className="text-gray-600 text-xs mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Week-by-week chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-4">Weekly km — Planned vs Actual</h2>
          <div className="space-y-2">
            {weekSummaries.map(({ week, plannedKm, actualKm, completedCount, plannedCount, avgPace, pct }) => (
              <div key={week.weekNumber} className="flex items-center gap-3">
                {/* Week label */}
                <div className="text-xs text-gray-600 w-12 shrink-0">W{week.weekNumber}</div>

                {/* Bar */}
                <div className="flex-1 relative h-6 bg-gray-800 rounded overflow-hidden">
                  {/* Planned bar (background) */}
                  <div className="absolute inset-0 bg-gray-700/40 rounded" />
                  {/* Actual bar */}
                  <div
                    className={`absolute inset-y-0 left-0 rounded transition-all ${
                      pct >= 90 ? 'bg-emerald-600' : pct >= 60 ? 'bg-orange-500' : 'bg-red-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                  {/* Label inside bar */}
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-xs text-white font-medium drop-shadow">
                      {actualKm} km
                    </span>
                  </div>
                </div>

                {/* Planned + compliance */}
                <div className="text-xs text-gray-500 w-24 shrink-0 text-right">
                  {plannedKm} km · {completedCount}/{plannedCount}
                </div>

                {/* Avg pace */}
                <div className="text-xs text-gray-600 w-16 shrink-0 text-right">
                  {avgPace ? formatPaceDisplay(avgPace) : '—'}
                </div>
              </div>
            ))}
          </div>

          {weekSummaries.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-4">
              No completed weeks yet. Start running!
            </p>
          )}
        </div>

        {/* All runs table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">All Runs ({allRuns.length})</h2>
          {allRuns.length === 0 ? (
            <p className="text-gray-600 text-sm">
              No runs synced yet. Go to the Plan page and click "Sync Strava".
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-800">
                    <th className="text-left pb-2 font-medium">Date</th>
                    <th className="text-left pb-2 font-medium">Name</th>
                    <th className="text-right pb-2 font-medium">km</th>
                    <th className="text-right pb-2 font-medium">Pace</th>
                    <th className="text-right pb-2 font-medium">Avg HR</th>
                  </tr>
                </thead>
                <tbody>
                  {[...allRuns].reverse().map((run) => (
                    <tr key={run.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 text-gray-400">
                        {new Date(run.runDate + 'T00:00:00').toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td className="py-2 text-gray-300 max-w-[180px] truncate">{run.name}</td>
                      <td className="py-2 text-right text-white font-medium">{run.distanceKm}</td>
                      <td className="py-2 text-right text-gray-300">{formatPaceDisplay(run.paceMinPerKm)}</td>
                      <td className="py-2 text-right text-gray-400">
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
