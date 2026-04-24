import $ from 'jquery'
import { config } from '../config.js'
import { postSubmitCircle } from '../scene3d/postSubmitCircle.js'
import { soundController } from '../controllers/soundController.js'
import { scene3dController } from '../controllers/scene3dController.js'
import { stepController } from '../controllers/stepController.js'
import { inputController } from '../controllers/inputController.js'
import { socialShare } from '../utils/socialUtils.js'
import { animator } from '../animation/animator.js'

// NOTE: original AMD factory listed `scene3d/stepCircle` as a dep but body
// never used it. Also captured `t.transform3DStyle` as a module-load local —
// unused. Both dropped.

let container
let shareBtn
let hideTimer
let isShown = false

function init() {
  cacheElements()
  bindEvents()
}

function cacheElements() {
  container = $('.add-steps-congrats')
  shareBtn = $('.add-steps-congrats-share')
}

function bindEvents() {
  inputController.add(shareBtn, 'click', onShareClick)
}

function onBGClick() {
  if (isShown) {
    clearTimeout(hideTimer)
    hide()
  }
}

function onShareClick() {
  const $btn = $(this)
  const type = $btn.data('type')
  socialShare(
    type,
    '/memory/' + (parseInt(stepController.data.id, 10) + config.POST_ID_OFFSET),
    type === 'twitter' ? window.TWITTER_POST_DESCRIPTION : window.POST_DESCRIPTION,
  )
}

function show() {
  isShown = false
  container.css('display', 'table')
  soundController.playAdd()
  stepController.disableBackBtn()
  stepController.disableValidateBtn()
  stepController.hideBackBtn()
  stepController.hideValidateBtn()
  animator.killTweensOf(postSubmitCircle.uniforms.animation, 'value')
  animator.to(postSubmitCircle.uniforms.animation, {
    duration: 8,
    value: 5,
    ease: 'none',
  })
  scene3dController.resetCamera({
    lockControl: true,
    hasControl: false,
    duration: 5,
    lookAt: { delay: 1.5 },
    camera: { delay: 1.5 },
  })
  animator.killTweensOf(container[0], 'opacity')
  animator.to(container[0], {
    duration: 0,
    opacity: 1,
    delay: 4,
    ease: 'none',
    onStart() {
      isShown = true
    },
    onComplete() {
      hideTimer = setTimeout(hide, 8500)
    },
  })
}

function hide() {
  animator.killTweensOf(container[0], 'opacity')
  animator.to(container[0], {
    duration: 1,
    opacity: 0,
    ease: 'circ.out',
    onComplete() {
      container.hide()
      stepController.hide()
    },
  })
}

export const congratsStep = {
  id: 'congrats',
  animationIndex: 4,
  animationDuration: 2,
  indicatorIndex: 2,
  init,
  show,
  hide,
  onBGClick,
}
