import { useState } from 'react'
import { urgencyScore, daysLeft, hoursLeft } from '../../utils/urgency'

const STATUS_LABELS = {
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
}

function urgencyInfo(task) {
  const h = hoursLeft(task)
  if (h < 0) return { text: `${Math.abs(Math.ceil(h / 24))}d overdue`, color: '#ef4444' }
  if (h < 24) return { text: `${Math.round(h)}h left`, color: '#ef4444' }
  const d = daysLeft(task)
  if (d <= 2) return { text: `${d}d left`, color: '#f97316' }
  if (d <= 5) return { text: `${d}d left`, color: '#f59e0b' }
  return { text: `${d}d left`, color: 'var(--text-secondary)' }
}

const SORT_OPTIONS = [
  { value: 'urgency',    label: 'Urgency',    arrow: '↓' },
  { value: 'importance', label: 'Importance', arrow: '↓' },
  { value: 'deadline',   label: 'Deadline',   arrow: '↑' },
]

function sortTasks(tasks, by) {
  return [...tasks].sort((a, b) => {
    if (by === 'importance') return b.importance - a.importance
    if (by === 'deadline') return new Date(a.deadline) - new Date(b.deadline)
    return urgencyScore(b) - urgencyScore(a)
  })
}

function ImportancePips({ level }) {
  return (
    <div className="task-importance-pips">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`task-pip${i <= level ? ' task-pip--filled' : ''}`} />
      ))}
    </div>
  )
}

export default function TaskList({ tasks, onOpen }) {
  const [sortBy, setSortBy] = useState('urgency')
  const sorted = sortTasks(tasks, sortBy)

  return (
    <div className="task-list-view">
      <div className="task-list-toolbar">
        <span className="task-list-count">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
        <div className="task-sort-pills">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`task-sort-pill${sortBy === opt.value ? ' active' : ''}`}
              onClick={() => setSortBy(opt.value)}
            >
              {opt.label}{sortBy === opt.value ? ` ${opt.arrow}` : ''}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="task-list-empty">No tasks yet — add one above</div>
      ) : (
        <div className="task-list-rows">
          {sorted.map((task, idx) => {
            const urg = urgencyInfo(task)
            return (
              <div
                key={task.id}
                className={`task-list-row${idx % 2 === 1 ? ' task-list-row--alt' : ''}`}
                onClick={() => onOpen(task)}
              >
                <span className="task-list-title">{task.title}</span>
                <ImportancePips level={task.importance} />
                <span className="task-urgency-label" style={{ color: urg.color }}>{urg.text}</span>
                <span className={`task-status-pill task-status-pill--${task.status}`}>
                  {STATUS_LABELS[task.status]}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
