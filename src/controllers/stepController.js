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
import { animator } from '../animation/animator.js'
import { hide as hideElement, qs, qsa, show as showElement, toggleClass } from '../utils/dom.js'

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
}

function cacheElements() {
  container = qs('.add-steps')
  indicators = qsa('.add-steps-indicator')
  backBtn = qs('.add-steps-back-btn')
  validateBtn = qs('.add-steps-validate-btn')
}

function registerSteps() {
  for (let i = 0, len = STEPS.length; i < len; i++) {
    const step = STEPS[i]
    stepsById[step.id] = step
    step.init()
  }
}

function bindEvents() {
  backBtn.circleBtn.onClicked.add(onBackClicked)
  validateBtn.circleBtn.onClicked.add(onValidateClicked)
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

function goToStep(id) {
  const step = stepsById[id]
  const animationDuration = step.animationDuration === undefined ? 1 : step.animationDuration
  trackPage({ trackPage: 'memory-post-' + (STEPS.indexOf(step) + 1) })
  if (step !== currentStep) {
    if (currentStep) currentStep.hide()
    indicators.forEach((indicator, i) => {
      toggleClass(indicator, 'selected', i === step.indicatorIndex)
    })
    animator.killTweensOf(stepCircle.uniforms.animationRatio, 'value')
    animator.to(stepCircle.uniforms.animationRatio, {
      duration: animationDuration,
      value: step.animationIndex,
      ease: 'sine.out',
    })
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
  showElement(container)
  animator.killTweensOf(stepCircle.uniforms.opacity, 'value')
  animator.to(stepCircle.uniforms.opacity, { duration: 0.5, value: 1, ease: 'circ.out' })
  animator.killTweensOf(container, 'opacity')
  animator.fromTo(container, { opacity: 0 }, { duration: 0.5, opacity: 1, ease: 'none' })
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
  indicators.forEach((indicator) => toggleClass(indicator, 'selected', false))
  currentStep = null
  animator.killTweensOf(stepCircle.uniforms.opacity, 'value')
  animator.to(stepCircle.uniforms.opacity, { duration: 0.5, value: 0, ease: 'circ.out' })
  animator.killTweensOf(postSubmitCircle.uniforms.fade, 'value')
  animator.to(postSubmitCircle.uniforms.fade, { duration: 0.5, value: 0, ease: 'circ.out' })
  animator.killTweensOf(container, 'opacity')
  animator.to(container, {
    duration: 0.5,
    opacity: 0,
    ease: 'none',
    onComplete() {
      hideElement(container)
      animator.killTweensOf(stepCircle.uniforms.animationRatio, 'value')
      animator.set(stepCircle.uniforms.animationRatio, { value: 0 })
    },
  })
  tutorialController.show()
  uiController.showNav()
}

function showBackBtn(callback) {
  backCallback = callback
  showElement(backBtn)
  animator.killTweensOf(backBtn, 'opacity,x')
  animator.to(backBtn, {
    duration: 0.5,
    opacity: 1,
    x: 0,
    ease: 'circ.out',
  })
}

function hideBackBtn() {
  animator.killTweensOf(backBtn, 'opacity,x')
  animator.to(backBtn, {
    duration: 0.5,
    opacity: 0,
    x: -40,
    ease: 'circ.out',
    onComplete() {
      hideElement(backBtn)
    },
  })
}

function enableBackBtn() {
  backBtn.circleBtn.enable()
}

function disableBackBtn() {
  backBtn.circleBtn.disable()
}

function showValidateBtn(callback) {
  validateCallback = callback
  showElement(validateBtn)
  animator.killTweensOf(validateBtn, 'opacity,x')
  animator.to(validateBtn, {
    duration: 0.5,
    opacity: 1,
    x: 0,
    ease: 'circ.out',
  })
}

// NOTE: original tweens opacity to 1 (not 0) on hide. Also slides to +40px.
// Looks like a typo (the back button sets opacity:0 in its hide), but kept
// verbatim — visual quirk in the archived bundle.
function hideValidateBtn() {
  animator.killTweensOf(validateBtn, 'opacity,x')
  animator.to(validateBtn, {
    duration: 0.5,
    opacity: 1,
    x: 40,
    ease: 'circ.out',
    onComplete() {
      hideElement(validateBtn)
    },
  })
}

function enableValidateBtn() {
  validateBtn.circleBtn.enable()
}

function disableValidateBtn() {
  validateBtn.circleBtn.disable()
}

export const stepController = {
  data: {},
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
}
