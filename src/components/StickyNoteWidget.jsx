import { useState, useEffect, useRef } from 'react'
import storage from '../storage'

const MAX_CHARS = 500

export default function StickyNoteWidget({ instanceId }) {
  const [text, setText] = useState(() => storage.get(`sticky-${instanceId}`) || '')
  const debounceRef = useRef(null)

  useEffect(() => {
    function onStorage(e) {
      if (e.key === `sticky-${instanceId}`) {
        setText(storage.get(`sticky-${instanceId}`) || '')
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [instanceId])

  function handleChange(e) {
    const val = e.target.value
    if (val.length > MAX_CHARS) return
    setText(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      storage.set(`sticky-${instanceId}`, val)
    }, 500)
  }

  return (
    <div className="sticky-widget">
      <div className="sticky-header">
        <span className="sticky-header-icon">📝</span>
        <span className="sticky-header-label">Notes</span>
        <span className="sticky-char-count">{text.length}/{MAX_CHARS}</span>
      </div>
      <div className="sticky-divider" />
      <textarea
        className="sticky-textarea"
        value={text}
        onChange={handleChange}
        placeholder="Jot something down…"
        spellCheck={false}
      />
    </div>
  )
}
