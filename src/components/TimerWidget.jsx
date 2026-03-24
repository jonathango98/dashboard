import { useState, useEffect, useRef, useCallback } from 'react'
import storage from '../storage'

// ── Notifications ────────────────────────────────────────────────────────────

async function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

function sendNotif(title, body = '') {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

// ── Time formatting ───────────────────────────────────────────────────────────

function fmtMSS(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function parseMMSS(str) {
  // Accept "MM:SS", "M:SS", or plain minutes
  const parts = str.trim().split(':')
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10) || 0
    const s = parseInt(parts[1], 10) || 0
    return (m * 60 + Math.min(s, 59)) * 1000
  }
  const mins = parseInt(str, 10) || 0
  return mins * 60 * 1000
}

// ── Pomodoro ─────────────────────────────────────────────────────────────────

const POMO_DEFAULTS = { focus: 25, short: 5, long: 15 }

function makePomo(overrides = {}) {
  return {
    phase: 'focus',      // 'focus' | 'short' | 'long'
    session: 1,          // 1–4
    running: false,
    startedAt: null,
    elapsed: 0,          // ms elapsed before current start
    durations: { ...POMO_DEFAULTS },
    ...overrides,
  }
}

function pomoPhaseMs(pomo) {
  const d = pomo.durations
  if (pomo.phase === 'focus')  return d.focus  * 60_000
  if (pomo.phase === 'short')  return d.short  * 60_000
  return d.long * 60_000
}

function pomoRemainingMs(pomo) {
  const totalElapsed = pomo.elapsed + (pomo.running ? Date.now() - pomo.startedAt : 0)
  return Math.max(0, pomoPhaseMs(pomo) - totalElapsed)
}

function nextPomoPhase(pomo) {
  if (pomo.phase === 'focus') {
    const isLast = pomo.session === 4
    return {
      ...pomo,
      phase: isLast ? 'long' : 'short',
      elapsed: 0,
      startedAt: Date.now(),
      running: true,
    }
  } else {
    // After break → next focus session
    const nextSession = pomo.phase === 'long' ? 1 : (pomo.session % 4) + 1
    return {
      ...pomo,
      phase: 'focus',
      session: nextSession,
      elapsed: 0,
      startedAt: Date.now(),
      running: true,
    }
  }
}

// ── Countdown ─────────────────────────────────────────────────────────────────

function makeCountdown(overrides = {}) {
  return {
    totalMs: 5 * 60_000,  // default 5 min
    running: false,
    startedAt: null,
    elapsed: 0,
    label: '',
    done: false,
    ...overrides,
  }
}

function countdownRemainingMs(cd) {
  const totalElapsed = cd.elapsed + (cd.running ? Date.now() - cd.startedAt : 0)
  return Math.max(0, cd.totalMs - totalElapsed)
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TimerWidget({ instanceId }) {
  const storeKey = `timer-${instanceId}`
  const savedState = storage.get(storeKey) || {}

  const [tab, setTab] = useState(savedState.tab || 'pomodoro')
  const [pomo, setPomo] = useState(() => makePomo(savedState.pomo || {}))
  const [cd, setCd] = useState(() => makeCountdown(savedState.cd || {}))

  // For editing duration displays inline
  const [editingPomoPhase, setEditingPomoPhase] = useState(null) // 'focus'|'short'|'long'|null
  const [editingDraft, setEditingDraft] = useState('')
  const [editingCd, setEditingCd] = useState(false)
  const [editingCdDraft, setEditingCdDraft] = useState('')

  const tickRef = useRef(null)

  // Persist state on change
  useEffect(() => {
    storage.set(storeKey, { tab, pomo, cd })
  }, [tab, pomo, cd])

  // Request notification permission once
  useEffect(() => {
    requestNotifPermission()
  }, [])

  // Tick loop
  useEffect(() => {
    function tick() {
      if (tab === 'pomodoro') {
        setPomo((prev) => {
          if (!prev.running) return prev
          const remaining = pomoRemainingMs(prev)
          if (remaining > 0) return prev
          // Phase complete
          if (prev.phase === 'focus') {
            sendNotif('Focus session complete!', 'Time for a break.')
          } else {
            sendNotif('Break over!', 'Time to focus.')
          }
          return nextPomoPhase(prev)
        })
      } else {
        setCd((prev) => {
          if (!prev.running || prev.done) return prev
          const remaining = countdownRemainingMs(prev)
          if (remaining > 0) return prev
          sendNotif(prev.label || 'Timer done!', '')
          return { ...prev, running: false, done: true }
        })
      }
    }
    tickRef.current = setInterval(tick, 500)
    return () => clearInterval(tickRef.current)
  }, [tab])

  // ── Pomodoro controls ──────────────────────────────────────────────────────

  function pomoStart() {
    setPomo((prev) => ({
      ...prev,
      running: true,
      startedAt: Date.now(),
    }))
  }

  function pomoPause() {
    setPomo((prev) => ({
      ...prev,
      running: false,
      elapsed: prev.elapsed + (Date.now() - prev.startedAt),
      startedAt: null,
    }))
  }

  function pomoReset() {
    setPomo((prev) => ({
      ...prev,
      running: false,
      elapsed: 0,
      startedAt: null,
    }))
  }

  function pomoEditDuration(phase) {
    setEditingPomoPhase(phase)
    setEditingDraft(String(pomo.durations[phase]))
  }

  function pomoCommitDuration() {
    const mins = Math.max(1, Math.min(99, parseInt(editingDraft, 10) || pomo.durations[editingPomoPhase]))
    setPomo((prev) => ({
      ...prev,
      running: false,
      elapsed: 0,
      startedAt: null,
      durations: { ...prev.durations, [editingPomoPhase]: mins },
    }))
    setEditingPomoPhase(null)
  }

  // ── Countdown controls ────────────────────────────────────────────────────

  function cdStart() {
    if (cd.done) {
      // Reset then start
      setCd((prev) => ({
        ...prev,
        done: false,
        elapsed: 0,
        startedAt: Date.now(),
        running: true,
      }))
    } else {
      setCd((prev) => ({
        ...prev,
        running: true,
        startedAt: Date.now(),
      }))
    }
  }

  function cdPause() {
    setCd((prev) => ({
      ...prev,
      running: false,
      elapsed: prev.elapsed + (Date.now() - prev.startedAt),
      startedAt: null,
    }))
  }

  function cdReset() {
    setCd((prev) => ({
      ...prev,
      running: false,
      elapsed: 0,
      startedAt: null,
      done: false,
    }))
  }

  function cdEditDuration() {
    setEditingCd(true)
    setEditingCdDraft(fmtMSS(cd.totalMs))
  }

  function cdCommitDuration() {
    const ms = parseMMSS(editingCdDraft)
    const clamped = Math.max(1000, Math.min(99 * 60 * 60_000, ms))
    setCd((prev) => ({
      ...prev,
      totalMs: clamped,
      elapsed: 0,
      running: false,
      startedAt: null,
      done: false,
    }))
    setEditingCd(false)
  }

  // ── Re-render every 500ms when running ────────────────────────────────────
  const [, forceRender] = useState(0)
  useEffect(() => {
    const isRunning = tab === 'pomodoro' ? pomo.running : cd.running
    if (!isRunning) return
    const id = setInterval(() => forceRender((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [tab, pomo.running, cd.running])

  // ── Render helpers ─────────────────────────────────────────────────────────

  function renderPomodoro() {
    const remaining = pomoRemainingMs(pomo)
    const phaseLabel = pomo.phase === 'focus' ? 'Focus' : pomo.phase === 'short' ? 'Short Break' : 'Long Break'
    const d = pomo.durations

    return (
      <div className="timer-body">
        <div className="timer-phase-label">{phaseLabel}</div>

        <div className="timer-countdown">{fmtMSS(remaining)}</div>

        <div className="timer-session">Session {pomo.session} of 4</div>

        <div className="timer-controls">
          {pomo.running ? (
            <button className="timer-btn" onClick={pomoPause}>Pause</button>
          ) : (
            <button className="timer-btn timer-btn-primary" onClick={pomoStart}>Start</button>
          )}
          <button className="timer-btn" onClick={pomoReset}>Reset</button>
        </div>

        <div className="timer-durations">
          {(['focus', 'short', 'long'] ).map((phase) => (
            <div key={phase} className="timer-dur-item">
              <span className="timer-dur-label">
                {phase === 'focus' ? 'Focus' : phase === 'short' ? 'Short' : 'Long'}
              </span>
              {editingPomoPhase === phase ? (
                <input
                  className="timer-dur-input"
                  value={editingDraft}
                  onChange={(e) => setEditingDraft(e.target.value)}
                  onBlur={pomoCommitDuration}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') pomoCommitDuration()
                    if (e.key === 'Escape') setEditingPomoPhase(null)
                  }}
                  autoFocus
                  maxLength={3}
                />
              ) : (
                <button
                  className="timer-dur-val"
                  onClick={() => pomoEditDuration(phase)}
                  title="Click to edit"
                >
                  {d[phase]}m
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderCountdown() {
    const remaining = countdownRemainingMs(cd)

    return (
      <div className="timer-body">
        <div className="timer-phase-label">{cd.label || 'Countdown'}</div>

        {editingCd ? (
          <input
            className="timer-countdown timer-countdown-input"
            value={editingCdDraft}
            onChange={(e) => setEditingCdDraft(e.target.value)}
            onBlur={cdCommitDuration}
            onKeyDown={(e) => {
              if (e.key === 'Enter') cdCommitDuration()
              if (e.key === 'Escape') setEditingCd(false)
            }}
            autoFocus
            placeholder="MM:SS"
          />
        ) : (
          <button
            className="timer-countdown timer-countdown-btn"
            onClick={!cd.running ? cdEditDuration : undefined}
            title={!cd.running ? 'Click to set duration' : undefined}
            style={{ cursor: cd.running ? 'default' : 'pointer' }}
          >
            {fmtMSS(remaining)}
          </button>
        )}

        {cd.done && <div className="timer-done-label">Done!</div>}

        <div className="timer-label-row">
          <input
            className="timer-label-input"
            placeholder="Label (optional)"
            value={cd.label}
            onChange={(e) => setCd((prev) => ({ ...prev, label: e.target.value }))}
            maxLength={30}
          />
        </div>

        <div className="timer-controls">
          {cd.running ? (
            <button className="timer-btn" onClick={cdPause}>Pause</button>
          ) : (
            <button className="timer-btn timer-btn-primary" onClick={cdStart}>
              {cd.done ? 'Restart' : 'Start'}
            </button>
          )}
          <button className="timer-btn" onClick={cdReset}>Reset</button>
        </div>
      </div>
    )
  }

  return (
    <div className="timer-widget">
      <div className="timer-tabs">
        <button
          className={`timer-tab ${tab === 'pomodoro' ? 'active' : ''}`}
          onClick={() => setTab('pomodoro')}
        >
          Pomodoro
        </button>
        <button
          className={`timer-tab ${tab === 'countdown' ? 'active' : ''}`}
          onClick={() => setTab('countdown')}
        >
          Countdown
        </button>
      </div>

      {tab === 'pomodoro' ? renderPomodoro() : renderCountdown()}
    </div>
  )
}
