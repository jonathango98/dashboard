import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import storage from '../storage'

const REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutes

const CONDITION_ICONS = {
  Clear: '☀️',
  Clouds: '☁️',
  Rain: '🌧️',
  Drizzle: '🌦️',
  Thunderstorm: '⛈️',
  Snow: '❄️',
  Mist: '🌫️',
  Fog: '🌫️',
  Haze: '🌫️',
  Smoke: '🌫️',
  Dust: '🌫️',
  Sand: '🌫️',
  Ash: '🌫️',
  Squall: '💨',
  Tornado: '🌪️',
}

function getIcon(condition) {
  return CONDITION_ICONS[condition] || '🌡️'
}

function convertTemp(f, unit) {
  if (unit === 'C') return (f - 32) * 5 / 9
  if (unit === 'K') return (f - 32) * 5 / 9 + 273.15
  return f
}

function formatTemp(f, unit) {
  const val = Math.round(convertTemp(f, unit))
  if (unit === 'K') return `${val} K`
  return `${val}°${unit}`
}

function abbreviateCity(city) {
  if (!city) return ''
  // Return first word or abbreviation for long names
  const parts = city.split(/[\s,]+/)
  return parts[0]
}

export default function WeatherWidget({ instanceId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null) // 'denied' | 'error'
  const [loading, setLoading] = useState(true)
  const [tempUnit, setTempUnit] = useState(() => storage.get('tempUnit') || 'F')
  const [locating, setLocating] = useState(false)
  const [locSearch, setLocSearch] = useState('')
  const [locError, setLocError] = useState(null)

  const pinnedKey = `weather-pinned-${instanceId}`

  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      const result = await api.getWeather(lat, lon)
      setData(result)
      setError(null)
      storage.set(`weather-cache-${instanceId}`, { data: result, ts: Date.now(), lat, lon })
    } catch {
      setError('error')
    } finally {
      setLoading(false)
    }
  }, [instanceId])

  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'tempUnit') setTempUnit(storage.get('tempUnit') || 'F')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const cached = storage.get(`weather-cache-${instanceId}`)
    if (cached && Date.now() - cached.ts < REFRESH_INTERVAL) {
      setData(cached.data)
      setLoading(false)
      const id = setTimeout(() => fetchWeather(cached.lat, cached.lon), REFRESH_INTERVAL - (Date.now() - cached.ts))
      return () => clearTimeout(id)
    }

    const pinned = storage.get(pinnedKey)
    if (pinned) {
      fetchWeather(pinned.lat, pinned.lon)
      const id = setInterval(() => fetchWeather(pinned.lat, pinned.lon), REFRESH_INTERVAL)
      return () => clearInterval(id)
    }

    if (!navigator.geolocation) {
      setError('denied')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => { fetchWeather(pos.coords.latitude, pos.coords.longitude) },
      () => { setError('denied'); setLoading(false) }
    )

    const id = setInterval(() => {
      const c = storage.get(`weather-cache-${instanceId}`)
      if (c) fetchWeather(c.lat, c.lon)
    }, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [fetchWeather, instanceId, pinnedKey])

  async function handleLocationSubmit(e) {
    e.preventDefault()
    const q = locSearch.trim()
    if (!q) return
    try {
      const results = await api.geocode(q)
      if (!results.length) { setLocError('Location not found'); return }
      const { lat, lon } = results[0]
      storage.set(pinnedKey, { lat, lon })
      setLocating(false)
      setLocSearch('')
      setLocError(null)
      fetchWeather(lat, lon)
    } catch {
      setLocError('Search failed')
    }
  }

  if (loading) {
    return (
      <div className="weather-widget weather-loading">
        <span className="weather-loading-icon">🌡️</span>
        <span className="weather-loading-text">Getting weather…</span>
      </div>
    )
  }

  if (error === 'denied') {
    return (
      <div className="weather-widget weather-empty">
        <span className="weather-empty-icon">📍</span>
        <span className="weather-empty-text">Location denied</span>
      </div>
    )
  }

  if (error === 'error' && !data) {
    return (
      <div className="weather-widget weather-empty">
        <span className="weather-empty-icon">⚠️</span>
        <span className="weather-empty-text">Couldn't load weather</span>
      </div>
    )
  }

  const icon = getIcon(data.condition)
  const cityShort = abbreviateCity(data.city)
  const tooltipText = `${data.condition} · Feels like ${formatTemp(data.feelsLike, tempUnit)} · ${formatTemp(data.high, tempUnit)}/${formatTemp(data.low, tempUnit)}`

  if (locating) {
    return (
      <div className="weather-widget weather-locating">
        <form className="weather-location-form" onSubmit={handleLocationSubmit}>
          <input
            className="weather-location-input"
            autoFocus
            value={locSearch}
            onChange={(e) => { setLocSearch(e.target.value); setLocError(null) }}
            onKeyDown={(e) => e.key === 'Escape' && (setLocating(false), setLocSearch(''), setLocError(null))}
            placeholder="Search city…"
          />
          {locError && <span className="weather-location-error">{locError}</span>}
        </form>
      </div>
    )
  }

  return (
    <div className="weather-widget" title={tooltipText}>
      <span className="weather-icon-compact">{icon}</span>
      <span className="weather-temp-compact">{formatTemp(data.temp, tempUnit)}</span>
      <button
        className="weather-city-compact"
        onClick={() => setLocating(true)}
        title="Change location"
      >
        {cityShort}
      </button>
    </div>
  )
}
