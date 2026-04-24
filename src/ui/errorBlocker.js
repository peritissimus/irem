import { config } from '../config.js'
import { scene3dController } from '../controllers/scene3dController.js'
import { inputController } from '../controllers/inputController.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { animator } from '../animation/animator.js'
import { hide as hideElement, qs, show as showElement, withDescendants } from '../utils/dom.js'

// NOTE: original imported `mout/lang/isArray` — replaced with the native
// `Array.isArray`. Also, two unused locals (`f`, `l`) from the minified
// factory header were dropped.

let container
let messagesContainer
let messageTemplate
let pendingCallback = null
const queue = []
let isVisible = false

function preInit() {
  container = qs('.error-blocker')
  preloaderController.add(withDescendants(container))
}

function init() {
  cacheElements()
  bindEvents()
}

function cacheElements() {
  messagesContainer = qs('.error-blocker-messages-container')
  messageTemplate = qs('.error-blocker-message')
  messageTemplate.remove()
}

function bindEvents() {
  inputController.add(container, 'click', onContainerClick)
}

function onContainerClick() {
  hide()
}

function errorHandler(payload) {
  const fallback = config.ERROR_MESSAGES.unexpected
  show(payload && payload.errorMsg ? payload.errorMsg : fallback)
}

function show(messages, callback) {
  if (isVisible) {
    queue.push([messages, callback])
    return
  }
  isVisible = true
  pendingCallback = callback

  const fallback = config.ERROR_MESSAGES.unexpected
  let list = messages
  if (!Array.isArray(list)) list = [list]

  for (let i = 0, len = list.length; i < len; i++) {
    const node = messageTemplate.cloneNode(true)
    let msg = list[i]
    if (msg) {
      if (config.ERROR_MESSAGES[msg]) msg = config.ERROR_MESSAGES[msg]
    } else {
      msg = fallback
    }
    node.innerHTML = msg
    messagesContainer.append(node)
  }

  animator.killTweensOf(scene3dController.customShader.uniforms.alpha, 'value')
  animator.to(scene3dController.customShader.uniforms.alpha, {
    duration: 1,
    value: 0.2,
    ease: 'circ.out',
  })
  showElement(container)
}

function hide() {
  if (pendingCallback) pendingCallback()
  pendingCallback = null
  isVisible = false
  hideElement(container)
  animator.killTweensOf(scene3dController.customShader.uniforms.alpha, 'value')
  animator.to(scene3dController.customShader.uniforms.alpha, {
    duration: 1,
    value: config.DEFAULT_NOISE_RATIO,
    ease: 'circ.out',
  })
  messagesContainer.replaceChildren()
  if (queue.length > 0) {
    const next = queue.shift()
    show.apply(this, next)
  }
}

export const errorBlocker = {
  get container() {
    return container
  },
  preInit,
  init,
  errorHandler,
  show,
  hide,
}
