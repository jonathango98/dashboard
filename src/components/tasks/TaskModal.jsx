import { useState, useEffect, useRef } from 'react'
import { IMPORTANCE_COLORS } from './TaskCard'

const EMPTY = {
  title: '',
  description: '',
  deadline: '',
  importance: 3,
  status: 'todo',
}

export default function TaskModal({ task, onSave, onDelete, onClose }) {
  const isNew = !task
  const [form, setForm] = useState(isNew ? EMPTY : {
    title: task.title,
    description: task.description || '',
    deadline: task.deadline,
    importance: task.importance,
    status: task.status,
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const titleRef = useRef(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [form])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    if (!form.title.trim() || !form.deadline) return
    onSave({ ...form, title: form.title.trim() })
    onClose()
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    onDelete(task.id)
    onClose()
  }

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div className="task-modal" onClick={e => e.stopPropagation()}>
        <div className="task-modal-header">
          <h3 className="task-modal-title">{isNew ? 'New task' : 'Edit task'}</h3>
          <div className="task-modal-header-actions">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button
              className="btn-accent"
              onClick={handleSave}
              disabled={!form.title.trim() || !form.deadline}
            >
              Save
            </button>
          </div>
        </div>

        <div className="task-modal-body">
          {/* Title */}
          <div className="task-field">
            <label className="task-field-label">Title *</label>
            <input
              ref={titleRef}
              className="task-field-input"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="What needs to be done?"
              maxLength={120}
            />
          </div>

          {/* Description */}
          <div className="task-field">
            <label className="task-field-label">Description</label>
            <textarea
              className="task-field-input task-field-textarea"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Optional notes…"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Deadline */}
          <div className="task-field">
            <label className="task-field-label">Deadline *</label>
            <input
              className="task-field-input"
              type="date"
              value={form.deadline}
              onChange={e => set('deadline', e.target.value)}
            />
          </div>

          {/* Importance */}
          <div className="task-field">
            <label className="task-field-label">Importance</label>
            <div className="task-importance-control">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  className={`task-importance-btn${form.importance === n ? ' active' : ''}`}
                  style={form.importance === n ? { background: IMPORTANCE_COLORS[n], borderColor: IMPORTANCE_COLORS[n] } : {}}
                  onClick={() => set('importance', n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="task-field">
            <label className="task-field-label">Status</label>
            <select
              className="task-field-input"
              value={form.status}
              onChange={e => set('status', e.target.value)}
            >
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        {!isNew && (
          <div className="task-modal-footer">
            <button
              className={`task-delete-btn${confirmDelete ? ' task-delete-btn--confirm' : ''}`}
              onClick={handleDelete}
            >
              {confirmDelete ? 'Confirm delete' : 'Delete task'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
