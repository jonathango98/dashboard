import { useState, useEffect, useRef } from 'react'
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

function GearIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

export default function BibleVerseWidget() {
  const [translation, setTranslation] = useState(
    () => storage.get(PREF_KEY) || 'NIV'
  )
  const [verse, setVerse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [gearOpen, setGearOpen] = useState(false)
  const gearRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (gearRef.current && !gearRef.current.contains(e.target)) {
        setGearOpen(false)
      }
    }
    if (gearOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [gearOpen])

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
    setGearOpen(false)
  }

  const gearMenu = (
    <div className="bible-gear-wrap" ref={gearRef}>
      <button
        className="bible-gear-btn"
        onClick={() => setGearOpen(o => !o)}
        title="Change translation"
      >
        <GearIcon />
      </button>
      {gearOpen && (
        <div className="bible-gear-dropdown">
          {TRANSLATIONS.map((t) => (
            <button
              key={t}
              className={`bible-gear-option${translation === t ? ' active' : ''}`}
              onClick={() => handleTranslationChange(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}
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
        {gearMenu}
        <span className="bible-empty-text">Couldn't load today's verse</span>
      </div>
    )
  }

  return (
    <div className="bible-widget">
      {gearMenu}
      <div className="bible-quote-mark">"</div>
      <div className="bible-text-area">
        <p className="bible-text">"{verse.text}"</p>
      </div>
      <div className="bible-ref-row">
        <span className="bible-reference">— {verse.reference}</span>
      </div>
    </div>
  )
}
