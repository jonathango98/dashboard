// Widget type → fixed grid size mapping

// Grid: 12 cols × 6 rows
// Row 0: at-a-glance bar (h=1)
// Row 1: quick links (h=1)
// Rows 2-3: focus area (h=2)
// Rows 4-5: workspace (h=2)
export const WIDGET_SIZES = {
  greeting:  { w: 3, h: 1 },
  clock:     { w: 2, h: 1 },
  weather:   { w: 2, h: 1 },
  drive:     { w: 2, h: 1 },
  timer:     { w: 3, h: 2 },
  bible:     { w: 4, h: 2 },
  sticky:    { w: 3, h: 3 },
  tasks:     { w: 8, h: 2 },
  link:      { w: 1, h: 1 },
  fidget:    { w: 2, h: 2 },
  dvd:       { w: 2, h: 2 },
  snorlax:   { w: 2, h: 2 },
  blackjack: { w: 2, h: 2 },
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
  fidget:   'Fidget Toy',
  dvd:      'DVD',
  snorlax:   'Pet',
  blackjack: 'Blackjack',
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
import FidgetWidget      from './components/VirtualPetWidget'
import DvdWidget         from './components/DvdWidget'
import SnorlaxWidget     from './components/SnorlaxWidget'
import BlackjackWidget   from './components/BlackjackWidget'

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
  fidget:   FidgetWidget,
  dvd:      DvdWidget,
  snorlax:   SnorlaxWidget,
  blackjack: BlackjackWidget,
}

export function registerWidget(type, component) {
  registry[type] = component
}

export function getWidgetComponent(type) {
  return registry[type] || null
}

export const WIDGET_TYPES = Object.keys(WIDGET_SIZES)
