'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { formatGoalTime } from '@/lib/plan-generator'

interface Plan {
  id:          string
  name:        string
  raceDate:    string
  goalSeconds: number
  weeklyKm:    number
  isActive:    boolean
  createdAt:   string
}

export default function PlansPage() {
  const router = useRouter()
  const [plans,           setPlans]           = useState<Plan[]>([])
  const [loading,         setLoading]         = useState(true)
  const [switching,       setSwitching]       = useState<string | null>(null)
  const [userName,        setUserName]        = useState('')
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [plansRes, runsRes] = await Promise.all([
        fetch('/api/plans'),
        fetch('/api/runs'),
      ])
      if (plansRes.ok) {
        const d = await plansRes.json()
        setPlans(d.plans ?? [])
      }
      if (runsRes.ok) {
        const d = await runsRes.json()
        setUserName(d.userName ?? '')
        setProfilePhotoUrl(d.profilePhotoUrl ?? null)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function switchPlan(planId: string) {
    setSwitching(planId)
    const res = await fetch('/api/plans', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ planId }),
    })
    if (res.ok) {
      router.push('/plan')
    } else {
      setSwitching(null)
    }
  }

  function formatRaceDate(dateStr: string) {
    return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-sm" style={{ color: 'var(--text-dim)' }}>Loading…</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navigation userName={userName} profilePhotoUrl={profilePhotoUrl} />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-2xl"
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
          >
            My Plans
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Switch between plans or start a new one
          </p>
        </div>

        {/* Start new plan */}
        <a
          href="/onboarding"
          className="flex items-center gap-3 w-full rounded-xl p-4 mb-4 text-sm font-semibold transition-colors"
          style={{
            background:   'var(--accent)',
            color:        '#fff',
          }}
        >
          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.20)' }}>
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </span>
          <div>
            <div>Start a new plan</div>
            <div className="text-xs font-normal mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Your current plan is archived — you can switch back anytime
            </div>
          </div>
        </a>

        {/* Plans list */}
        {plans.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center text-sm"
            style={{ background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.08)', color: 'var(--text-dim)' }}
          >
            No plans yet. Start by setting up your first plan.
          </div>
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-xl p-4"
                style={{
                  background: 'var(--surface)',
                  border:     plan.isActive
                    ? '1px solid rgba(var(--accent-rgb),0.35)'
                    : '1px solid rgba(var(--tint),0.08)',
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Status dot */}
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ background: plan.isActive ? 'var(--accent)' : 'rgba(var(--tint),0.20)' }}
                  />

                  {/* Plan info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-sm font-semibold"
                        style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}
                      >
                        {plan.name}
                      </span>
                      {plan.isActive && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)' }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs" style={{ color: 'var(--text-dim)' }}>
                      <span>📅 {formatRaceDate(plan.raceDate)}</span>
                      <span>🎯 {formatGoalTime(plan.goalSeconds)}</span>
                      <span>📏 {plan.weeklyKm} km/week</span>
                    </div>
                  </div>

                  {/* Switch button (only for inactive plans) */}
                  {!plan.isActive && (
                    <button
                      onClick={() => switchPlan(plan.id)}
                      disabled={switching === plan.id}
                      className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      style={{
                        background:   'rgba(var(--tint),0.08)',
                        color:        'var(--text-secondary)',
                      }}
                    >
                      {switching === plan.id ? 'Switching…' : 'Switch'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back to plan */}
        <div className="mt-6 text-center">
          <a
            href="/plan"
            className="text-sm font-medium"
            style={{ color: 'var(--text-dim)' }}
          >
            ← Back to plan
          </a>
        </div>
      </main>
    </div>
  )
}
