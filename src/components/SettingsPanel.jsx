import { useState } from 'react'
import storage from '../storage'
import { applyTheme, applyAccent, ACCENT_OPTIONS } from '../utils/theme'

export default function SettingsPanel({ onClose }) {
  const [accent,    setAccent]    = useState(() => storage.get('accent')    || 'yellow')
  const [colorMode, setColorMode] = useState(() => storage.get('colorMode') || 'system')
  const [tempUnit,  setTempUnit]  = useState(() => storage.get('tempUnit')  || 'F')

  function handleNameChange(e) {
    storage.set('userName', e.target.value)
    // Notify GreetingWidget instances (same tab via custom event workaround)
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'userName',
      newValue: JSON.stringify(e.target.value),
    }))
  }

  function handleAccentChange(key) {
    setAccent(key)
    storage.set('accent', key)
    applyAccent(key)
  }

  function handleModeChange(mode) {
    setColorMode(mode)
    storage.set('colorMode', mode)
    applyTheme(mode)
  }

  function handleTempUnitChange(unit) {
    setTempUnit(unit)
    storage.set('tempUnit', unit)
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'tempUnit',
      newValue: JSON.stringify(unit),
    }))
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        {/* Name */}
        <div className="settings-section">
          <label className="settings-label">Your name</label>
          <input
            className="settings-input"
            type="text"
            defaultValue={storage.get('userName') || ''}
            onChange={handleNameChange}
            placeholder="Friend"
            maxLength={40}
          />
          <p className="settings-hint">Used in the Greeting widget.</p>
        </div>

        {/* Accent color */}
        <div className="settings-section">
          <label className="settings-label">Accent color</label>
          <div className="settings-accent-swatches">
            {ACCENT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                className={`accent-swatch ${accent === opt.key ? 'active' : ''}`}
                style={{ '--swatch-color': opt.hex }}
                onClick={() => handleAccentChange(opt.key)}
                title={opt.label}
                aria-label={opt.label}
              />
            ))}
          </div>
        </div>

        {/* Color mode */}
        <div className="settings-section">
          <label className="settings-label">Appearance</label>
          <div className="settings-mode-pills">
            {['light', 'dark', 'system'].map((mode) => (
              <button
                key={mode}
                className={`mode-pill ${colorMode === mode ? 'active' : ''}`}
                onClick={() => handleModeChange(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Temperature unit */}
        <div className="settings-section">
          <label className="settings-label">Temperature unit</label>
          <div className="settings-mode-pills">
            {[
              { key: 'F', label: '°F Fahrenheit' },
              { key: 'C', label: '°C Celsius' },
              { key: 'K', label: 'K Kelvin' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`mode-pill ${tempUnit === key ? 'active' : ''}`}
                onClick={() => handleTempUnitChange(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
