import $ from 'jquery'
import { inputController } from '../controllers/inputController.js'
import { trackPage } from '../controllers/trackingController.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { EKTweener } from '../ektweener.js'

// NOTE: original AMD factory also listed `config`, `uiController`, and
// `stageReference` as deps but never used them — dropped.

let container
let wrapper
let closeBtn
let isVisible = false

function preInit() {
  container = $('.credit')
  preloaderController.add(container)
}

function init() {
  cacheElements()
  bindEvents()
}

function cacheElements() {
  wrapper = $('.credit-wrapper')
  closeBtn = $('.credit-close-btn')[0].circleBtn
}

function bindEvents() {
  closeBtn.onClicked.add(onCloseClicked)
  inputController.add(container, 'click', onContainerClick)
}

function onContainerClick(event) {
  if (event.target === this) onCloseClicked()
}

function onCloseClicked() {
  hide()
}

function show() {
  if (isVisible) return
  isVisible = true
  trackPage({ trackPage: 'footer-credits' })
  container.show()
  EKTweener.fromTo(
    wrapper,
    0.5,
    { transform3d: 'translate3d(332px,0,0)' },
    { transform3d: 'translate3d(0,0,0)' },
  )
  container.find('.bss-inner > *').each(function (i) {
    EKTweener.to(this, 0, {
      transform3d: 'translate3d(0,30px,0)',
      opacity: 0,
    })
    EKTweener.to(this, 0.5, {
      opacity: 1,
      ease: 'linear',
      delay: 0.1 * i,
    })
    // NOTE: `translateZ(0,0,0)` is malformed (translateZ takes one arg) —
    // typo in original, preserved verbatim.
    EKTweener.to(this, 0.5, {
      transform3d: 'translateZ(0,0,0)',
      delay: 0.1 * i,
    })
  })
}

function hide() {
  if (!isVisible) return
  isVisible = false
  EKTweener.to(wrapper, 0.5, {
    transform3d: 'translate3d(332px,0,0)',
    onComplete: () => {
      container.hide()
    },
  })
}

export const credit = {
  get container() {
    return container
  },
  preInit,
  init,
  show,
  hide,
}
