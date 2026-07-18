import { useState, useRef, useEffect } from 'react'
import storage from '../storage'
import './CoinTossWidget.css'

const STORAGE_KEY = 'coin-widget'
const FLIP_MS = 700

export default function CoinTossWidget() {
  const [tally, setTally] = useState(() => {
    const saved = storage.get(STORAGE_KEY)
    return saved && typeof saved.heads === 'number' && typeof saved.tails === 'number'
      ? saved
      : { heads: 0, tails: 0 }
  })
  const [side, setSide] = useState('heads')
  const [pending, setPending] = useState(null)
  const [flipping, setFlipping] = useState(false)
  const [spins, setSpins] = useState(0)
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  function handleFlip() {
    if (flipping) return
    const result = Math.random() < 0.5 ? 'heads' : 'tails'
    setPending(result)
    setFlipping(true)
    setSpins((n) => n + 1)
    timeoutRef.current = setTimeout(() => {
      setSide(result)
      setFlipping(false)
      setTally((t) => {
        const next = {
          heads: t.heads + (result === 'heads' ? 1 : 0),
          tails: t.tails + (result === 'tails' ? 1 : 0),
        }
        storage.set(STORAGE_KEY, next)
        return next
      })
    }, FLIP_MS)
  }

  const displaySide = flipping ? pending : side

  return (
    <div className="coin-widget" onClick={handleFlip} title="Click to flip">
      <div className="coin-stage">
        <div
          key={spins}
          className={`coin${flipping ? ' coin--flipping' : ''} coin--${displaySide}`}
        >
          <div className="coin-face coin-face--front">
            <span className="coin-glyph">H</span>
          </div>
          <div className="coin-face coin-face--back">
            <span className="coin-glyph">T</span>
          </div>
        </div>
      </div>
      <div className="coin-label">{flipping ? 'flipping…' : side === 'heads' ? 'HEADS' : 'TAILS'}</div>
      <div className="coin-tally">H {tally.heads} &middot; T {tally.tails}</div>
    </div>
  )
}
