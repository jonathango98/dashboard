import { useState, useEffect } from 'react'
import WidgetCanvas from './components/WidgetCanvas'
import WidgetTray from './components/WidgetTray'
import SettingsPanel from './components/SettingsPanel'
import { useLayout } from './hooks/useLayout'
import storage from './storage'
import { applyTheme, applyAccent } from './utils/theme'

export default function App({ onReady }) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { layout, addWidget, removeWidget, onLayoutChange, commitLayout, discardLayout } = useLayout()

  // Apply stored theme + accent on mount
  useEffect(() => {
    const mode = storage.get('colorMode') || 'system'
    const accent = storage.get('accent') || 'yellow'
    applyTheme(mode)
    applyAccent(accent)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if ((storage.get('colorMode') || 'system') === 'system') applyTheme('system')
    }
    mq.addEventListener('change', handler)

    // Dismiss loading screen
    if (onReady) onReady()

    return () => mq.removeEventListener('change', handler)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (isEditMode) handleDiscard()
        else if (isSettingsOpen) setIsSettingsOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isEditMode, isSettingsOpen])

  function handleDone() {
    commitLayout()
    setIsEditMode(false)
  }

  function handleDiscard() {
    discardLayout()
    setIsEditMode(false)
  }

  return (
    <div className={`app${isEditMode ? ' edit-mode' : ''}`}>
      <div className="topbar">
<div className="topbar-right">
          {!isEditMode ? (
            <>
              <button className="btn-ghost" onClick={() => setIsEditMode(true)}>
                Edit Layout
              </button>
              <button
                className="btn-icon"
                onClick={() => setIsSettingsOpen(true)}
                aria-label="Settings"
              >
                ⚙
              </button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={handleDiscard}>
                Discard
              </button>
              <button className="btn-accent" onClick={handleDone}>
                Done
              </button>
            </>
          )}
        </div>
      </div>

      <WidgetCanvas
        layout={layout}
        isEditMode={isEditMode}
        onLayoutChange={onLayoutChange}
        onRemove={removeWidget}
      />

      {isEditMode && <WidgetTray onAdd={addWidget} />}

      {isSettingsOpen && (
        <SettingsPanel onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  )
}
