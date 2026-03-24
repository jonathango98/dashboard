import { useState, useEffect } from 'react'
import { format } from 'date-fns'

export default function ClockWidget() {
  const [now, setNow] = useState(() => new Date())
  const [colonVisible, setColonVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date())
      setColonVisible((v) => !v)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const hours = format(now, 'h')
  const minutes = format(now, 'mm')
  const ampm = format(now, 'a')

  return (
    <div className="clock-widget">
      <div className="clock-time">
        <span className="clock-hm">{hours}</span>
        <span className={`clock-colon${colonVisible ? '' : ' clock-colon--hidden'}`}>:</span>
        <span className="clock-hm">{minutes}</span>
        <span className="clock-ampm">{ampm}</span>
      </div>
    </div>
  )
}
