'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg]         = useState<string | null>(null)
  const router                = useRouter()

  async function handleSync() {
    setSyncing(true)
    setMsg(null)
    try {
      const res  = await fetch('/api/strava/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setMsg(`✓ Synced ${data.synced} run${data.synced !== 1 ? 's' : ''}`)
        router.refresh()           // re-fetch server component data
      } else {
        setMsg(data.detail ? `Sync failed: ${data.detail}` : 'Sync failed. Try again.')
      }
    } catch {
      setMsg('Sync failed. Try again.')
    } finally {
      setSyncing(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {msg && (
        <span
          className="text-sm font-medium"
          style={{ color: msg.startsWith('✓') ? 'var(--text-secondary)' : 'var(--accent)' }}
        >
          {msg}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
        style={{ background: '#FC5200' }}
      >
        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 fill-none stroke-current stroke-2 ${syncing ? 'animate-spin' : ''}`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
        {syncing ? 'Syncing…' : 'Sync Strava'}
      </button>
    </div>
  )
}
