import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'

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

function generateMesh(dateStr, block) {
  const rand = mulberry32(hashSeed(`${dateStr}-${block}`))
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

export default function MeshGradientWidget() {
  const [{ block, dateStr }, setKey] = useState(currentBlockKey)

  // Roll over to the next gradient when the 6-hour block (or date) changes
  useEffect(() => {
    const id = setInterval(() => {
      const next = currentBlockKey()
      setKey((prev) => (prev.block !== next.block || prev.dateStr !== next.dateStr ? next : prev))
    }, 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const mesh = useMemo(() => generateMesh(dateStr, block), [dateStr, block])
  const background = useMemo(() => meshToCss(mesh), [mesh])

  function handleDownload(e) {
    e.stopPropagation()
    const canvas = document.createElement('canvas')
    canvas.width = 1920
    canvas.height = 1080
    drawMesh(canvas.getContext('2d'), 1920, 1080, mesh)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mesh-${block}-${dateStr}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  return (
    <div className="gradient-widget" style={{ background }}>
      <div className="gradient-overlay">
        <span className="gradient-block">{block}</span>
        <span className="gradient-date">{dateStr}</span>
      </div>
      <button className="gradient-download" onClick={handleDownload} title="Download as 1920×1080 wallpaper">
        ↓
      </button>
    </div>
  )
}
