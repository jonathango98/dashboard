import { useState, useEffect } from 'react'
import storage from '../storage'

const TRANSLATIONS = ['NIV', 'NLT', 'ESV']
const PREF_KEY = 'bible-translation'

function cacheKey(translation) {
  return `bible-verse-cache-${translation.toLowerCase()}`
}

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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function fetchVerse(translation) {
  const res = await fetch(
    `${API_BASE}/api/bible?translation=${translation.toLowerCase()}`
  )
  if (!res.ok) throw new Error('Failed')
  const data = await res.json()
  if (!data.text || !data.reference) throw new Error('Could not parse verse')
  return { text: data.text, reference: data.reference, version: translation }
}

export default function BibleVerseWidget() {
  const [translation, setTranslation] = useState(
    () => storage.get(PREF_KEY) || 'NIV'
  )
  const [verse, setVerse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)

    const cached = storage.get(cacheKey(translation))
    if (cached && isSameDay(cached.ts)) {
      setVerse(cached.verse)
      setLoading(false)
      return
    }

    fetchVerse(translation)
      .then((verse) => {
        setVerse(verse)
        storage.set(cacheKey(translation), { verse, ts: Date.now() })
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [translation])

  function handleTranslationChange(t) {
    storage.set(PREF_KEY, t)
    setTranslation(t)
  }

  const translationToggle = (
    <div className="bible-translation-toggle">
      {TRANSLATIONS.map((t) => (
        <button
          key={t}
          className={`bible-translation-btn${translation === t ? ' active' : ''}`}
          onClick={() => handleTranslationChange(t)}
        >
          {t}
        </button>
      ))}
    </div>
  )

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
        {translationToggle}
        <span className="bible-empty-text">Couldn't load today's verse</span>
      </div>
    )
  }

  return (
    <div className="bible-widget">
      <div className="bible-quote-mark">"</div>
      <div className="bible-text-area">
        <p className="bible-text">"{verse.text}"</p>
      </div>
      <div className="bible-ref-row">
        <span className="bible-reference">— {verse.reference}</span>
        {translationToggle}
      </div>
    </div>
  )
}
