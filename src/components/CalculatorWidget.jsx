import { useState, useRef, useEffect } from 'react'

const BUTTONS = [
  ['C', '⌫', '%', '/'],
  ['7', '8', '9', '*'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['±', '0', '.', '='],
]

function safeEval(expr) {
  try {
    const sanitized = expr.replace(/[^0-9+\-*/.%()\s]/g, '')
    const withPercent = sanitized.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')
    // eslint-disable-next-line no-new-func
    const val = Function('"use strict"; return (' + withPercent + ')')()
    if (!isFinite(val)) return 'Error'
    return parseFloat(val.toFixed(10)).toString()
  } catch {
    return 'Error'
  }
}

export default function CalculatorWidget() {
  const [expr, setExpr] = useState('')
  const [result, setResult] = useState(null)
  const [evaluated, setEvaluated] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  function press(val) {
    if (val === 'C') {
      setExpr(''); setResult(null); setEvaluated(false)
      return
    }
    if (val === '⌫') {
      if (evaluated) { setExpr(''); setResult(null); setEvaluated(false); return }
      setExpr(p => p.slice(0, -1))
      return
    }
    if (val === '=') {
      if (!expr) return
      setResult(safeEval(expr))
      setEvaluated(true)
      return
    }
    if (val === '±') {
      if (evaluated && result && result !== 'Error') {
        const neg = result.startsWith('-') ? result.slice(1) : '-' + result
        setExpr(neg); setResult(null); setEvaluated(false)
        return
      }
      setExpr(p => {
        if (!p) return '-'
        const m = p.match(/^(.*[+\-*/]|)(-?\d*\.?\d+)$/)
        if (m) {
          const n = m[2]
          return m[1] + (n.startsWith('-') ? n.slice(1) : '-' + n)
        }
        return p
      })
      return
    }
    const isOp = ['+', '-', '*', '/'].includes(val)
    if (evaluated && result && result !== 'Error') {
      setExpr(isOp ? result + val : val)
      setResult(null); setEvaluated(false)
      return
    }
    setExpr(p => p + val)
    setResult(null); setEvaluated(false)
  }

  function onKey(e) {
    const k = e.key
    if (k >= '0' && k <= '9') press(k)
    else if (k === '+') press('+')
    else if (k === '-') press('-')
    else if (k === '*') press('*')
    else if (k === '/') { e.preventDefault(); press('/') }
    else if (k === '%') press('%')
    else if (k === '.') press('.')
    else if (k === 'Enter' || k === '=') press('=')
    else if (k === 'Escape') press('C')
    else if (k === 'Backspace') press('⌫')
    else return
    e.preventDefault()
  }

  const display = expr || '0'
  const hasResult = result !== null

  return (
    <div ref={ref} className="calc-widget" tabIndex={0} onKeyDown={onKey}>
      <div className="calc-display">
        <div className="calc-expr" title={display}>{display}</div>
        {hasResult && (
          <div className={`calc-result${result === 'Error' ? ' calc-error' : ''}`}>
            {result === 'Error' ? 'Error' : `= ${result}`}
          </div>
        )}
      </div>
      <div className="calc-grid">
        {BUTTONS.map((row, ri) =>
          row.map((btn, ci) => (
            <button
              key={`${ri}-${ci}`}
              className={`calc-btn${
                btn === '=' ? ' calc-btn-eq' :
                ['+', '-', '*', '/'].includes(btn) ? ' calc-btn-op' :
                btn === 'C' ? ' calc-btn-clear' : ''
              }`}
              onMouseDown={e => { e.preventDefault(); press(btn) }}
              tabIndex={-1}
            >
              {btn === '*' ? '×' : btn === '/' ? '÷' : btn}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
