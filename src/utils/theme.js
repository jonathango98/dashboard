const ACCENT_COLORS = {
  yellow: { color: '#F5C518', glow: 'rgba(245, 197, 24, 0.15)', glowDark: 'rgba(245, 197, 24, 0.08)' },
  blue:   { color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.15)',  glowDark: 'rgba(59, 130, 246, 0.08)' },
  green:  { color: '#22C55E', glow: 'rgba(34, 197, 94, 0.15)',   glowDark: 'rgba(34, 197, 94, 0.08)'  },
  pink:   { color: '#EC4899', glow: 'rgba(236, 72, 153, 0.15)',  glowDark: 'rgba(236, 72, 153, 0.08)' },
  coral:  { color: '#F97316', glow: 'rgba(249, 115, 22, 0.15)',  glowDark: 'rgba(249, 115, 22, 0.08)' },
}

export function applyTheme(mode) {
  const root = document.documentElement
  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    root.setAttribute('data-theme', mode)
  }
}

export function applyAccent(accent) {
  const c = ACCENT_COLORS[accent] || ACCENT_COLORS.yellow
  const style = document.getElementById('accent-style') || (() => {
    const el = document.createElement('style')
    el.id = 'accent-style'
    document.head.appendChild(el)
    return el
  })()
  style.textContent = `
    :root, :root[data-theme="light"] { --accent: ${c.color}; --accent-glow: ${c.glow}; }
    :root[data-theme="dark"] { --accent: ${c.color}; --accent-glow: ${c.glowDark}; }
  `
}

export const ACCENT_OPTIONS = [
  { key: 'yellow', label: 'Yellow', hex: '#F5C518' },
  { key: 'blue',   label: 'Blue',   hex: '#3B82F6' },
  { key: 'green',  label: 'Green',  hex: '#22C55E' },
  { key: 'pink',   label: 'Pink',   hex: '#EC4899' },
  { key: 'coral',  label: 'Coral',  hex: '#F97316' },
]
