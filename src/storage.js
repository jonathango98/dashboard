const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // localStorage unavailable (private mode, quota exceeded)
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}

export default storage
