import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import storage from '../storage'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning', icon: '☀️' }
  if (h < 17) return { text: 'Good afternoon', icon: '🌤️' }
  return { text: 'Good evening', icon: '🌙' }
}

export default function GreetingWidget() {
  const [name, setName] = useState(() => storage.get('userName') || 'Friend')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [greeting, setGreeting] = useState(getGreeting())
  const [now, setNow] = useState(() => new Date())
  const inputRef = useRef(null)

  // Update greeting phase every minute, tick date
  useEffect(() => {
    const id = setInterval(() => {
      setGreeting(getGreeting())
      setNow(new Date())
    }, 60_000)

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

  const dateStr = format(now, 'EEEE, MMMM d')

  return (
    <div className="greeting-widget">
      <div className="greeting-accent-bar" />
      <div className="greeting-content">
        <div className="greeting-line">
          <span className="greeting-icon">{greeting.icon}</span>
          <span className="greeting-salutation">{greeting.text}, </span>
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
        <div className="greeting-date">{dateStr}</div>
      </div>
    </div>
  )
}
