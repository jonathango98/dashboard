import storage from '../storage'

const COUNT_KEY = 'tab-odometer-count'

let recorded = false

// The extension loads the dashboard in an iframe on every new tab, while
// direct Netlify visits (and local dev) are top-level — only count the former.
export function recordTabOpen() {
  if (recorded) return
  recorded = true
  if (window.self === window.top) return
  storage.set(COUNT_KEY, getTabOpenCount() + 1)
}

export function getTabOpenCount() {
  return storage.get(COUNT_KEY) || 0
}
