import { useState, useEffect } from 'react'
import { GridLayout, useContainerWidth } from 'react-grid-layout'
import { getWidgetComponent, WIDGET_LABELS } from '../widgetRegistry'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const COLS = 12
const ROWS = 5
const MARGIN = [12, 12]
const TOPBAR_HEIGHT = 60

function computeRowHeight(availableHeight) {
  // fill exactly ROWS rows: availableHeight = ROWS * rh + (ROWS - 1) * marginV
  return Math.max(40, Math.floor((availableHeight - MARGIN[1] * (ROWS - 1)) / ROWS))
}

function GridBackground({ rowHeight, width }) {
  if (!width || !rowHeight) return null
  const cellW = (width - MARGIN[0] * (COLS - 1)) / COLS
  const cellH = rowHeight
  const arm = Math.min(12, cellW * 0.15, cellH * 0.15) // corner arm length
  const r = 6 // corner radius inset

  function corners(x, y, w, h) {
    return [
      // top-left
      `M${x + r},${y} L${x + arm},${y} M${x},${y + r} L${x},${y + arm}`,
      // top-right
      `M${x + w - arm},${y} L${x + w - r},${y} M${x + w},${y + r} L${x + w},${y + arm}`,
      // bottom-left
      `M${x},${y + h - arm} L${x},${y + h - r} M${x + r},${y + h} L${x + arm},${y + h}`,
      // bottom-right
      `M${x + w - arm},${y + h} L${x + w - r},${y + h} M${x + w},${y + h - arm} L${x + w},${y + h - r}`,
    ].join(' ')
  }

  return (
    <svg
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      width={width}
      height={rowHeight * ROWS + MARGIN[1] * (ROWS - 1)}
    >
      {Array.from({ length: ROWS }, (_, row) =>
        Array.from({ length: COLS }, (_, col) => {
          const x = col * (cellW + MARGIN[0])
          const y = row * (cellH + MARGIN[1])
          return (
            <path
              key={`${row}-${col}`}
              d={corners(x, y, cellW, cellH)}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={0.7}
            />
          )
        })
      )}
    </svg>
  )
}

function PlaceholderWidget({ instance, isEditMode, onRemove }) {
  const label = WIDGET_LABELS[instance.type] || instance.type
  return (
    <div className="widget-card placeholder-widget">
      {isEditMode && (
        <button
          className="widget-remove-btn"
          onClick={() => onRemove(instance.instanceId)}
          aria-label="Remove widget"
        >
          ✕
        </button>
      )}
      <span className="placeholder-label">{label}</span>
      <span className="placeholder-size">{instance.w}×{instance.h}</span>
    </div>
  )
}

function WidgetWrapper({ instance, isEditMode, onRemove }) {
  const Component = getWidgetComponent(instance.type)
  if (!Component) {
    return <PlaceholderWidget instance={instance} isEditMode={isEditMode} onRemove={onRemove} />
  }
  return (
    <div className="widget-card">
      {isEditMode && (
        <button
          className="widget-remove-btn"
          onClick={() => onRemove(instance.instanceId)}
          aria-label="Remove widget"
        >
          ✕
        </button>
      )}
      <Component instanceId={instance.instanceId} />
    </div>
  )
}

export default function WidgetCanvas({ layout, isEditMode, onLayoutChange, onRemove }) {
  const { containerRef, width } = useContainerWidth({ initialWidth: 1280 })
  const [rowHeight, setRowHeight] = useState(100)

  useEffect(() => {
    function recompute() {
      setRowHeight(computeRowHeight(window.innerHeight - TOPBAR_HEIGHT))
    }
    recompute()
    window.addEventListener('resize', recompute)
    return () => window.removeEventListener('resize', recompute)
  }, [])

  const rglLayout = layout.map((item) => ({
    i: item.instanceId,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    isResizable: false,
    isDraggable: isEditMode,
    maxY: ROWS - item.h,
  }))

  return (
    <div className="widget-canvas" ref={containerRef} style={{ position: 'relative' }}>
      {isEditMode && <GridBackground rowHeight={rowHeight} width={width} />}

      <GridLayout
        layout={rglLayout}
        cols={COLS}
        rowHeight={rowHeight}
        width={width}
        margin={MARGIN}
        containerPadding={[0, 0]}
        maxRows={ROWS}
        isDraggable={isEditMode}
        isResizable={false}
        compactType={null}
        preventCollision={true}
        onLayoutChange={onLayoutChange}
        draggableHandle=".widget-drag-handle"
        draggableCancel=".react-grid-layout-cancel"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {layout.map((instance) => (
          <div key={instance.instanceId}>
            {isEditMode && <div className="widget-drag-handle" />}
            <WidgetWrapper
              instance={instance}
              isEditMode={isEditMode}
              onRemove={onRemove}
            />
          </div>
        ))}
      </GridLayout>

      {layout.length === 0 && !isEditMode && (
        <div className="empty-canvas-prompt">
          <p>Your dashboard is empty.</p>
          <p>Click <strong>Edit Layout</strong> to add widgets.</p>
        </div>
      )}
    </div>
  )
}
