import $ from 'jquery'
import { config } from '../config.js'
import { uiController } from '../controllers/uiController.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { trackPage } from '../controllers/trackingController.js'
import { stepCircle } from '../scene3d/stepCircle.js'
import { EKTweener } from '../ektweener.js'

let container
let textLines
let completeCounter = 0

function preInit() {
  textLines = $('.preloader-text-line')
}

function bindLoading() {
  preloaderController.onLoading.add(onLoading)
}

function onLoading(value) {
  EKTweener.to(stepCircle.uniforms.fading, config.SKIP_PRELOADER ? 0 : 1, {
    value: 1,
    ease: 'easeInSine',
  })
  EKTweener.to(stepCircle.uniforms.animationRatio, config.SKIP_PRELOADER ? 0 : 10, {
    value: 1,
    ease: 'easeInSine',
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
  container.show()
  EKTweener.to(textLines[0], config.SKIP_PRELOADER ? 0 : 2, {
    opacity: 0.5,
    ease: 'linear',
  })
  EKTweener.to(textLines[1], config.SKIP_PRELOADER ? 0 : 2, {
    delay: config.SKIP_PRELOADER ? 0 : 2,
    opacity: 0.5,
    ease: 'linear',
    onComplete() {
      setTimeout(fadeOutFirstPair, config.SKIP_PRELOADER ? 0 : 2500)
    },
  })
}

function fadeOutFirstPair() {
  EKTweener.to(textLines[0], config.SKIP_PRELOADER ? 0 : 1, {
    opacity: 0,
    ease: 'linear',
  })
  EKTweener.to(textLines[1], config.SKIP_PRELOADER ? 0 : 1, {
    opacity: 0,
    ease: 'linear',
    onComplete() {
      textLines[0].style.display = textLines[1].style.display = 'none'
      EKTweener.to(textLines[2], config.SKIP_PRELOADER ? 0 : 2, {
        opacity: 0.5,
        ease: 'linear',
      })
      EKTweener.to(textLines[3], config.SKIP_PRELOADER ? 0 : 2, {
        delay: config.SKIP_PRELOADER ? 0 : 2,
        opacity: 0.5,
        ease: 'linear',
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
  EKTweener.to(textLines[2], config.SKIP_PRELOADER ? 0 : 1, {
    opacity: 0,
    ease: 'linear',
  })
  EKTweener.to(textLines[3], config.SKIP_PRELOADER ? 0 : 1, {
    opacity: 0,
    ease: 'linear',
    onComplete() {
      uiController._appInitFunc()
      container.hide()
    },
  })
}

function init() {
  container = $('.preloader')
  preInit()
  bindLoading()
  start()
}

export const preloader = {
  init,
}
