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
  bible:     { w: 3, h: 2 },
  sticky:    { w: 3, h: 3 },
  link:      { w: 1, h: 1 },
  snorlax:   { w: 2, h: 2 },
  blackjack:  { w: 2, h: 2 },
  exchange:   { w: 2, h: 2 },
  countdown:  { w: 2, h: 1 },
  calculator: { w: 2, h: 3 },
  odometer:   { w: 2, h: 1 },
  randomsite: { w: 2, h: 1 },
  gradient:   { w: 2, h: 2 },
  dice:       { w: 1, h: 2 },
  sysgauge:   { w: 1, h: 1 },
  sunarc:     { w: 3, h: 1 },
  safari:     { w: 3, h: 2 },
}

export const WIDGET_LABELS = {
  greeting: 'Greeting',
  clock:    'Clock',
  weather:  'Weather',
  drive:    'Drive to Location',
  timer:    'Timer',
  bible:    'Bible Verse',
  sticky:   'Sticky Note',
  link:     'Link Button',
  snorlax:  'Virtual Pet',
  blackjack:  'Blackjack',
  exchange:   'Exchange Rate',
  countdown:  'Countdown',
  calculator: 'Calculator',
  odometer:   'Tab Odometer',
  randomsite: 'Random Website',
  gradient:   'Gradient of the Day',
  dice:       'Dice Roller',
  sysgauge:   'System Gauge',
  sunarc:     'Sun Arc',
  safari:     'Safari Zone',
}

// Registry maps widget type → React component
import GreetingWidget    from './components/GreetingWidget'
import ClockWidget       from './components/ClockWidget'
import TimerWidget       from './components/TimerWidget'
import WeatherWidget     from './components/WeatherWidget'
import DriveWidget       from './components/DriveWidget'
import BibleVerseWidget  from './components/BibleVerseWidget'
import StickyNoteWidget  from './components/StickyNoteWidget'
import LinkWidget        from './components/LinkWidget'
import VirtualPetWidget  from './components/VirtualPetWidget'
import BlackjackWidget      from './components/BlackjackWidget'
import ExchangeRateWidget   from './components/ExchangeRateWidget'
import CountdownWidget      from './components/CountdownWidget'
import CalculatorWidget     from './components/CalculatorWidget'
import OdometerWidget       from './components/OdometerWidget'
import RandomSiteWidget     from './components/RandomSiteWidget'
import MeshGradientWidget   from './components/MeshGradientWidget'
import DiceRollerWidget     from './components/DiceRollerWidget'
import SystemGaugeWidget    from './components/SystemGaugeWidget'
import SunArcWidget         from './components/SunArcWidget'
import SafariWidget         from './components/SafariWidget'

const registry = {
  greeting: GreetingWidget,
  clock:    ClockWidget,
  timer:    TimerWidget,
  weather:  WeatherWidget,
  drive:    DriveWidget,
  bible:    BibleVerseWidget,
  sticky:   StickyNoteWidget,
  link:     LinkWidget,
  snorlax:  VirtualPetWidget,
  blackjack:  BlackjackWidget,
  exchange:   ExchangeRateWidget,
  countdown:  CountdownWidget,
  calculator: CalculatorWidget,
  odometer:   OdometerWidget,
  randomsite: RandomSiteWidget,
  gradient:   MeshGradientWidget,
  dice:       DiceRollerWidget,
  sysgauge:   SystemGaugeWidget,
  sunarc:     SunArcWidget,
  safari:     SafariWidget,
}

export function registerWidget(type, component) {
  registry[type] = component
}

export function getWidgetComponent(type) {
  return registry[type] || null
}

export const WIDGET_TYPES = Object.keys(WIDGET_SIZES)
