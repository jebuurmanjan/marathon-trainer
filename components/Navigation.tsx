'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/plan', label: 'Training Plan' },
  { href: '/progress', label: 'Progress' },
  { href: '/suggestions', label: 'AI Coach' },
]

interface NavigationProps {
  userName: string
}

export default function Navigation({ userName }: NavigationProps) {
  const pathname = usePathname()

  return (
    <header className="border-b border-gray-800 bg-gray-950 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/plan" className="flex items-center gap-2 text-white font-bold text-lg">
          <span className="text-orange-500">⏱</span>
          <span>Sub 3:30</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm hidden sm:block">{userName}</span>
          <a
            href="/api/logout"
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Logout
          </a>
        </div>
      </div>
    </header>
  )
}
