// Yoru: a pixel-art night by a lake. One SVG unit = one art pixel (320×180).
// Built as a string at load; the surface draws it, CSS inside does the motion.
// Two kinds of layer share one scale: the far scene crops from the middle,
// the near scene (moon, tree, friends) is pinned to the right edge, where the
// chat column leaves room.

type Pal = Record<string, string>

const W = 320
const H = 180
const HORIZON = 128

// Each row of a map becomes horizontal runs of 1px-tall rects.
function sprite(rows: string[], pal: Pal, ox: number, oy: number, cls?: string): string {
  let out = ''
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const c = row[x]!
      const fill = pal[c]
      if (fill === undefined) {
        x++
        continue
      }
      let w = 1
      while (row[x + w] === c) w++
      out += `<rect x="${ox + x}" y="${oy + y}" width="${w}" height="1" fill="${fill}"/>`
      x += w
    }
  })
  return cls ? `<g class="${cls}">${out}</g>` : out
}

function pixelDisc(cx: number, cy: number, r: number, fill: string, cls?: string): string {
  let out = ''
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(r * r - dy * dy))
    out += `<rect x="${cx - half}" y="${cy + dy}" width="${half * 2 + 1}" height="1"/>`
  }
  return `<g fill="${fill}"${cls ? ` class="${cls}"` : ''}>${out}</g>`
}

// Deterministic noise so the scene is the same every load.
let seed = 7
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)

// A stepped skyline: height per column, drawn as one path.
function ridge(heightAt: (x: number) => number, fill: string): string {
  let d = `M0 ${H}`
  for (let x = 0; x < W; x++) {
    d += `V${Math.round(heightAt(x))}H${x + 1}`
  }
  return `<path d="${d}V${H}Z" fill="${fill}"/>`
}

// --- sky ------------------------------------------------------------------

const SKY = ['#0a0b1e', '#0e0f28', '#131331', '#19173b', '#201c45', '#29224f']

function sky(): string {
  const band = HORIZON / SKY.length
  let defs = ''
  let out = ''
  SKY.forEach((c, i) => {
    const y = Math.round(i * band)
    out += `<rect x="0" y="${y}" width="${W}" height="${Math.ceil(band) + 1}" fill="${c}"/>`
    if (i > 0) {
      // checker dither where two bands meet
      defs += `<pattern id="d${i}" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="${c}"/><rect x="1" y="1" width="1" height="1" fill="${c}"/></pattern>`
      out += `<rect x="0" y="${y - 3}" width="${W}" height="3" fill="url(#d${i})"/>`
    }
  })
  return `<defs>${defs}</defs>${out}`
}

function stars(): string {
  let out = ''
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(rand() * W)
    const y = Math.floor(rand() * (HORIZON - 40))
    const big = rand() < 0.12
    const tw = rand() < 0.6 ? ` class="tw tw${i % 5}"` : ''
    const op = (0.35 + rand() * 0.6).toFixed(2)
    const fill = rand() < 0.2 ? '#cfd8ff' : '#f3eedc'
    out += big
      ? `<g fill="${fill}"${tw}><rect x="${x}" y="${y - 1}" width="1" height="3"/><rect x="${x - 1}" y="${y}" width="3" height="1"/></g>`
      : `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}" opacity="${op}"${tw}/>`
  }
  return out
}

const CLOUD = [
  '......XXXX..........',
  '...XXXXXXXXX..XXX...',
  '.XXXXXXXXXXXXXXXXXX.',
  'XXXXXXXXXXXXXXXXXXXX',
]

function clouds(): string {
  const pal = { X: '#2a2550' }
  return (
    `<g class="cloud c1" opacity=".55">${sprite(CLOUD, pal, 0, 52)}</g>` +
    `<g class="cloud c2" opacity=".4">${sprite(CLOUD.map(r => r + r.slice(4)), pal, 0, 30)}</g>`
  )
}

// --- moon -----------------------------------------------------------------

const MOON = { x: 248, y: 30 }

function moon(): string {
  const { x, y } = MOON
  const glow = pixelDisc(x, y, 19, '#f6efd6', 'glow g2') + pixelDisc(x, y, 15, '#f6efd6', 'glow g1')
  const face = pixelDisc(x, y, 11, '#f4ecd2')
  const craters = sprite(['..CC......', '..CC...C..', '.......C..', '....CC....', '...CCC....'], { C: '#e0d4b2' }, x - 6, y - 4)
  return glow + face + craters
}

function moonPath(): string {
  let path = ''
  const widths = [12, 9, 14, 7, 10, 5, 8, 4, 6, 3]
  widths.forEach((w, i) => {
    path += `<rect class="sh sh${i % 4}" x="${MOON.x - 8 - Math.floor(w / 2) + (i % 3) - 1}" y="${HORIZON + 2 + i * 4}" width="${w}" height="1" fill="#f4ecd2"/>`
  })
  return path
}

// --- far land: the volcano, hills and a pagoda ------------------------------

const nearHill = (x: number) => Math.min(HORIZON, 116 + Math.sin(x / 31 + 2) * 7 + Math.sin(x / 7) * 1.5)

const PAGODA = [
  '........P........',
  '........P........',
  '.......PPP.......',
  '...P..PPPPP..P...',
  '....PPPPPPPPP....',
  '......PPPPP......',
  '......PPAPP......',
  '..P..PPPPPPP..P..',
  '...PPPPPPPPPPP...',
  '......PPPPP......',
  '......PPPPP......',
  '.P..PPPPPPPPP..P.',
  '..PPPPPPPPPPPPP..',
  '.....PPPPPPP.....',
  '.....PPPAPPP.....',
  '.....PPPPPPP.....',
]

function mountains(): string {
  const far = ridge(x => {
    const cone = 76 + Math.abs(x - 150) * 0.62 // the tall volcano
    const roll = 104 + Math.sin(x / 23) * 6 + Math.sin(x / 9) * 2
    return Math.min(cone, roll, HORIZON)
  }, '#1d1a3c')
  let snow = ''
  for (let x = 136; x <= 164; x++) {
    const top = Math.round(76 + Math.abs(x - 150) * 0.62)
    const foot = 83 + (x % 5 === 0 ? 2 : x % 3 === 0 ? 1 : 0)
    if (top < foot) snow += `<rect x="${x}" y="${top}" width="1" height="${foot - top}"/>`
  }
  const near = ridge(nearHill, '#151330')
  const px = 88
  const py = Math.round(nearHill(px + 8)) - PAGODA.length + 2
  const pagoda =
    sprite(PAGODA.map(r => r.replace(/A/g, 'P')), { P: '#151330' }, px, py) +
    sprite(PAGODA.map(r => r.replace(/[^A]/g, '.')), { A: '#e7a85a' }, px, py, 'win')
  return `${far}<g fill="#8f8bb4" opacity=".55">${snow}</g>${near}${pagoda}`
}

function water(): string {
  let out = `<rect x="0" y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="#0e0d23"/>`
  out += `<rect x="0" y="${HORIZON}" width="${W}" height="1" fill="#2b2454"/>`
  for (let i = 0; i < 14; i++) {
    const w = 4 + Math.floor(rand() * 14)
    out += `<rect x="${Math.floor(rand() * W)}" y="${HORIZON + 4 + Math.floor(rand() * 46)}" width="${w}" height="1" fill="#1b1838"/>`
  }
  return out
}

// --- a torii standing in the lake --------------------------------------------

const TORII = [
  'K.............K',
  'KKKKKKKKKKKKKKK',
  '.VVVVVVVVVVVVV.',
  '...V...V...V...',
  '.VVVVVVVVVVVVV.',
  '...V.......V...',
  '...V.......V...',
  '...V.......V...',
  '...V.......V...',
  '...V.......V...',
  '..KKK.....KKK..',
]

function torii(): string {
  const x = 204
  const base = HORIZON + 13
  const top = base - TORII.length + 1
  const mirror = sprite([...TORII].reverse(), { K: '#2a1f35', V: '#5e2a3a' }, x, base + 1)
  return sprite(TORII, { K: '#1b1622', V: '#b8443a' }, x, top) + `<g class="ripple">${mirror}</g>`
}

// --- the bank, the cherry tree, and who sits beneath it ---------------------

const flip = (rows: string[]) => rows.map(r => [...r].reverse().join(''))

// drawn facing right, flipped to face the moon
const AKITA = flip([
  '....................',
  '....................',
  '..........RRRRRR....',
  '.........RLLLLRRR...',
  '.........RRRRRRRRR..',
  '.........RRRRRRRRRRK',
  '.........WRRRRWWWDW.',
  '..LRRL....WWWWWWWW..',
  '.LWWWWL...WWWWWW....',
  '.RWDDWR..LWWWWW.....',
  '.RWDRWRLLRWWWWW.....',
  '..RRRRRRRRWWWWW.....',
  '..RRRRRRRRRWWWR.....',
  '..RRRRRRRRRWWWR.....',
  '..RRRRRRRRRWWWR.....',
  '..RDRRRRRRDWWWR.....',
  '..RDDRRRRRDWWWR.....',
  '.RRDDRRRRRDWW.WW....',
  '.RRRDRRRRRDWW.WW....',
  '.WWWWWD...DWW.WW....',
])
const AKITA_EARS = flip(['...........R...R....', '..........RD..RD....'])
const AKITA_EYE = 5
const AKITA_PAL = { R: '#c8733c', L: '#dd9658', D: '#93502a', W: '#f0e4cf', K: '#17121f' }

const CLAWD = [
  '.CCCCCCC.',
  '.CCCCCCC.',
  '.CCCCCCC.',
  'CCCCCCCCC',
  '.CCCCCCC.',
  '.C.C.C.C.',
]
const CLAWD_EYES = ['.........', '..K...K..', '..K...K..']

const TORO = [
  '....S....',
  '...SSS...',
  '.SSSSSSS.',
  'SSSSSSSSS',
  '.sssssss.',
  '..s...s..',
  '..s...s..',
  '..sssss..',
  '.SSSSSSS.',
  '...sss...',
  '...sss...',
  '...sss...',
  '..sssss..',
  '.SSSSSSS.',
]

const BANK_TOP = 138
const BANK_X = 256
const FEET = BANK_TOP - 1

function bank(): string {
  // runs past the right edge, so the pinned layer never shows its end
  const d = `M${BANK_X - 6} ${H}V${BANK_TOP + 6}H${BANK_X - 4}V${BANK_TOP + 3}H${BANK_X - 2}V${BANK_TOP + 1}H${BANK_X}V${BANK_TOP}H${W + 80}V${H}Z`
  let tufts = ''
  for (let x = BANK_X + 2; x < W + 60; x += 3 + Math.floor(rand() * 5)) {
    tufts += `<rect x="${x}" y="${BANK_TOP - 1}" width="1" height="1"/>`
    if (rand() < 0.4) tufts += `<rect x="${x + 1}" y="${BANK_TOP - 2}" width="1" height="2"/>`
  }
  let fallen = ''
  for (let i = 0; i < 14; i++) {
    fallen += `<rect x="${264 + Math.floor(rand() * 60)}" y="${BANK_TOP + Math.floor(rand() * 3)}" width="1" height="1"/>`
  }
  return (
    `<path d="${d}" fill="#0b0a19"/><rect x="${BANK_X}" y="${BANK_TOP}" width="${W + 80 - BANK_X}" height="1" fill="#1a1834"/>` +
    `<g fill="#1a1834">${tufts}</g><g fill="#b86a8c" opacity=".7">${fallen}</g>`
  )
}

function line(x0: number, y0: number, x1: number, y1: number): string {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  let out = ''
  for (let i = 0; i <= n; i++) {
    out += `<rect x="${Math.round(x0 + ((x1 - x0) * i) / n)}" y="${Math.round(y0 + ((y1 - y0) * i) / n)}" width="1" height="1"/>`
  }
  return out
}

const CANOPY: [number, number, number][] = [
  [298, 56, 9], [288, 62, 8], [306, 62, 9], [278, 70, 8], [292, 72, 9], [310, 74, 8], [268, 80, 6],
  [284, 80, 7], [320, 60, 8], [316, 50, 7], [290, 50, 6], [300, 82, 6], [262, 86, 4],
]

function tree(): string {
  let wood = ''
  for (let y = 84; y <= FEET; y++) {
    const cx = 306 - Math.floor(((FEET - y) * 3) / 53)
    const w = y > FEET - 2 ? 6 : y > 120 ? 4 : y > 100 ? 3 : 2
    wood += `<rect x="${cx - Math.floor(w / 2)}" y="${y}" width="${w}" height="1"/>`
  }
  wood += line(304, 94, 283, 70) + line(303, 90, 268, 82) + line(304, 88, 318, 66) + line(303, 86, 298, 58) + line(285, 72, 262, 88)

  const inCanopy = (x: number, y: number) => CANOPY.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r)
  let speck = ''
  for (let i = 0; i < 260; i++) {
    const x = 250 + Math.floor(rand() * 85)
    const y = 44 + Math.floor(rand() * 52)
    if (!inCanopy(x, y)) continue
    const c = rand() < 0.6 ? '#fde6ee' : '#a65a7e'
    speck += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`
  }

  const shade = CANOPY.map(([x, y, r]) => pixelDisc(x + 1, y + 2, r, '#b0637f')).join('')
  const mid = CANOPY.map(([x, y, r]) => pixelDisc(x, y, r - 1, '#e59ab6')).join('')
  const light = CANOPY.map(([x, y, r]) => pixelDisc(x - 2, y - 2, Math.max(1, Math.round(r * 0.4)), '#f6c4d5')).join('')
  return `<g fill="#2b1d24">${wood}</g><g class="canopy">${shade}${mid}${light}${speck}</g>`
}

function friends(): string {
  const toro = { x: 258, y: FEET - TORO.length + 1 }
  const lantern =
    pixelDisc(toro.x + 4, toro.y + 6, 5, '#ffcf7a', 'halo') +
    sprite(TORO, { S: '#3b3858', s: '#2c2a46' }, toro.x, toro.y) +
    sprite(['...LLL...', '...LLL...'], { L: '#ffcf7a' }, toro.x, toro.y + 5, 'flame')

  const cl = { x: 269, y: FEET - CLAWD.length + 1 }
  const clawd =
    `<g class="bob">` +
    sprite(CLAWD, { C: '#d97757' }, cl.x, cl.y) +
    sprite(CLAWD_EYES, { K: '#17121f' }, cl.x, cl.y, 'blink b2') +
    `</g>`

  const dog = { x: 280, y: FEET - AKITA.length + 1 }
  const akita =
    `<g class="breath">` +
    sprite(AKITA, AKITA_PAL, dog.x, dog.y) +
    sprite(AKITA_EARS, AKITA_PAL, dog.x, dog.y, 'ears') +
    `<rect class="blink b1" x="${dog.x + AKITA_EYE}" y="${dog.y + 4}" width="1" height="1" fill="#17121f"/>` +
    `</g>`

  return lantern + clawd + akita
}

function fireflies(): string {
  let out = ''
  const homes: [number, number][] = [[246, 126], [292, 106], [318, 124]]
  homes.forEach(([x, y], i) => {
    out +=
      `<g class="fly f${i}"><g class="glim">` +
      `<rect x="${x - 1}" y="${y - 1}" width="3" height="3" fill="#f6e58d" opacity=".18"/>` +
      `<rect x="${x}" y="${y}" width="1" height="1" fill="#fbf1b0"/></g></g>`
  })
  return out
}

// --- petals leaving the tree on a slow breeze from the right -----------------

function petals(): string {
  const starts: [number, number][] = [[0, 0], [14, -6], [-10, 8], [22, 10], [6, -12], [-18, 2]]
  return starts
    .map(
      ([dx, dy], i) =>
        `<g transform="translate(${dx} ${dy})"><g class="petal p${i}"><rect x="0" y="0" width="2" height="1" fill="#f3b6c9"/><rect x="1" y="1" width="1" height="1" fill="#e595b0"/></g></g>`,
    )
    .join('')
}

const STYLE = `
.tw{animation:tw 6s ease-in-out infinite}
.tw1{animation-duration:8s;animation-delay:-3s}.tw2{animation-duration:11s;animation-delay:-7s}
.tw3{animation-duration:7s;animation-delay:-5s}.tw4{animation-duration:13s;animation-delay:-2s}
@keyframes tw{0%,100%{opacity:1}50%{opacity:.2}}

.cloud{animation:drift 220s linear infinite}
.c2{animation-duration:320s;animation-delay:-150s}
.c1{animation-delay:-60s}
@keyframes drift{from{transform:translateX(-80px)}to{transform:translateX(${W + 20}px)}}

.glow{animation:glow 9s ease-in-out infinite}
.g1{opacity:.08}.g2{opacity:.04;animation-delay:-4.5s}
@keyframes glow{50%{opacity:.13}}

.sh{animation:sh 5s ease-in-out infinite}
.sh1{animation-delay:-1.3s;animation-duration:6s}.sh2{animation-delay:-2.9s;animation-duration:4.4s}.sh3{animation-delay:-4s;animation-duration:7s}
@keyframes sh{0%,100%{opacity:.55;transform:translateX(0)}50%{opacity:.15;transform:translateX(1px)}}
.ripple{opacity:.5;animation:sh 6s ease-in-out infinite}

.halo{opacity:.07;animation:flick 4s ease-in-out infinite}
.flame,.win{animation:flame 4s ease-in-out infinite}
.win{animation-duration:6s;animation-delay:-2s}
@keyframes flick{30%{opacity:.11}55%{opacity:.06}80%{opacity:.1}}
@keyframes flame{30%{opacity:.8}55%{opacity:1}80%{opacity:.9}}

.canopy{transform-origin:306px ${BANK_TOP}px;animation:sway 12s ease-in-out infinite}
@keyframes sway{50%{transform:rotate(-.6deg)}}

.breath{transform-origin:290px ${BANK_TOP}px;animation:breath 5.5s ease-in-out infinite}
@keyframes breath{50%{transform:scaleY(1.025)}}
.ears{animation:ears 13s ease-in-out infinite}
@keyframes ears{0%,90%,96%,100%{transform:translateY(0)}92%,94%{transform:translateY(.6px)}}

.blink{animation:blink 7s step-end infinite}
.b2{animation-duration:9s;animation-delay:-4s}
@keyframes blink{0%,100%{opacity:1}96%{opacity:0}98%{opacity:1}}
.bob{animation:bob 4.5s ease-in-out infinite;animation-delay:-1.5s}
@keyframes bob{50%{transform:translateY(-.8px)}}

.fly{animation:wander 19s ease-in-out infinite}
.f1{animation-duration:26s;animation-delay:-8s}.f2{animation-duration:31s;animation-delay:-17s}
@keyframes wander{0%,100%{transform:translate(0,0)}25%{transform:translate(-6px,-4px)}50%{transform:translate(-2px,-9px)}75%{transform:translate(5px,-3px)}}
.glim{animation:glim 5s ease-in-out infinite}
.f1 .glim{animation-duration:7s;animation-delay:-2s}.f2 .glim{animation-duration:6s;animation-delay:-4s}
@keyframes glim{0%,100%{opacity:.15}40%,60%{opacity:1}}

.petal{opacity:0;animation:fall 30s linear infinite}
.p1{animation-duration:36s;animation-delay:-9s}.p2{animation-duration:28s;animation-delay:-17s}
.p3{animation-duration:41s;animation-delay:-25s}.p4{animation-duration:33s;animation-delay:-31s}
.p5{animation-duration:38s;animation-delay:-4s}
@keyframes fall{
0%{opacity:0;transform:translate(296px,66px) rotate(0)}
6%{opacity:.9}
25%{transform:translate(272px,84px) rotate(-90deg)}
50%{transform:translate(246px,100px) rotate(-180deg)}
75%{transform:translate(218px,118px) rotate(-270deg)}
94%{opacity:.9}
100%{opacity:0;transform:translate(190px,136px) rotate(-360deg)}}

@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`

// One scale for every layer; only the crop anchor differs.
const layer = (align: string, body: string) =>
  `<svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="${align} slice" overflow="hidden">${body}</svg>`

export const SCENE =
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" shape-rendering="crispEdges">` +
  `<style>${STYLE}</style>` +
  layer('xMidYMid', sky() + stars()) +
  layer('xMaxYMid', moon()) +
  layer('xMidYMid', clouds() + mountains() + water()) +
  layer('xMaxYMid', moonPath() + torii() + bank() + tree() + friends() + fireflies() + petals()) +
  `</svg>`
