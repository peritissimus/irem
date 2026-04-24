import { config } from '../config.js'
import { uiController } from '../controllers/uiController.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { trackPage } from '../controllers/trackingController.js'
import { stepCircle } from '../scene3d/stepCircle.js'
import { animator } from '../animation/animator.js'
import { hide as hideElement, qs, qsa, show as showElement } from '../utils/dom.js'

let container
let textLines
let completeCounter = 0

function preInit() {
  textLines = qsa('.preloader-text-line')
}

function bindLoading() {
  preloaderController.onLoading.add(onLoading)
}

function onLoading(value) {
  animator.killTweensOf(stepCircle.uniforms.fading, 'value')
  animator.to(stepCircle.uniforms.fading, {
    duration: config.SKIP_PRELOADER ? 0 : 1,
    value: 1,
    ease: 'sine.in',
  })
  animator.killTweensOf(stepCircle.uniforms.animationRatio, 'value')
  animator.to(stepCircle.uniforms.animationRatio, {
    duration: config.SKIP_PRELOADER ? 0 : 10,
    value: 1,
    ease: 'sine.in',
    onComplete() {
      if (value === 1) {
        completeCounter++
        finalize()
      }
    },
  })
}

function start() {
  trackPage({ trackPage: 'loader' })
  showElement(container)
  animator.killTweensOf(textLines[0], 'opacity')
  animator.to(textLines[0], {
    duration: config.SKIP_PRELOADER ? 0 : 2,
    opacity: 0.5,
    ease: 'none',
  })
  animator.killTweensOf(textLines[1], 'opacity')
  animator.to(textLines[1], {
    duration: config.SKIP_PRELOADER ? 0 : 2,
    delay: config.SKIP_PRELOADER ? 0 : 2,
    opacity: 0.5,
    ease: 'none',
    onComplete() {
      setTimeout(fadeOutFirstPair, config.SKIP_PRELOADER ? 0 : 2500)
    },
  })
}

function fadeOutFirstPair() {
  animator.killTweensOf(textLines[0], 'opacity')
  animator.to(textLines[0], {
    duration: config.SKIP_PRELOADER ? 0 : 1,
    opacity: 0,
    ease: 'none',
  })
  animator.killTweensOf(textLines[1], 'opacity')
  animator.to(textLines[1], {
    duration: config.SKIP_PRELOADER ? 0 : 1,
    opacity: 0,
    ease: 'none',
    onComplete() {
      textLines[0].style.display = textLines[1].style.display = 'none'
      animator.killTweensOf(textLines[2], 'opacity')
      animator.to(textLines[2], {
        duration: config.SKIP_PRELOADER ? 0 : 2,
        opacity: 0.5,
        ease: 'none',
      })
      animator.killTweensOf(textLines[3], 'opacity')
      animator.to(textLines[3], {
        duration: config.SKIP_PRELOADER ? 0 : 2,
        delay: config.SKIP_PRELOADER ? 0 : 2,
        opacity: 0.5,
        ease: 'none',
        onComplete() {
          setTimeout(
            () => {
              completeCounter++
              finalize()
            },
            config.SKIP_PRELOADER ? 0 : 2500,
          )
        },
      })
    },
  })
}

function finalize() {
  if (completeCounter !== 2) return
  animator.killTweensOf(textLines[2], 'opacity')
  animator.to(textLines[2], {
    duration: config.SKIP_PRELOADER ? 0 : 1,
    opacity: 0,
    ease: 'none',
  })
  animator.killTweensOf(textLines[3], 'opacity')
  animator.to(textLines[3], {
    duration: config.SKIP_PRELOADER ? 0 : 1,
    opacity: 0,
    ease: 'none',
    onComplete() {
      uiController._appInitFunc()
      hideElement(container)
    },
  })
}

function init() {
  container = qs('.preloader')
  preInit()
  bindLoading()
  start()
}

export const preloader = {
  init,
}
