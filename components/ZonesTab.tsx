'use client'

import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_ZONES, ZONE_META, ZoneConfig, fmtZoneTime, zoneBoundaryLabel } from '@/lib/hr-zones'
import type { ZoneDataResponse, WeeklyZoneRow } from '@/app/api/hr-zones/data/route'

// ─── Zone stacked-bar chart (SVG) ────────────────────────────────────────────

function WeeklyChart({ weekly }: { weekly: WeeklyZoneRow[] }) {
  if (weekly.length === 0) return null

  const CL = 40, CT = 10, CB = 120
  const CH = CB - CT  // chart height

  const maxTotal = Math.max(...weekly.map((w) => w.total))
  const maxHours = maxTotal / 3600

  // Y axis labels: 0, then nice round steps
  const yStep  = maxHours <= 2 ? 0.5 : maxHours <= 5 ? 1 : maxHours <= 10 ? 2 : 5
  const yLabels: number[] = []
  for (let v = 0; v <= Math.ceil(maxHours / yStep) * yStep + 0.01; v += yStep) yLabels.push(v)

  const barSlot = Math.max(14, Math.min(28, (560 - CL) / weekly.length))
  const barW    = Math.round(barSlot * 0.65)
  const gap     = barSlot - barW
  const VW      = CL + weekly.length * barSlot + gap + 10

  function yPos(seconds: number) {
    return CB - (seconds / maxTotal) * CH
  }

  return (
    <svg viewBox={`0 0 ${VW} 148`} className="w-full" style={{ overflow: 'visible' }}>
      {/* Y-axis grid + labels */}
      {yLabels.map((h) => {
        const y = CB - (h / maxHours) * CH
        return (
          <g key={h}>
            <line x1={CL} y1={y} x2={VW - 4} y2={y} stroke="rgba(43,49,23,0.06)" strokeWidth="1"/>
            <text x={CL - 5} y={y + 3.5} textAnchor="end" fontSize="9" fill="#A09880" fontFamily="system-ui,sans-serif">
              {h % 1 === 0 ? `${h}h` : `${h * 60}m`}
            </text>
          </g>
        )
      })}

      {/* Bars */}
      {weekly.map((week, i) => {
        const x = CL + i * barSlot + gap / 2
        let currentY = CB

        return (
          <g key={week.weekKey}>
            {week.zones.map((zSec, zi) => {
              if (zSec === 0) return null
              const h = (zSec / maxTotal) * CH
              currentY -= h
              return (
                <rect
                  key={zi}
                  x={x} y={currentY}
                  width={barW} height={h}
                  fill={ZONE_META[zi].color}
                  rx="1"
                />
              )
            })}
            {/* Week label */}
            <text
              x={x + barW / 2} y={CB + 14}
              textAnchor="middle"
              fontSize="8"
              fill="#A09880"
              fontFamily="system-ui,sans-serif"
            >
              {week.weekLabel}
            </text>
          </g>
        )
      })}

      {/* Axis line */}
      <line x1={CL} y1={CB} x2={VW - 4} y2={CB} stroke="rgba(43,49,23,0.12)" strokeWidth="1"/>
    </svg>
  )
}

// ─── Zone editor (inline panel) ───────────────────────────────────────────────

function ZoneEditor({
  config, onSave, onCancel,
}: {
  config: ZoneConfig
  onSave: (cfg: ZoneConfig) => Promise<void>
  onCancel: () => void
}) {
  const [vals, setVals] = useState<ZoneConfig>({ ...config })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const zoneNames = ['Recovery', 'Aerobic Endurance', 'Aerobic Power', 'Threshold', 'Anaerobic Endurance']
  const keys: (keyof ZoneConfig)[] = ['zone1Max', 'zone2Max', 'zone3Max', 'zone4Max', 'zone5Max']

  async function handleSave() {
    // Basic validation
    const arr = keys.map((k) => vals[k])
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] <= arr[i - 1]) {
        setErr('Each zone must have a higher upper bound than the previous one.')
        return
      }
    }
    setSaving(true)
    setErr(null)
    await onSave(vals)
    setSaving(false)
  }

  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{ background: '#F5F4F2', border: '1px solid rgba(43,49,23,0.10)' }}
    >
      <p className="text-xs font-semibold mb-3" style={{ color: '#4A5427' }}>
        Edit zone boundaries — enter the <strong>upper bpm limit</strong> of each zone.
        Zone 6 (Anaerobic Power) is everything above Zone 5.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {keys.map((key, i) => (
          <div key={key}>
            <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#736554' }}>
              {zoneNames[i]}
              <span
                className="ml-1.5 inline-block w-2 h-2 rounded-full align-middle"
                style={{ background: ZONE_META[i].color }}
              />
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={50} max={250}
                value={vals[key]}
                onChange={(e) => setVals((v) => ({ ...v, [key]: parseInt(e.target.value) || 0 }))}
                className="w-20 px-2 py-1.5 rounded-lg text-sm text-center font-semibold border outline-none"
                style={{
                  background: '#EDE9DE',
                  borderColor: 'rgba(43,49,23,0.12)',
                  color: '#1E1611',
                }}
              />
              <span className="text-xs" style={{ color: '#736554' }}>bpm max</span>
            </div>
          </div>
        ))}
      </div>

      {err && <p className="text-xs mb-2" style={{ color: '#EE6B17' }}>{err}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: '#EE6B17' }}
        >
          {saving ? 'Saving…' : 'Save zones'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 rounded-lg text-sm font-medium"
          style={{ color: '#736554' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ZonesTab() {
  const [status, setStatus]         = useState<'loading' | 'empty' | 'ready'>('loading')
  const [config, setConfig]         = useState<ZoneConfig>(DEFAULT_ZONES)
  const [data, setData]             = useState<ZoneDataResponse | null>(null)
  const [syncing, setSyncing]       = useState(false)
  const [syncDone, setSyncDone]     = useState(0)
  const [syncLeft, setSyncLeft]     = useState<number | null>(null)
  const [editingZones, setEditingZones] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [cfgRes, dataRes] = await Promise.all([
        fetch('/api/hr-zones/config'),
        fetch('/api/hr-zones/data'),
      ])
      if (cfgRes.ok)  setConfig((await cfgRes.json()).config)
      if (dataRes.ok) {
        const d: ZoneDataResponse = await dataRes.json()
        setData(d)
        setStatus(d.hasData ? 'ready' : 'empty')
      } else {
        setStatus('empty')
      }
    } catch {
      setStatus('empty')
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleSync() {
    setSyncing(true)
    setSyncDone(0)
    setSyncLeft(null)
    let done = 0
    // Keep calling until all activities are processed
    while (true) {
      try {
        const res  = await fetch('/api/hr-zones/sync', { method: 'POST' })
        const body = await res.json()
        done += body.synced ?? 0
        setSyncDone(done)
        setSyncLeft(body.remaining ?? 0)
        if (!res.ok || body.remaining === 0) break
      } catch {
        break
      }
    }
    setSyncing(false)
    setSyncLeft(0)
    await loadData()
  }

  async function handleSaveConfig(newCfg: ZoneConfig) {
    const res = await fetch('/api/hr-zones/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCfg),
    })
    if (res.ok) {
      setConfig(newCfg)
      setEditingZones(false)
      // Invalidate synced zone data so user re-syncs with new boundaries
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const syncBtn = (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-xl text-sm disabled:opacity-60 shrink-0"
      style={{ background: '#EE6B17' }}
    >
      <svg viewBox="0 0 24 24" className={`w-4 h-4 fill-none stroke-current stroke-2 ${syncing ? 'animate-spin' : ''}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
      </svg>
      {syncing
        ? syncLeft !== null
          ? `Syncing… (${syncLeft} left)`
          : 'Syncing…'
        : 'Sync HR data'}
    </button>
  )

  if (status === 'loading') {
    return (
      <div className="text-center py-20 text-sm" style={{ color: '#736554' }}>
        Loading…
      </div>
    )
  }

  if (status === 'empty' || !data) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
      >
        <div className="text-4xl mb-3">💓</div>
        <p className="font-semibold mb-1" style={{ color: '#1E1611' }}>No HR zone data yet</p>
        <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: '#736554' }}>
          Sync your Strava activities to pull heart rate streams and calculate time in each zone.
          {data && data.totalCount > 0 && ` ${data.totalCount} activities found.`}
        </p>
        {syncing && syncLeft !== null && (
          <p className="text-sm mb-3 font-medium" style={{ color: '#EE6B17' }}>
            Processing {syncDone} activities… {syncLeft} remaining
          </p>
        )}
        {syncBtn}
      </div>
    )
  }

  const { totalZones, totalSeconds, weekly, syncedCount, totalCount } = data

  return (
    <div className="space-y-4">

      {/* Controls row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs" style={{ color: '#736554' }}>
          {syncedCount} of {totalCount} activities with HR data
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingZones((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
            style={{
              color: '#4A5427',
              background: editingZones ? '#EDE9DE' : 'transparent',
              borderColor: 'rgba(43,49,23,0.14)',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit HR zones
          </button>
          {syncing && syncLeft !== null && (
            <span className="text-xs font-medium" style={{ color: '#EE6B17' }}>
              {syncDone} done, {syncLeft} left…
            </span>
          )}
          {syncBtn}
        </div>
      </div>

      {/* Zone editor */}
      {editingZones && (
        <ZoneEditor
          config={config}
          onSave={handleSaveConfig}
          onCancel={() => setEditingZones(false)}
        />
      )}

      {/* ── Zone distribution ── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
      >
        <h3
          className="text-base font-semibold mb-4"
          style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, color: '#1E1611' }}
        >
          Zone distribution
        </h3>

        <div className="space-y-3">
          {ZONE_META.map((meta, i) => {
            const zSec = totalZones[i]
            const pct  = totalSeconds > 0 ? Math.round((zSec / totalSeconds) * 100) : 0
            return (
              <div key={i} className="flex items-center gap-3">
                {/* Colour dot */}
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.color }} />

                {/* Name + range */}
                <div className="w-44 shrink-0">
                  <div className="text-xs font-semibold" style={{ color: '#1E1611' }}>{meta.name}</div>
                  <div className="text-[10px]" style={{ color: '#736554' }}>
                    {zoneBoundaryLabel(i, config)}
                  </div>
                </div>

                {/* Bar */}
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(43,49,23,0.08)' }}>
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: meta.color }}
                  />
                </div>

                {/* Time */}
                <div className="text-xs font-semibold tabular-nums w-14 text-right shrink-0" style={{ color: '#1E1611' }}>
                  {fmtZoneTime(zSec)}
                </div>

                {/* Pct */}
                <div className="text-xs tabular-nums w-8 text-right shrink-0" style={{ color: '#736554' }}>
                  {pct}%
                </div>
              </div>
            )
          })}
        </div>

        {/* Total */}
        <div
          className="mt-4 pt-3 flex justify-between text-xs border-t"
          style={{ borderColor: 'rgba(43,49,23,0.08)', color: '#736554' }}
        >
          <span>Total training time</span>
          <span className="font-semibold" style={{ color: '#1E1611' }}>{fmtZoneTime(totalSeconds)}</span>
        </div>
      </div>

      {/* ── Weekly trend chart ── */}
      {weekly.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
        >
          <h3
            className="text-base font-semibold mb-1"
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, color: '#1E1611' }}
          >
            Weekly zone breakdown
          </h3>
          <p className="text-xs mb-4" style={{ color: '#736554' }}>
            Stacked by zone — height = total training time that week
          </p>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4">
            {ZONE_META.map((meta, i) => (
              <span key={i} className="flex items-center gap-1 text-[10px]" style={{ color: '#736554' }}>
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: meta.color }} />
                Z{i + 1} {meta.name}
              </span>
            ))}
          </div>

          <WeeklyChart weekly={weekly} />
        </div>
      )}
    </div>
  )
}
