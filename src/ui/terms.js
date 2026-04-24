import $ from 'jquery'
import { inputController } from '../controllers/inputController.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { stageReference } from '../stageReference.js'
import { EKTweener } from '../ektweener.js'

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
  EKTweener.fromTo(
    wrapper,
    0.5,
    { transform3d: 'translate3d(332px,0,0)' },
    { transform3d: 'translate3d(0,0,0)' },
  )
  stageReference.onResize.add(onStageResize)
  onStageResize()
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
