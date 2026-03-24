// Widget type → fixed grid size mapping
// Components will be filled in as widgets are built in later phases

// Grid: 12 cols × 5 rows
// Row budget: 1 (info row) + 2 (content row) + 2 (tasks) = 5
export const WIDGET_SIZES = {
  greeting:  { w: 4, h: 1 },
  clock:     { w: 2, h: 2 },
  weather:   { w: 2, h: 2 },
  drive:     { w: 2, h: 2 },
  timer:     { w: 2, h: 3 },
  bible:     { w: 4, h: 4 },
  sticky:    { w: 2, h: 3 },
  tasks:     { w: 8, h: 4 },
  link:      { w: 1, h: 1 },
}

export const WIDGET_LABELS = {
  greeting: 'Greeting',
  clock:    'Clock',
  weather:  'Weather',
  drive:    'Drive to Location',
  timer:    'Timer',
  bible:    'Bible Verse',
  sticky:   'Sticky Note',
  tasks:    'Task Board',
  link:     'Link Button',
}

// Registry maps widget type → React component
import GreetingWidget    from './components/GreetingWidget'
import ClockWidget       from './components/ClockWidget'
import TimerWidget       from './components/TimerWidget'
import WeatherWidget     from './components/WeatherWidget'
import DriveWidget       from './components/DriveWidget'
import BibleVerseWidget  from './components/BibleVerseWidget'
import StickyNoteWidget  from './components/StickyNoteWidget'
import TaskBoardWidget   from './components/tasks/TaskBoardWidget'
import LinkWidget        from './components/LinkWidget'

const registry = {
  greeting: GreetingWidget,
  clock:    ClockWidget,
  timer:    TimerWidget,
  weather:  WeatherWidget,
  drive:    DriveWidget,
  bible:    BibleVerseWidget,
  sticky:   StickyNoteWidget,
  tasks:    TaskBoardWidget,
  link:     LinkWidget,
}

export function registerWidget(type, component) {
  registry[type] = component
}

export function getWidgetComponent(type) {
  return registry[type] || null
}

export const WIDGET_TYPES = Object.keys(WIDGET_SIZES)
