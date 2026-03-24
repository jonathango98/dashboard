import { useState, useEffect } from 'react'
import storage from '../storage'

const CACHE_KEY = 'bible-verse-cache'
const API_URL = 'https://beta.ourmanna.com/api/v1/get?format=json&order=daily'

function isSameDay(ts) {
  if (!ts) return false
  const cached = new Date(ts)
  const now = new Date()
  return (
    cached.getFullYear() === now.getFullYear() &&
    cached.getMonth() === now.getMonth() &&
    cached.getDate() === now.getDate()
  )
}

export default function BibleVerseWidget() {
  const [verse, setVerse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const cached = storage.get(CACHE_KEY)
    if (cached && isSameDay(cached.ts)) {
      setVerse(cached.verse)
      setLoading(false)
      return
    }

    fetch(API_URL)
      .then((r) => {
        if (!r.ok) throw new Error('Failed')
        return r.json()
      })
      .then((json) => {
        // ourmanna response shape: { verse: { details: { text, reference, version } } }
        const details = json?.verse?.details
        if (!details) throw new Error('Unexpected shape')
        const verse = {
          text: details.text?.trim(),
          reference: details.reference?.trim(),
          version: details.version?.trim() || 'NIV',
        }
        setVerse(verse)
        storage.set(CACHE_KEY, { verse, ts: Date.now() })
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bible-widget bible-loading">
        <span className="bible-loading-text">Loading verse…</span>
      </div>
    )
  }

  if (error || !verse) {
    return (
      <div className="bible-widget bible-empty">
        <span className="bible-empty-text">Couldn't load today's verse</span>
      </div>
    )
  }

  return (
    <div className="bible-widget">
      <p className="bible-text">"{verse.text}"</p>
      <div className="bible-meta">
        <span className="bible-reference">{verse.reference}</span>
        <span className="bible-version">{verse.version}</span>
      </div>
    </div>
  )
}
