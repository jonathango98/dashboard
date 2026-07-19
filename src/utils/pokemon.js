// PokéAPI sprite helpers + Safari Zone encounter logic
import storage from '../storage'

export const MAX_DEX = 1025

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

// Animated Showdown gif — exists for most of the dex, 404s on some newest ids
export function gifUrl(id, shiny) {
  return `${SPRITE_BASE}/other/showdown/${shiny ? 'shiny/' : ''}${id}.gif`
}

// Static sprite — exists for all ids through MAX_DEX, used as fallback
export function pngUrl(id, shiny) {
  return `${SPRITE_BASE}/${shiny ? 'shiny/' : ''}${id}.png`
}

// Legendaries, mythicals, ultra beasts, paradox — the "rare" encounter pool
const RARE_RANGES = [
  [144, 146], [150, 151],          // Kanto birds, Mewtwo, Mew
  [243, 251],                      // Johto beasts, Lugia, Ho-Oh, Celebi
  [377, 386],                      // Regis, Latis, weather trio, Jirachi, Deoxys
  [480, 494],                      // lake trio, creation trio, Darkrai... Victini
  [638, 649],                      // swords of justice, forces of nature, Kyurem...
  [716, 721],                      // Xerneas → Volcanion
  [772, 773],                      // Type: Null, Silvally
  [785, 809],                      // tapus, cosmog line, ultra beasts, Zeraora... Melmetal
  [888, 898],                      // Zacian → Calyrex
  [905, 905],                      // Enamorus
  [984, 1025],                     // paradox forms, treasures of ruin → Pecharunt
]

const RARE_IDS = RARE_RANGES.flatMap(([lo, hi]) =>
  Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
)
const RARE_SET = new Set(RARE_IDS)

export const SHINY_ODDS = 1 / 4096

// Pity system: rare odds climb with every ball spent on a non-rare catch
export function rareChance(pity) {
  return Math.min(0.5, 0.08 + 0.0075 * (pity || 0))
}

export function rollEncounter(pity) {
  const rare = Math.random() < rareChance(pity)
  let id
  if (rare) {
    id = RARE_IDS[Math.floor(Math.random() * RARE_IDS.length)]
  } else {
    do {
      id = 1 + Math.floor(Math.random() * MAX_DEX)
    } while (RARE_SET.has(id))
  }
  return { id, rare, shiny: Math.random() < SHINY_ODDS }
}

export function isRare(id) {
  return RARE_SET.has(id)
}

// Species name list, fetched once and cached forever in localStorage.
// Module-level memoized promise so StrictMode double-effects share one fetch;
// reset on failure so a later mount retries.
const NAME_CACHE_KEY = 'safari-name-cache'
let namesPromise = null

function titleCase(slug) {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function loadNames() {
  const cached = storage.get(NAME_CACHE_KEY)
  if (cached?.names?.length) return Promise.resolve(cached.names)
  if (!namesPromise) {
    namesPromise = fetch(`https://pokeapi.co/api/v2/pokemon-species?limit=${MAX_DEX}`)
      .then(r => {
        if (!r.ok) throw new Error(`pokeapi ${r.status}`)
        return r.json()
      })
      .then(data => {
        const names = data.results.map(r => titleCase(r.name))
        storage.set(NAME_CACHE_KEY, { names, fetchedAt: Date.now() })
        return names
      })
      .catch(err => {
        namesPromise = null
        throw err
      })
  }
  return namesPromise
}

export function displayName(id, names, dexEntry) {
  return names?.[id - 1] ?? dexEntry?.name ?? `#${String(id).padStart(4, '0')}`
}
