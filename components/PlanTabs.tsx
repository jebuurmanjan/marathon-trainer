'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/plan',        label: 'Plan'     },
  { href: '/progress',    label: 'Progress' },
  { href: '/suggestions', label: 'AI Coach' },
]

export default function PlanTabs() {
  const pathname = usePathname()

  return (
    <div
      className="flex gap-1 p-1 rounded-2xl mb-6"
      style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
    >
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="flex-1 text-center py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={
            pathname === link.href
              ? { background: '#E3D2B4', color: '#1E1611', boxShadow: '0 1px 3px rgba(43,49,23,0.10)' }
              : { color: '#4A5427' }
          }
        >
          {link.label}
        </Link>
      ))}
    </div>
  )
}
