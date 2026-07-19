import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import storage from '../storage'
import { MAX_DEX, gifUrl, pngUrl, rollEncounter, loadNames, displayName } from '../utils/pokemon'

const DAILY_BALLS = 10
const PARTY_MAX = 6
const GOLD = '#D9A400'

// Global keys — the collection is shared across widget instances on purpose
const K_DEX = 'safari-dex'
const K_PARTY = 'safari-party'
const K_BALLS = 'safari-balls'
const K_PITY = 'safari-pity'

function today() {
  return format(new Date(), 'yyyy-MM-dd')
}

function freshBalls() {
  const stored = storage.get(K_BALLS)
  return stored?.date === today() ? stored : { date: today(), balls: DAILY_BALLS }
}

// Walks a fallback chain: animated showdown gif → static png → non-shiny png
function Sprite({ id, shiny, animated, size }) {
  const urls = animated
    ? [gifUrl(id, shiny), pngUrl(id, shiny), pngUrl(id, false)]
    : shiny
      ? [pngUrl(id, true), pngUrl(id, false)]
      : [pngUrl(id, false)]
  const [i, setI] = useState(0)
  if (i >= urls.length) {
    return <span style={{ fontSize: size * 0.6, lineHeight: 1 }}>❓</span>
  }
  return (
    <img
      src={urls[i]}
      onError={() => setI(i + 1)}
      alt=""
      style={{
        width: size, height: size, objectFit: 'contain',
        imageRendering: 'pixelated', display: 'block',
      }}
    />
  )
}

function btn(bg, color, flex) {
  return {
    flex: flex || undefined, background: bg, color, border: 'none',
    borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
  }
}

export default function SafariWidget() {
  const [dex, setDex] = useState(() => storage.get(K_DEX) ?? {})
  const [party, setParty] = useState(() => storage.get(K_PARTY) ?? [])
  const [pity, setPity] = useState(() => storage.get(K_PITY) ?? 0)
  const [balls, setBalls] = useState(freshBalls)
  const [wild, setWild] = useState(() => rollEncounter(storage.get(K_PITY) ?? 0))
  const [names, setNames] = useState(null)
  const [view, setView] = useState('safari')       // safari | dex | party
  const [phase, setPhase] = useState(() => (freshBalls().balls > 0 ? 'encounter' : 'noballs'))
  const [caughtOutcome, setCaughtOutcome] = useState('joined')  // joined | released
  const [dexSel, setDexSel] = useState(null)
  const [confirmIdx, setConfirmIdx] = useState(null)
  // Blocks double-spending a ball when Catch is clicked again before re-render
  const busyRef = useRef(false)

  const saveDex = next => { setDex(next); storage.set(K_DEX, next) }
  const saveParty = next => { setParty(next); storage.set(K_PARTY, next) }
  const savePity = next => { setPity(next); storage.set(K_PITY, next) }
  const saveBalls = next => { setBalls(next); storage.set(K_BALLS, next) }

  useEffect(() => {
    let alive = true
    loadNames().then(n => { if (alive) setNames(n) }).catch(() => {})
    return () => { alive = false }
  }, [])

  // Self-heal past midnight while sitting on the out-of-balls screen
  useEffect(() => {
    if (phase !== 'noballs') return
    const tick = setInterval(() => {
      const b = freshBalls()
      if (b.balls > 0) {
        saveBalls(b)
        setWild(rollEncounter(storage.get(K_PITY) ?? 0))
        setPhase('encounter')
      }
    }, 60000)
    return () => clearInterval(tick)
  }, [phase])

  const nextEncounter = () => {
    busyRef.current = false
    const b = freshBalls()
    if (b.date !== balls.date) saveBalls(b)
    if (b.balls <= 0) { setPhase('noballs'); return }
    setWild(rollEncounter(pity))
    setPhase('encounter')
  }

  const doCatch = () => {
    if (busyRef.current) return
    const b = freshBalls()
    if (b.balls <= 0) { setPhase('noballs'); return }
    busyRef.current = true
    saveBalls({ ...b, balls: b.balls - 1 })

    const key = String(wild.id)
    const prev = dex[key]
    saveDex({
      ...dex,
      [key]: {
        name: names?.[wild.id - 1] ?? prev?.name ?? null,
        shiny: Boolean(prev?.shiny || wild.shiny),
        count: (prev?.count || 0) + 1,
        firstCaughtAt: prev?.firstCaughtAt || new Date().toISOString(),
      },
    })
    savePity(wild.rare ? 0 : pity + 1)

    if (party.length < PARTY_MAX) {
      saveParty([...party, { id: wild.id, shiny: wild.shiny, caughtAt: new Date().toISOString() }])
      setCaughtOutcome('joined')
      setPhase('caught')
    } else {
      setPhase('choose')
    }
  }

  const swapInto = idx => {
    const next = [...party]
    next[idx] = { id: wild.id, shiny: wild.shiny, caughtAt: new Date().toISOString() }
    saveParty(next)
    setCaughtOutcome('joined')
    setPhase('caught')
  }

  const letGo = () => {
    setCaughtOutcome('released')
    setPhase('caught')
  }

  const releaseAt = idx => {
    saveParty(party.filter((_, i) => i !== idx))
    setConfirmIdx(null)
  }

  const wildName = displayName(wild.id, names, dex[String(wild.id)])
  const cancel = 'react-grid-layout-cancel'

  const navBtn = v => ({
    ...btn(view === v ? 'var(--accent)' : 'transparent', view === v ? '#111' : 'var(--text-secondary)', 1),
    padding: '3px 0', fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
  })

  return (
    <div style={{
      width: '100%', height: '100%', borderRadius: 'inherit', boxSizing: 'border-box',
      background: 'var(--bg-card)', padding: '8px 10px', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 4,
      fontFamily: 'Plus Jakarta Sans, sans-serif', color: 'var(--text-primary)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, opacity: 0.6, textTransform: 'uppercase' }}>
          Safari Zone
        </div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--text-secondary)' }}>
          ● {balls.balls}/{DAILY_BALLS}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {view === 'safari' && phase === 'encounter' && (
          <>
            <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-secondary)' }}>
              A wild <b style={{ color: wild.shiny ? GOLD : 'var(--text-primary)' }}>{wildName}</b> appeared!
              {wild.shiny && <span style={{ color: GOLD }}> ✦</span>}
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Sprite key={`${wild.id}-${wild.shiny}`} id={wild.id} shiny={wild.shiny} animated size={72} />
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--text-secondary)' }}>
                #{String(wild.id).padStart(4, '0')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className={cancel} onClick={doCatch} style={btn('var(--accent)', '#111', 2)}>Catch</button>
              <button className={cancel} onClick={nextEncounter} style={btn('var(--border)', 'var(--text-primary)', 1)}>Run</button>
            </div>
          </>
        )}

        {view === 'safari' && phase === 'caught' && (
          <>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              <Sprite key={`${wild.id}-${wild.shiny}`} id={wild.id} shiny={wild.shiny} animated size={60} />
              <div style={{ fontSize: 11, fontWeight: 700 }}>
                Gotcha! <span style={{ color: wild.shiny ? GOLD : 'inherit' }}>{wildName}</span> was caught!
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
                {caughtOutcome === 'joined' ? 'Added to your party' : 'Released back into the wild'}
              </div>
            </div>
            <button className={cancel} onClick={nextEncounter} style={btn('var(--accent)', '#111')}>
              Next Pokémon
            </button>
          </>
        )}

        {view === 'safari' && phase === 'choose' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Sprite key={`${wild.id}-${wild.shiny}`} id={wild.id} shiny={wild.shiny} animated size={40} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>Party full!</div>
                <div style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Tap a member to swap out</div>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {party.map((p, i) => (
                <button
                  key={i}
                  className={cancel}
                  onClick={() => swapInto(i)}
                  title={displayName(p.id, names, dex[String(p.id)])}
                  style={{
                    background: 'transparent', border: '1px solid var(--border)', borderRadius: 8,
                    padding: 2, cursor: 'pointer',
                  }}
                >
                  <Sprite id={p.id} shiny={p.shiny} animated={false} size={30} />
                </button>
              ))}
            </div>
            <button className={cancel} onClick={letGo} style={btn('var(--border)', 'var(--text-primary)')}>
              Let {wildName} go
            </button>
          </>
        )}

        {view === 'safari' && phase === 'noballs' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: 0.55 }}>
            <div style={{ fontSize: 28 }}>🎒</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>Out of Safari Balls</div>
            <div style={{ fontSize: 9 }}>Come back tomorrow — {DAILY_BALLS} more at midnight</div>
          </div>
        )}

        {view === 'dex' && (
          <>
            <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginBottom: 3 }}>
              Caught <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text-primary)' }}>
                {Object.keys(dex).length} / {MAX_DEX}
              </span>
            </div>
            {Object.keys(dex).length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, opacity: 0.45 }}>
                Nothing caught yet
              </div>
            ) : (
              <div
                className={cancel}
                style={{
                  flex: 1, minHeight: 0, overflowY: 'auto',
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(34px, 1fr))', gap: 3,
                  alignContent: 'start',
                }}
              >
                {Object.keys(dex).map(Number).sort((a, b) => a - b).map(id => {
                  const inParty = party.some(p => p.id === id)
                  return (
                    <button
                      key={id}
                      className={cancel}
                      onClick={() => setDexSel(dexSel === id ? null : id)}
                      style={{
                        position: 'relative', background: 'transparent', cursor: 'pointer',
                        border: inParty ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: 7, padding: 1,
                      }}
                    >
                      <Sprite id={id} shiny={false} animated={false} size={28} />
                      {dex[String(id)].shiny && (
                        <span style={{ position: 'absolute', top: -2, right: 0, fontSize: 8, color: GOLD }}>✦</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            {dexSel && dex[String(dexSel)] && (
              <div style={{ fontSize: 9, textAlign: 'center', color: 'var(--text-secondary)', paddingTop: 2 }}>
                <b style={{ color: 'var(--text-primary)' }}>{displayName(dexSel, names, dex[String(dexSel)])}</b>
                {' '}· caught ×{dex[String(dexSel)].count}
                {dex[String(dexSel)].shiny && <span style={{ color: GOLD }}> · shiny ✦</span>}
              </div>
            )}
          </>
        )}

        {view === 'party' && (
          <>
            <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginBottom: 3 }}>
              Your Party <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text-primary)' }}>
                {party.length}/{PARTY_MAX}
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {Array.from({ length: PARTY_MAX }, (_, i) => {
                const p = party[i]
                if (!p) {
                  return (
                    <div key={i} style={{
                      width: 40, height: 40, borderRadius: 8,
                      border: '1px dashed var(--border)',
                    }} />
                  )
                }
                return (
                  <button
                    key={i}
                    className={cancel}
                    onClick={() => setConfirmIdx(confirmIdx === i ? null : i)}
                    title={displayName(p.id, names, dex[String(p.id)])}
                    style={{
                      position: 'relative', width: 44, height: 44, borderRadius: 8,
                      background: 'transparent', cursor: 'pointer',
                      border: confirmIdx === i ? '1.5px solid #F87171' : '1px solid var(--border)',
                      boxShadow: p.shiny ? `0 0 8px ${GOLD}55` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Sprite id={p.id} shiny={p.shiny} animated size={36} />
                    {p.shiny && (
                      <span style={{ position: 'absolute', top: -1, right: 1, fontSize: 9, color: GOLD }}>✦</span>
                    )}
                  </button>
                )
              })}
            </div>
            {confirmIdx !== null && party[confirmIdx] ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: 'var(--text-secondary)', flex: 1 }}>
                  Release {displayName(party[confirmIdx].id, names, dex[String(party[confirmIdx].id)])}?
                </span>
                <button className={cancel} onClick={() => releaseAt(confirmIdx)} style={btn('#F87171', '#111')}>Release</button>
                <button className={cancel} onClick={() => setConfirmIdx(null)} style={btn('var(--border)', 'var(--text-primary)')}>Keep</button>
              </div>
            ) : (
              <div style={{ fontSize: 9, textAlign: 'center', color: 'var(--text-secondary)', opacity: 0.7 }}>
                {party.length > 0 ? 'Tap a Pokémon to release it' : 'Catch Pokémon to fill your party'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ display: 'flex', gap: 2, borderTop: '1px solid var(--border)', paddingTop: 4 }}>
        <button className={cancel} onClick={() => setView('safari')} style={navBtn('safari')}>Safari</button>
        <button className={cancel} onClick={() => { setView('dex'); setDexSel(null) }} style={navBtn('dex')}>Dex</button>
        <button className={cancel} onClick={() => { setView('party'); setConfirmIdx(null) }} style={navBtn('party')}>Party</button>
      </div>
    </div>
  )
}
