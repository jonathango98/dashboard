import { useState, useEffect, useRef } from 'react'
import storage from '../storage'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function GreetingWidget() {
  const [name, setName] = useState(() => storage.get('userName') || 'Friend')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [greeting, setGreeting] = useState(getGreeting)
  const inputRef = useRef(null)

  // Update greeting phase every minute
  useEffect(() => {
    const id = setInterval(() => setGreeting(getGreeting()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Sync name when storage changes (e.g. updated from Settings panel)
  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'userName') {
        setName(e.newValue ? JSON.parse(e.newValue) : 'Friend')
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function startEdit() {
    setDraft(name)
    setEditing(true)
  }

  function commitEdit() {
    const trimmed = draft.trim() || 'Friend'
    setName(trimmed)
    storage.set('userName', trimmed)
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div className="greeting-widget">
      <p className="greeting-line">{greeting},</p>
      {editing ? (
        <input
          ref={inputRef}
          className="greeting-name-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          autoFocus
          maxLength={40}
        />
      ) : (
        <button className="greeting-name-btn" onClick={startEdit} title="Click to edit your name">
          {name}
        </button>
      )}
    </div>
  )
}
