import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE } from './scene.ts'

// Moonlit indigo; accents from sakura, torii vermilion, lantern amber.
const { theme, problems } = makeColors({
  label: 'Yoru',
  only: 'dark',
  roles: { accent: '#f0a6c0', danger: '#e5605a', success: '#8fc79a', warning: '#e8b964', pro: '#a99cf0' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#12112a',
        'surface-1': '#171631',
        'surface-2': '#1c1a38',
        'surface-3': '#211f3f',
        'text-primary': '#ece6f5',
        'text-secondary': '#c9c1dc',
        'text-muted': '#a39bbb',
      },
    },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'yoru', glass: { blur: 10, tint: '#12112a', opacity: 0.62 } },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)

    const set = await $.theme.set(LOOK)
    if (!set.isDrawn) $.ui.status(set.reason)

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== 'yoru') return next(e)
    const { Svg } = $.ui.resolve(e)
    return <Svg source={SCENE} alt="Pixel night by a lake: an Akita and Clawd sit beside a stone lantern, watching the moon" isInteractive />
  })
}
