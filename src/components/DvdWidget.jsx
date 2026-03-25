import { useRef, useEffect } from 'react'

const COLORS = ['#F5C518', '#FF6B6B', '#4ECDC4', '#A29BFE', '#6BCB77', '#FD79A8', '#45B7D1', '#FF9F43']
const SPEED = 0.7

// Draw "DVD" in chunky block letters on the canvas
function drawDvd(ctx, x, y, color) {
  ctx.fillStyle = color

  // D
  ctx.fillRect(x,      y,      4, 14)
  ctx.fillRect(x + 4,  y + 1,  2, 2)
  ctx.fillRect(x + 6,  y + 3,  2, 2)
  ctx.fillRect(x + 6,  y + 7,  2, 2)
  ctx.fillRect(x + 4,  y + 11, 2, 2)

  // V
  ctx.fillRect(x + 10, y,      3, 2)
  ctx.fillRect(x + 17, y,      3, 2)
  ctx.fillRect(x + 11, y + 3,  3, 2)
  ctx.fillRect(x + 16, y + 3,  2, 2)
  ctx.fillRect(x + 12, y + 6,  3, 2)
  ctx.fillRect(x + 15, y + 6,  2, 2)
  ctx.fillRect(x + 13, y + 9,  3, 2)
  ctx.fillRect(x + 13, y + 12, 3, 2)

  // D
  ctx.fillRect(x + 21, y,      4, 14)
  ctx.fillRect(x + 25, y + 1,  2, 2)
  ctx.fillRect(x + 27, y + 3,  2, 2)
  ctx.fillRect(x + 27, y + 7,  2, 2)
  ctx.fillRect(x + 25, y + 11, 2, 2)

  // disc shape under text
  ctx.beginPath()
  ctx.ellipse(x + 15, y + 21, 13, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(x + 15, y + 21, 4, 1.5, 0, 0, Math.PI * 2)
  ctx.fill()
}

const LOGO_W = 30
const LOGO_H = 26

export default function DvdWidget() {
  const canvasRef = useRef(null)
  const stateRef  = useRef(null)
  const rafRef    = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width
    const H = canvas.height

    stateRef.current = {
      x: Math.random() * (W - LOGO_W),
      y: Math.random() * (H - LOGO_H),
      vx: SPEED * (Math.random() > 0.5 ? 1 : -1),
      vy: SPEED * (Math.random() > 0.5 ? 1 : -1),
      colorIdx: 0,
    }

    const ctx = canvas.getContext('2d')

    function tick() {
      const s = stateRef.current
      const W = canvas.width
      const H = canvas.height

      s.x += s.vx
      s.y += s.vy

      let bounced = false
      if (s.x <= 0)          { s.x = 0;          s.vx =  Math.abs(s.vx); bounced = true }
      if (s.x >= W - LOGO_W) { s.x = W - LOGO_W; s.vx = -Math.abs(s.vx); bounced = true }
      if (s.y <= 0)          { s.y = 0;           s.vy =  Math.abs(s.vy); bounced = true }
      if (s.y >= H - LOGO_H) { s.y = H - LOGO_H; s.vy = -Math.abs(s.vy); bounced = true }

      if (bounced) s.colorIdx = (s.colorIdx + 1) % COLORS.length

      ctx.clearRect(0, 0, W, H)
      drawDvd(ctx, Math.round(s.x), Math.round(s.y), COLORS[s.colorIdx])

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg-card)', borderRadius: 'inherit' }}>
      <canvas
        ref={canvasRef}
        width={180}
        height={140}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  )
}
