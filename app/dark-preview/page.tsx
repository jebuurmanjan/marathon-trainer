'use client'

import { useState } from 'react'

// ─── Dark mode token candidates ────────────────────────────────────────────────
// Edit these values and refresh to iterate on the palette.
// Once approved, these become the [data-theme="dark"] CSS variables.

const DARK = {
  bgBase:       '#111111',   // page background
  surface:      '#1F1919',   // cards, week cards, drawers
  surface2:     '#252420',   // progress bar bg, subtle wells
  surface3:     '#2B1F0B',   // active tab, deepest surface
  textPrimary:  '#EDE9DE',   // headlines, body
  textSecondary:'#9E8E7A',   // labels, descriptions
  textDim:      '#6E5E4A',   // timestamps, hints
  textMuted:    '#4A3A28',   // section headers (uppercase labels)
  accent:       '#EE4917',   // orange — slightly deeper/warmer on dark
  accentViolet: '#A89FEF',   // slightly lighter violet for dark bg
  accentGreen:  '#7A9A3A',   // completed, success
  border:       'rgba(237,233,222,0.08)',
  borderMid:    'rgba(237,233,222,0.12)',
  borderStrong: 'rgba(237,233,222,0.20)',
  // semi-transparent accent tints (used only in badges/pills, not card backgrounds)
  orangeTint:   'rgba(238,73,23,0.14)',
  violetTint:   'rgba(136,121,225,0.14)',
  greenTint:    'rgba(122,154,58,0.14)',
  redTint:      'rgba(220,38,38,0.10)',
  // workout card states — type-agnostic
  cardBase:        '#1B1A18',              // upcoming: neutral, recessive
  cardDone:        '#1E2219',              // completed: +8 green channel lift reads as resolved
  cardDoneBorder:  'rgba(122,154,58,0.20)',// faint green rim echoes the checkmark
  cardMissed:      '#221A18',              // missed: +7 red channel — red equivalent of cardDone
  cardMissedBorder:'rgba(220,38,38,0.20)', // faint red rim
}

const LIGHT = {
  bgBase:       '#F5F3EC',
  surface:      '#EDE9DE',
  surface2:     '#F5F4F2',
  surface3:     '#E3D2B4',
  textPrimary:  '#1E1611',
  textSecondary:'#4A5427',
  textDim:      '#736554',
  textMuted:    '#A09880',
  accent:       '#EE6B17',
  accentViolet: '#8879E1',
  accentGreen:  '#4A5427',
  border:       'rgba(43,49,23,0.08)',
  borderMid:    'rgba(43,49,23,0.12)',
  borderStrong: 'rgba(43,49,23,0.20)',
  orangeTint:   'rgba(238,107,23,0.12)',
  violetTint:   'rgba(136,121,225,0.12)',
  greenTint:    'rgba(74,84,39,0.10)',
  redTint:      'rgba(220,38,38,0.08)',
  cardBase:        '#F5F4F2',
  cardDone:        'rgba(74,84,39,0.08)',
  cardDoneBorder:  'rgba(74,84,39,0.20)',
  cardMissed:      'rgba(238,107,23,0.06)',
  cardMissedBorder:'rgba(220,38,38,0.18)',
}

// ─── Preview page ──────────────────────────────────────────────────────────────

export default function DarkPreviewPage() {
  const [mode, setMode] = useState<'dark' | 'light'>('dark')
  const t = mode === 'dark' ? DARK : LIGHT

  return (
    <div style={{ minHeight: '100vh', background: t.bgBase, padding: '24px 0', transition: 'background 0.2s' }}>

      {/* ── Mode toggle ── */}
      <div className="flex justify-center mb-6 gap-3 items-center">
        <span style={{ color: '#888', fontSize: '12px', fontFamily: 'system-ui' }}>
          Dark mode preview · edit token values in <code>/app/dark-preview/page.tsx</code>
        </span>
        <button
          onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
          style={{
            background: mode === 'dark' ? '#EE6B17' : '#EDE9DE',
            color:       mode === 'dark' ? '#fff'    : '#1E1611',
            border:      'none',
            borderRadius: '8px',
            padding:     '6px 14px',
            fontSize:    '12px',
            fontWeight:  600,
            cursor:      'pointer',
            fontFamily:  'system-ui',
          }}
        >
          Showing: {mode === 'dark' ? '🌙 Dark' : '☀ Light'}
        </button>
      </div>

      {/* ── Canvas ── */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 16px' }}>

        {/* Navigation */}
        <Section label="Navigation bar" t={t}>
          <div
            style={{
              background:   t.bgBase,
              borderBottom: `1px solid ${t.border}`,
              padding:      '0 20px',
              height:       '72px',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'space-between',
              borderRadius: '16px',
            }}
          >
            {/* Hamburger */}
            <div style={{ color: t.textSecondary, fontSize: '18px', lineHeight: 1, cursor: 'pointer' }}>☰</div>

            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>⏱</div>
              <span style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, fontSize: '26px', letterSpacing: '-0.045em', color: t.textPrimary, lineHeight: 1 }}>
                Sub <span style={{ color: t.accent }}>3:30</span>
              </span>
            </div>

            {/* Avatar */}
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700 }}>JT</div>
          </div>
        </Section>

        {/* Hero stats */}
        <Section label="Hero stats grid" t={t}>
          <div style={{ background: t.bgBase, padding: '20px', borderRadius: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Days to race', value: '42', sub: '7 June',       accent: true  },
                { label: 'Current week', value: '14/20', sub: 'Peak phase', accent: false },
                { label: 'Km logged',    value: '623',   sub: 'of ~840 planned', accent: false },
                { label: 'Target pace',  value: '4:58',  sub: 'Sub 3:30 goal',   accent: false },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    borderRadius: '16px',
                    padding:      '16px',
                    background:   t.surface,
                    border:       stat.accent ? `1px solid rgba(238,107,23,0.30)` : `1px solid ${t.border}`,
                    position:     'relative',
                    overflow:     'hidden',
                  }}
                >
                  {stat.accent && (
                    <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'radial-gradient(circle at top right, rgba(238,107,23,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
                  )}
                  <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.textSecondary, marginBottom: '8px' }}>{stat.label}</div>
                  <div style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, fontSize: '30px', letterSpacing: '-0.04em', color: stat.accent ? t.accent : t.textPrimary, lineHeight: 1, marginBottom: '4px' }}>{stat.value}</div>
                  <div style={{ fontSize: '11px', color: t.textDim }}>{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Filter tabs + current week banner */}
        <Section label="Filter tabs + current week banner" t={t}>
          <div style={{ background: t.bgBase, padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Tab row */}
            <div style={{ display: 'flex', gap: '2px', padding: '4px', borderRadius: '12px', background: t.surface, border: `1px solid ${t.border}`, width: 'fit-content' }}>
              {['upcoming', 'all', 'past'].map((f, i) => (
                <button
                  key={f}
                  style={{
                    padding:     '6px 14px',
                    borderRadius: '8px',
                    fontSize:    '13px',
                    fontWeight:  500,
                    border:      'none',
                    cursor:      'pointer',
                    textTransform: 'capitalize',
                    background:  i === 0 ? t.surface3 : 'transparent',
                    color:       i === 0 ? t.textPrimary : t.textSecondary,
                    boxShadow:   i === 0 ? `0 1px 3px ${t.border}` : 'none',
                  }}
                >{f}</button>
              ))}
            </div>

            {/* Banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '12px', padding: '12px 16px', background: 'rgba(238,107,23,0.10)', border: '1px solid rgba(238,107,23,0.25)', color: t.accent, fontSize: '13px', fontWeight: 500 }}>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              Week 14 — Peak phase. Stay consistent and keep easy runs genuinely easy.
            </div>
          </div>
        </Section>

        {/* Week card — current week expanded */}
        <Section label="Week card (current week, expanded)" t={t}>
          <div style={{ borderRadius: '16px', overflow: 'hidden', background: t.surface, border: `1px solid rgba(238,107,23,0.30)` }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px' }}>
              <span style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, fontSize: '12px', color: t.accent, minWidth: '28px' }}>W14</span>
              <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '2px 8px', borderRadius: '999px', background: 'rgba(238,107,23,0.12)', color: t.accent }}>Peak</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, fontSize: '13px', color: t.textPrimary, letterSpacing: '-0.01em' }}>Peak volume — race-pace work</div>
                <div style={{ fontSize: '11px', color: t.textSecondary, marginTop: '2px' }}>19 May – 25 May</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, fontSize: '18px', letterSpacing: '-0.03em', color: t.textPrimary }}>72 km</div>
                <div style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 600, marginTop: '2px' }}>43.2 km logged</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: t.accentGreen }}>~74<span style={{ opacity: 0.55, fontWeight: 400 }}>/100</span></span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: '2px', background: t.surface2 }}>
              <div style={{ height: '2px', width: '60%', background: t.accent, borderRadius: '1px' }} />
            </div>

            {/* Run rows */}
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <RunRowPreview t={t} type="easy"    label="Easy run"         km="12 km"  pace="5:45 /km" date="Mon 19 May" status="completed" />
              <RunRowPreview t={t} type="quality" label="Tempo intervals"  km="16 km"  pace="4:30 /km" date="Wed 21 May" status="upcoming"  />
              <RunRowPreview t={t} type="easy"    label="Recovery run"     km="8 km"   pace="6:00 /km" date="Thu 22 May" status="missed"    />
              <RunRowPreview t={t} type="long"    label="Long run"         km="32 km"  pace="5:15 /km" date="Sat 24 May" status="upcoming"  />
              <StrengthRowPreview t={t} date="Fri 23 May" completed={true} />
            </div>
          </div>
        </Section>

        {/* Week card — past week collapsed */}
        <Section label="Week card (past week, collapsed)" t={t}>
          <div style={{ borderRadius: '16px', overflow: 'hidden', background: t.surface, border: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px' }}>
              <span style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, fontSize: '12px', color: t.textDim, minWidth: '28px' }}>W13</span>
              <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '2px 8px', borderRadius: '999px', background: t.greenTint, color: t.accentGreen }}>Taper</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, fontSize: '13px', color: t.textPrimary }}>Build week — aerobic base</div>
                <div style={{ fontSize: '11px', color: t.textSecondary, marginTop: '2px' }}>12 May – 18 May</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, fontSize: '18px', color: t.textPrimary }}>65 km</div>
                <div style={{ fontSize: '11px', color: t.textSecondary, fontWeight: 600, marginTop: '2px' }}>64.1 km logged</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: t.accentGreen }}>88<span style={{ opacity: 0.55, fontWeight: 400 }}>/100</span></span>
                </div>
                <div style={{ fontSize: '10px', color: t.textDim, marginTop: '2px' }}>▸ expand</div>
              </div>
            </div>
            <div style={{ height: '2px', background: t.surface2 }}>
              <div style={{ height: '2px', width: '99%', background: t.accentGreen, borderRadius: '1px' }} />
            </div>
          </div>
        </Section>

        {/* Phase badges */}
        <Section label="Phase badges" t={t}>
          <div style={{ background: t.surface, padding: '20px', borderRadius: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Base',    bg: `rgba(227,210,180,0.20)`, color: t.textDim      },
              { label: 'Build',   bg: t.violetTint,              color: t.accentViolet },
              { label: 'Peak',    bg: t.orangeTint,              color: t.accent       },
              { label: 'Sharpen', bg: t.orangeTint,              color: t.accent       },
              { label: 'Taper',   bg: t.greenTint,               color: t.accentGreen  },
            ].map((b) => (
              <span key={b.label} style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '4px 10px', borderRadius: '999px', background: b.bg, color: b.color }}>{b.label}</span>
            ))}
          </div>
        </Section>

        {/* Settings sections */}
        <Section label="Settings — Profile + Preferences" t={t}>
          <div style={{ background: t.bgBase, padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Profile card */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: t.textMuted, marginBottom: '10px' }}>Profile</div>
              <div style={{ borderRadius: '16px', background: t.surface, border: `1px solid ${t.border}` }}>
                {/* Avatar row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '18px', flexShrink: 0 }}>JT</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: t.textPrimary }}>Jan Teunissen</div>
                    <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>Strava: Jan Teunissen</div>
                  </div>
                </div>
                {/* Display name input */}
                <div style={{ borderTop: `1px solid ${t.border}`, padding: '16px 20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: t.textPrimary, marginBottom: '6px' }}>Display name</div>
                  <div style={{ fontSize: '12px', color: t.textDim, marginBottom: '10px' }}>Override your Strava name. Leave blank to use your Strava name.</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1, padding: '10px 16px', borderRadius: '12px', background: t.bgBase, border: `1px solid ${t.borderMid}`, color: t.textDim, fontSize: '13px' }}>Jan Teunissen</div>
                    <button style={{ padding: '10px 16px', borderRadius: '12px', background: t.accent, color: '#fff', fontWeight: 600, fontSize: '13px', border: 'none', cursor: 'pointer', flexShrink: 0 }}>Save</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: t.textMuted, marginBottom: '10px' }}>Preferences</div>
              <div style={{ borderRadius: '16px', background: t.surface, border: `1px solid ${t.border}` }}>
                {/* Units */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: t.textPrimary }}>Distance units</span>
                  <PillTogglePreview t={t} options={['km', 'miles']} active="km" />
                </div>
                {/* Theme */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: `1px solid ${t.border}` }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: t.textPrimary }}>Appearance</span>
                  <PillTogglePreview t={t} options={['☀ Light', '🌙 Dark']} active="🌙 Dark" />
                </div>
              </div>
            </div>

            {/* Danger zone */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: t.textMuted, marginBottom: '10px' }}>Danger zone</div>
              <div style={{ borderRadius: '16px', background: t.surface, border: `1px solid ${t.border}`, padding: '16px 20px' }}>
                <div style={{ fontSize: '13px', color: t.textDim, marginBottom: '12px' }}>Permanently deletes your account, all training plans, and all synced runs.</div>
                <button style={{ padding: '10px 16px', borderRadius: '12px', background: t.redTint, border: `1px solid ${t.borderStrong.replace('245,243,236', '220,38,38')}`, color: '#F87171', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Delete account
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* Side menu footer */}
        <Section label="Side menu user footer" t={t}>
          <div style={{ background: t.surface3, borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '13px' }}>JT</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: t.textPrimary }}>Jan Teunissen</div>
                <div style={{ fontSize: '11px', color: t.textDim }}>via Strava</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button style={{ padding: '6px 12px', borderRadius: '8px', background: t.surface, border: `1px solid ${t.border}`, color: t.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Account</button>
              <button style={{ padding: '6px 12px', borderRadius: '8px', background: t.surface, border: `1px solid ${t.border}`, color: t.textDim, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Log out</button>
            </div>
          </div>
        </Section>

      </div>
    </div>
  )
}

// ─── Mini sub-components ───────────────────────────────────────────────────────

function Section({ label, t, children }: { label: string; t: typeof DARK; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#666', fontFamily: 'system-ui', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function RunRowPreview({ t, type, label, km, pace, date, status }: {
  t: typeof DARK
  type: 'easy' | 'quality' | 'long'
  label: string
  km: string
  pace: string
  date: string
  status: 'completed' | 'upcoming' | 'missed'
}) {
  // Type badge colours — still differentiate the run type
  const typeStyle = {
    easy:    { bg: t.greenTint,  color: t.accentGreen,  dot: t.accentGreen  },
    quality: { bg: t.orangeTint, color: t.accent,        dot: t.accent       },
    long:    { bg: t.violetTint, color: t.accentViolet,  dot: t.accentViolet },
  }[type]

  // Card background — type-agnostic, only completion state matters
  const rowBg = status === 'completed' ? t.cardDone
              : status === 'missed'    ? t.cardMissed
              :                          t.cardBase
  const rowBorder = status === 'completed' ? `1px solid ${t.cardDoneBorder}`
                  : status === 'missed'    ? `1px solid ${t.cardMissedBorder}`
                  :                          `1px solid ${t.border}`
  const isCompleted = status === 'completed'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '12px', background: rowBg, border: rowBorder }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeStyle.dot, flexShrink: 0 }} />
      <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', padding: '2px 7px', borderRadius: '999px', background: typeStyle.bg, color: typeStyle.color, flexShrink: 0 }}>{type}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: status === 'missed' ? t.textDim : t.textPrimary, textDecoration: status === 'missed' ? 'line-through' : 'none' }}>{label}</div>
        <div style={{ fontSize: '11px', color: t.textDim, marginTop: '1px' }}>{date}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: isCompleted ? t.textPrimary : t.textDim }}>{km}</div>
        <div style={{ fontSize: '11px', color: t.textDim }}>{pace}</div>
      </div>
      {isCompleted && (
        <div style={{ color: t.accentGreen, fontSize: '16px', flexShrink: 0 }}>✓</div>
      )}
    </div>
  )
}

function StrengthRowPreview({ t, date, completed }: { t: typeof DARK; date: string; completed: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '12px', background: completed ? t.cardDone : t.cardBase, border: `1px solid ${completed ? t.cardDoneBorder : t.border}` }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.textDim, flexShrink: 0 }} />
      <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', padding: '2px 7px', borderRadius: '999px', background: t.border, color: t.textDim, flexShrink: 0 }}>strength</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: t.textPrimary }}>Strength & mobility</div>
        <div style={{ fontSize: '11px', color: t.textDim, marginTop: '1px' }}>{date}</div>
      </div>
      {completed && <div style={{ color: t.accentGreen, fontSize: '16px' }}>✓</div>}
      {!completed && (
        <button style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', background: 'transparent', border: `1px solid ${t.border}`, color: t.textDim, cursor: 'pointer' }}>Mark done</button>
      )}
    </div>
  )
}

function PillTogglePreview({ t, options, active }: { t: typeof DARK; options: string[]; active: string }) {
  return (
    <div style={{ display: 'flex', gap: '2px', padding: '4px', borderRadius: '12px', background: t.surface2, border: `1px solid ${t.border}` }}>
      {options.map((o) => (
        <button
          key={o}
          style={{
            padding:      '6px 14px',
            borderRadius: '8px',
            fontSize:     '13px',
            fontWeight:   500,
            border:       'none',
            cursor:       'pointer',
            background:   o === active ? t.accent : 'transparent',
            color:        o === active ? '#fff' : t.textSecondary,
          }}
        >{o}</button>
      ))}
    </div>
  )
}
