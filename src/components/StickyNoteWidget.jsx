import { useState, useEffect, useRef } from 'react'
import storage from '../storage'

export default function StickyNoteWidget({ instanceId }) {
  const [text, setText] = useState(() => storage.get(`sticky-${instanceId}`) || '')
  const debounceRef = useRef(null)

  // Sync if another tab updates this key
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
    setText(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      storage.set(`sticky-${instanceId}`, val)
    }, 500)
  }

  return (
    <div className="sticky-widget">
      <textarea
        className="sticky-textarea"
        value={text}
        onChange={handleChange}
        placeholder="Jot something down…"
        spellCheck={false}
      />
      <span className="sticky-char-count">{text.length}</span>
    </div>
  )
}
