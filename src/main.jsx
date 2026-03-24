import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App onReady={() => {
      const el = document.getElementById('loading-screen')
      if (el) {
        el.style.opacity = '0'
        setTimeout(() => el.remove(), 300)
      }
    }} />
  </StrictMode>,
)
