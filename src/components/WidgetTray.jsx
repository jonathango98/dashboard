import { WIDGET_TYPES, WIDGET_LABELS, WIDGET_SIZES } from '../widgetRegistry'

export default function WidgetTray({ onAdd }) {
  return (
    <div className="widget-tray">
      <div className="widget-tray-inner">
        <p className="widget-tray-heading">Add Widget</p>
        <div className="widget-tray-grid">
          {WIDGET_TYPES.map((type) => {
            const { w, h } = WIDGET_SIZES[type]
            return (
              <button
                key={type}
                className="widget-tray-item"
                onClick={() => onAdd(type)}
              >
                <span className="widget-tray-name">{WIDGET_LABELS[type]}</span>
                <span className="widget-tray-size">{w}×{h}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
