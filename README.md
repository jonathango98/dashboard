# Dashboard Frontend

A personal productivity dashboard built with React + Vite. Features a customizable widget grid, task management, weather/maps integration, and a Chrome extension to replace your new tab page.

## Stack

- **Framework:** React 19 + Vite 8
- **Grid layout:** `react-grid-layout` (12 columns × 6 rows)
- **Drag and drop:** `@dnd-kit/core` (task board only)
- **Styling:** Custom CSS with design tokens (no UI library)
- **Fonts:** Plus Jakarta Sans, DM Mono
- **Storage:** `localStorage` (no backend database)

## Widgets

| Widget | Type key | Default size | Description |
|--------|----------|-------------|-------------|
| Greeting | `greeting` | 3×1 | Time-based greeting with editable name |
| Clock | `clock` | 2×1 | Live time + date |
| Weather | `weather` | 2×1 | Temperature, condition, high/low (geolocation or city) |
| Drive | `drive` | 2×1 | ETA to a destination with traffic status |
| Bible Verse | `bible` | 4×2 | Daily verse (cached, refreshes daily) |
| Sticky Note | `sticky` | 3×3 | Free-text note with auto-save |
| Timer | `timer` | 3×2 | Pomodoro (25 min focus / 5 min break) + countdown mode |
| Task Board | `tasks` | 8×2 | Kanban board + list view with urgency sorting |
| Link | `link` | 1×1 | Quick-launch button for a URL |
| DVD | `dvd` | 2×2 | DVD screensaver animation |
| Snorlax | `snorlax` | 2×2 | Idle Pokémon animation |
| Fidget | `fidget` | 2×2 | Interactive fidget toy |

Multiple instances of most widgets can be added to the same layout.

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Configure the API URL**

The backend URL is set via environment variables:

```env
# .env.development (already included)
VITE_API_URL=http://localhost:3001

# .env.production (already included)
VITE_API_URL=https://dashboard-server-production-b04e.up.railway.app
```

Update `.env.production` if you deploy your own backend instance.

**3. Run**
```bash
npm run dev      # Dev server at http://localhost:5173
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
npm run lint     # ESLint
```

## Features

### Layout Customization
Click **Edit Layout** to enter edit mode: drag widgets to reposition, add new widgets from the tray, or remove existing ones. Changes are saved to `localStorage` and can be discarded.

### Settings
Click the **⚙** icon to open Settings:
- **Accent color** — Yellow, Blue, Green, Pink, or Coral
- **Theme** — Light, Dark, or System
- **Name** — Shown in the greeting widget
- **Temperature unit** — °F, °C, or K

### Task Management
The Task Board widget supports:
- Kanban view with drag-and-drop between Todo / In Progress / Done columns
- List view sorted by urgency (deadline × importance score)
- Task details: title, description, deadline, importance (1–5)

### Weather & Drive
- **Weather** requests browser geolocation on first load; falls back to manual city entry
- **Drive** requires a destination address (configured per widget instance)
- Both refresh automatically (weather every 10 min, drive every 5 min)

## Responsive Breakpoints

| Breakpoint | Columns |
|-----------|---------|
| ≥ 1280px (desktop) | 12 |
| ≥ 1024px (tablet) | 8 |
| ≤ 768px (mobile) | 4 |

## Chrome Extension

The `extension/` directory contains a Manifest v3 Chrome extension that overrides the new tab page with an iframe pointing to the deployed dashboard URL. Load it unpacked from `chrome://extensions` or install from the Chrome Web Store.

## Deployment

Deployed on [Netlify](https://netlify.com). Build command: `npm run build`, publish directory: `dist/`. Live at [jogo-dashboard.netlify.app](https://jogo-dashboard.netlify.app).
