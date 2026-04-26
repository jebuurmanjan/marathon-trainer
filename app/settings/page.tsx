'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'

interface Settings {
  stravaName:      string
  displayName:     string | null
  effectiveName:   string
  profilePhotoUrl: string | null
  units:           'km' | 'miles'
  theme:           'light' | 'dark'
}

// ─── Pill toggle (2 options) ──────────────────────────────────────────────────

function PillToggle<T extends string>({
  value, options, onChange,
}: {
  value:    T
  options:  { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div
      className="flex gap-0.5 p-1 rounded-lg w-fit"
      style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={
            value === o.value
              ? { background: '#EE6B17', color: '#fff' }
              : { color: '#4A5427', background: 'transparent' }
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2
        className="text-[10px] font-bold uppercase tracking-widest mb-3"
        style={{ color: '#A09880' }}
      >
        {title}
      </h2>
      <div
        className="rounded-xl divide-y divide-[rgba(43,49,23,0.06)]"
        style={{
          background: '#EDE9DE',
          border:     '1px solid rgba(43,49,23,0.08)',
        }}
      >
        {children}
      </div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="text-sm font-medium" style={{ color: '#1E1611' }}>{label}</span>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()

  const [settings,    setSettings]    = useState<Settings | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [nameSaving,  setNameSaving]  = useState(false)
  const [nameSaved,   setNameSaved]   = useState(false)
  const [nameError,   setNameError]   = useState<string | null>(null)
  const [deleteOpen,  setDeleteOpen]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  // Load settings on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: Settings) => {
        setSettings(data)
        setDisplayName(data.displayName ?? '')
      })
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false))
  }, [router])

  // ── Patch helper ───────────────────────────────────────────────────────────
  async function patch(body: Record<string, unknown>) {
    await fetch('/api/settings', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
  }

  // ── Toggle handlers (auto-save) ───────────────────────────────────────────
  async function handleUnits(units: 'km' | 'miles') {
    if (!settings) return
    setSettings({ ...settings, units })
    await patch({ units })
  }

  async function handleTheme(theme: 'light' | 'dark') {
    if (!settings) return
    setSettings({ ...settings, theme })
    document.documentElement.setAttribute('data-theme', theme)
    await patch({ theme })
  }

  // ── Display name save ─────────────────────────────────────────────────────
  async function saveDisplayName() {
    if (!settings) return
    setNameSaving(true)
    setNameError(null)
    setNameSaved(false)
    try {
      const res = await fetch('/api/settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ displayName: displayName.trim() || null }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to save')
      }
      const effectiveName = displayName.trim() || settings.stravaName
      setSettings({ ...settings, displayName: displayName.trim() || null, effectiveName })
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2500)
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setNameSaving(false)
    }
  }

  // ── Delete account ────────────────────────────────────────────────────────
  async function deleteAccount() {
    setDeleting(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      router.replace('/')
    } catch {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (loading || !settings) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F3EC' }} className="flex items-center justify-center">
        <div className="text-sm" style={{ color: '#736554' }}>Loading settings…</div>
      </div>
    )
  }

  const initials = settings.effectiveName
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <div style={{ minHeight: '100vh', background: '#F5F3EC' }}>
      <Navigation userName={settings.effectiveName} profilePhotoUrl={settings.profilePhotoUrl} />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1
            className="text-2xl"
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: '#1E1611' }}
          >
            Account settings
          </h1>
          <p className="text-sm mt-1" style={{ color: '#736554' }}>Manage your profile and preferences</p>
        </div>

        {/* ── Profile ── */}
        <Section title="Profile">
          {/* Avatar + Strava name */}
          <div className="flex items-center gap-4 px-5 py-4">
            <div
              className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold text-white shrink-0"
              style={settings.profilePhotoUrl ? undefined : { background: '#EE6B17' }}
            >
              {settings.profilePhotoUrl
                ? <img src={settings.profilePhotoUrl} alt={settings.effectiveName} className="w-full h-full object-cover" />
                : initials
              }
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: '#1E1611' }}>{settings.effectiveName}</div>
              {settings.displayName && (
                <div className="text-xs mt-0.5" style={{ color: '#A09880' }}>Strava: {settings.stravaName}</div>
              )}
            </div>
          </div>

          {/* Display name */}
          <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(43,49,23,0.06)' }}>
            <label className="text-sm font-medium block mb-2" style={{ color: '#1E1611' }}>
              Display name
            </label>
            <p className="text-xs mb-3" style={{ color: '#736554' }}>
              Override your Strava name. Leave blank to use your Strava name.
            </p>
            <div className="flex gap-2">
              <input
                ref={nameRef}
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setNameSaved(false) }}
                onKeyDown={(e) => { if (e.key === 'Enter') saveDisplayName() }}
                placeholder={settings.stravaName}
                maxLength={60}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: '#F5F3EC', border: '1px solid rgba(43,49,23,0.12)', color: '#1E1611' }}
              />
              <button
                onClick={saveDisplayName}
                disabled={nameSaving}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 shrink-0"
                style={{ background: '#EE6B17' }}
              >
                {nameSaving ? 'Saving…' : nameSaved ? '✓ Saved' : 'Save'}
              </button>
            </div>
            {nameError && (
              <p className="text-xs mt-2" style={{ color: '#EE6B17' }}>{nameError}</p>
            )}
          </div>
        </Section>

        {/* ── Preferences ── */}
        <Section title="Preferences">
          <Row label="Distance units">
            <PillToggle
              value={settings.units}
              options={[{ value: 'km', label: 'km' }, { value: 'miles', label: 'miles' }]}
              onChange={handleUnits}
            />
          </Row>
          <div style={{ borderTop: '1px solid rgba(43,49,23,0.06)' }}>
            <Row label="Appearance">
              <PillToggle
                value={settings.theme}
                options={[{ value: 'light', label: '☀ Light' }, { value: 'dark', label: '🌙 Dark' }]}
                onChange={handleTheme}
              />
            </Row>
          </div>
          {settings.theme === 'dark' && (
            <div
              className="mx-4 mb-4 px-3 py-2.5 rounded-lg text-xs"
              style={{ background: 'rgba(238,107,23,0.08)', color: '#736554' }}
            >
              Full dark theme is coming soon — preference is saved for when it lands.
            </div>
          )}
        </Section>

        {/* ── Training zones ── */}
        <Section title="Training zones">
          <div className="px-5 py-4">
            <p className="text-sm mb-3" style={{ color: '#736554' }}>
              Customise your heart rate zone boundaries. Used to score your training quality.
            </p>
            <a
              href="/statistics?tab=zones"
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg"
              style={{ background: '#F5F3EC', border: '1px solid rgba(43,49,23,0.12)', color: '#4A5427' }}
            >
              Open zone settings →
            </a>
          </div>
        </Section>

        {/* ── Danger zone ── */}
        <Section title="Danger zone">
          <div className="px-5 py-4">
            <p className="text-sm mb-3" style={{ color: '#736554' }}>
              Permanently deletes your account, all training plans, and all synced runs. This cannot be undone.
            </p>
            <button
              onClick={() => setDeleteOpen(true)}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.20)', color: '#DC2626' }}
            >
              Delete account
            </button>
          </div>
        </Section>
      </main>

      {/* ── Delete confirmation modal ── */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(30,22,17,0.50)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) setDeleteOpen(false) }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: '#F5F3EC' }}
          >
            <div className="text-center mb-5">
              <div className="text-3xl mb-3">⚠️</div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}
              >
                Delete your account?
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#736554' }}>
                This will permanently delete your account, all training plans, and all synced Strava runs.
                <strong className="block mt-1" style={{ color: '#1E1611' }}>This cannot be undone.</strong>
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={deleteAccount}
                disabled={deleting}
                className="w-full py-3 rounded-lg text-sm font-bold text-white disabled:opacity-60"
                style={{ background: '#DC2626' }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete everything'}
              </button>
              <button
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="w-full py-3 rounded-lg text-sm font-semibold"
                style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.10)', color: '#4A5427' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
