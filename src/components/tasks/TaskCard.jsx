import { useDraggable } from '@dnd-kit/core'
import { daysLeft, hoursLeft } from '../../utils/urgency'

export const IMPORTANCE_COLORS = {
  1: '#94a3b8',
  2: '#60a5fa',
  3: '#fbbf24',
  4: '#fb923c',
  5: 'var(--accent)',
}

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

export default function TaskCard({ task, onClick, overlay = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: overlay,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const urg = urgencyInfo(task)
  const borderColor = IMPORTANCE_COLORS[task.importance]

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      className={`task-card${isDragging ? ' task-card--dragging' : ''}${overlay ? ' task-card--overlay' : ''}`}
      style={{ ...(overlay ? undefined : style), '--importance-color': borderColor }}
      onClick={!isDragging ? onClick : undefined}
      {...(overlay ? {} : listeners)}
      {...(overlay ? {} : attributes)}
    >
      <div className="task-card-header">
        <span className="task-importance-badge" style={{ background: borderColor }}>
          !{task.importance}
        </span>
        <span className="task-card-title">{task.title}</span>
      </div>
      {task.description && (
        <div className="task-card-desc">{task.description}</div>
      )}
      <div className="task-card-footer">
        <span className="task-urgency-label" style={{ color: urg.color }}>
          ● {urg.text}
        </span>
        <span className={`task-status-pill task-status-pill--${task.status}`}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>
    </div>
  )
}
