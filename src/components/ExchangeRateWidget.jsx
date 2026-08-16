import { useState, useEffect, useCallback, useRef, useId } from 'react'
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

function formatAmount(val) {
  if (val === null || val === undefined || !isFinite(val)) return '—'
  return val.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function EditPopover({ anchor, config, onSave, onCancel }) {
  const [from, setFrom] = useState(config.from)
  const [to, setTo] = useState(config.to)
  const rect = anchor.getBoundingClientRect()
  const fromId = useId()
  const toId = useId()

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
        <label className="drive-popover-label" htmlFor={fromId}>From</label>
        <select id={fromId} className="exchange-select" value={from} onChange={(e) => setFrom(e.target.value)}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="drive-popover-label" htmlFor={toId} style={{ marginTop: 8 }}>To</label>
        <select id={toId} className="exchange-select" value={to} onChange={(e) => setTo(e.target.value)}>
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
  const [tab, setTab] = useState('rate')
  const [amount, setAmount] = useState('1')
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

  function handleSwap() {
    handleSave({ from: config.to, to: config.from })
  }

  function selectTab(next) {
    setShowEdit(false)
    setTab(next)
  }

  const numericAmount = parseFloat(amount)
  const converted = rate !== null && !isNaN(numericAmount) ? numericAmount * rate : null

  return (
    <div className="exchange-container">
      <div className="exchange-tabs">
        <button
          className={`exchange-tab${tab === 'rate' ? ' active' : ''}`}
          onClick={() => selectTab('rate')}
        >
          Rate
        </button>
        <button
          className={`exchange-tab${tab === 'calc' ? ' active' : ''}`}
          onClick={() => selectTab('calc')}
        >
          Calculator
        </button>
      </div>

      {tab === 'rate' ? (
        <div
          className="exchange-widget"
          ref={anchorRef}
          role="button"
          tabIndex={0}
          onClick={() => !showEdit && setShowEdit(true)}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (!showEdit) setShowEdit(true)
            }
          }}
          title="Click to change currencies"
        >
          <span className="exchange-currency exchange-from">{config.from}</span>
          <span className="exchange-rate">
            {loading && rate === null ? '…' : error ? '—' : rate !== null ? formatRate(rate) : '…'}
          </span>
          <span className="exchange-currency exchange-to">{config.to}</span>
          <button
            type="button"
            className="exchange-refresh"
            onClick={(e) => { e.stopPropagation(); fetchRate(config.from, config.to, true) }}
            title="Refresh"
            aria-label="Refresh rate"
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
      ) : (
        <div className="exchange-calc">
          <div className="exchange-calc-row">
            <input
              className="exchange-calc-input"
              type="number"
              inputMode="decimal"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 100…"
              aria-label="Amount"
            />
            <select
              className="exchange-select exchange-calc-select"
              value={config.from}
              onChange={(e) => handleSave({ ...config, from: e.target.value })}
              aria-label="From currency"
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button
            type="button"
            className="exchange-calc-swap"
            onClick={handleSwap}
            title="Swap currencies"
            aria-label="Swap currencies"
            disabled={loading}
          >
            ⇄
          </button>
          <div className="exchange-calc-row">
            <div className="exchange-calc-output" title={converted !== null ? String(converted) : ''}>
              {loading ? '…' : error ? '—' : formatAmount(converted)}
            </div>
            <select
              className="exchange-select exchange-calc-select"
              value={config.to}
              onChange={(e) => handleSave({ ...config, to: e.target.value })}
              aria-label="To currency"
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {error && <p className="exchange-calc-error">Failed to load rate</p>}
        </div>
      )}
    </div>
  )
}
