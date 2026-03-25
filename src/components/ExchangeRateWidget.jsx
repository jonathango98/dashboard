import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'
import storage from '../storage'

const CACHE_TTL = 60 * 60 * 1000 // 1 hour

// Currencies supported by Frankfurter (ECB)
const CURRENCIES = [
  'AUD','BGN','BRL','CAD','CHF','CNY','CZK','DKK','EUR','GBP',
  'HKD','HUF','IDR','ILS','INR','ISK','JPY','KRW','MXN','MYR',
  'NOK','NZD','PHP','PLN','RON','SEK','SGD','THB','TRY','USD','ZAR',
]

function formatRate(rate) {
  if (rate >= 1_000_000) return (rate / 1_000_000).toFixed(3) + 'M'
  if (rate >= 1_000) return (rate / 1_000).toFixed(3) + 'K'
  return rate.toFixed(3)
}

function EditPopover({ anchor, config, onSave, onCancel }) {
  const [from, setFrom] = useState(config.from)
  const [to, setTo] = useState(config.to)
  const rect = anchor.getBoundingClientRect()

  const style = {
    position: 'fixed',
    top: rect.bottom + 6,
    left: rect.left,
    width: Math.max(220, rect.width),
    zIndex: 500,
  }

  function handleSave(e) {
    e.preventDefault()
    if (from === to) return
    onSave({ from, to })
  }

  return createPortal(
    <div className="drive-popover" style={style}>
      <form onSubmit={handleSave}>
        <label className="drive-popover-label">From</label>
        <select className="exchange-select" value={from} onChange={(e) => setFrom(e.target.value)}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="drive-popover-label" style={{ marginTop: 8 }}>To</label>
        <select className="exchange-select" value={to} onChange={(e) => setTo(e.target.value)}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {from === to && (
          <p style={{ fontSize: 11, color: '#EF4444', margin: '6px 0 0' }}>Choose different currencies</p>
        )}
        <div className="drive-popover-actions" style={{ marginTop: 12 }}>
          <button type="submit" className="drive-popover-save" disabled={from === to}>Save</button>
          <button type="button" className="drive-popover-cancel" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>,
    document.body
  )
}

export default function ExchangeRateWidget({ instanceId }) {
  const storageKey = `exchange-${instanceId}`
  const cacheKey = `exchange-cache-${instanceId}`

  const [config, setConfig] = useState(() => storage.get(storageKey) || { from: 'USD', to: 'EUR' })
  const [rate, setRate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const anchorRef = useRef(null)

  const fetchRate = useCallback(async (from, to, force = false) => {
    const cached = storage.get(cacheKey)
    if (!force && cached && cached.from === from && cached.to === to && Date.now() - cached.ts < CACHE_TTL) {
      setRate(cached.rate)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const result = await api.getExchangeRate(from, to)
      setRate(result.rate)
      storage.set(cacheKey, { from, to, rate: result.rate, ts: Date.now() })
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [cacheKey])

  useEffect(() => {
    fetchRate(config.from, config.to)
  }, [config.from, config.to, fetchRate])

  function handleSave(newConfig) {
    setConfig(newConfig)
    storage.set(storageKey, newConfig)
    setShowEdit(false)
    setRate(null)
    setError(false)
    fetchRate(newConfig.from, newConfig.to, true)
  }

  return (
    <div
      className="exchange-widget"
      ref={anchorRef}
      onClick={() => !showEdit && setShowEdit(true)}
      title="Click to change currencies"
    >
      <span className="exchange-currency exchange-from">{config.from}</span>
      <span className="exchange-rate">
        {loading && rate === null ? '…' : error ? '—' : rate !== null ? formatRate(rate) : '…'}
      </span>
      <span className="exchange-currency exchange-to">{config.to}</span>
      <button
        className="exchange-refresh"
        onClick={(e) => { e.stopPropagation(); fetchRate(config.from, config.to, true) }}
        title="Refresh"
        disabled={loading}
      >
        ↻
      </button>
      {showEdit && anchorRef.current && (
        <EditPopover
          anchor={anchorRef.current}
          config={config}
          onSave={handleSave}
          onCancel={() => setShowEdit(false)}
        />
      )}
    </div>
  )
}
