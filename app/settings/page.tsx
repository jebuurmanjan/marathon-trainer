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
      style={{ background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.08)' }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={
            value === o.value
              ? { background: 'var(--accent)', color: '#fff' }
              : { color: 'var(--text-secondary)', background: 'transparent' }
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
        style={{ color: 'var(--text-muted)' }}
      >
        {title}
      </h2>
      <div
        className="rounded-xl divide-y divide-[rgba(var(--tint),0.06)]"
        style={{
          background: 'var(--surface)',
          border:     '1px solid rgba(var(--tint),0.08)',
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
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
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
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }} className="flex items-center justify-center">
        <div className="text-sm" style={{ color: 'var(--text-dim)' }}>Loading settings…</div>
      </div>
    )
  }

  const initials = settings.effectiveName
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navigation userName={settings.effectiveName} profilePhotoUrl={settings.profilePhotoUrl} />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1
            className="text-2xl"
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
          >
            Account settings
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Manage your profile and preferences</p>
        </div>

        {/* ── Profile ── */}
        <Section title="Profile">
          {/* Avatar + Strava name */}
          <div className="flex items-center gap-4 px-5 py-4">
            <div
              className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold text-white shrink-0"
              style={settings.profilePhotoUrl ? undefined : { background: 'var(--accent)' }}
            >
              {settings.profilePhotoUrl
                ? <img src={settings.profilePhotoUrl} alt={settings.effectiveName} className="w-full h-full object-cover" />
                : initials
              }
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{settings.effectiveName}</div>
              {settings.displayName && (
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Strava: {settings.stravaName}</div>
              )}
            </div>
          </div>

          {/* Display name */}
          <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(var(--tint),0.06)' }}>
            <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-primary)' }}>
              Display name
            </label>
            <p className="text-xs mb-3" style={{ color: 'var(--text-dim)' }}>
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
                style={{ background: 'var(--bg-base)', border: '1px solid rgba(var(--tint),0.12)', color: 'var(--text-primary)' }}
              />
              <button
                onClick={saveDisplayName}
                disabled={nameSaving}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 shrink-0"
                style={{ background: 'var(--accent)' }}
              >
                {nameSaving ? 'Saving…' : nameSaved ? '✓ Saved' : 'Save'}
              </button>
            </div>
            {nameError && (
              <p className="text-xs mt-2" style={{ color: 'var(--accent)' }}>{nameError}</p>
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
          <div style={{ borderTop: '1px solid rgba(var(--tint),0.06)' }}>
            <Row label="Appearance">
              <PillToggle
                value={settings.theme}
                options={[{ value: 'light', label: '☀ Light' }, { value: 'dark', label: '🌙 Dark' }]}
                onChange={handleTheme}
              />
            </Row>
          </div>
        </Section>

        {/* ── Training zones ── */}
        <Section title="Training zones">
          <div className="px-5 py-4">
            <p className="text-sm mb-3" style={{ color: 'var(--text-dim)' }}>
              Customise your heart rate zone boundaries. Used to score your training quality.
            </p>
            <a
              href="/statistics?tab=zones"
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg"
              style={{ background: 'var(--bg-base)', border: '1px solid rgba(var(--tint),0.12)', color: 'var(--text-secondary)' }}
            >
              Open zone settings →
            </a>
          </div>
        </Section>

        {/* ── Danger zone ── */}
        <Section title="Danger zone">
          <div className="px-5 py-4">
            <p className="text-sm mb-3" style={{ color: 'var(--text-dim)' }}>
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
            style={{ background: 'var(--bg-base)' }}
          >
            <div className="text-center mb-5">
              <div className="text-3xl mb-3">⚠️</div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}
              >
                Delete your account?
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                This will permanently delete your account, all training plans, and all synced Strava runs.
                <strong className="block mt-1" style={{ color: 'var(--text-primary)' }}>This cannot be undone.</strong>
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
                style={{ background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.10)', color: 'var(--text-secondary)' }}
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
