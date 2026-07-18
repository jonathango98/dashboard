import { useState, useRef, useEffect } from 'react'
import storage from '../storage'
import './DiceRollerWidget.css'

const STORAGE_KEY = 'dice-widget'
const DIE_TYPES = [4, 6, 8, 12, 20, 'coin']
const ROLL_MS = 600
const FLIP_MS = 700

// Pip layouts for a d6 face, as a 3x3 grid of on/off dots
const PIP_LAYOUTS = {
  1: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  2: [1, 0, 0, 0, 0, 0, 0, 0, 1],
  3: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  4: [1, 0, 1, 0, 0, 0, 1, 0, 1],
  5: [1, 0, 1, 0, 1, 0, 1, 0, 1],
  6: [1, 0, 1, 1, 0, 1, 1, 0, 1],
}

function DiePips({ value }) {
  const layout = PIP_LAYOUTS[value] || PIP_LAYOUTS[1]
  return (
    <div className="dice-pip-face">
      {layout.map((on, i) => (
        <span key={i} className={`dice-pip${on ? ' dice-pip--on' : ''}`} />
      ))}
    </div>
  )
}

export default function DiceRollerWidget() {
  const [die, setDie] = useState(() => {
    const saved = storage.get(STORAGE_KEY)
    return saved && DIE_TYPES.includes(saved.sides) ? saved.sides : 6
  })
  const [value, setValue] = useState(6)
  const [side, setSide] = useState('heads')
  const [pending, setPending] = useState(null)
  const [prev, setPrev] = useState(null)
  const [rolling, setRolling] = useState(false)
  const [spins, setSpins] = useState(0)
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  function handleTypeSelect(e, type) {
    e.stopPropagation()
    if (rolling || type === die) return
    setDie(type)
    setPrev(null)
    storage.set(STORAGE_KEY, { sides: type })
  }

  function handleRoll() {
    if (rolling) return
    setRolling(true)
    if (die === 'coin') {
      const result = Math.random() < 0.5 ? 'heads' : 'tails'
      setPending(result)
      setSpins((n) => n + 1)
      timeoutRef.current = setTimeout(() => {
        setPrev(side === 'heads' ? 'H' : 'T')
        setSide(result)
        setRolling(false)
      }, FLIP_MS)
    } else {
      const result = Math.floor(Math.random() * die) + 1
      timeoutRef.current = setTimeout(() => {
        setPrev(String(value))
        setValue(result)
        setRolling(false)
      }, ROLL_MS)
    }
  }

  const isCoin = die === 'coin'
  const coinShown = rolling ? pending : side

  return (
    <div className="dice-widget" onClick={handleRoll} title={isCoin ? 'Click to flip' : 'Click to roll'}>
      <div className="dice-type-row">
        {DIE_TYPES.map((type) => (
          <button
            key={type}
            className={`dice-type-btn${die === type ? ' dice-type-btn--active' : ''}`}
            onClick={(e) => handleTypeSelect(e, type)}
          >
            {type === 'coin' ? 'coin' : `d${type}`}
          </button>
        ))}
      </div>

      <div className="dice-face-area">
        {isCoin ? (
          <div className="coin-stage">
            <div
              key={spins}
              className={`coin${rolling ? ' coin--flipping' : ''} coin--${coinShown}`}
            >
              <div className="coin-face coin-face--front">
                <span className="coin-glyph">H</span>
              </div>
              <div className="coin-face coin-face--back">
                <span className="coin-glyph">T</span>
              </div>
            </div>
          </div>
        ) : (
          <div className={`dice-face${rolling ? ' dice-face--rolling' : ''}`}>
            {die === 6 ? <DiePips value={value} /> : <span className="dice-number">{value}</span>}
          </div>
        )}
      </div>

      <div className="dice-prev">
        {isCoin
          ? rolling
            ? 'flipping…'
            : `${side === 'heads' ? 'HEADS' : 'TAILS'}${prev ? ` · prev ${prev}` : ''}`
          : prev !== null
            ? `prev ${prev}`
            : ' '}
      </div>
    </div>
  )
}
