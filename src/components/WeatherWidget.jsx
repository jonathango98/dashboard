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

export default function WeatherWidget({ instanceId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null) // 'denied' | 'error'
  const [loading, setLoading] = useState(true)

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
    // Try to use cached data first
    const cached = storage.get(`weather-cache-${instanceId}`)
    if (cached && Date.now() - cached.ts < REFRESH_INTERVAL) {
      setData(cached.data)
      setLoading(false)
      // Still schedule a background refresh
      const id = setTimeout(() => fetchWeather(cached.lat, cached.lon), REFRESH_INTERVAL - (Date.now() - cached.ts))
      return () => clearTimeout(id)
    }

    // Request geolocation
    if (!navigator.geolocation) {
      setError('denied')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeather(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        setError('denied')
        setLoading(false)
      }
    )

    // Refresh every 10 min
    const id = setInterval(() => {
      const c = storage.get(`weather-cache-${instanceId}`)
      if (c) fetchWeather(c.lat, c.lon)
    }, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [fetchWeather, instanceId])

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
        <span className="weather-empty-text">Location access denied</span>
        <span className="weather-empty-hint">Enable location to see weather</span>
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

  return (
    <div className="weather-widget">
      <div className="weather-top">
        <span className="weather-icon">{icon}</span>
        <div className="weather-temps">
          <span className="weather-temp">{Math.round(data.temp)}°</span>
          <span className="weather-feels">Feels {Math.round(data.feelsLike)}°</span>
        </div>
      </div>
      <div className="weather-bottom">
        <span className="weather-city">{data.city}</span>
        <span className="weather-hl">{Math.round(data.high)}° / {Math.round(data.low)}°</span>
      </div>
    </div>
  )
}
