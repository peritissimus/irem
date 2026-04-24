import $ from 'jquery'
import { config } from '../config.js'
import { uiController } from './uiController.js'
import { inputController } from './inputController.js'
import { tutorialController } from './tutorialController.js'
import { trackPage } from './trackingController.js'
import { stepCircle } from '../scene3d/stepCircle.js'
import { postSubmitCircle } from '../scene3d/postSubmitCircle.js'
import { scene3dController } from './scene3dController.js'
import { addOptionsStep } from '../steps/addOptionsStep.js'
import { uploadMethodsStep } from '../steps/uploadMethodsStep.js'
import { adjustmentStep } from '../steps/adjustmentStep.js'
import { messageStep } from '../steps/messageStep.js'
import { congratsStep } from '../steps/congratsStep.js'
import { EKTweener } from '../ektweener.js'

// NOTE: original AMD factory listed `signals` as a dep but body never used it.
// Dropped. Also dropped the cached selector `b = $(".add-steps-indicators,
// .add-steps-add-options-look, ...")` which was assigned but never read —
// the selector even contained a typo (".add-steps-add-steps-congrats")
// and a duplicate (".add-steps-indicators" twice). Dead code, dropped.

const STEPS = [addOptionsStep, uploadMethodsStep, adjustmentStep, messageStep, congratsStep]
const stepsById = {}

let container
let indicators
let backBtn
let validateBtn
let currentStep = null
let backCallback
let validateCallback

function init() {
  cacheElements()
  registerSteps()
  bindEvents()
  updateFading()
}

function cacheElements() {
  container = $('.add-steps')
  indicators = $('.add-steps-indicator')
  backBtn = $('.add-steps-back-btn')
  validateBtn = $('.add-steps-validate-btn')
}

function registerSteps() {
  for (let i = 0, len = STEPS.length; i < len; i++) {
    const step = STEPS[i]
    stepsById[step.id] = step
    step.init()
  }
}

function bindEvents() {
  backBtn[0].circleBtn.onClicked.add(onBackClicked)
  validateBtn[0].circleBtn.onClicked.add(onValidateClicked)
  inputController.add(container, 'click', onContainerClick)
}

function onContainerClick(event) {
  if (event.target === this && currentStep) {
    if (currentStep.onBGClick) currentStep.onBGClick()
    else hide()
  }
}

function onBackClicked() {
  backCallback()
}

function onValidateClicked() {
  validateCallback()
}

function indexOfStep(step) {
  for (let i = 0, len = STEPS.length; i < len; i++) {
    if (step === STEPS[i]) return i
  }
  return -1
}

function goToStep(id) {
  const step = stepsById[id]
  trackPage({ trackPage: 'memory-post-' + (indexOfStep(step) + 1) })
  if (step !== currentStep) {
    if (currentStep) currentStep.hide()
    indicators.removeClass('selected').eq(step.indicatorIndex).addClass('selected')
    EKTweener.to(
      stepCircle.uniforms.animationRatio,
      step.animationDuration === undefined ? 1 : step.animationDuration,
      { value: step.animationIndex, ease: 'easeOutSine' },
    )
    step.show()
    currentStep = step
  }
}

function show(id) {
  const cameraOffset = 200
  scene3dController.disableControl()
  scene3dController.resetCamera({
    lockControl: true,
    hasControl: false,
    duration: 3,
    cameraOffsetY: cameraOffset,
    lookAtOffsetY: cameraOffset + config.SCENE_CAMERA_VERTICAL_BASE_DISTANCE - 110,
  })
  if (!id) id = 'add-options'
  container.show()
  EKTweener.to(stepCircle.uniforms.opacity, 0.5, { value: 1 })
  EKTweener.fromTo(container, 0.5, { opacity: 0 }, { opacity: 1, ease: 'linear' })
  goToStep(id)
}

function hide() {
  scene3dController.resetCamera({
    lockControl: true,
    hasControl: true,
    duration: 2,
  })
  hideBackBtn()
  hideValidateBtn()
  if (currentStep) currentStep.hide()
  indicators.removeClass('selected')
  currentStep = null
  EKTweener.to(stepCircle.uniforms.opacity, 0.5, { value: 0 })
  EKTweener.to(postSubmitCircle.uniforms.fade, 0.5, { value: 0 })
  EKTweener.to(container, 0.5, {
    opacity: 0,
    ease: 'linear',
    onComplete() {
      container.hide()
      EKTweener.to(stepCircle.uniforms.animationRatio, 0, { value: 0 })
    },
  })
  tutorialController.show()
  uiController.showNav()
}

function showBackBtn(callback) {
  backCallback = callback
  backBtn.show()
  EKTweener.to(backBtn, 0.5, { opacity: 1, transform3d: 'translate3d(0,0,0)' })
}

function hideBackBtn() {
  EKTweener.to(backBtn, 0.5, {
    opacity: 0,
    transform3d: 'translate3d(-40px,0,0)',
    onComplete() {
      backBtn.hide()
    },
  })
}

function enableBackBtn() {
  backBtn[0].circleBtn.enable()
}

function disableBackBtn() {
  backBtn[0].circleBtn.disable()
}

function showValidateBtn(callback) {
  validateCallback = callback
  validateBtn.show()
  EKTweener.to(validateBtn, 0.5, { opacity: 1, transform3d: 'translate3d(0,0,0)' })
}

// NOTE: original tweens opacity to 1 (not 0) on hide. Also slides to +40px.
// Looks like a typo (the back button sets opacity:0 in its hide), but kept
// verbatim — visual quirk in the archived bundle.
function hideValidateBtn() {
  EKTweener.to(validateBtn, 0.5, {
    opacity: 1,
    transform3d: 'translate3d(40px,0,0)',
    onComplete() {
      validateBtn.hide()
    },
  })
}

function enableValidateBtn() {
  validateBtn[0].circleBtn.enable()
}

function disableValidateBtn() {
  validateBtn[0].circleBtn.disable()
}

// NOTE: empty function in original (V) — no-op preserved.
function updateFading() {}

export const stepController = {
  data: {},
  get container() {
    return container
  },
  init,
  goToStep,
  show,
  hide,
  showBackBtn,
  hideBackBtn,
  enableBackBtn,
  disableBackBtn,
  showValidateBtn,
  hideValidateBtn,
  enableValidateBtn,
  disableValidateBtn,
  updateFading,
}
