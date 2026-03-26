import { useState } from 'react'

const SUITS = ['♠', '♥', '♦', '♣']
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function newDeck() {
  const deck = SUITS.flatMap(s => VALUES.map(v => ({ s, v })))
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function cardScore(card) {
  if (['J', 'Q', 'K'].includes(card.v)) return 10
  if (card.v === 'A') return 11
  return parseInt(card.v)
}

function total(hand) {
  let sum = hand.reduce((t, c) => t + cardScore(c), 0)
  let aces = hand.filter(c => c.v === 'A').length
  while (sum > 21 && aces-- > 0) sum -= 10
  return sum
}

function Card({ card, hidden }) {
  const red = card?.s === '♥' || card?.s === '♦'
  return (
    <div style={{
      width: 32, height: 46, borderRadius: 4, flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: hidden ? 'var(--border)' : 'var(--bg-card)',
      border: `1px solid var(--border)`,
      color: hidden ? 'transparent' : (red ? '#EF4444' : 'var(--text-primary)'),
      fontSize: hidden ? 15 : 11, fontWeight: 700,
      fontFamily: 'DM Mono, monospace', lineHeight: 1.1,
    }}>
      {hidden ? '?' : <><span>{card.v}</span><span>{card.s}</span></>}
    </div>
  )
}

function btn(bg, color, flex) {
  return {
    flex: flex || undefined, background: bg, color, border: 'none',
    borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
  }
}

export default function BlackjackWidget() {
  const [deck, setDeck] = useState([])
  const [player, setPlayer] = useState([])
  const [dealer, setDealer] = useState([])
  const [phase, setPhase] = useState('idle') // idle | playing | done
  const [result, setResult] = useState(null)
  const [stats, setStats] = useState({ w: 0, l: 0, p: 0 })

  const deal = () => {
    const d = newDeck()
    const p = [d.pop(), d.pop()]
    const dl = [d.pop(), d.pop()]

    setDeck(d)
    setPlayer(p)
    setDealer(dl)
    setResult(null)

    if (total(p) === 21) {
      const r = total(dl) === 21 ? 'push' : 'blackjack'
      setResult(r)
      setPhase('done')
      setStats(s => ({ ...s, w: r === 'blackjack' ? s.w + 1 : s.w, p: r === 'push' ? s.p + 1 : s.p }))
    } else {
      setPhase('playing')
    }
  }

  const hit = () => {
    const d = [...deck]
    const p = [...player, d.pop()]
    setDeck(d)
    setPlayer(p)
    if (total(p) > 21) {
      setResult('bust')
      setPhase('done')
      setStats(s => ({ ...s, l: s.l + 1 }))
    }
  }

  const stand = () => {
    let dl = [...dealer]
    let d = [...deck]
    while (total(dl) < 17) dl.push(d.pop())
    setDealer(dl)
    setDeck(d)

    const pt = total(player)
    const dt = total(dl)
    const r = dt > 21 || pt > dt ? 'win' : pt === dt ? 'push' : 'lose'
    setResult(r)
    setPhase('done')
    setStats(s => ({
      w: r === 'win' ? s.w + 1 : s.w,
      l: r === 'lose' ? s.l + 1 : s.l,
      p: r === 'push' ? s.p + 1 : s.p,
    }))
  }

  const resultLabel = {
    win: '🎉 You win!',
    lose: '💀 Dealer wins',
    push: '🤝 Push',
    blackjack: '🃏 Blackjack!',
    bust: '💥 Bust!',
  }[result]

  const resultColor = ['win', 'blackjack'].includes(result) ? '#4ADE80'
    : result === 'push' ? 'var(--text-secondary)'
    : '#F87171'

  const showDealerFull = phase === 'done'

  return (
    <div style={{
      width: '100%', height: '100%', borderRadius: 'inherit', boxSizing: 'border-box',
      background: 'var(--bg-card)', padding: '10px 10px 8px',
      display: 'flex', flexDirection: 'column', gap: 6,
      fontFamily: 'Plus Jakarta Sans, sans-serif', color: 'var(--text-primary)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, opacity: 0.6, textTransform: 'uppercase' }}>
          Blackjack
        </div>
        <div style={{ display: 'flex', gap: 6, fontFamily: 'DM Mono, monospace', fontSize: 9 }}>
          <span style={{ color: '#4ADE80' }}>{stats.w}W</span>
          <span style={{ color: '#F87171' }}>{stats.l}L</span>
          <span style={{ color: 'var(--text-secondary)' }}>{stats.p}P</span>
        </div>
      </div>

      {/* Dealer hand */}
      {phase !== 'idle' && (
        <div>
          <div style={{ fontSize: 9, opacity: 0.5, marginBottom: 3 }}>
            DEALER {showDealerFull ? `— ${total(dealer)}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {dealer.map((c, i) => (
              <Card key={i} card={c} hidden={!showDealerFull && i === 0} />
            ))}
          </div>
        </div>
      )}

      {/* Player hand */}
      {phase !== 'idle' && (
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, opacity: 0.5, marginBottom: 3 }}>YOU — {total(player)}</div>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {player.map((c, i) => (
              <Card key={i} card={c} />
            ))}
          </div>
        </div>
      )}

      {/* Idle placeholder */}
      {phase === 'idle' && (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 4, opacity: 0.45,
        }}>
          <div style={{ fontSize: 32 }}>🃏</div>
          <div style={{ fontSize: 10 }}>Press deal to play</div>
        </div>
      )}

      {/* Result message */}
      {result && (
        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: resultColor }}>
          {resultLabel}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 4 }}>
        {phase === 'playing' ? (
          <>
            <button onClick={hit} style={btn('var(--accent)', '#111', 1)}>Hit</button>
            <button onClick={stand} style={btn('var(--border)', 'var(--text-primary)', 1)}>Stand</button>
          </>
        ) : (
          <button onClick={deal} style={btn('var(--accent)', '#111', 1)}>
            {phase === 'done' ? 'New Game' : 'Deal'}
          </button>
        )}
      </div>
    </div>
  )
}
