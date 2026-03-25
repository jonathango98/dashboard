import { useState, useEffect, useRef } from 'react'
import storage from '../storage'

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
    // *bold* ~strikethrough~ _italic_ all stay as-is (WhatsApp uses same syntax)
}

function renderPreview(text) {
  let numCounter = 0
  const lines = text.split('\n')
  const parts = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (/^\d+\.\s/.test(line)) {
      // collect consecutive numbered lines
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      numCounter = 0
      parts.push(
        <ol key={`ol-${i}`} className="sticky-preview-list sticky-preview-ol">
          {items.map((item, idx) => (
            <li key={idx}>{formatInline(item)}</li>
          ))}
        </ol>
      )
      continue
    }

    if (/^-\s/.test(line)) {
      // collect consecutive bullet lines
      const items = []
      while (i < lines.length && /^-\s/.test(lines[i])) {
        items.push(lines[i].slice(2))
        i++
      }
      parts.push(
        <ul key={`ul-${i}`} className="sticky-preview-list sticky-preview-ul">
          {items.map((item, idx) => (
            <li key={idx}>{formatInline(item)}</li>
          ))}
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

function formatInline(text) {
  // Split on bold, italic, strikethrough tokens
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

export default function StickyNoteWidget({ instanceId }) {
  const [text, setText] = useState(() => storage.get(`sticky-${instanceId}`) || '')
  const [preview, setPreview] = useState(false)
  const [copied, setCopied] = useState(false)
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

  return (
    <div className="sticky-widget">
      <div className="sticky-header">
        <span className="sticky-header-icon">📝</span>
        <span className="sticky-header-label">Notes</span>
        <span className="sticky-char-count">{text.trim() === '' ? 0 : text.trim().split(/\s+/).length}</span>
        <button
          className={`sticky-btn${preview ? ' sticky-btn-active' : ''}`}
          onClick={() => setPreview(p => !p)}
          title="Toggle WhatsApp preview"
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
      <div className="sticky-divider" />
      {preview ? (
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
          spellCheck={false}
        />
      )}
    </div>
  )
}
