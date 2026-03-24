import { useDraggable } from '@dnd-kit/core'
import { daysLeft, hoursLeft } from '../../utils/urgency'

export const IMPORTANCE_COLORS = {
  1: '#94a3b8',
  2: '#60a5fa',
  3: '#fbbf24',
  4: '#fb923c',
  5: 'var(--accent)',
}

function urgencyInfo(task) {
  const h = hoursLeft(task)
  if (h < 0) return { text: `${Math.abs(Math.ceil(h / 24))}d overdue`, color: '#ef4444', pulse: true }
  if (h < 24) return { text: `${Math.round(h)}h left`, color: '#ef4444', pulse: false }
  const d = daysLeft(task)
  if (d <= 2) return { text: `${d}d left`, color: '#f97316', pulse: false }
  if (d <= 5) return { text: `${d}d left`, color: '#f59e0b', pulse: false }
  return { text: `${d}d left`, color: 'var(--text-secondary)', pulse: false }
}

function ImportancePips({ level }) {
  return (
    <div className="task-importance-pips">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`task-pip${i <= level ? ' task-pip--filled' : ''}`}
        />
      ))}
    </div>
  )
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

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      className={`task-card${isDragging ? ' task-card--dragging' : ''}${overlay ? ' task-card--overlay' : ''}`}
      style={overlay ? undefined : style}
      onClick={!isDragging ? onClick : undefined}
      {...(overlay ? {} : listeners)}
      {...(overlay ? {} : attributes)}
    >
      <div className="task-card-title">{task.title}</div>
      {task.description && (
        <div className="task-card-desc">{task.description}</div>
      )}
      <div className="task-card-footer">
        <span
          className={`task-urgency-dot${urg.pulse ? ' task-urgency-dot--pulse' : ''}`}
          style={{ color: urg.color }}
        >
          ● {urg.text}
        </span>
        <ImportancePips level={task.importance} />
      </div>
    </div>
  )
}
