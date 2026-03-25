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
    phase: 'focus',
    session: 1,
    running: false,
    startedAt: null,
    elapsed: 0,
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
    return { ...pomo, phase: isLast ? 'long' : 'short', elapsed: 0, startedAt: Date.now(), running: true }
  } else {
    const nextSession = pomo.phase === 'long' ? 1 : (pomo.session % 4) + 1
    return { ...pomo, phase: 'focus', session: nextSession, elapsed: 0, startedAt: Date.now(), running: true }
  }
}

// ── Countdown ─────────────────────────────────────────────────────────────────

function makeCountdown(overrides = {}) {
  return {
    totalMs: 5 * 60_000,
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

// ── Progress Ring ─────────────────────────────────────────────────────────────

function ProgressRing({ progress, children, size = 110 }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)))

  return (
    <div className="timer-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="timer-ring-svg">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={4}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="timer-ring-inner">{children}</div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TimerWidget({ instanceId }) {
  const storeKey = `timer-${instanceId}`
  const savedState = storage.get(storeKey) || {}

  const [tab, setTab] = useState(savedState.tab || 'pomodoro')
  const [pomo, setPomo] = useState(() => makePomo(savedState.pomo || {}))
  const [cd, setCd] = useState(() => makeCountdown(savedState.cd || {}))

  const [editingPomoPhase, setEditingPomoPhase] = useState(null)
  const [editingDraft, setEditingDraft] = useState('')
  const [editingCd, setEditingCd] = useState(false)
  const [editingCdDraft, setEditingCdDraft] = useState('')

  const tickRef = useRef(null)

  useEffect(() => {
    storage.set(storeKey, { tab, pomo, cd })
  }, [tab, pomo, cd])

  useEffect(() => {
    requestNotifPermission()
  }, [])

  useEffect(() => {
    function tick() {
      if (tab === 'pomodoro') {
        setPomo((prev) => {
          if (!prev.running) return prev
          const remaining = pomoRemainingMs(prev)
          if (remaining > 0) return prev
          if (prev.phase === 'focus') sendNotif('Focus session complete!', 'Time for a break.')
          else sendNotif('Break over!', 'Time to focus.')
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
    setPomo((prev) => ({ ...prev, running: true, startedAt: Date.now() }))
  }

  function pomoPause() {
    setPomo((prev) => ({
      ...prev, running: false,
      elapsed: prev.elapsed + (Date.now() - prev.startedAt),
      startedAt: null,
    }))
  }

  function pomoReset() {
    setPomo((prev) => ({ ...prev, running: false, elapsed: 0, startedAt: null }))
  }

  function pomoEditDuration(phase) {
    setEditingPomoPhase(phase)
    setEditingDraft(String(pomo.durations[phase]))
  }

  function pomoCommitDuration() {
    const mins = Math.max(1, Math.min(99, parseInt(editingDraft, 10) || pomo.durations[editingPomoPhase]))
    setPomo((prev) => ({
      ...prev, running: false, elapsed: 0, startedAt: null,
      durations: { ...prev.durations, [editingPomoPhase]: mins },
    }))
    setEditingPomoPhase(null)
  }

  // ── Countdown controls ────────────────────────────────────────────────────

  function cdStart() {
    if (cd.done) {
      setCd((prev) => ({ ...prev, done: false, elapsed: 0, startedAt: Date.now(), running: true }))
    } else {
      setCd((prev) => ({ ...prev, running: true, startedAt: Date.now() }))
    }
  }

  function cdPause() {
    setCd((prev) => ({
      ...prev, running: false,
      elapsed: prev.elapsed + (Date.now() - prev.startedAt),
      startedAt: null,
    }))
  }

  function cdReset() {
    setCd((prev) => ({ ...prev, running: false, elapsed: 0, startedAt: null, done: false }))
  }

  function cdEditDuration() {
    setEditingCd(true)
    setEditingCdDraft(fmtMSS(cd.totalMs))
  }

  function cdCommitDuration() {
    const ms = parseMMSS(editingCdDraft)
    const clamped = Math.max(1000, Math.min(99 * 60 * 60_000, ms))
    setCd((prev) => ({ ...prev, totalMs: clamped, elapsed: 0, running: false, startedAt: null, done: false }))
    setEditingCd(false)
  }

  const [, forceRender] = useState(0)
  useEffect(() => {
    const isRunning = tab === 'pomodoro' ? pomo.running : cd.running
    if (!isRunning) return
    const id = setInterval(() => forceRender((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [tab, pomo.running, cd.running])

  // ── Render ─────────────────────────────────────────────────────────────────

  const isPomodoro = tab === 'pomodoro'
  const remaining = isPomodoro ? pomoRemainingMs(pomo) : countdownRemainingMs(cd)
  const total = isPomodoro ? pomoPhaseMs(pomo) : cd.totalMs
  const progress = total > 0 ? (total - remaining) / total : 0
  const isRunning = isPomodoro ? pomo.running : cd.running
  const phaseLabel = isPomodoro
    ? (pomo.phase === 'focus' ? 'Focus' : pomo.phase === 'short' ? 'Short' : 'Long')
    : (cd.label || 'Countdown')

  return (
    <div className="timer-widget">
      {/* Mode tabs */}
      <div className="timer-tabs">
        <button
          className={`timer-tab${tab === 'pomodoro' ? ' active' : ''}`}
          onClick={() => setTab('pomodoro')}
        >
          Pomodoro
        </button>
        <button
          className={`timer-tab${tab === 'countdown' ? ' active' : ''}`}
          onClick={() => setTab('countdown')}
        >
          Countdown
        </button>
      </div>

      {/* Horizontal body: ring left, controls right */}
      <div className="timer-body">
        {/* Progress ring */}
        <ProgressRing progress={progress}>
          {editingCd && !isPomodoro ? (
            <input
              className="timer-ring-input"
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
              className="timer-ring-time"
              onClick={!isPomodoro && !isRunning ? cdEditDuration : undefined}
              style={{ cursor: !isPomodoro && !isRunning ? 'pointer' : 'default' }}
              title={!isPomodoro && !isRunning ? 'Click to set duration' : undefined}
            >
              {fmtMSS(remaining)}
            </button>
          )}
        </ProgressRing>

        {/* Right side: info + controls */}
        <div className="timer-info">
          <div className="timer-phase-label">{phaseLabel}</div>
          {isPomodoro && (
            <div className="timer-session">
              Session {pomo.session} of 4
            </div>
          )}
          {isPomodoro && (
            <div className="timer-dur-row">
              {(['focus', 'short', 'long']).map((phase) => (
                <div key={phase} className="timer-dur-item">
                  <span className="timer-dur-label">
                    {phase === 'focus' ? 'F' : phase === 'short' ? 'S' : 'L'}
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
                    <button className="timer-dur-val" onClick={() => pomoEditDuration(phase)} title="Click to edit">
                      {pomo.durations[phase]}m
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!isPomodoro && (
            <div className="timer-label-row">
              <input
                className="timer-label-input"
                placeholder="Label"
                value={cd.label}
                onChange={(e) => setCd((prev) => ({ ...prev, label: e.target.value }))}
                maxLength={30}
              />
            </div>
          )}
          {!isPomodoro && cd.done && (
            <div className="timer-done-label">Done!</div>
          )}
          <div className="timer-controls">
            {isRunning ? (
              <button className="timer-btn" onClick={isPomodoro ? pomoPause : cdPause}>Pause</button>
            ) : (
              <button className="timer-btn timer-btn-primary" onClick={isPomodoro ? pomoStart : cdStart}>
                {!isPomodoro && cd.done ? 'Restart' : '▶ Start'}
              </button>
            )}
            <button className="timer-btn" onClick={isPomodoro ? pomoReset : cdReset} title="Reset">↺</button>
          </div>
        </div>
      </div>
    </div>
  )
}
