'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCelebration } from './CelebrationProvider'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  id:          string
  name:        string
  raceDate:    string
  goalSeconds: number
  weeklyKm:    number
  isActive:    boolean
  archivedAt:  string | null
}

interface NavItem {
  href:   string
  label:  string
  tab?:   string
  icon:   React.ReactNode
}

interface Section {
  title: string
  items: NavItem[]
}

// ─── Nav sections (no Plans item — handled by selector above) ─────────────────

const SECTIONS: Section[] = [
  {
    title: 'Marathon Plan',
    items: [
      {
        href: '/plan',
        label: 'Plan',
        icon: (
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        ),
      },
      {
        href: '/progress',
        label: 'Progress',
        icon: (
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        ),
      },
      {
        href: '/suggestions',
        label: 'AI Coach',
        icon: (
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Statistics',
    items: [
      {
        href: '/statistics',
        label: 'Distance',
        icon: (
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        ),
      },
      {
        href: '/statistics?tab=zones',
        label: 'Zones',
        tab: 'zones',
        icon: (
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        ),
      },
    ],
  },
]

// ─── Plan selector ────────────────────────────────────────────────────────────

interface PlanItemProps {
  plan:       Plan
  onActivate: (id: string) => void
  onArchive:  (id: string) => void
  onRestore:  (id: string) => void
  onDelete:   (id: string) => void
  busy:       string | null  // planId currently being mutated
}

function PlanItem({ plan, onActivate, onArchive, onRestore, onDelete, busy }: PlanItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isBusy = busy === plan.id

  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{
        background: plan.isActive ? 'rgba(238,107,23,0.08)' : 'rgba(var(--tint),0.04)',
        border:     plan.isActive ? '1px solid rgba(238,107,23,0.20)' : '1px solid transparent',
      }}
    >
      {/* Plan name row */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: plan.isActive ? 'var(--accent)' : 'rgba(var(--tint),0.25)' }}
        />
        <span
          className="text-xs font-semibold flex-1 truncate"
          style={{ color: plan.isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        >
          {plan.name}
        </span>
        {plan.isActive && (
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: 'rgba(238,107,23,0.15)', color: 'var(--accent)' }}
          >
            Active
          </span>
        )}
      </div>

      {/* Action row */}
      {confirmDelete ? (
        <div className="flex items-center gap-2">
          <span className="text-[11px] flex-1" style={{ color: 'var(--text-dim)' }}>Delete permanently?</span>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-[11px] px-2 py-1 rounded-lg font-medium"
            style={{ color: 'var(--text-dim)', background: 'rgba(var(--tint),0.08)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => { setConfirmDelete(false); onDelete(plan.id) }}
            disabled={isBusy}
            className="text-[11px] px-2 py-1 rounded-lg font-semibold disabled:opacity-50"
            style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}
          >
            Delete
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          {/* Activate (inactive, non-archived only) */}
          {!plan.isActive && !plan.archivedAt && (
            <button
              onClick={() => onActivate(plan.id)}
              disabled={isBusy}
              className="text-[11px] px-2 py-1 rounded-lg font-semibold transition-colors disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {isBusy ? '…' : 'Activate'}
            </button>
          )}

          {/* Restore (archived only) */}
          {plan.archivedAt && (
            <button
              onClick={() => onRestore(plan.id)}
              disabled={isBusy}
              className="text-[11px] px-2 py-1 rounded-lg font-semibold transition-colors disabled:opacity-50"
              style={{ background: 'rgba(74,84,39,0.12)', color: 'var(--text-secondary)' }}
            >
              {isBusy ? '…' : 'Restore'}
            </button>
          )}

          {/* Archive (non-archived only) */}
          {!plan.archivedAt && (
            <button
              onClick={() => onArchive(plan.id)}
              disabled={isBusy}
              className="text-[11px] px-2 py-1 rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{ color: 'var(--text-dim)', background: 'rgba(var(--tint),0.08)' }}
            >
              {isBusy ? '…' : 'Archive'}
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isBusy}
            className="text-[11px] px-2 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 ml-auto"
            style={{ color: '#dc2626', background: 'rgba(220,38,38,0.06)' }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SideMenuProps {
  isOpen:   boolean
  onClose:         () => void
  userName:        string
  profilePhotoUrl?: string | null
}

export default function SideMenu({ isOpen, onClose, userName, profilePhotoUrl }: SideMenuProps) {
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const currentTab  = searchParams.get('tab') ?? ''
  const { triggerTest } = useCelebration()

  // ── Plan selector state ───────────────────────────────────────────────────
  const [selectorOpen,  setSelectorOpen]  = useState(false)
  const [showArchived,  setShowArchived]  = useState(false)
  const [plans,         setPlans]         = useState<Plan[]>([])
  const [loadingPlans,  setLoadingPlans]  = useState(false)
  const [planError,     setPlanError]     = useState<string | null>(null)
  const [busyPlanId,    setBusyPlanId]    = useState<string | null>(null)

  const activePlan = plans.find((p) => p.isActive && !p.archivedAt)
  const regularPlans = plans.filter((p) => !p.archivedAt)
  const archivedPlans = plans.filter((p) => !!p.archivedAt)

  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true)
    setPlanError(null)
    try {
      const res = await fetch('/api/plans?all=true')
      if (res.ok) {
        const d = await res.json()
        setPlans(d.plans ?? [])
      }
    } finally {
      setLoadingPlans(false)
    }
  }, [])

  // Fetch plans whenever the menu opens
  useEffect(() => {
    if (isOpen) fetchPlans()
  }, [isOpen, fetchPlans])

  // Reset selector when menu closes
  useEffect(() => {
    if (!isOpen) {
      setSelectorOpen(false)
      setShowArchived(false)
      setPlanError(null)
    }
  }, [isOpen])

  async function mutate(planId: string, action: string) {
    setBusyPlanId(planId)
    setPlanError(null)
    const res = await fetch('/api/plans', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ planId, action }),
    })
    const data = await res.json()
    if (!res.ok) {
      setPlanError(data.error ?? 'Something went wrong')
    } else {
      await fetchPlans()
    }
    setBusyPlanId(null)
  }

  async function deletePlan(planId: string) {
    setBusyPlanId(planId)
    setPlanError(null)
    const res = await fetch('/api/plans', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ planId }),
    })
    const data = await res.json()
    if (!res.ok) {
      setPlanError(data.error ?? 'Something went wrong')
    } else {
      await fetchPlans()
    }
    setBusyPlanId(null)
  }

  // ── Nav active state ──────────────────────────────────────────────────────
  function isActive(item: NavItem): boolean {
    if (pathname !== item.href.split('?')[0]) return false
    if (item.tab) return currentTab === item.tab
    if (item.href === '/statistics') return currentTab === '' || currentTab === 'distance'
    return true
  }

  // ── Keyboard / scroll lock ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const initials = userName
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'JB'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background:   'rgba(30,22,17,0.45)',
          backdropFilter: 'blur(3px)',
          opacity:      isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* Drawer panel */}
      <div
        className="fixed top-0 left-0 bottom-0 z-50 flex flex-col w-72 transition-transform duration-300 ease-out"
        style={{
          background:   'var(--bg-base)',
          borderRight:  '1px solid rgba(var(--tint),0.10)',
          boxShadow:    '8px 0 32px rgba(30,22,17,0.14)',
          transform:    isOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 h-14 shrink-0 border-b"
          style={{ borderColor: 'rgba(var(--tint),0.08)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: 'var(--accent)' }}
            >
              ⏱
            </div>
            <span
              className="text-base font-semibold"
              style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}
            >
              Sub <span style={{ color: 'var(--accent)' }}>3:30</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ color: 'var(--text-dim)' }}
            aria-label="Close menu"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* ── Plan selector ── */}
        <div
          className="px-3 py-3 border-b shrink-0"
          style={{ borderColor: 'rgba(var(--tint),0.08)' }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest px-1 mb-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            Active Plan
          </p>

          {/* Selector trigger */}
          <button
            onClick={() => setSelectorOpen((o) => !o)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.08)', color: 'var(--text-primary)' }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: 'var(--accent)' }}
            />
            <span className="flex-1 truncate">
              {loadingPlans ? 'Loading…' : (activePlan?.name ?? 'No active plan')}
            </span>
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5 fill-none stroke-current stroke-2 shrink-0 transition-transform"
              style={{ color: 'var(--text-dim)', transform: selectorOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Expanded plan list */}
          {selectorOpen && (
            <div className="mt-2 space-y-1.5">
              {/* Error */}
              {planError && (
                <div
                  className="rounded-lg px-3 py-2 text-xs"
                  style={{ background: 'rgba(238,107,23,0.10)', color: 'var(--accent)' }}
                >
                  {planError}
                </div>
              )}

              {/* Regular (non-archived) plans */}
              {regularPlans.length === 0 && !loadingPlans && (
                <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>No plans yet.</p>
              )}
              {regularPlans.map((plan) => (
                <PlanItem
                  key={plan.id}
                  plan={plan}
                  onActivate={(id) => mutate(id, 'activate')}
                  onArchive={(id)  => mutate(id, 'archive')}
                  onRestore={(id)  => mutate(id, 'unarchive')}
                  onDelete={deletePlan}
                  busy={busyPlanId}
                />
              ))}

              {/* Archived section */}
              {archivedPlans.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowArchived((s) => !s)}
                    className="flex items-center gap-1.5 w-full px-1 py-1 text-[11px] font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-3 h-3 fill-none stroke-current stroke-2 transition-transform"
                      style={{ transform: showArchived ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    Archived ({archivedPlans.length})
                  </button>

                  {showArchived && (
                    <div className="space-y-1.5 mt-1">
                      {archivedPlans.map((plan) => (
                        <PlanItem
                          key={plan.id}
                          plan={plan}
                          onActivate={(id) => mutate(id, 'activate')}
                          onArchive={(id)  => mutate(id, 'archive')}
                          onRestore={(id)  => mutate(id, 'unarchive')}
                          onDelete={deletePlan}
                          busy={busyPlanId}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* New plan */}
              <a
                href="/onboarding"
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: 'rgba(238,107,23,0.10)', color: 'var(--accent)' }}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Start new plan
              </a>
            </div>
          )}
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {SECTIONS.map((section) => (
            <div key={section.title} className="mb-6">
              <p
                className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                {section.title}
              </p>
              {section.items.map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5"
                    style={
                      active
                        ? { background: 'var(--surface)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(var(--tint),0.08)' }
                        : { color: 'var(--text-secondary)' }
                    }
                  >
                    <span style={{ color: active ? 'var(--accent)' : 'var(--text-dim)' }}>{item.icon}</span>
                    {item.label}
                    {active && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: 'var(--accent)' }}
                      />
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Test celebration button */}
        <div className="px-3 pb-2 shrink-0">
          <button
            onClick={() => { triggerTest(); onClose() }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span style={{ color: 'var(--text-dim)', fontSize: '16px' }}>🎉</span>
            Test celebration
          </button>
        </div>

        {/* Footer: user + settings + logout */}
        <div
          className="px-5 py-4 border-t shrink-0"
          style={{ borderColor: 'rgba(var(--tint),0.08)' }}
        >
          {/* User identity row */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={profilePhotoUrl ? undefined : { background: 'var(--accent)' }}
            >
              {profilePhotoUrl
                ? <img src={profilePhotoUrl} alt={userName} className="w-full h-full object-cover" />
                : initials
              }
            </div>
            <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
              {userName || 'Athlete'}
            </span>
          </div>
          {/* Action links */}
          <div className="flex gap-2">
            <Link
              href="/settings"
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors font-medium"
              style={{ color: 'var(--text-secondary)', borderColor: 'rgba(var(--tint),0.12)', background: 'var(--surface)' }}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Account
            </Link>
            <a
              href="/api/logout"
              className="flex-1 flex items-center justify-center text-xs px-3 py-2 rounded-lg border transition-colors font-medium"
              style={{ color: 'var(--text-dim)', borderColor: 'rgba(var(--tint),0.12)' }}
            >
              Log out
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
