// Each theme pairs an accent with two companion hues. Together the trio
// forms the mesh gradient behind the page; the accent alone drives
// buttons, highlights, and --accent-glow.
const THEMES = {
  yellow: { accent: '#F5C518', mesh: ['#F5C518', '#FB923C', '#38BDF8'] },
  blue:   { accent: '#3B82F6', mesh: ['#3B82F6', '#22D3EE', '#818CF8'] },
  green:  { accent: '#22C55E', mesh: ['#22C55E', '#2DD4BF', '#A3E635'] },
  pink:   { accent: '#EC4899', mesh: ['#EC4899', '#C084FC', '#FDBA74'] },
  coral:  { accent: '#F97316', mesh: ['#F97316', '#F43F5E', '#FBBF24'] },
  purple: { accent: '#8B5CF6', mesh: ['#8B5CF6', '#D946EF', '#38BDF8'] },
  teal:   { accent: '#14B8A6', mesh: ['#14B8A6', '#06B6D4', '#34D399'] },
  red:    { accent: '#EF4444', mesh: ['#EF4444', '#FB923C', '#F43F5E'] },
  sky:    { accent: '#0EA5E9', mesh: ['#0EA5E9', '#22D3EE', '#818CF8'] },
  lime:   { accent: '#84CC16', mesh: ['#84CC16', '#4ADE80', '#FACC15'] },
  slate:  { accent: '#64748B', mesh: ['#64748B', '#94A3B8', '#A8B8D8'] },
}

function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// Four soft radial blobs anchored near the corners; alpha sets how far the
// wash reads against the page background (light needs more than dark).
function mesh([c1, c2, c3], alpha) {
  return [
    `radial-gradient(at 12% 15%, ${rgba(c1, alpha)} 0px, transparent 55%)`,
    `radial-gradient(at 88% 10%, ${rgba(c2, alpha)} 0px, transparent 55%)`,
    `radial-gradient(at 80% 90%, ${rgba(c3, alpha)} 0px, transparent 55%)`,
    `radial-gradient(at 15% 85%, ${rgba(c2, alpha * 0.7)} 0px, transparent 55%)`,
  ].join(', ')
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

export function applyAccent(themeKey) {
  const t = THEMES[themeKey] || THEMES.yellow
  const style = document.getElementById('accent-style') || (() => {
    const el = document.createElement('style')
    el.id = 'accent-style'
    document.head.appendChild(el)
    return el
  })()
  style.textContent = `
    :root, :root[data-theme="light"] {
      --accent: ${t.accent};
      --accent-glow: ${rgba(t.accent, 0.15)};
      --mesh: ${mesh(t.mesh, 0.33)};
    }
    :root[data-theme="dark"] {
      --accent: ${t.accent};
      --accent-glow: ${rgba(t.accent, 0.08)};
      --mesh: ${mesh(t.mesh, 0.16)};
    }
  `
}

export const ACCENT_OPTIONS = Object.entries(THEMES).map(([key, t]) => ({
  key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
  gradient: `linear-gradient(135deg, ${t.mesh[0]} 0%, ${t.mesh[0]} 40%, ${t.mesh[1]} 75%, ${t.mesh[2]} 100%)`,
}))
