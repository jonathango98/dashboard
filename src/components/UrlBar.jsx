import { useState, useEffect, useRef } from 'react'

export default function UrlBar() {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    // Small delay to ensure the page is ready before focusing
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [])

  function navigate(raw) {
    const trimmed = raw.trim()
    if (!trimmed) return
    // If it looks like a URL (has a dot and no spaces), navigate directly
    const looksLikeUrl = /^https?:\/\//.test(trimmed) || (/\./.test(trimmed) && !/\s/.test(trimmed))
    const url = looksLikeUrl && !/^https?:\/\//.test(trimmed) ? `https://${trimmed}` : trimmed
    if (looksLikeUrl) {
      window.location.href = url
    } else {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') navigate(value)
  }

  return (
    <div className="urlbar-wrapper">
      <input
        ref={inputRef}
        className="urlbar-input"
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search or enter address"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  )
}
