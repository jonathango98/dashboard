import { useState, useEffect, useRef } from 'react'
import { GridLayout, noCompactor } from 'react-grid-layout'
import { getWidgetComponent, WIDGET_LABELS } from '../widgetRegistry'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const COLS = 12
const ROWS = 6
const MARGIN = [16, 16]

// Free-form positioning (no compaction), and dragging onto an occupied cell
// snaps back instead of pushing other widgets around.
const FIXED_COMPACTOR = { ...noCompactor, preventCollision: true }

// Measures the canvas's content box (padding excluded), so the grid always
// fits exactly inside the visible area regardless of topbar/canvas padding.
function useContentSize() {
  const ref = useRef(null)
  const [size, setSize] = useState(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return [ref, size]
}

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
      style={{ position: 'absolute', pointerEvents: 'none', zIndex: 0 }}
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

function WidgetWrapper({ instance }) {
  const Component = getWidgetComponent(instance.type)
  const label = WIDGET_LABELS[instance.type] || instance.type
  if (!Component) {
    return (
      <div className="widget-card placeholder-widget">
        <span className="placeholder-label">{label}</span>
        <span className="placeholder-size">{instance.w}×{instance.h}</span>
      </div>
    )
  }
  return (
    <div className="widget-card">
      <Component instanceId={instance.instanceId} />
    </div>
  )
}

export default function WidgetCanvas({ layout, isEditMode, onLayoutChange, onRemove }) {
  const [containerRef, size] = useContentSize()

  const rowHeight = size ? computeRowHeight(size.height) : null

  const items = layout.map((item) => ({
    i: item.instanceId,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    isResizable: false,
    static: !isEditMode,
  }))

  function handleLayoutChange(currentLayout) {
    // Only propagate changes when the user is actively editing. Without the
    // isEditMode guard, react-grid-layout fires this on every initial render /
    // container-width measurement, scrambling the saved layout every time a
    // new tab opens.
    if (isEditMode) onLayoutChange(currentLayout)
  }

  return (
    <div className="widget-canvas" ref={containerRef} style={{ position: 'relative' }}>
      {size && (
        <>
          {isEditMode && <GridBackground rowHeight={rowHeight} width={size.width} />}

          <GridLayout
            width={size.width}
            layout={items}
            gridConfig={{
              cols: COLS,
              rowHeight,
              margin: MARGIN,
              containerPadding: [0, 0],
              maxRows: ROWS,
            }}
            dragConfig={{
              enabled: isEditMode,
              handle: '.widget-drag-handle',
              cancel: '.react-grid-layout-cancel',
            }}
            resizeConfig={{ enabled: false }}
            compactor={FIXED_COMPACTOR}
            autoSize={false}
            onLayoutChange={handleLayoutChange}
            style={{ position: 'relative', zIndex: 1 }}
          >
            {layout.map((instance) => (
              <div key={instance.instanceId}>
                {isEditMode && <div className="widget-drag-handle" />}
                {isEditMode && (
                  <button
                    className="widget-remove-btn react-grid-layout-cancel"
                    onClick={() => onRemove(instance.instanceId)}
                    aria-label="Remove widget"
                  >
                    ✕
                  </button>
                )}
                <WidgetWrapper instance={instance} />
              </div>
            ))}
          </GridLayout>
        </>
      )}

      {layout.length === 0 && !isEditMode && (
        <div className="empty-canvas-prompt">
          <p>Your dashboard is empty.</p>
          <p>Click <strong>Edit Layout</strong> to add widgets.</p>
        </div>
      )}
    </div>
  )
}
