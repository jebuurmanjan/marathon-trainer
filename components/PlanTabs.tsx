'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/plan',        label: 'Plan'     },
  { href: '/progress',    label: 'Progress' },
  { href: '/workouts',    label: 'Workouts' },
  { href: '/suggestions', label: 'AI Coach' },
]

export default function PlanTabs() {
  const pathname = usePathname()

  return (
    <div
      className="flex gap-1 p-1 rounded-xl mb-6"
      style={{ background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.08)' }}
    >
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-colors"
          style={
            pathname === link.href
              ? { background: 'var(--surface-3)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(var(--tint),0.10)' }
              : { color: 'var(--text-secondary)' }
          }
        >
          {link.label}
        </Link>
      ))}
    </div>
  )
}
