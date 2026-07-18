import { useState, useEffect, useRef } from 'react'
import './SystemGaugeWidget.css'

const TICK_MS = 600
const SAMPLE_EVERY = 2 // sample every 2 ticks (~1.2s cadence)
const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const HAS_MEMORY = typeof performance !== 'undefined' && !!performance.memory

export default function SystemGaugeWidget() {
  const [loadPct, setLoadPct] = useState(0)
  const [heapPct, setHeapPct] = useState(null)
  const [showHeap, setShowHeap] = useState(false)
  const lastTickRef = useRef(null)
  const tickCountRef = useRef(0)

  useEffect(() => {
    lastTickRef.current = performance.now()

    const id = setInterval(() => {
      const now = performance.now()
      const expected = lastTickRef.current + TICK_MS
      const drift = Math.max(0, now - expected)
      lastTickRef.current = now

      // Map drift (ms of event-loop lag) to a 0-100% pressure estimate.
      // 0ms drift -> 0%, 150ms+ drift -> 100%.
      const pct = Math.min(100, Math.round((drift / 150) * 100))
      setLoadPct(pct)

      tickCountRef.current += 1
      if (HAS_MEMORY && tickCountRef.current % SAMPLE_EVERY === 0) {
        const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory
        if (jsHeapSizeLimit) {
          setHeapPct(Math.round((usedJSHeapSize / jsHeapSizeLimit) * 100))
        }
      }
    }, TICK_MS)

    return () => clearInterval(id)
  }, [])

  const ringMetric = showHeap && heapPct != null ? heapPct : loadPct
  const ringLabel = showHeap && heapPct != null ? 'heap' : 'load'
  const dashOffset = CIRCUMFERENCE * (1 - ringMetric / 100)

  function handleToggle() {
    if (HAS_MEMORY) setShowHeap((v) => !v)
  }

  return (
    <button
      className="sysgauge-widget"
      onClick={handleToggle}
      title={HAS_MEMORY ? 'Tap to toggle load / heap' : 'Event-loop lag estimate (heap unavailable in this browser)'}
    >
      <svg className="sysgauge-ring" viewBox="0 0 64 64" width="52" height="52">
        <circle
          className="sysgauge-ring-track"
          cx="32"
          cy="32"
          r={RADIUS}
          fill="none"
          strokeWidth="5"
        />
        <circle
          className="sysgauge-ring-fill"
          cx="32"
          cy="32"
          r={RADIUS}
          fill="none"
          strokeWidth="5"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="30" className="sysgauge-ring-value" textAnchor="middle">
          {ringMetric}
        </text>
        <text x="32" y="41" className="sysgauge-ring-label" textAnchor="middle">
          {ringLabel}
        </text>
      </svg>
      {HAS_MEMORY && heapPct != null && (
        <span className="sysgauge-sub">heap {heapPct}%</span>
      )}
    </button>
  )
}
