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
      style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
    >
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => goTo(t.key)}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={
            activeTab === t.key
              ? { background: '#E3D2B4', color: '#1E1611', boxShadow: '0 1px 3px rgba(43,49,23,0.10)' }
              : { color: '#4A5427', background: 'transparent' }
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
