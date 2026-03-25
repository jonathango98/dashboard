import { useRef, useEffect } from 'react'

// ─── Config ───────────────────────────────────────────────────────────────────

const COLS = 6
const ROWS = 5
const DOT_R = 5
const REPEL_R = 70
const SPRING = 0.10
const DAMPING = 0.72

// Accent color: #F5C518 — dots are muted at rest, accent when displaced
const DOT_REST  = 'rgba(245, 197, 24, 0.25)'
const DOT_LIVE  = '#F5C518'
const DOT_GLOW  = 'rgba(245, 197, 24, 0.18)'

// ─── Component ────────────────────────────────────────────────────────────────

export default function FidgetWidget() {
  const canvasRef = useRef(null)
  const dotsRef   = useRef(null)
  const mouseRef  = useRef({ x: -9999, y: -9999 })
  const rafRef    = useRef(null)

  // Build dot grid once canvas mounts
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width
    const H = canvas.height
    const xGap = W  / (COLS + 1)
    const yGap = H / (ROWS + 1)

    dotsRef.current = []
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ox = xGap * (c + 1)
        const oy = yGap * (r + 1)
        dotsRef.current.push({ ox, oy, x: ox, y: oy, vx: 0, vy: 0 })
      }
    }
  }, [])

  // Physics + render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height

    function tick() {
      const { x: mx, y: my } = mouseRef.current
      ctx.clearRect(0, 0, W, H)

      for (const d of (dotsRef.current || [])) {
        // Spring toward origin
        d.vx += (d.ox - d.x) * SPRING
        d.vy += (d.oy - d.y) * SPRING

        // Repel from cursor
        const dx = d.x - mx
        const dy = d.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < REPEL_R && dist > 0.5) {
          const strength = ((REPEL_R - dist) / REPEL_R) ** 1.5 * 18
          d.vx += (dx / dist) * strength
          d.vy += (dy / dist) * strength
        }

        // Damping + integrate
        d.vx *= DAMPING
        d.vy *= DAMPING
        d.x  += d.vx
        d.y  += d.vy

        // Interpolate between rest and live color based on displacement
        const displacement = Math.sqrt((d.x - d.ox) ** 2 + (d.y - d.oy) ** 2)
        const t = Math.min(displacement / 25, 1)
        const scale = 1 + t * 0.5
        const r = DOT_R * scale

        if (t > 0.05) {
          ctx.beginPath()
          ctx.arc(d.x, d.y, r + 4, 0, Math.PI * 2)
          ctx.fillStyle = DOT_GLOW
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2)
        ctx.fillStyle = t < 0.05 ? DOT_REST : DOT_LIVE
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const onMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    mouseRef.current = {
      x: (e.clientX - rect.left) * (canvas.width  / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height),
    }
  }

  const onMouseLeave = () => { mouseRef.current = { x: -9999, y: -9999 } }

  return (
    <div
      style={{ width: '100%', height: '100%' }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <canvas
        ref={canvasRef}
        width={180}
        height={140}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'none' }}
      />
    </div>
  )
}
