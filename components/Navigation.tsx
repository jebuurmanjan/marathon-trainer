'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SideMenu from './SideMenu'

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
  const [menuOpen, setMenuOpen] = useState(false)

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'JB'

  return (
    <>
      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} userName={userName} />

      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'rgba(245,243,236,0.92)',
          backdropFilter: 'blur(14px)',
          borderColor: 'rgba(43,49,23,0.08)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14 gap-4">

          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5"
              style={{ color: '#4A5427' }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2" strokeLinecap="round">
                <line x1="3" y1="6"  x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            <Link href="/plan" className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                style={{ background: '#EE6B17' }}
              >
                ⏱
              </div>
              <span
                className="text-base font-semibold"
                style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.025em', color: '#1E1611' }}
              >
                Sub <span style={{ color: '#EE6B17' }}>3:30</span>
              </span>
            </Link>
          </div>

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

          {/* Right: avatar */}
          <div className="shrink-0">
            <button
              onClick={() => setMenuOpen(true)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: '#EE6B17' }}
              aria-label="Open menu"
            >
              {initials}
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
