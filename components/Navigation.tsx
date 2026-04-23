'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SideMenu from './SideMenu'

function pageTitle(pathname: string): string {
  if (pathname.startsWith('/statistics')) return 'Statistics'
  return 'Marathon Plan'
}

interface NavigationProps {
  userName: string
}

export default function Navigation({ userName }: NavigationProps) {
  const pathname  = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const initials = userName
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'JB'

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
        {/* Use relative + absolute centering so the title is always truly centred
            regardless of how wide the left/right elements are */}
        <div className="max-w-5xl mx-auto px-4 relative flex items-center" style={{ height: '72px' }}>

          {/* Left: hamburger + active page label */}
          <div className="flex items-center gap-2.5 shrink-0 z-10">
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

            <span
              className="text-sm font-semibold"
              style={{ color: '#4A5427', letterSpacing: '-0.01em' }}
            >
              {pageTitle(pathname)}
            </span>
          </div>

          {/* Centre: big brand title — absolutely centred in the bar */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Link
              href="/plan"
              className="flex items-center gap-3 pointer-events-auto"
              aria-label="Go to plan"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: '#EE6B17' }}
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <span
                style={{
                  fontFamily: 'Nohemi, Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '28px',
                  letterSpacing: '-0.045em',
                  color: '#1E1611',
                  lineHeight: 1,
                }}
              >
                Sub <span style={{ color: '#EE6B17' }}>3:30</span>
              </span>
            </Link>
          </div>

          {/* Right: avatar (also opens side menu) */}
          <div className="ml-auto shrink-0 z-10">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
              style={{ background: '#EE6B17' }}
            >
              {initials}
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
