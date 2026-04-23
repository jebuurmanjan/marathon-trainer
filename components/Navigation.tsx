'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/plan', label: 'Plan' },
  { href: '/progress', label: 'Progress' },
  { href: '/suggestions', label: 'AI Coach' },
]

interface NavigationProps {
  userName: string
}

export default function Navigation({ userName }: NavigationProps) {
  const pathname = usePathname()

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'JB'

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: 'rgba(245,243,236,0.92)',
        backdropFilter: 'blur(14px)',
        borderColor: 'rgba(43,49,23,0.08)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14 gap-4">
        {/* Logo */}
        <Link href="/plan" className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: '#EE6B17' }}
          >
            ⏱
          </div>
          <span
            className="text-base font-display font-semibold"
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.025em', color: '#1E1611' }}
          >
            Sub <span style={{ color: '#EE6B17' }}>3:30</span>
          </span>
        </Link>

        {/* Nav tabs */}
        <nav
          className="flex gap-0.5 rounded-xl p-1"
          style={{ background: '#F5F4F2', border: '1px solid rgba(43,49,23,0.08)' }}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={
                pathname === link.href
                  ? { background: '#E3D2B4', color: '#1E1611', boxShadow: '0 1px 3px rgba(43,49,23,0.12)' }
                  : { color: '#4A5427' }
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: avatar + logout */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: '#EE6B17' }}
          >
            {initials}
          </div>
          <a
            href="/api/logout"
            className="text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
            style={{ color: '#736554', borderColor: 'rgba(43,49,23,0.08)' }}
          >
            Log out
          </a>
        </div>
      </div>
    </header>
  )
}
