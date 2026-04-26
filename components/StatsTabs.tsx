'use client'

import { useRouter, usePathname } from 'next/navigation'

const TABS = [
  { key: 'distance', label: 'Distance' },
  { key: 'zones',    label: 'Zones'    },
]

export default function StatsTabs({ activeTab }: { activeTab: string }) {
  const router   = useRouter()
  const pathname = usePathname()

  function goTo(tab: string) {
    router.push(tab === 'distance' ? pathname : `${pathname}?tab=${tab}`)
  }

  return (
    <div
      className="flex gap-1 p-1 rounded-xl mb-6"
      style={{ background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.08)' }}
    >
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => goTo(t.key)}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={
            activeTab === t.key
              ? { background: 'var(--surface-3)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(var(--tint),0.10)' }
              : { color: 'var(--text-secondary)', background: 'transparent' }
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
