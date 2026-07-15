import { useState } from 'react'
import storage from '../storage'

const LAST_KEY = 'random-site-last'

// Curated mix: wonder & exploration / weird & useless / learning rabbit holes
const SITES = [
  // Wonder & exploration
  { name: 'Radio Garden', url: 'https://radio.garden' },
  { name: 'WindowSwap', url: 'https://window-swap.com' },
  { name: 'Earth Wind Map', url: 'https://earth.nullschool.net' },
  { name: '100,000 Stars', url: 'https://stars.chromeexperiments.com' },
  { name: 'Flightradar24', url: 'https://www.flightradar24.com' },
  { name: 'The Deep Sea', url: 'https://neal.fun/deep-sea/' },
  { name: 'Zoom Earth', url: 'https://zoom.earth' },
  { name: 'Lightyear.fm', url: 'https://www.lightyear.fm' },
  { name: 'Explore Live Cams', url: 'https://explore.org/livecams' },
  { name: 'Zoomquilt', url: 'https://zoomquilt.org' },
  { name: 'Stellarium', url: 'https://stellarium-web.org' },
  { name: 'Submarine Cable Map', url: 'https://www.submarinecablemap.com' },
  { name: 'Every Noise at Once', url: 'https://everynoise.com' },
  { name: 'Size of Space', url: 'https://neal.fun/size-of-space/' },

  // Weird & useless web
  { name: 'Pointer Pointer', url: 'https://pointerpointer.com' },
  { name: 'Cat Bounce', url: 'https://cat-bounce.com' },
  { name: 'Eel Slap', url: 'https://eelslap.com' },
  { name: 'Endless Horse', url: 'https://endless.horse' },
  { name: 'Koalas to the Max', url: 'https://koalastothemax.com' },
  { name: 'Hacker Typer', url: 'https://hackertyper.net' },
  { name: 'Pug in a Rug', url: 'https://puginarug.com' },
  { name: 'Corndog.io', url: 'https://corndog.io' },
  { name: 'Smash the Walls', url: 'https://smashthewalls.com' },
  { name: 'Long Doge Challenge', url: 'https://longdogechallenge.com' },
  { name: 'Heeeeeeeey', url: 'https://heeeeeeeey.com' },
  { name: 'Optical Toys', url: 'https://optical.toys' },
  { name: 'The Useless Web', url: 'https://theuselessweb.com' },

  // Learning rabbit holes
  { name: 'Random Wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Random' },
  { name: 'Bartosz Ciechanowski', url: 'https://ciechanow.ski' },
  { name: 'The Pudding', url: 'https://pudding.cool' },
  { name: 'Our World in Data', url: 'https://ourworldindata.org' },
  { name: 'Wait But Why', url: 'https://waitbutwhy.com' },
  { name: 'Seeing Theory', url: 'https://seeing-theory.brown.edu' },
  { name: 'Scale of the Universe', url: 'https://scaleofuniverse.com' },
  { name: 'Random xkcd', url: 'https://c.xkcd.com/random/comic/' },
  { name: 'Quanta Magazine', url: 'https://www.quantamagazine.org' },
  { name: 'Histography', url: 'https://histography.io' },
  { name: 'Moon 1 Pixel', url: 'https://joshworth.com/dev/pixelspace/pixelspace_solarsystem.html' },
]

export default function RandomSiteWidget() {
  const [last, setLast] = useState(() => storage.get(LAST_KEY))

  function handleClick() {
    let pick
    do {
      pick = SITES[Math.floor(Math.random() * SITES.length)]
    } while (last && pick.name === last && SITES.length > 1)
    setLast(pick.name)
    storage.set(LAST_KEY, pick.name)
    window.open(pick.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <button className="randomsite-widget" onClick={handleClick} title="Open a random interesting website">
      <span className="randomsite-title">
        <span className="randomsite-die">⚄</span> Surprise me
      </span>
      <span className="randomsite-sub">
        {last ? `last stop: ${last}` : 'opens somewhere interesting'}
      </span>
    </button>
  )
}
