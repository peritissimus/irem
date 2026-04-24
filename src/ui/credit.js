import { inputController } from '../controllers/inputController.js'
import { trackPage } from '../controllers/trackingController.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { animator } from '../animation/animator.js'
import { hide as hideElement, qs, qsa, show as showElement, withDescendants } from '../utils/dom.js'

// NOTE: original AMD factory also listed `config`, `uiController`, and
// `stageReference` as deps but never used them — dropped.

let container
let wrapper
let closeBtn
let isVisible = false

function preInit() {
  container = qs('.credit')
  preloaderController.add(withDescendants(container))
}

function init() {
  cacheElements()
  bindEvents()
}

function cacheElements() {
  wrapper = qs('.credit-wrapper')
  closeBtn = qs('.credit-close-btn').circleBtn
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
  showElement(container)
  animator.fromTo(wrapper, { x: 332 }, { duration: 0.5, x: 0, ease: 'circ.out' })
  qsa('.bss-inner > *', container).forEach((node, i) => {
    animator.set(node, {
      y: 30,
      opacity: 0,
    })
    animator.to(node, {
      duration: 0.5,
      opacity: 1,
      ease: 'none',
      delay: 0.1 * i,
    })
    animator.to(node, {
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
  animator.to(wrapper, {
    duration: 0.5,
    x: 332,
    ease: 'circ.out',
    onComplete: () => {
      hideElement(container)
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
