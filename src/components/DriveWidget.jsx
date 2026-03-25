import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'
import storage from '../storage'

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

const TRAFFIC_COLORS = {
  light:    '#22C55E',
  moderate: '#F5C518',
  heavy:    '#EF4444',
}

const TRAFFIC_LABELS = {
  light:    'Light traffic',
  moderate: 'Moderate traffic',
  heavy:    'Heavy traffic',
}

function getOrigin() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(`${pos.coords.latitude},${pos.coords.longitude}`),
      () => resolve(null),
      { timeout: 5000 }
    )
  })
}

function EditPopover({ anchor, config, onSave, onCancel }) {
  const [label, setLabel] = useState(config.label || '')
  const [address, setAddress] = useState(config.destination || '')
  const rect = anchor.getBoundingClientRect()

  const style = {
    position: 'fixed',
    top: rect.bottom + 6,
    left: rect.left,
    width: Math.max(260, rect.width),
    zIndex: 500,
  }

  function handleSave(e) {
    e.preventDefault()
    if (!address.trim()) return
    onSave({ label: label.trim() || address.trim(), destination: address.trim() })
  }

  return createPortal(
    <div className="drive-popover" style={style}>
      <form onSubmit={handleSave}>
        <label className="drive-popover-label">Label</label>
        <input
          className="drive-popover-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Work, Home, Gym…"
          maxLength={30}
        />
        <label className="drive-popover-label">Address</label>
        <input
          className="drive-popover-input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St, San Francisco"
          autoFocus={!config.destination}
          maxLength={200}
        />
        <div className="drive-popover-actions">
          <button type="submit" className="drive-popover-save">Save</button>
          <button type="button" className="drive-popover-cancel" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>,
    document.body
  )
}

export default function DriveWidget({ instanceId }) {
  const storageKey = `drive-${instanceId}`
  const [config, setConfig] = useState(() => storage.get(storageKey) || { label: '', destination: '' })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const anchorRef = useRef(null)
  const originRef = useRef(null)

  const fetchDrive = useCallback(async (dest) => {
    if (!dest) return
    setLoading(true)
    try {
      if (!originRef.current) {
        originRef.current = await getOrigin()
      }
      const result = await api.getDrive(dest, originRef.current)
      setData(result)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!config.destination) return
    fetchDrive(config.destination)
    const id = setInterval(() => fetchDrive(config.destination), REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [config.destination, fetchDrive])

  function handleSave(newConfig) {
    setConfig(newConfig)
    storage.set(storageKey, newConfig)
    setShowEdit(false)
    setData(null)
    setError(false)
  }

  const mapsUrl = config.destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(config.destination)}`
    : null

  const trafficColor = data ? (TRAFFIC_COLORS[data.trafficCondition] || TRAFFIC_COLORS.light) : null
  const trafficLabel = data ? (TRAFFIC_LABELS[data.trafficCondition] || 'Light traffic') : null
  const tooltipText = data
    ? `${config.destination} · ${data.distance} · ${trafficLabel}`
    : config.destination || ''

  if (!config.destination) {
    return (
      <div className="drive-widget drive-empty-new" ref={anchorRef}>
        <button className="drive-set-prompt" onClick={() => setShowEdit(true)}>
          <span>📍</span>
          <span>Set destination</span>
        </button>
        {showEdit && (
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

  if (loading && !data) {
    return (
      <div className="drive-widget drive-loading-new">
        <span className="drive-loading-icon">🚗</span>
        <span className="drive-loading-text">Getting ETA…</span>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="drive-widget drive-empty-new" ref={anchorRef}>
        <span>⚠️</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Couldn't load</span>
        <button className="drive-set-prompt" style={{ fontSize: 11 }} onClick={() => setShowEdit(true)}>Edit</button>
        {showEdit && (
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

  return (
    <div className="drive-widget drive-configured" ref={anchorRef} title={tooltipText}>
      {data && (
        <span
          className="drive-traffic-dot"
          style={{ background: trafficColor }}
          title={trafficLabel}
        />
      )}
      <button
        className="drive-label-btn"
        onClick={() => setShowEdit(true)}
        title="Edit destination"
      >
        🏠 {config.label || config.destination.split(',')[0]}
      </button>
      {data && (
        <a
          className="drive-eta-group"
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="drive-eta-compact">{data.eta} min</span>
          {data.distance && <span className="drive-distance">{data.distance}</span>}
        </a>
      )}
      {showEdit && (
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
