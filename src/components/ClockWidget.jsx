import { useState, useEffect } from 'react'
import { format } from 'date-fns'

export default function ClockWidget() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeStr = format(now, 'HH:mm:ss')
  const dateStr = format(now, 'EEEE, MMMM d')

  return (
    <div className="clock-widget">
      <div className="clock-time">{timeStr}</div>
      <div className="clock-date">{dateStr}</div>
    </div>
  )
}
