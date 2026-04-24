import $ from 'jquery'
import { inputController } from '../controllers/inputController.js'
import { trackPage } from '../controllers/trackingController.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { animator } from '../animation/animator.js'

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
  animator.fromTo(wrapper[0], { x: 332 }, { duration: 0.5, x: 0, ease: 'circ.out' })
  container.find('.bss-inner > *').each(function (i) {
    animator.set(this, {
      y: 30,
      opacity: 0,
    })
    animator.to(this, {
      duration: 0.5,
      opacity: 1,
      ease: 'none',
      delay: 0.1 * i,
    })
    animator.to(this, {
      duration: 0.5,
      y: 0,
      ease: 'circ.out',
      delay: 0.1 * i,
    })
  })
}

function hide() {
  if (!isVisible) return
  isVisible = false
  animator.to(wrapper[0], {
    duration: 0.5,
    x: 332,
    ease: 'circ.out',
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
