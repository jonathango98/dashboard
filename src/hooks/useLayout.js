import { useState, useCallback } from 'react'
import storage from '../storage'
import { WIDGET_SIZES } from '../widgetRegistry'

const STORAGE_KEY = 'dashboard-layout'

// Default layout (12×5 grid):
//
//  Row 0   (h=1): Greeting(2) | Clock(2) | Weather(2) | Drive(2) | [4 free]
//  Row 1-2 (h=2): Bible(4) | Sticky(2) | [6 free]
//  Row 3-4 (h=2): Task Board (12)
//
const DEFAULT_LAYOUT = [
  { instanceId: 'greeting-1', type: 'greeting', x: 0, y: 0, ...WIDGET_SIZES.greeting },
  { instanceId: 'clock-1',    type: 'clock',    x: 2, y: 0, ...WIDGET_SIZES.clock    },
  { instanceId: 'weather-1',  type: 'weather',  x: 4, y: 0, ...WIDGET_SIZES.weather  },
  { instanceId: 'drive-1',    type: 'drive',    x: 6, y: 0, ...WIDGET_SIZES.drive    },
  { instanceId: 'bible-1',    type: 'bible',    x: 0, y: 1, ...WIDGET_SIZES.bible    },
  { instanceId: 'sticky-1',   type: 'sticky',   x: 4, y: 1, ...WIDGET_SIZES.sticky   },
  { instanceId: 'tasks-1',    type: 'tasks',    x: 0, y: 3, ...WIDGET_SIZES.tasks    },
]

function loadLayout() {
  const saved = storage.get(STORAGE_KEY)
  if (!saved) return DEFAULT_LAYOUT
  // Re-apply current WIDGET_SIZES so stale saved layouts stay correct
  return saved.map((item) => ({
    ...item,
    ...(WIDGET_SIZES[item.type] || {}),
  }))
}

let instanceCounters = {}

function nextInstanceId(type) {
  instanceCounters[type] = (instanceCounters[type] || 0) + 1
  return `${type}-${instanceCounters[type]}`
}

const GRID_ROWS = 5

function findFirstFreeSlot(layout, w, h) {
  for (let y = 0; y <= GRID_ROWS - h; y++) {
    for (let x = 0; x <= 12 - w; x++) {
      const overlaps = layout.some((item) =>
        x < item.x + item.w &&
        x + w > item.x &&
        y < item.y + item.h &&
        y + h > item.y
      )
      if (!overlaps) return { x, y }
    }
  }
  return null // no free slot
}

export function useLayout() {
  const [layout, setLayout] = useState(loadLayout)
  const [savedLayout, setSavedLayout] = useState(loadLayout)

  const saveLayout = useCallback((items) => {
    storage.set(STORAGE_KEY, items)
    setSavedLayout(items)
  }, [])

  const addWidget = useCallback((type) => {
    setLayout((prev) => {
      const { w, h } = WIDGET_SIZES[type]
      const slot = findFirstFreeSlot(prev, w, h)
      if (!slot) return prev // grid full, don't add
      const instanceId = nextInstanceId(type)
      return [...prev, { instanceId, type, x: slot.x, y: slot.y, w, h }]
    })
  }, [])

  const removeWidget = useCallback((instanceId) => {
    setLayout((prev) => prev.filter((item) => item.instanceId !== instanceId))
  }, [])

  // Called by react-grid-layout on drag/drop
  const onLayoutChange = useCallback((rglLayout) => {
    setLayout((prev) =>
      prev.map((item) => {
        const updated = rglLayout.find((r) => r.i === item.instanceId)
        if (!updated) return item
        // Keep w/h fixed per spec; only update x/y
        return { ...item, x: updated.x, y: updated.y }
      })
    )
  }, [])

  const commitLayout = useCallback(() => {
    setLayout((current) => {
      saveLayout(current)
      return current
    })
  }, [saveLayout])

  const discardLayout = useCallback(() => {
    setLayout(savedLayout)
  }, [savedLayout])

  return {
    layout,
    addWidget,
    removeWidget,
    onLayoutChange,
    commitLayout,
    discardLayout,
  }
}
