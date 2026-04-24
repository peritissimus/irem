import { inputController } from '../controllers/inputController.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { stageReference } from '../stageReference.js'
import { animator } from '../animation/animator.js'
import { hide as hideElement, qs, show as showElement, withDescendants } from '../utils/dom.js'

let container
let wrapper
let closeBtn
let isVisible = false

function preInit() {
  container = qs('.terms')
  preloaderController.add(withDescendants(container))
}

function init() {
  cacheElements()
  bindEvents()
}

function cacheElements() {
  wrapper = qs('.terms-wrapper')
  closeBtn = qs('.terms-close-btn').circleBtn
}

function bindEvents() {
  closeBtn.onClicked.add(onCloseClicked)
  inputController.add(container, 'click', onContainerClick)
}

function onStageResize() {
  container.scrollpane.onResize()
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
  showElement(container)
  animator.fromTo(wrapper, { x: 332 }, { duration: 0.5, x: 0, ease: 'circ.out' })
  stageReference.onResize.add(onStageResize)
  onStageResize()
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
  stageReference.onResize.remove(onStageResize)
}

export const terms = {
  get container() {
    return container
  },
  preInit,
  init,
  show,
  hide,
}
