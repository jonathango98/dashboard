import { useState, useEffect, useRef, useCallback } from 'react'
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

function fitFontSize(container, textEl, min = 10, max = 40) {
  let lo = min, hi = max
  textEl.style.fontSize = hi + 'px'
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2)
    textEl.style.fontSize = mid + 'px'
    if (textEl.scrollHeight <= container.clientHeight && textEl.scrollWidth <= container.clientWidth) {
      lo = mid
    } else {
      hi = mid
    }
  }
  textEl.style.fontSize = lo + 'px'
}

export default function BibleVerseWidget() {
  const [verse, setVerse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const containerRef = useRef(null)
  const textRef = useRef(null)

  const refit = useCallback(() => {
    if (containerRef.current && textRef.current) {
      fitFontSize(containerRef.current, textRef.current)
    }
  }, [])

  useEffect(() => {
    if (!verse) return
    refit()
    const ro = new ResizeObserver(refit)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [verse, refit])

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
    <div className="bible-widget" ref={containerRef}>
      <p className="bible-text" ref={textRef}>"{verse.text}"</p>
      <div className="bible-meta">
        <span className="bible-reference">{verse.reference}</span>
        <span className="bible-version">{verse.version}</span>
      </div>
    </div>
  )
}
