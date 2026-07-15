const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request(path) {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error || `API error: ${res.status}`)
  }
  return res.json()
}

export const api = {
  getWeather: (lat, lon) => request(`/api/weather?lat=${lat}&lon=${lon}`),
  geocode: (q) => request(`/api/geocode?q=${encodeURIComponent(q)}`),
  getDrive: (destination, origin) => {
    const params = new URLSearchParams({ destination })
    if (origin) params.set('origin', origin)
    return request(`/api/drive?${params}`)
  },
  getExchangeRate: (from, to) => request(`/api/exchange?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  generateGradientColors: (prompt) => post('/api/gradient', { prompt }),
}
