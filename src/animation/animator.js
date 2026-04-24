import { gsap } from 'gsap'

export const animator = {
  to(target, vars) {
    return gsap.to(target, vars)
  },

  fromTo(target, fromVars, toVars) {
    return gsap.fromTo(target, fromVars, toVars)
  },

  set(target, vars) {
    return gsap.set(target, vars)
  },

  timeline(vars) {
    return gsap.timeline(vars)
  },

  killTweensOf(target, properties) {
    return gsap.killTweensOf(target, properties)
  },

  ticker: gsap.ticker,
}

export { gsap }
