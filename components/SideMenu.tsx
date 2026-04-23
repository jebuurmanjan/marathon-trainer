'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SECTIONS = [
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
        label: 'Yearly goals',
        icon: (
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        ),
      },
    ],
  },
]

interface SideMenuProps {
  isOpen: boolean
  onClose: () => void
  userName: string
}

export default function SideMenu({ isOpen, onClose, userName }: SideMenuProps) {
  const pathname = usePathname()

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Lock body scroll while open
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
          background: 'rgba(30,22,17,0.45)',
          backdropFilter: 'blur(3px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* Drawer panel */}
      <div
        className="fixed top-0 left-0 bottom-0 z-50 flex flex-col w-72 transition-transform duration-300 ease-out"
        style={{
          background: '#F5F3EC',
          borderRight: '1px solid rgba(43,49,23,0.10)',
          boxShadow: '8px 0 32px rgba(30,22,17,0.14)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 h-14 shrink-0 border-b"
          style={{ borderColor: 'rgba(43,49,23,0.08)' }}
        >
          <div className="flex items-center gap-2.5">
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
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ color: '#736554' }}
            aria-label="Close menu"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {SECTIONS.map((section) => (
            <div key={section.title} className="mb-6">
              <p
                className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5"
                style={{ color: '#A09880' }}
              >
                {section.title}
              </p>
              {section.items.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5"
                    style={
                      active
                        ? { background: '#EDE9DE', color: '#1E1611', boxShadow: '0 1px 3px rgba(43,49,23,0.08)' }
                        : { color: '#4A5427' }
                    }
                  >
                    <span style={{ color: active ? '#EE6B17' : '#736554' }}>{item.icon}</span>
                    {item.label}
                    {active && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: '#EE6B17' }}
                      />
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer: user + logout */}
        <div
          className="px-5 py-4 border-t shrink-0"
          style={{ borderColor: 'rgba(43,49,23,0.08)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: '#EE6B17' }}
            >
              {initials}
            </div>
            <span className="text-sm font-medium flex-1 truncate" style={{ color: '#1E1611' }}>
              {userName || 'Athlete'}
            </span>
            <a
              href="/api/logout"
              className="text-xs px-2.5 py-1.5 rounded-lg border shrink-0 transition-colors"
              style={{ color: '#736554', borderColor: 'rgba(43,49,23,0.12)' }}
            >
              Log out
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
