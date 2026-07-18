import { useState, useEffect, useMemo, useCallback } from 'react'
import storage from '../storage'
import './SunArcWidget.css'

const LOC_KEY = 'sunarc-location'
const deg2rad = (d) => (d * Math.PI) / 180
const rad2deg = (r) => (r * 180) / Math.PI

// NOAA solar position algorithm (simplified), computed for local noon-ish
// precision. Returns { sunrise, sunset } as Date objects, or null if the
// sun doesn't rise/set that day (polar regions).
function calcSunTimes(date, lat, lon) {
  const midnightUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const JD = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12) / 86400000 + 2440587.5
  const JC = (JD - 2451545) / 36525

  const geomMeanLongSun = (280.46646 + JC * (36000.76983 + JC * 0.0003032)) % 360
  const geomMeanAnomSun = 357.52911 + JC * (35999.05029 - 0.0001537 * JC)
  const eccentEarthOrbit = 0.016708634 - JC * (0.000042037 + 0.0000001267 * JC)
  const sunEqOfCtr =
    Math.sin(deg2rad(geomMeanAnomSun)) * (1.914602 - JC * (0.004817 + 0.000014 * JC)) +
    Math.sin(deg2rad(2 * geomMeanAnomSun)) * (0.019993 - 0.000101 * JC) +
    Math.sin(deg2rad(3 * geomMeanAnomSun)) * 0.000289
  const sunTrueLong = geomMeanLongSun + sunEqOfCtr
  const sunAppLong = sunTrueLong - 0.00569 - 0.00478 * Math.sin(deg2rad(125.04 - 1934.136 * JC))
  const meanObliqEcliptic = 23 + (26 + (21.448 - JC * (46.815 + JC * (0.00059 - JC * 0.001813))) / 60) / 60
  const obliqCorr = meanObliqEcliptic + 0.00256 * Math.cos(deg2rad(125.04 - 1934.136 * JC))
  const sunDeclin = rad2deg(Math.asin(Math.sin(deg2rad(obliqCorr)) * Math.sin(deg2rad(sunAppLong))))
  const varY = Math.tan(deg2rad(obliqCorr / 2)) * Math.tan(deg2rad(obliqCorr / 2))
  const eqOfTime =
    4 *
    rad2deg(
      varY * Math.sin(2 * deg2rad(geomMeanLongSun)) -
        2 * eccentEarthOrbit * Math.sin(deg2rad(geomMeanAnomSun)) +
        4 * eccentEarthOrbit * varY * Math.sin(deg2rad(geomMeanAnomSun)) * Math.cos(2 * deg2rad(geomMeanLongSun)) -
        0.5 * varY * varY * Math.sin(4 * deg2rad(geomMeanLongSun)) -
        1.25 * eccentEarthOrbit * eccentEarthOrbit * Math.sin(2 * deg2rad(geomMeanAnomSun))
    )

  const cosHA =
    Math.cos(deg2rad(90.833)) / (Math.cos(deg2rad(lat)) * Math.cos(deg2rad(sunDeclin))) -
    Math.tan(deg2rad(lat)) * Math.tan(deg2rad(sunDeclin))
  if (cosHA < -1 || cosHA > 1) return null // sun never sets / never rises

  const haSunrise = rad2deg(Math.acos(cosHA))
  const solarNoonFrac = (720 - 4 * lon - eqOfTime) / 1440
  const sunriseFrac = solarNoonFrac - (haSunrise * 4) / 1440
  const sunsetFrac = solarNoonFrac + (haSunrise * 4) / 1440

  return {
    sunrise: new Date(midnightUTC + sunriseFrac * 86400000),
    sunset: new Date(midnightUTC + sunsetFrac * 86400000),
  }
}

function fmtTime(d) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function fmtDuration(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

// Quadratic bezier point for the arc path (P0 -> P1 control -> P2)
const P0 = { x: 16, y: 78 }
const P1 = { x: 150, y: 10 }
const P2 = { x: 284, y: 78 }
function pointOnArc(t) {
  const mt = 1 - t
  return {
    x: mt * mt * P0.x + 2 * mt * t * P1.x + t * t * P2.x,
    y: mt * mt * P0.y + 2 * mt * t * P1.y + t * t * P2.y,
  }
}
const ARC_PATH = `M ${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`

export default function SunArcWidget() {
  const [location, setLocation] = useState(() => storage.get(LOC_KEY))
  const [locError, setLocError] = useState(null)
  const [now, setNow] = useState(() => new Date())

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        storage.set(LOC_KEY, loc)
        setLocation(loc)
        setLocError(null)
      },
      () => setLocError('denied')
    )
  }, [])

  useEffect(() => {
    if (!location) requestLocation()
  }, [location, requestLocation])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  const sunTimes = useMemo(() => {
    if (!location) return null
    return calcSunTimes(now, location.lat, location.lon)
  }, [location, now])

  if (!location || !sunTimes) {
    return (
      <button
        className="sunarc-widget sunarc-empty"
        onClick={requestLocation}
        title={locError === 'denied' ? 'Location denied — click to retry' : 'Click to enable location'}
      >
        <span className="sunarc-empty-icon">📍</span>
        <span className="sunarc-empty-text">Click to enable location</span>
      </button>
    )
  }

  const { sunrise, sunset } = sunTimes
  const beforeSunrise = now < sunrise
  const afterSunset = now > sunset
  const t = Math.min(1, Math.max(0, (now - sunrise) / (sunset - sunrise)))
  const dot = pointOnArc(t)

  let centerLabel
  if (beforeSunrise) centerLabel = `sun rises ${fmtTime(sunrise)}`
  else if (afterSunset) centerLabel = 'sun has set'
  else centerLabel = `${fmtDuration(sunset - now)} of daylight left`

  return (
    <div className="sunarc-widget">
      <svg className="sunarc-svg" viewBox="0 0 300 100" preserveAspectRatio="xMidYMid meet">
        <path className="sunarc-path" d={ARC_PATH} fill="none" />
        <circle
          className={`sunarc-dot${beforeSunrise || afterSunset ? ' sunarc-dot--dim' : ''}`}
          cx={dot.x}
          cy={dot.y}
          r="6"
        />
        <text x={P0.x} y="96" className="sunarc-time sunarc-time--rise" textAnchor="start">
          {fmtTime(sunrise)}
        </text>
        <text x={P2.x} y="96" className="sunarc-time sunarc-time--set" textAnchor="end">
          {fmtTime(sunset)}
        </text>
      </svg>
      <span className="sunarc-label">{centerLabel}</span>
    </div>
  )
}
