import { getTabOpenCount } from '../utils/tabOpens'

const MIN_DIGITS = 6

export default function OdometerWidget() {
  // Incremented once per page load in main.jsx (extension iframe only),
  // so the value is stable for the lifetime of this tab.
  const count = getTabOpenCount()
  const str = String(count)
  const digits = str.padStart(Math.max(MIN_DIGITS, str.length), '0').split('')
  const firstSignificant = digits.length - str.length

  return (
    <div className="odometer-widget" title="Counts tabs opened through the extension">
      <div className="odometer-digits">
        {digits.map((d, i) => (
          <span
            key={i}
            className={`odometer-digit${i < firstSignificant && count > 0 ? ' odometer-digit--dim' : i < digits.length - 1 && count === 0 ? ' odometer-digit--dim' : ''}`}
          >
            {d}
          </span>
        ))}
      </div>
      <p className="odometer-label">new tabs opened</p>
    </div>
  )
}
