import { useState } from 'react'
import storage from '../storage'

function getFaviconUrl(url) {
  try {
    const { origin } = new URL(url)
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(origin)}`
  } catch {
    return null
  }
}

function normalizeUrl(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function extractLabel(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    // Capitalize first letter of first segment
    const name = hostname.split('.')[0]
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return url
  }
}

export default function LinkWidget({ instanceId }) {
  const storageKey = `link-${instanceId}`
  const [config, setConfig] = useState(() => storage.get(storageKey) || { url: '', label: '' })
  const [editing, setEditing] = useState(() => !storage.get(storageKey)?.url)
  const [draft, setDraft] = useState(config.url || '')

  function commitEdit() {
    const url = normalizeUrl(draft)
    if (!url) {
      if (config.url) setEditing(false)
      return
    }
    const label = extractLabel(url)
    const next = { url, label }
    setConfig(next)
    storage.set(storageKey, next)
    setEditing(false)
  }

  function startEdit() {
    setDraft(config.url)
    setEditing(true)
  }

  const faviconUrl = getFaviconUrl(config.url)

  if (editing) {
    return (
      <div className="link-widget link-widget--editing">
        <input
          className="link-widget-input react-grid-layout-cancel"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape' && config.url) setEditing(false)
          }}
          onBlur={commitEdit}
          placeholder="https://..."
          autoFocus
        />
      </div>
    )
  }

  return (
    <div className="link-widget" title={config.label || config.url}>
      <a
        className="link-widget-btn react-grid-layout-cancel"
        href={config.url || '#'}
        target="_self"
        onClick={(e) => !config.url && e.preventDefault()}
      >
        {faviconUrl ? (
          <img
            className="link-widget-favicon"
            src={faviconUrl}
            alt=""
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <span className="link-widget-empty-icon">🔗</span>
        )}
      </a>
      <button
        className="link-widget-edit-btn react-grid-layout-cancel"
        onClick={startEdit}
        title="Edit link"
      >
        ✎
      </button>
    </div>
  )
}
