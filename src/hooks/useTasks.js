import { useState, useCallback } from 'react'
import storage from '../storage'

const STORAGE_KEY = 'dashboard-tasks'

function generateId() {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function useTasks() {
  const [tasks, setTasks] = useState(() => storage.get(STORAGE_KEY) || [])

  const save = useCallback((next) => {
    storage.set(STORAGE_KEY, next)
    setTasks(next)
  }, [])

  const addTask = useCallback((fields) => {
    save([...tasks, {
      id: generateId(),
      createdAt: new Date().toISOString(),
      status: 'todo',
      ...fields,
    }])
  }, [tasks, save])

  const updateTask = useCallback((id, fields) => {
    save(tasks.map(t => t.id === id ? { ...t, ...fields } : t))
  }, [tasks, save])

  const deleteTask = useCallback((id) => {
    save(tasks.filter(t => t.id !== id))
  }, [tasks, save])

  return { tasks, addTask, updateTask, deleteTask }
}
