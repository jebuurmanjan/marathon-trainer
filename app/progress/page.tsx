import Navigation from '@/components/Navigation'
import PlanTabs from '@/components/PlanTabs'
import { getSession } from '@/lib/session'
import { getActualRuns } from '@/lib/strava'
import { formatPaceDisplay } from '@/lib/training-plan'
import { formatGoalTime } from '@/lib/plan-generator'
import { getUserPlan } from '@/lib/user-plan'
import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export default async function ProgressPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const [userPlan, userRow] = await Promise.all([
    getUserPlan(session.userId, session.stravaId),
    createServerClient().from('users')
      .select('display_name, profile_photo_url')
      .eq('id', session.userId)
      .single()
      .then((r) => r.data),
  ])
  if (!userPlan) redirect('/onboarding')

  const userName        = userRow?.display_name ?? session.name
  const profilePhotoUrl = userRow?.profile_photo_url ?? null

  const { plan, currentWeek, planStartDate, config } = userPlan

  const endDate = currentWeek > 0
    ? plan[Math.min(currentWeek, plan.length) - 1].endDate
    : config.raceDate

  const allRuns = await getActualRuns(session.userId, planStartDate, endDate)

  const weekSummaries = plan
    .filter((w) => w.weekNumber <= currentWeek)
    .map((week) => {
      const weekRuns      = allRuns.filter((r) => r.runDate >= week.startDate && r.runDate <= week.endDate)
      const actualKm      = weekRuns.reduce((s, r) => s + r.distanceKm, 0)
      const completedCount = week.runs.filter((planned) => {
        const pd = new Date(planned.date).getTime()
        return weekRuns.some((a) => Math.abs(new Date(a.runDate).getTime() - pd) <= 86_400_000 * 1.5)
      }).length
      const avgPace = weekRuns.length > 0
        ? weekRuns.reduce((s, r) => s + r.paceMinPerKm, 0) / weekRuns.length
        : null
      return {
        week,
        actualKm:      Math.round(actualKm * 10) / 10,
        plannedKm:     week.targetKm,
        completedCount,
        plannedCount:  week.runs.length,
        avgPace,
        pct:           Math.min(100, Math.round((actualKm / week.targetKm) * 100)),
      }
    })

  const totalPlanned      = weekSummaries.reduce((s, w) => s + w.plannedKm, 0)
  const totalActual       = weekSummaries.reduce((s, w) => s + w.actualKm, 0)
  const totalPlannedRuns  = weekSummaries.reduce((s, w) => s + w.plannedCount, 0)
  const totalCompletedRuns = weekSummaries.reduce((s, w) => s + w.completedCount, 0)
  const overallPct        = Math.round((totalActual / totalPlanned) * 100) || 0
  const runCompliancePct  = Math.round((totalCompletedRuns / totalPlannedRuns) * 100) || 0
  const longestRun        = allRuns.reduce((max, r) => (r.distanceKm > max ? r.distanceKm : max), 0)
  const bestPaceRun       = allRuns.filter((r) => r.distanceKm >= 5).sort((a, b) => a.paceMinPerKm - b.paceMinPerKm)[0]

  const topStats = [
    { label: 'Km logged',      value: String(totalActual),       sub: `of ${totalPlanned} km`,                            accent: false },
    { label: 'Volume',         value: `${overallPct}%`,          sub: 'of plan completed',                                accent: true  },
    { label: 'Run compliance', value: `${runCompliancePct}%`,    sub: `${totalCompletedRuns}/${totalPlannedRuns} sessions`, accent: false },
    { label: 'Longest run',    value: `${longestRun} km`,        sub: bestPaceRun ? `Best ${formatPaceDisplay(bestPaceRun.paceMinPerKm)}` : '—', accent: false },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navigation userName={userName} profilePhotoUrl={profilePhotoUrl} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Page title */}
        <div className="mb-5">
          <h1
            className="text-2xl"
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
          >
            Marathon Plan
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{plan.length} weeks · sub {formatGoalTime(config.goalSeconds)} goal</p>
        </div>

        <PlanTabs />

        {/* Top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {topStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4 relative overflow-hidden"
              style={{
                background: 'var(--surface)',
                border: stat.accent ? '1px solid rgba(var(--accent-rgb),0.30)' : '1px solid rgba(var(--tint),0.08)',
              }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                {stat.label}
              </div>
              <div
                className="text-3xl leading-none mb-1"
                style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.04em', color: stat.accent ? 'var(--accent)' : 'var(--text-primary)' }}
              >
                {stat.value}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Weekly volume chart */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{ background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.08)' }}
        >
          <h2
            className="text-base font-semibold mb-4"
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, color: 'var(--text-primary)' }}
          >
            Weekly volume — planned vs actual
          </h2>
          <div className="space-y-2.5">
            {weekSummaries.map(({ week, plannedKm, actualKm, completedCount, plannedCount, avgPace, pct }) => (
              <div key={week.weekNumber} className="flex items-center gap-3">
                <div className="text-xs w-8 shrink-0 font-semibold" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-dim)' }}>
                  W{week.weekNumber}
                </div>
                <div className="flex-1 relative h-6 rounded-lg overflow-hidden" style={{ background: 'rgba(var(--tint),0.08)' }}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg transition-all"
                    style={{ width: `${pct}%`, background: pct >= 90 ? 'var(--accent-green)' : pct >= 60 ? 'var(--accent)' : 'rgba(var(--accent-rgb),0.5)' }}
                  />
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-xs font-semibold" style={{ color: pct > 20 ? '#fff' : 'var(--text-primary)' }}>
                      {actualKm} km
                    </span>
                  </div>
                </div>
                <div className="text-xs w-28 shrink-0 text-right" style={{ color: 'var(--text-dim)' }}>
                  {plannedKm} km · {completedCount}/{plannedCount}
                </div>
                <div className="text-xs w-16 shrink-0 text-right" style={{ color: 'var(--text-dim)' }}>
                  {avgPace ? formatPaceDisplay(avgPace) : '—'}
                </div>
              </div>
            ))}
            {weekSummaries.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-dim)' }}>No completed weeks yet. Start running!</p>
            )}
          </div>
        </div>

        {/* Runs table */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.08)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(var(--tint),0.08)' }}>
            <h2 className="text-base font-semibold" style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, color: 'var(--text-primary)' }}>
              All runs ({allRuns.length})
            </h2>
          </div>
          {allRuns.length === 0 ? (
            <p className="px-5 py-6 text-sm" style={{ color: 'var(--text-dim)' }}>No runs synced yet. Go to Plan and click "Sync Strava".</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid rgba(var(--tint),0.08)' }}>
                    {['Date','Name','km','Pace','HR'].map((h, i) => (
                      <th key={h} className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider ${i >= 2 ? 'text-right' : 'text-left'}`} style={{ color: 'var(--text-secondary)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...allRuns].reverse().map((run) => (
                    <tr key={run.id} className="transition-colors" style={{ borderBottom: '1px solid rgba(var(--tint),0.05)' }}>
                      <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(run.runDate + 'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                      </td>
                      <td className="py-3 px-4 max-w-[180px] truncate text-xs" style={{ color: 'var(--text-primary)' }}>{run.name}</td>
                      <td className="py-3 px-4 text-right font-semibold" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>{run.distanceKm}</td>
                      <td className="py-3 px-4 text-right font-semibold text-xs" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>{formatPaceDisplay(run.paceMinPerKm)}</td>
                      <td className="py-3 px-4 text-right text-xs" style={{ color: 'var(--text-dim)' }}>{run.averageHeartrate ? Math.round(run.averageHeartrate) : '—'}</td>
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
