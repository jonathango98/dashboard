import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useTasks } from '../../hooks/useTasks'
import { urgencyScore } from '../../utils/urgency'
import TaskCard from './TaskCard'
import TaskList from './TaskList'
import TaskModal from './TaskModal'

const COLUMNS = [
  { id: 'todo',        label: 'Todo' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done',        label: 'Done' },
]

function Column({ id, label, tasks, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`task-column${isOver ? ' task-column--over' : ''}`}
    >
      <div className="task-column-header">
        <span className="task-column-label">{label}</span>
        <span className="task-column-count">{tasks.length}</span>
      </div>
      <div className="task-column-cards">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onClick={() => onOpen(task)} />
        ))}
        {tasks.length === 0 && (
          <div className="task-column-empty">Drop here</div>
        )}
      </div>
    </div>
  )
}

export default function TaskBoardWidget() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks()
  const [view, setView] = useState('board') // 'board' | 'list'
  const [modal, setModal] = useState(null)  // null | 'new' | task object
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  function columnTasks(status) {
    return tasks
      .filter(t => t.status === status)
      .sort((a, b) => urgencyScore(b) - urgencyScore(a))
  }

  function handleDragStart({ active }) {
    setActiveId(active.id)
  }

  function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over) return
    const task = tasks.find(t => t.id === active.id)
    if (task && task.status !== over.id) {
      updateTask(task.id, { status: over.id })
    }
  }

  function handleSave(fields) {
    if (modal === 'new') {
      addTask(fields)
    } else {
      updateTask(modal.id, fields)
    }
  }

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  return (
    <div className="task-board-widget">
      {/* Header */}
      <div className="task-board-header">
        <div className="task-view-pills">
          <button
            className={`task-view-pill${view === 'board' ? ' active' : ''}`}
            onClick={() => setView('board')}
          >
            Board
          </button>
          <button
            className={`task-view-pill${view === 'list' ? ' active' : ''}`}
            onClick={() => setView('list')}
          >
            List
          </button>
        </div>
        <button className="task-add-btn" onClick={() => setModal('new')}>
          + Add task
        </button>
      </div>

      {/* Body */}
      <div className="task-board-body">
        {view === 'board' ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="task-board-columns">
              {COLUMNS.map(col => (
                <Column
                  key={col.id}
                  id={col.id}
                  label={col.label}
                  tasks={columnTasks(col.id)}
                  onOpen={setModal}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask && (
                <TaskCard task={activeTask} overlay />
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <TaskList tasks={tasks} onOpen={setModal} />
        )}
      </div>

      {/* Modal */}
      {modal && (
        <TaskModal
          task={modal === 'new' ? null : modal}
          onSave={handleSave}
          onDelete={deleteTask}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
