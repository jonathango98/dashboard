import { useState } from 'react'
import { urgencyScore, daysLeft, hoursLeft } from '../../utils/urgency'
import { IMPORTANCE_COLORS } from './TaskCard'

const STATUS_LABELS = {
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
}

function urgencyInfo(task) {
  const h = hoursLeft(task)
  if (h < 0) return { text: `${Math.abs(Math.ceil(h / 24))}d overdue`, color: '#ef4444' }
  if (h < 24) return { text: `${h}h left`, color: '#f97316' }
  const d = daysLeft(task)
  if (d <= 2) return { text: `${d}d left`, color: '#f97316' }
  if (d <= 7) return { text: `${d}d left`, color: '#fbbf24' }
  return { text: `${d}d left`, color: 'var(--text-secondary)' }
}

const SORT_OPTIONS = [
  { value: 'urgency', label: 'Urgency' },
  { value: 'importance', label: 'Importance' },
  { value: 'deadline', label: 'Deadline' },
]

function sortTasks(tasks, by) {
  return [...tasks].sort((a, b) => {
    if (by === 'importance') return b.importance - a.importance
    if (by === 'deadline') return new Date(a.deadline) - new Date(b.deadline)
    return urgencyScore(b) - urgencyScore(a) // default: urgency
  })
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
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="task-list-empty">No tasks yet — add one above</div>
      ) : (
        <div className="task-list-rows">
          {sorted.map(task => {
            const urg = urgencyInfo(task)
            return (
              <div
                key={task.id}
                className="task-list-row"
                style={{ '--importance-color': IMPORTANCE_COLORS[task.importance] }}
                onClick={() => onOpen(task)}
              >
                <span className="task-importance-badge" style={{ background: IMPORTANCE_COLORS[task.importance] }}>
                  !{task.importance}
                </span>
                <span className="task-list-title">{task.title}</span>
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
