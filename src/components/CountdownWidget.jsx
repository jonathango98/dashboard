import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import storage from '../storage'

function calcParts(targetDate) {
  const now = Date.now()
  const target = new Date(targetDate).getTime()
  const diffMs = Math.abs(target - now)
  const past = target < now

  const totalSecs = Math.floor(diffMs / 1000)
  const d = Math.floor(totalSecs / 86400)
  const h = Math.floor((totalSecs % 86400) / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)

  return { d, h, m, past }
}

function EditPopover({ anchor, config, onSave, onCancel }) {
  const [label, setLabel] = useState(config.label || '')
  const [date, setDate] = useState(config.date || '')
  const rect = anchor.getBoundingClientRect()

  const style = {
    position: 'fixed',
    top: rect.bottom + 6,
    left: rect.left,
    width: Math.max(240, rect.width),
    zIndex: 500,
  }

  function handleSave(e) {
    e.preventDefault()
    if (!date || !label.trim()) return
    onSave({ label: label.trim(), date })
  }

  return createPortal(
    <div className="drive-popover" style={style}>
      <form onSubmit={handleSave}>
        <label className="drive-popover-label">Label</label>
        <input
          className="drive-popover-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Our anniversary, Trip to Paris…"
          maxLength={40}
          autoFocus
        />
        <label className="drive-popover-label">Date</label>
        <input
          className="drive-popover-input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <div className="drive-popover-actions">
          <button type="submit" className="drive-popover-save" disabled={!date || !label.trim()}>Save</button>
          <button type="button" className="drive-popover-cancel" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>,
    document.body
  )
}

export default function CountdownWidget({ instanceId }) {
  const storageKey = `countdown-${instanceId}`
  const [config, setConfig] = useState(() => storage.get(storageKey) || null)
  const [parts, setParts] = useState(null)
  const [showEdit, setShowEdit] = useState(!storage.get(storageKey))
  const anchorRef = useRef(null)

  useEffect(() => {
    if (!config) return
    setParts(calcParts(config.date))
    const id = setInterval(() => setParts(calcParts(config.date)), 60_000)
    return () => clearInterval(id)
  }, [config])

  function handleSave(newConfig) {
    setConfig(newConfig)
    storage.set(storageKey, newConfig)
    setShowEdit(false)
  }

  if (!config) {
    return (
      <div className="countdown-widget countdown-empty" ref={anchorRef}>
        <button className="drive-set-prompt" onClick={() => setShowEdit(true)}>
          <span>📅</span>
          <span>Set date</span>
        </button>
        {showEdit && anchorRef.current && (
          <EditPopover
            anchor={anchorRef.current}
            config={{}}
            onSave={handleSave}
            onCancel={() => setShowEdit(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div
      className="countdown-widget"
      ref={anchorRef}
      onClick={() => !showEdit && setShowEdit(true)}
      title="Click to edit"
    >
      <span className="countdown-label">{config.label}</span>
      <div className="countdown-time">
        {parts ? (
          <>
            <span className="countdown-unit"><span className="countdown-num">{parts.d}</span>d</span>
            <span className="countdown-unit"><span className="countdown-num">{parts.h}</span>h</span>
            <span className="countdown-unit"><span className="countdown-num">{parts.m}</span>m</span>
          </>
        ) : (
          <span className="countdown-num">…</span>
        )}
      </div>
      <span className="countdown-direction">{parts?.past ? 'since' : 'until'}</span>
      {showEdit && anchorRef.current && (
        <EditPopover
          anchor={anchorRef.current}
          config={config}
          onSave={handleSave}
          onCancel={() => setShowEdit(false)}
        />
      )}
    </div>
  )
}
