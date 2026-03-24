import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'
import storage from '../storage'

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

const TRAFFIC_LABELS = {
  light:    { label: 'Light traffic',    color: '#22C55E' },
  moderate: { label: 'Moderate traffic', color: '#F5C518' },
  heavy:    { label: 'Heavy traffic',    color: '#EF4444' },
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

export default function DriveWidget() {
  const [destination, setDestination] = useState(() => storage.get('destination') || '')
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(false)
  const originRef = useRef(null) // cache geolocation so we don't re-request every refresh

  // Listen for destination changes from SettingsPanel
  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'destination') {
        const val = storage.get('destination') || ''
        setDestination(val)
        setData(null)
        setError(false)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const fetchDrive = useCallback(async (dest) => {
    if (!dest) return
    setLoading(true)
    try {
      // Get geolocation origin (cached after first call)
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
    if (!destination) return
    fetchDrive(destination)
    const id = setInterval(() => fetchDrive(destination), REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [destination, fetchDrive])

  const mapsUrl = destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
    : null

  if (!destination) {
    return (
      <div className="drive-widget drive-empty">
        <span className="drive-empty-icon">🚗</span>
        <span className="drive-empty-text">No destination set</span>
        <span className="drive-empty-hint">Add one in ⚙ Settings</span>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="drive-widget drive-loading">
        <span className="drive-loading-icon">🚗</span>
        <span className="drive-loading-text">Getting ETA…</span>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="drive-widget drive-empty">
        <span className="drive-empty-icon">⚠️</span>
        <span className="drive-empty-text">Couldn't load drive info</span>
      </div>
    )
  }

  const traffic = data ? TRAFFIC_LABELS[data.trafficCondition] || TRAFFIC_LABELS.light : null

  return (
    <div className="drive-widget">
      <div className="drive-top">
        <span className="drive-icon">🚗</span>
        <div className="drive-info">
          <span className="drive-eta">{data?.eta}<span className="drive-eta-unit"> min</span></span>
          <span className="drive-distance">{data?.distance}</span>
        </div>
      </div>
      <div className="drive-bottom">
        <span
          className="drive-traffic"
          style={{ color: traffic?.color }}
        >
          {traffic?.label}
        </span>
        <a
          className="drive-maps-link"
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Maps ↗
        </a>
      </div>
    </div>
  )
}
