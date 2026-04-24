import $ from 'jquery'
import { inputController } from '../controllers/inputController.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { stageReference } from '../stageReference.js'
import { animator } from '../animation/animator.js'

let container
let wrapper
let closeBtn
let isVisible = false

function preInit() {
  container = $('.terms')
  preloaderController.add(container)
}

function init() {
  cacheElements()
  bindEvents()
}

function cacheElements() {
  wrapper = $('.terms-wrapper')
  closeBtn = $('.terms-close-btn')[0].circleBtn
}

function bindEvents() {
  closeBtn.onClicked.add(onCloseClicked)
  inputController.add(container, 'click', onContainerClick)
}

function onStageResize() {
  container[0].scrollpane.onResize()
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
  container.show()
  animator.fromTo(wrapper[0], { x: 332 }, { duration: 0.5, x: 0, ease: 'circ.out' })
  stageReference.onResize.add(onStageResize)
  onStageResize()
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
