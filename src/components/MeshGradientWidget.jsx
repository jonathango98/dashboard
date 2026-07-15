import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { api } from '../api'
import storage from '../storage'

// One mesh gradient per 6-hour block, deterministic from date + block,
// so everyone gets the same "morning gradient" all morning.
const BLOCKS = ['night', 'morning', 'afternoon', 'evening'] // idx = floor(hour / 6)

const PALETTES = {
  morning: {
    hues: [[18, 45], [195, 215], [330, 350], [45, 60]],
    sat: [65, 90],
    light: [65, 82],
    baseLight: 88,
  },
  afternoon: {
    hues: [[200, 225], [45, 58], [165, 185], [10, 25]],
    sat: [70, 95],
    light: [55, 70],
    baseLight: 78,
  },
  evening: {
    hues: [[10, 35], [270, 300], [335, 355], [220, 240]],
    sat: [60, 85],
    light: [45, 62],
    baseLight: 52,
  },
  night: {
    hues: [[220, 250], [260, 290], [200, 220], [290, 320]],
    sat: [40, 70],
    light: [18, 38],
    baseLight: 14,
  },
}

const BLOB_COUNT = 6

function hashSeed(str) {
  let h = 1779033703
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hsla({ h, s, l }, a) {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`
}

function currentBlockKey() {
  const now = new Date()
  const block = BLOCKS[Math.floor(now.getHours() / 6)]
  return { block, dateStr: format(now, 'yyyy-MM-dd') }
}

function generateMesh(dateStr, block, variant) {
  // variant 0 keeps the original shared-seed gradient; refreshes salt the seed
  const seed = variant === 0 ? `${dateStr}-${block}` : `${dateStr}-${block}-v${variant}`
  const rand = mulberry32(hashSeed(seed))
  const p = PALETTES[block]
  const range = ([min, max]) => min + rand() * (max - min)

  const baseHueRange = p.hues[Math.floor(rand() * p.hues.length)]
  const base = { h: Math.round(range(baseHueRange)), s: Math.round(range(p.sat) * 0.6), l: p.baseLight }

  const blobs = Array.from({ length: BLOB_COUNT }, (_, i) => ({
    x: -0.15 + rand() * 1.3,
    y: -0.15 + rand() * 1.3,
    f: 0.45 + rand() * 0.4, // radius as a fraction of each axis
    a: 0.75 + rand() * 0.2,
    color: {
      h: Math.round(range(p.hues[i % p.hues.length])),
      s: Math.round(range(p.sat)),
      l: Math.round(range(p.light)),
    },
  }))

  return { base, blobs }
}

function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  const d = max - min
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

// Build a mesh from 4 AI-picked hex colors. Blob layout is procedurally
// seeded (so "refresh" can reshuffle composition without another API call);
// colors themselves are fixed to what Gemini returned.
function generateMeshFromColors(colors, seedStr) {
  const rand = mulberry32(hashSeed(seedStr))
  const hsls = colors.map(hexToHsl)

  const blobs = Array.from({ length: BLOB_COUNT }, (_, i) => ({
    x: -0.15 + rand() * 1.3,
    y: -0.15 + rand() * 1.3,
    f: 0.45 + rand() * 0.4,
    a: 0.75 + rand() * 0.2,
    color: hsls[i % hsls.length],
  }))

  const avgL = hsls.reduce((sum, c) => sum + c.l, 0) / hsls.length
  const avgS = hsls.reduce((sum, c) => sum + c.s, 0) / hsls.length
  const base = {
    h: hsls[0].h,
    s: Math.round(avgS * 0.6),
    l: Math.round(Math.min(90, Math.max(8, avgL * 0.4))),
  }

  return { base, blobs }
}

// CSS paints the first layer on top; canvas paints in draw order —
// keep both renderers visually identical by reversing here.
function meshToCss({ base, blobs }) {
  const layers = [...blobs].reverse().map((b) =>
    `radial-gradient(ellipse ${Math.round(b.f * 100)}% ${Math.round(b.f * 100)}% at ${Math.round(b.x * 100)}% ${Math.round(b.y * 100)}%, ${hsla(b.color, b.a)} 0%, ${hsla(b.color, 0)} 70%)`
  )
  layers.push(`linear-gradient(${hsla(base, 1)}, ${hsla(base, 1)})`)
  return layers.join(', ')
}

function drawMesh(ctx, W, H, { base, blobs }) {
  ctx.fillStyle = hsla(base, 1)
  ctx.fillRect(0, 0, W, H)
  for (const b of blobs) {
    ctx.save()
    ctx.translate(b.x * W, b.y * H)
    ctx.scale(b.f * W, b.f * H)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    g.addColorStop(0, hsla(b.color, b.a))
    g.addColorStop(0.7, hsla(b.color, 0))
    g.addColorStop(1, hsla(b.color, 0))
    ctx.fillStyle = g
    ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()
  }
}

export default function MeshGradientWidget({ instanceId }) {
  const storageKey = `gradient-ai-${instanceId}`

  const [{ block, dateStr }, setKey] = useState(currentBlockKey)
  const [variant, setVariant] = useState(0)

  // AI-generated palette (colors + the prompt that produced them), if any.
  // Presence of `ai` switches the widget from the automatic time-of-day
  // gradient to the prompt-driven one; it persists across reloads.
  const [ai, setAi] = useState(() => storage.get(storageKey) || null)
  const [aiVariant, setAiVariant] = useState(0)

  const [showPrompt, setShowPrompt] = useState(false)
  const [promptInput, setPromptInput] = useState(() => storage.get(storageKey)?.prompt || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const anchorRef = useRef(null)

  // Roll over to the next gradient when the 6-hour block (or date) changes
  useEffect(() => {
    const id = setInterval(() => {
      const next = currentBlockKey()
      setKey((prev) => {
        if (prev.block !== next.block || prev.dateStr !== next.dateStr) {
          setVariant(0)
          return next
        }
        return prev
      })
    }, 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const mesh = useMemo(() => {
    if (ai?.colors?.length === 4) {
      return generateMeshFromColors(ai.colors, `${instanceId}-ai-${aiVariant}`)
    }
    return generateMesh(dateStr, block, variant)
  }, [ai, aiVariant, dateStr, block, variant, instanceId])
  const background = useMemo(() => meshToCss(mesh), [mesh])

  function handleRefresh(e) {
    e.stopPropagation()
    if (ai) {
      setAiVariant((v) => v + 1)
    } else {
      setVariant((v) => v + 1)
    }
  }

  async function handleGenerate(e) {
    e.preventDefault()
    e.stopPropagation()
    const trimmed = promptInput.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError('')
    try {
      const result = await api.generateGradientColors(trimmed)
      const colors = result?.colors
      if (!Array.isArray(colors) || colors.length !== 4) {
        throw new Error('Unexpected response from server')
      }
      const next = { colors, prompt: trimmed }
      setAi(next)
      storage.set(storageKey, next)
      setAiVariant(0)
      setShowPrompt(false)
    } catch (err) {
      setError(err.message || 'Could not generate colors — try again')
    } finally {
      setLoading(false)
    }
  }

  function handleUseAutomatic(e) {
    e.stopPropagation()
    setAi(null)
    storage.remove(storageKey)
    setAiVariant(0)
    setShowPrompt(false)
  }

  function handleDownload(e) {
    e.stopPropagation()
    const canvas = document.createElement('canvas')
    canvas.width = 1920
    canvas.height = 1080
    drawMesh(canvas.getContext('2d'), 1920, 1080, mesh)
    const filenamePart = ai ? `ai-v${aiVariant}` : `${block}-${dateStr}${variant > 0 ? `-v${variant}` : ''}`
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mesh-${filenamePart}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  return (
    <div className="gradient-widget" style={{ background }} ref={anchorRef}>
      <div className="gradient-overlay">
        {ai ? (
          <>
            <span className="gradient-block">AI vibe</span>
            <span className="gradient-date gradient-prompt" title={ai.prompt}>{ai.prompt}</span>
          </>
        ) : (
          <>
            <span className="gradient-block">{block}</span>
            <span className="gradient-date">{dateStr}</span>
          </>
        )}
      </div>
      <button
        className="gradient-ai-btn"
        onClick={(e) => { e.stopPropagation(); setShowPrompt((v) => !v) }}
        title="Generate colors from a text prompt"
      >
        ✨
      </button>
      <button className="gradient-refresh" onClick={handleRefresh} title="Refresh gradient">
        ↻
      </button>
      <button className="gradient-download" onClick={handleDownload} title="Download as 1920×1080 wallpaper">
        ↓
      </button>
      {showPrompt && anchorRef.current && (
        <PromptPopover
          anchor={anchorRef.current}
          value={promptInput}
          onChange={setPromptInput}
          onSubmit={handleGenerate}
          onUseAutomatic={ai ? handleUseAutomatic : null}
          onCancel={(e) => { e.stopPropagation(); setShowPrompt(false); setError('') }}
          loading={loading}
          error={error}
        />
      )}
    </div>
  )
}

function PromptPopover({ anchor, value, onChange, onSubmit, onUseAutomatic, onCancel, loading, error }) {
  const rect = anchor.getBoundingClientRect()

  const style = {
    position: 'fixed',
    top: rect.bottom + 6,
    left: Math.max(8, rect.right - 260),
    width: 260,
    zIndex: 500,
  }

  return createPortal(
    <div className="drive-popover" style={style} onClick={(e) => e.stopPropagation()}>
      <form onSubmit={onSubmit}>
        <label className="drive-popover-label">Describe a vibe</label>
        <input
          className="drive-popover-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="sunset over the ocean…"
          maxLength={200}
          autoFocus
          disabled={loading}
        />
        {error && <p className="gradient-ai-error">{error}</p>}
        <div className="drive-popover-actions" style={{ justifyContent: onUseAutomatic ? 'space-between' : 'flex-end' }}>
          {onUseAutomatic && (
            <button type="button" className="gradient-ai-reset" onClick={onUseAutomatic} disabled={loading}>
              Use automatic
            </button>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="drive-popover-cancel" onClick={onCancel} disabled={loading}>Cancel</button>
            <button type="submit" className="drive-popover-save" disabled={loading || !value.trim()}>
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  )
}
