import { useState, useEffect, useMemo, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { api } from '../api'
import storage from '../storage'

// The gradient of the day is mixed by the backend colourist (Gemini working
// to a brief the date picks) and cached per day + 6-hour block, so every tab
// sees the same palette all morning. Everything below is the offline
// fallback: it follows the same brief the backend does, so a dropped request
// still lands on today's colours instead of yesterday's.
const BLOCKS = ['night', 'morning', 'afternoon', 'evening'] // idx = floor(hour / 6)

// Must match backend/routes/gradient.js — the hue anchor advances by the
// golden angle each day, so consecutive days sit far apart on the wheel.
// The old version had four fixed hue windows per block, which is why every
// night gradient was the same blue-violet.
const GOLDEN_ANGLE = 137.508

// Hue offsets from the day's anchor, one scheme per harmony, in the same
// order as the backend's list so both pick the same scheme on a given day.
const HARMONIES = [
  [0, 18, 38, 58],    // analogous
  [0, 16, 164, 196],  // split-complementary
  [0, 118, 238, 12],  // triadic
  [0, 10, 20, 186],   // near-monochrome with one accent
  [0, 14, 172, 188],  // complementary tension
  [0, 30, 60, 90],    // warm-to-cool drift
  [0, 24, 48, 200],   // muted field with a hot accent
]

// The block sets the light key only — never the hue — so the day keeps one
// identity from dawn to midnight. Lightness is a ramp: darkest role first.
// Only the last role is bright: two light colours side by side blur into a
// pastel haze, while one accent over darker washes reads as a light source.
const BLOCK_LIGHT = {
  night:     { light: [10, 22, 36, 64], sat: [45, 78] },
  morning:   { light: [28, 46, 62, 90], sat: [42, 74] },
  afternoon: { light: [22, 40, 58, 88], sat: [58, 92] },
  evening:   { light: [12, 28, 46, 80], sat: [52, 86] },
}

const BLOB_COUNT = 6

function dailyBrief(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const n = Math.floor(Date.UTC(y, m - 1, d) / 86400000)
  const mod = (v, k) => ((v % k) + k) % k
  return {
    anchorHue: mod(n * GOLDEN_ANGLE, 360),
    offsets: HARMONIES[mod(n * 3, HARMONIES.length)],
  }
}

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
  // variant 0 keeps the shared seed everyone sees; refreshes salt it
  const seed = variant === 0 ? `${dateStr}-${block}` : `${dateStr}-${block}-v${variant}`
  const rand = mulberry32(hashSeed(seed))
  const { anchorHue, offsets } = dailyBrief(dateStr)
  const p = BLOCK_LIGHT[block]

  const colors = offsets.map((offset, i) => ({
    h: Math.round(((anchorHue + offset + (rand() - 0.5) * 14) % 360 + 360) % 360),
    s: Math.round(p.sat[0] + rand() * (p.sat[1] - p.sat[0])),
    l: Math.round(p.light[i] + (rand() - 0.5) * 6),
  }))

  // Darkest role deepened — a base near the darkest colour is what makes the
  // lighter washes read as light rather than as paint.
  const darkest = colors[0]
  const base = {
    h: darkest.h,
    s: Math.round(darkest.s * 0.7),
    l: Math.max(5, Math.round(darkest.l * 0.62)),
  }

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

// Shared across widget instances: the day's palette is the day's palette.
const DAILY_KEY = 'gradient-daily-v1'

export default function MeshGradientWidget({ instanceId }) {
  const storageKey = `gradient-ai-${instanceId}`

  const [{ block, dateStr }, setKey] = useState(currentBlockKey)
  const [variant, setVariant] = useState(0)

  // AI-generated palette (colors + the prompt that produced them), if any.
  // Presence of `ai` switches the widget from the daily gradient to the
  // prompt-driven one; it persists across reloads.
  const [ai, setAi] = useState(() => storage.get(storageKey) || null)
  const [aiVariant, setAiVariant] = useState(0)

  // Today's palette from the backend colourist. Null until it arrives (or
  // for good, if the request fails) — the local generator covers that case.
  const [daily, setDaily] = useState(() => storage.get(DAILY_KEY) || null)
  const [retry, setRetry] = useState(0)

  const [showPrompt, setShowPrompt] = useState(false)
  const [promptInput, setPromptInput] = useState(() => storage.get(storageKey)?.prompt || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const anchorRef = useRef(null)

  // Keep the CSS blur proportional to the widget, the same 5.5% of the short
  // side the canvas renderer uses — so a resized widget and a downloaded
  // wallpaper show the same mesh rather than the same pixel radius.
  useEffect(() => {
    const el = anchorRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      el.style.setProperty('--mesh-blur', `${Math.round(Math.min(width, height) * 0.055)}px`)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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

  // Fetch the day's palette whenever the day or block turns over. The cached
  // copy is reused only when it was mixed for this exact date and block; a
  // failure is silent, because the fallback gradient is a fine thing to look
  // at and an error card is not.
  useEffect(() => {
    // Read the cache here rather than depending on `daily`: keeping state out
    // of the deps is what stops a stored palette from re-triggering its own
    // fetch, and it picks up whatever another widget instance just stored.
    const cached = storage.get(DAILY_KEY)
    if (cached?.date === dateStr && cached?.block === block) {
      setDaily(cached)
      return
    }

    let stale = false
    api.getDailyGradient(dateStr, block)
      .then((result) => {
        if (stale || result?.colors?.length !== 4) return
        // Stamp the request's own date/block so a mismatched echo can never
        // leave the widget fetching in a loop.
        const next = { ...result, date: dateStr, block }
        setDaily(next)
        storage.set(DAILY_KEY, next)
      })
      .catch(() => {})

    return () => { stale = true }
  }, [dateStr, block, retry])

  const dailyColors =
    daily?.date === dateStr && daily?.block === block ? daily.colors : null

  const mesh = useMemo(() => {
    if (ai?.colors?.length === 4) {
      return generateMeshFromColors(ai.colors, `${instanceId}-ai-${aiVariant}`)
    }
    if (dailyColors) {
      // variant 0 is the composition everyone shares; refresh reshuffles the
      // layout but keeps the day's colours — they're the point.
      return generateMeshFromColors(dailyColors, `${dateStr}-${block}-v${variant}`)
    }
    return generateMesh(dateStr, block, variant)
  }, [ai, aiVariant, dailyColors, dateStr, block, variant, instanceId])
  const backgroundStyle = useMemo(() => meshToCss(mesh), [mesh])

  function handleRefresh(e) {
    e.stopPropagation()
    if (ai) {
      setAiVariant((v) => v + 1)
      return
    }
    setVariant((v) => v + 1)
    // If today's palette never arrived, a refresh is also the natural retry
    if (!dailyColors) setRetry((r) => r + 1)
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
    const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const named = dailyColors && daily?.name ? `-${slug(daily.name)}` : ''
    const filenamePart = ai
      ? `ai-v${aiVariant}`
      : `${block}-${dateStr}${named}${variant > 0 ? `-v${variant}` : ''}`
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
            <span
              className="gradient-block gradient-name"
              title={dailyColors && daily?.note ? daily.note : undefined}
            >
              {dailyColors && daily?.name ? daily.name : block}
            </span>
            <span className="gradient-date">{dateStr}</span>
          </>
        )}
      </div>
      <button
        className="gradient-ai-btn"
        onClick={(e) => { e.stopPropagation(); setShowPrompt((v) => !v) }}
        title="Generate colors from a text prompt"
        aria-label="Generate colors from a text prompt"
      >
        ✨
      </button>
      <button
        className="gradient-refresh"
        onClick={handleRefresh}
        title="Refresh gradient"
        aria-label="Refresh gradient"
      >
        ↻
      </button>
      <button
        className="gradient-download"
        onClick={handleDownload}
        title="Download as 1920×1080 wallpaper"
        aria-label="Download as wallpaper"
      >
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
  const inputId = useId()

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
        <label className="drive-popover-label" htmlFor={inputId}>Describe a vibe</label>
        <input
          id={inputId}
          className="drive-popover-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="sunset over the ocean…"
          maxLength={200}
          autoFocus
          disabled={loading}
        />
        {error && <p className="gradient-ai-error" role="alert">{error}</p>}
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
