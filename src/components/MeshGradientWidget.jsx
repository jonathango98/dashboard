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

// Place blobs on jittered cells of a 3x3 grid instead of uniformly at random:
// coverage stays even (no clumps, no bald corners). Cells are then ordered by
// angle around the center and colors by hue, so spatially adjacent blobs get
// analogous hues — overlapping far-apart hues is what averages into gray mud
// when the browser composites in sRGB. Painting runs dark to light so the
// brightest color reads as a light source instead of being buried.
function layoutBlobs(rand, colors) {
  const cells = []
  for (const cx of [0.16, 0.5, 0.84]) {
    for (const cy of [0.16, 0.5, 0.84]) cells.push({ cx, cy })
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }

  const picked = cells
    .slice(0, BLOB_COUNT)
    .sort((a, b) => Math.atan2(a.cy - 0.5, a.cx - 0.5) - Math.atan2(b.cy - 0.5, b.cx - 0.5))

  const byHue = [...colors].sort((a, b) => a.h - b.h)
  const brightest = Math.max(...colors.map((c) => c.l))

  return picked
    .map((cell, i) => {
      const color = byHue[i % byHue.length]
      const focal = color.l === brightest
      return {
        x: cell.cx - 0.16 + rand() * 0.32,
        y: cell.cy - 0.16 + rand() * 0.32,
        // brightest color stays a small, intense glow; the rest are broad washes
        f: focal ? 0.35 + rand() * 0.15 : 0.55 + rand() * 0.3,
        ratio: 0.7 + rand() * 0.6, // ellipse aspect, for organic shapes
        a: focal ? 0.85 + rand() * 0.1 : 0.7 + rand() * 0.15,
        color,
      }
    })
    .sort((a, b) => a.color.l - b.color.l)
}

function generateMesh(dateStr, block, variant) {
  // variant 0 keeps the original shared-seed gradient; refreshes salt the seed
  const seed = variant === 0 ? `${dateStr}-${block}` : `${dateStr}-${block}-v${variant}`
  const rand = mulberry32(hashSeed(seed))
  const p = PALETTES[block]
  const range = ([min, max]) => min + rand() * (max - min)

  const baseHueRange = p.hues[Math.floor(rand() * p.hues.length)]
  const base = { h: Math.round(range(baseHueRange)), s: Math.round(range(p.sat) * 0.6), l: p.baseLight }

  const colors = p.hues.map((hueRange) => ({
    h: Math.round(range(hueRange)),
    s: Math.round(range(p.sat)),
    l: Math.round(range(p.light)),
  }))

  return { base, blobs: layoutBlobs(rand, colors) }
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

  // Anchor the base to the darkest palette color (slightly deepened) rather
  // than an average — averages of 4 hues drift toward muddy gray, and a deep
  // base is what makes the lighter washes glow against it.
  const darkest = [...hsls].sort((a, b) => a.l - b.l)[0]
  const base = {
    h: darkest.h,
    s: Math.round(darkest.s * 0.75),
    l: Math.round(Math.min(82, Math.max(6, darkest.l * 0.75))),
  }

  return { base, blobs: layoutBlobs(rand, hsls) }
}

// Fine monochrome grain blended over the gradient hides the banding that
// smooth radial fades produce on low-contrast stretches (the same trick
// designers use in Figma: noise at low opacity over every mesh gradient).
const NOISE_LAYER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`

// Blob falloff eases through a mid stop and fades over the full radius —
// a rough gaussian, so wash edges never read as hard rings.
function blobStops(b) {
  return `${hsla(b.color, b.a)} 0%, ${hsla(b.color, b.a * 0.5)} 45%, ${hsla(b.color, 0)} 100%`
}

// Grain sits on its own unblurred layer above the mesh (see .gradient-grain)
const GRAIN_STYLE = {
  backgroundImage: NOISE_LAYER,
  backgroundSize: '160px 160px',
}

// CSS paints the first layer on top; canvas paints in draw order —
// keep both renderers visually identical by reversing here.
function meshToCss({ base, blobs }) {
  const layers = [...blobs].reverse().map((b) =>
    `radial-gradient(ellipse ${Math.round(b.f * 100)}% ${Math.round(b.f * b.ratio * 100)}% at ${Math.round(b.x * 100)}% ${Math.round(b.y * 100)}%, ${blobStops(b)})`
  )
  layers.push(`linear-gradient(${hsla(base, 1)}, ${hsla(base, 1)})`)
  return { backgroundImage: layers.join(', ') }
}

function drawMesh(ctx, W, H, { base, blobs }) {
  // Composite base + blobs into an oversized buffer, then draw it back
  // through a global blur — the blur is what actually mixes neighboring
  // colors; alpha falloff alone always leaves visible blob contours. The
  // bleed margin keeps the blur from fading toward transparent at the edges.
  const M = Math.round(Math.min(W, H) * 0.12)
  const off = document.createElement('canvas')
  off.width = W + M * 2
  off.height = H + M * 2
  const octx = off.getContext('2d')

  octx.fillStyle = hsla(base, 1)
  octx.fillRect(0, 0, off.width, off.height)
  for (const b of blobs) {
    octx.save()
    octx.translate(M + b.x * W, M + b.y * H)
    octx.scale(b.f * W, b.f * b.ratio * H)
    const g = octx.createRadialGradient(0, 0, 0, 0, 0, 1)
    g.addColorStop(0, hsla(b.color, b.a))
    g.addColorStop(0.45, hsla(b.color, b.a * 0.5))
    g.addColorStop(1, hsla(b.color, 0))
    octx.fillStyle = g
    octx.fillRect(-1.5, -1.5, 3, 3)
    octx.restore()
  }

  ctx.save()
  ctx.filter = `blur(${Math.round(Math.min(W, H) * 0.055)}px) saturate(1.15)`
  ctx.drawImage(off, -M, -M)
  ctx.restore()

  // Match the CSS grain layer so downloads look like the widget
  const noise = document.createElement('canvas')
  noise.width = 160
  noise.height = 160
  const nctx = noise.getContext('2d')
  const img = nctx.createImageData(160, 160)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256)
    img.data[i] = v
    img.data[i + 1] = v
    img.data[i + 2] = v
    img.data[i + 3] = 102 // ~0.4 alpha, same as the SVG grain
  }
  nctx.putImageData(img, 0, 0)
  ctx.save()
  ctx.globalCompositeOperation = 'soft-light'
  ctx.fillStyle = ctx.createPattern(noise, 'repeat')
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
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
  const backgroundStyle = useMemo(() => meshToCss(mesh), [mesh])

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
    <div className="gradient-widget" ref={anchorRef}>
      <div className="gradient-mesh" style={backgroundStyle} />
      <div className="gradient-grain" style={GRAIN_STYLE} />
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
