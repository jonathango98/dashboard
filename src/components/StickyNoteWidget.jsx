import { useState, useEffect, useRef } from 'react'
import storage from '../storage'

// ── Notes helpers ────────────────────────────────────────────────────────────

function toWhatsApp(text) {
  let numCounter = 0
  return text
    .split('\n')
    .map(line => {
      if (/^\d+\.\s/.test(line)) {
        numCounter++
        return `${numCounter}. ${line.replace(/^\d+\.\s+/, '')}`
      } else {
        numCounter = 0
        if (/^-\s/.test(line)) {
          return `• ${line.slice(2)}`
        }
        return line
      }
    })
    .join('\n')
}

function formatInline(text) {
  const parts = []
  const regex = /(\*([^*]+?)\*|~([^~]+?)~|_(.+?)_)/g
  let last = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    if (match[0].startsWith('*')) parts.push(<strong key={match.index}>{match[2]}</strong>)
    else if (match[0].startsWith('~')) parts.push(<del key={match.index}>{match[3]}</del>)
    else if (match[0].startsWith('_')) parts.push(<em key={match.index}>{match[4]}</em>)
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function renderPreview(text) {
  const lines = text.split('\n')
  const parts = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (/^\d+\.\s/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      parts.push(
        <ol key={`ol-${i}`} className="sticky-preview-list sticky-preview-ol">
          {items.map((item, idx) => <li key={idx}>{formatInline(item)}</li>)}
        </ol>
      )
      continue
    }

    if (/^-\s/.test(line)) {
      const items = []
      while (i < lines.length && /^-\s/.test(lines[i])) {
        items.push(lines[i].slice(2))
        i++
      }
      parts.push(
        <ul key={`ul-${i}`} className="sticky-preview-list sticky-preview-ul">
          {items.map((item, idx) => <li key={idx}>{formatInline(item)}</li>)}
        </ul>
      )
      continue
    }

    if (line === '') {
      parts.push(<br key={`br-${i}`} />)
    } else {
      parts.push(<p key={`p-${i}`} className="sticky-preview-p">{formatInline(line)}</p>)
    }
    i++
  }

  return parts
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StickyNoteWidget({ instanceId }) {
  const [tab, setTab] = useState('notes')

  // Notes state
  const [text, setText] = useState(() => storage.get(`sticky-${instanceId}`) || '')
  const [preview, setPreview] = useState(false)
  const [copied, setCopied] = useState(false)
  const debounceRef = useRef(null)

  // Checklist state
  const [items, setItems] = useState(() => storage.get(`sticky-checklist-${instanceId}`) || [])
  const [newItemText, setNewItemText] = useState('')
  const addInputRef = useRef(null)

  useEffect(() => {
    function onStorage(e) {
      if (e.key === `sticky-${instanceId}`) {
        setText(storage.get(`sticky-${instanceId}`) || '')
      }
      if (e.key === `sticky-checklist-${instanceId}`) {
        setItems(storage.get(`sticky-checklist-${instanceId}`) || [])
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [instanceId])

  // ── Notes handlers ────────────────────────────────────────────────────────

  function handleChange(e) {
    const val = e.target.value
    setText(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      storage.set(`sticky-${instanceId}`, val)
    }, 500)
  }

  function handleCopy() {
    navigator.clipboard.writeText(toWhatsApp(text)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  // ── Checklist handlers ────────────────────────────────────────────────────

  function saveItems(next) {
    setItems(next)
    storage.set(`sticky-checklist-${instanceId}`, next)
  }

  function handleAddItem(e) {
    e.preventDefault()
    const trimmed = newItemText.trim()
    if (!trimmed) return
    const next = [...items, { id: Date.now().toString(), text: trimmed, checked: false }]
    saveItems(next)
    setNewItemText('')
    addInputRef.current?.focus()
  }

  function handleToggle(id) {
    saveItems(items.map(it => it.id === id ? { ...it, checked: !it.checked } : it))
  }

  function handleDeleteItem(id) {
    saveItems(items.filter(it => it.id !== id))
  }

  function handleClearChecked() {
    saveItems(items.filter(it => !it.checked))
  }

  const checkedCount = items.filter(it => it.checked).length

  return (
    <div className="sticky-widget">
      <div className="sticky-header">
        <span className="sticky-header-icon">📝</span>

        <div className="sticky-tabs">
          <button
            className={`sticky-tab${tab === 'notes' ? ' active' : ''}`}
            onClick={() => setTab('notes')}
          >Notes</button>
          <button
            className={`sticky-tab${tab === 'checklist' ? ' active' : ''}`}
            onClick={() => setTab('checklist')}
          >Checklist</button>
        </div>

        {tab === 'notes' && (
          <div className="sticky-header-actions">
            <span className="sticky-char-count">
              {text.trim() === '' ? 0 : text.trim().split(/\s+/).length}
            </span>
            <button
              className={`sticky-btn${preview ? ' sticky-btn-active' : ''}`}
              onClick={() => setPreview(p => !p)}
              title="Toggle preview"
            >
              {preview ? 'Edit' : 'Preview'}
            </button>
            <button
              className={`sticky-btn${copied ? ' sticky-btn-copied' : ''}`}
              onClick={handleCopy}
              title="Copy as WhatsApp message"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}

        {tab === 'checklist' && items.length > 0 && (
          <div className="sticky-header-actions">
            <span className="sticky-char-count">{checkedCount}/{items.length}</span>
            {checkedCount > 0 && (
              <button className="sticky-btn" onClick={handleClearChecked} title="Remove checked items">
                Clear done
              </button>
            )}
          </div>
        )}
      </div>

      <div className="sticky-divider" />

      {tab === 'notes' && (
        preview ? (
          <div className="sticky-preview">
            {text.trim() === '' ? (
              <span className="sticky-preview-empty">Nothing to preview…</span>
            ) : (
              renderPreview(text)
            )}
          </div>
        ) : (
          <textarea
            className="sticky-textarea"
            value={text}
            onChange={handleChange}
            placeholder={"Jot something down…\n\n*bold*  _italic_  ~strikeout~\n- bullet\n1. numbered"}
            spellCheck={true}
          />
        )
      )}

      {tab === 'checklist' && (
        <div className="sticky-checklist">
          <ul className="sticky-checklist-list">
            {items.length === 0 && (
              <li className="sticky-checklist-empty">No items yet — add one below</li>
            )}
            {items.map(item => (
              <li key={item.id} className={`sticky-checklist-item${item.checked ? ' checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => handleToggle(item.id)}
                  className="sticky-checklist-checkbox"
                />
                <span className="sticky-checklist-text">{item.text}</span>
                <button
                  className="sticky-checklist-delete"
                  onClick={() => handleDeleteItem(item.id)}
                  title="Remove"
                >×</button>
              </li>
            ))}
          </ul>
          <form className="sticky-checklist-form" onSubmit={handleAddItem}>
            <input
              ref={addInputRef}
              className="sticky-checklist-input"
              value={newItemText}
              onChange={e => setNewItemText(e.target.value)}
              placeholder="Add an item…"
            />
            <button type="submit" className="sticky-checklist-add" title="Add item">+</button>
          </form>
        </div>
      )}
    </div>
  )
}
