import { useState, useRef, useEffect } from 'react'
import storage from '../storage'
import './DiceRollerWidget.css'

const STORAGE_KEY = 'dice-widget'
const DIE_TYPES = [4, 6, 8, 12, 20]
const ROLL_MS = 600

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
  const [sides, setSides] = useState(() => {
    const saved = storage.get(STORAGE_KEY)
    return saved && DIE_TYPES.includes(saved.sides) ? saved.sides : 6
  })
  const [value, setValue] = useState(6)
  const [prev, setPrev] = useState(null)
  const [rolling, setRolling] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  function persistSides(next) {
    storage.set(STORAGE_KEY, { sides: next })
  }

  function handleTypeSelect(e, type) {
    e.stopPropagation()
    if (rolling) return
    setSides(type)
    persistSides(type)
  }

  function handleRoll() {
    if (rolling) return
    setRolling(true)
    const result = Math.floor(Math.random() * sides) + 1
    timeoutRef.current = setTimeout(() => {
      setPrev((p) => (value !== null ? value : p))
      setValue(result)
      setRolling(false)
    }, ROLL_MS)
  }

  const showPips = sides === 6

  return (
    <div className="dice-widget" onClick={handleRoll} title="Click to roll">
      <div className="dice-type-row">
        {DIE_TYPES.map((type) => (
          <button
            key={type}
            className={`dice-type-btn${sides === type ? ' dice-type-btn--active' : ''}`}
            onClick={(e) => handleTypeSelect(e, type)}
          >
            d{type}
          </button>
        ))}
      </div>

      <div className="dice-face-area">
        <div className={`dice-face${rolling ? ' dice-face--rolling' : ''}`}>
          {showPips ? <DiePips value={value} /> : <span className="dice-number">{value}</span>}
        </div>
      </div>

      <div className="dice-prev">{prev !== null ? `prev ${prev}` : ' '}</div>
    </div>
  )
}
