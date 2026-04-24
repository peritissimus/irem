import $ from 'jquery'
import { config } from '../config.js'
import { scene3dController } from '../controllers/scene3dController.js'
import { inputController } from '../controllers/inputController.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { EKTweener } from '../ektweener.js'

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
  container = $('.error-blocker')
  preloaderController.add(container)
}

function init() {
  cacheElements()
  bindEvents()
}

function cacheElements() {
  messagesContainer = $('.error-blocker-messages-container')
  messageTemplate = $('.error-blocker-message').remove()
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
    const node = messageTemplate.clone()
    let msg = list[i]
    if (msg) {
      if (config.ERROR_MESSAGES[msg]) msg = config.ERROR_MESSAGES[msg]
    } else {
      msg = fallback
    }
    node.html(msg)
    messagesContainer.append(node)
  }

  EKTweener.to(scene3dController.customShader.uniforms.alpha, 1, { value: 0.2 })
  container.show()
}

function hide() {
  if (pendingCallback) pendingCallback()
  pendingCallback = null
  isVisible = false
  container.hide()
  EKTweener.to(scene3dController.customShader.uniforms.alpha, 1, {
    value: config.DEFAULT_NOISE_RATIO,
  })
  messagesContainer.find('> *').remove()
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
