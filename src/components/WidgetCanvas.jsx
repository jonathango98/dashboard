import { useState, useEffect } from 'react'
import { Responsive, useContainerWidth } from 'react-grid-layout'
import { getWidgetComponent, WIDGET_LABELS } from '../widgetRegistry'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const BREAKPOINTS = { lg: 1280, md: 1024, sm: 768 }
const COLS_MAP    = { lg: 12,   md: 8,    sm: 4   }
const ROWS = 6
const MARGIN = [16, 16]
const TOPBAR_HEIGHT = 60

function computeRowHeight(availableHeight) {
  // fill exactly ROWS rows: availableHeight = ROWS * rh + (ROWS - 1) * marginV
  return Math.max(40, Math.floor((availableHeight - MARGIN[1] * (ROWS - 1)) / ROWS))
}

function getInitialBreakpoint() {
  const w = window.innerWidth
  if (w >= 1280) return 'lg'
  if (w >= 1024) return 'md'
  return 'sm'
}

function scaleLayout(lgItems, toCols) {
  const scale = toCols / 12
  return lgItems.map((item) => {
    const w = Math.max(1, Math.round(item.w * scale))
    const x = Math.min(toCols - w, Math.floor(item.x * scale))
    return { ...item, x, w }
  })
}

function GridBackground({ rowHeight, width, cols }) {
  if (!width || !rowHeight) return null
  const cellW = (width - MARGIN[0] * (cols - 1)) / cols
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
        Array.from({ length: cols }, (_, col) => {
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

function WidgetWrapper({ instance, isEditMode }) {
  const Component = getWidgetComponent(instance.type)
  const label = WIDGET_LABELS[instance.type] || instance.type
  if (!Component) {
    return (
      <div className="widget-card placeholder-widget">
        {isEditMode && <div className="widget-edit-overlay" />}
        <span className="placeholder-label">{label}</span>
        <span className="placeholder-size">{instance.w}×{instance.h}</span>
      </div>
    )
  }
  return (
    <div className="widget-card">
      {isEditMode && <div className="widget-edit-overlay" />}
      <Component instanceId={instance.instanceId} />
    </div>
  )
}

export default function WidgetCanvas({ layout, isEditMode, onLayoutChange, onRemove }) {
  const { containerRef, width } = useContainerWidth({ initialWidth: 1280 })
  const [rowHeight, setRowHeight] = useState(100)
  const [currentBreakpoint, setCurrentBreakpoint] = useState(getInitialBreakpoint)

  useEffect(() => {
    function recompute() {
      setRowHeight(computeRowHeight(window.innerHeight - TOPBAR_HEIGHT))
    }
    recompute()
    window.addEventListener('resize', recompute)
    return () => window.removeEventListener('resize', recompute)
  }, [])

  const lgItems = layout.map((item) => ({
    i: item.instanceId,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    isResizable: false,
    maxY: ROWS - item.h,
    static: !isEditMode,
  }))

  const layouts = {
    lg: lgItems,
    md: scaleLayout(lgItems, 8),
    sm: scaleLayout(lgItems, 4),
  }

  function handleLayoutChange(currentLayout) {
    // Only propagate changes when the user is actively editing at the desktop
    // breakpoint. Without the isEditMode guard, react-grid-layout fires this
    // on every initial render / container-width measurement, scrambling the
    // saved layout every time a new tab opens.
    if (isEditMode && currentBreakpoint === 'lg') onLayoutChange(currentLayout)
  }

  const activeCols = COLS_MAP[currentBreakpoint] || 12

  return (
    <div className="widget-canvas" ref={containerRef} style={{ position: 'relative' }}>
      {isEditMode && <GridBackground rowHeight={rowHeight} width={width} cols={activeCols} />}

      <Responsive
        width={width}
        breakpoints={BREAKPOINTS}
        cols={COLS_MAP}
        layouts={layouts}
        rowHeight={rowHeight}
        margin={MARGIN}
        containerPadding={[0, 0]}
        maxRows={ROWS}
        isDraggable={isEditMode && currentBreakpoint === 'lg'}
        isResizable={false}
        compactType={null}
        preventCollision={true}
        onBreakpointChange={(bp) => setCurrentBreakpoint(bp)}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".widget-drag-handle"
        draggableCancel=".react-grid-layout-cancel"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {layout.map((instance) => (
          <div key={instance.instanceId}>
            {isEditMode && currentBreakpoint === 'lg' && <div className="widget-drag-handle" />}
            {isEditMode && (
              <button
                className="widget-remove-btn react-grid-layout-cancel"
                onClick={() => onRemove(instance.instanceId)}
                aria-label="Remove widget"
              >
                ✕
              </button>
            )}
            <WidgetWrapper instance={instance} isEditMode={isEditMode} />
          </div>
        ))}
      </Responsive>

      {layout.length === 0 && !isEditMode && (
        <div className="empty-canvas-prompt">
          <p>Your dashboard is empty.</p>
          <p>Click <strong>Edit Layout</strong> to add widgets.</p>
        </div>
      )}
    </div>
  )
}
