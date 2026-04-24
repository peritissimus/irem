import $ from 'jquery'
import { stepCircle } from '../scene3d/stepCircle.js'
import { stepController } from '../controllers/stepController.js'
import { EKTweener } from '../ektweener.js'

// NOTE: original AMD factory also captured `t.transform3DStyle` as a
// module-load local — never used in body. Dropped along with the lazy-config
// concern.

let container
let shareBtn
let lookBtn
let isAdvancing = false

function init() {
  cacheElements()
  bindEvents()
}

function cacheElements() {
  container = $('.add-steps-add-options')
  shareBtn = $('.add-steps-add-options-share')
  lookBtn = $('.add-steps-add-options-look')
}

function bindEvents() {
  shareBtn[0].circleBtn.onOvered.add(onShareOver)
  shareBtn[0].circleBtn.onOuted.add(onShareOut)
  shareBtn[0].circleBtn.onClicked.add(onShareClick)
  lookBtn[0].circleBtn.onClicked.add(onLookClick)
}

function onShareOver() {
  EKTweener.to(stepCircle.uniforms.focusRatio, 0.8, {
    value: 1,
    ease: 'easeOutSine',
  })
  EKTweener.to(stepCircle.uniforms.stepExtraTimes.value, 0.8, {
    x: stepCircle.uniforms.stepExtraTimes.value.x + 5,
    ease: 'easeOutSine',
  })
}

function onShareOut() {
  if (!isAdvancing) {
    EKTweener.to(stepCircle.uniforms.focusRatio, 0.8, { value: 0 })
  }
}

function onShareClick() {
  isAdvancing = true
  stepController.goToStep('upload-methods')
}

function onLookClick() {
  stepController.hide()
}

function show() {
  isAdvancing = false
  container.show()
}

function hide() {
  container.hide()
}

export const addOptionsStep = {
  id: 'add-options',
  animationIndex: 2,
  indicatorIndex: 0,
  init,
  show,
  hide,
}
