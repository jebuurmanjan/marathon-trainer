'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SideMenu from './SideMenu'

interface NavigationProps {
  userName:        string
  profilePhotoUrl?: string | null
}

export default function Navigation({ userName, profilePhotoUrl }: NavigationProps) {
  const pathname  = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const initials = userName
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <>
      <Suspense fallback={null}>
        <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} userName={userName} profilePhotoUrl={profilePhotoUrl} />
      </Suspense>

      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(14px)',
          borderColor: 'rgba(var(--tint),0.08)',
        }}
      >
        {/* Use relative + absolute centering so the title is always truly centred
            regardless of how wide the left/right elements are */}
        <div className="max-w-5xl mx-auto px-4 relative flex items-center" style={{ height: '72px' }}>

          {/* Left: hamburger */}
          <div className="flex items-center shrink-0 z-10">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2" strokeLinecap="round">
                <line x1="3" y1="6"  x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Centre: big brand title — absolutely centred in the bar */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Link
              href="/plan"
              className="flex items-center gap-3 pointer-events-auto"
              aria-label="Go to plan"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                style={{ background: 'var(--accent)', fontSize: '26px', lineHeight: 1 }}
              >
                ⏱
              </div>
              <span
                style={{
                  fontFamily: 'Nohemi, Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '28px',
                  letterSpacing: '-0.045em',
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                Sub <span style={{ color: 'var(--accent)' }}>3:30</span>
              </span>
            </Link>
          </div>

          {/* Right: avatar (also opens side menu) */}
          <div className="ml-auto shrink-0 z-10">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shadow-sm"
              style={profilePhotoUrl ? undefined : { background: 'var(--accent)' }}
            >
              {profilePhotoUrl
                ? <img src={profilePhotoUrl} alt={userName} className="w-full h-full object-cover" />
                : initials
              }
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
