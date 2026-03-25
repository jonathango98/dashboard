import { useRef, useEffect, useState } from 'react'
import storage from '../storage'

const FRAME_SIZE  = 32
const WALK_FRAMES = 6
const JUMP_FRAMES = 8
const FRAME_MS    = 180

function randLoops() { return 3 + Math.floor(Math.random() * 4) }

const ASPECT = 180 / 140

export default function SnorlaxWidget({ instanceId }) {
  const [char, setChar] = useState(() => storage.get(`pet-char-${instanceId}`) ?? 1)
  const [hover, setHover] = useState(false)
  const canvasRef = useRef(null)
  const wrapRef   = useRef(null)
  const rafRef    = useRef(null)

  function pickChar(n) {
    storage.set(`pet-char-${instanceId}`, n)
    setChar(n)
  }

  // Keep canvas pixel dimensions in sync with container, preserving aspect ratio
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width / height > ASPECT) {
        canvas.width  = Math.round(height * ASPECT)
        canvas.height = Math.round(height)
      } else {
        canvas.width  = Math.round(width)
        canvas.height = Math.round(width / ASPECT)
      }
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false

    const walkImg = new Image()
    const jumpImg = new Image()
    walkImg.src = `/walk${char}.png`
    jumpImg.src = `/jump${char}.png`

    cancelAnimationFrame(rafRef.current)

    let frame     = 0
    let frameTick = 0
    let lastTime  = null
    let isJumping = false
    let loopsLeft = randLoops()
    let loaded    = 0

    function tick(ts) {
      if (lastTime === null) lastTime = ts
      const dt = Math.min(ts - lastTime, 50)
      lastTime = ts

      frameTick += dt
      if (frameTick >= FRAME_MS) {
        frameTick -= FRAME_MS
        frame++
        if (isJumping) {
          if (frame >= JUMP_FRAMES) { isJumping = false; frame = 0; loopsLeft = randLoops() }
        } else {
          if (frame >= WALK_FRAMES) {
            frame = 0
            if (--loopsLeft <= 0) { isJumping = true; frame = 0 }
          }
        }
      }

      const W = canvas.width
      const H = canvas.height
      ctx.imageSmoothingEnabled = false
      const sheet = isJumping ? jumpImg : walkImg
      const scale = Math.floor(H * 0.55 / FRAME_SIZE)
      const size  = FRAME_SIZE * scale
      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(sheet, frame * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE, (W - size) / 2, (H - size) / 2, size, size)
      rafRef.current = requestAnimationFrame(tick)
    }

    const onLoad = () => { if (++loaded === 2) rafRef.current = requestAnimationFrame(tick) }
    walkImg.onload = onLoad
    jumpImg.onload = onLoad

    return () => cancelAnimationFrame(rafRef.current)
  }, [char])

  return (
    <div
      ref={wrapRef}
      style={{ width: '100%', height: '100%', borderRadius: 'inherit', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <canvas
        ref={canvasRef}
        width={180}
        height={140}
        style={{ display: 'block', imageRendering: 'pixelated' }}
      />
      {hover && (
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          display: 'flex', gap: 4,
        }}>
          {[1, 2, 3].map(n => (
            <button
              key={n}
              onClick={() => pickChar(n)}
              style={{
                width: 22, height: 22, borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: char === n ? 'var(--accent)' : 'var(--bg-card)',
                color: char === n ? '#fff' : 'var(--fg)',
                opacity: 0.9,
              }}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
