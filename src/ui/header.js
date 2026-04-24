import $ from 'jquery'
import { config } from '../config.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { animator } from '../animation/animator.js'

let container
let bg
let _fadeContainer
let canvas
let ctx
let percentNum
let uiAsset

const fadeState = { fading: 100 }
let targetFading
let isRetina
const spriteRect = { x: 0, y: 356, width: 266, height: 44 }

function preInit() {
  container = $('.header')
  bg = $('.header-bg')
  _fadeContainer = $('.header-description, .header-fade-container')
  preloaderController.add(container)
}

function init() {
  setupCanvas()
  postSetup()
  render()
}

function setupCanvas() {
  isRetina = config.isRetina
  targetFading = config.settings.fading

  $('.header-logo').remove()
  canvas = document.createElement('canvas')
  canvas.className = 'header-logo'

  if (isRetina) {
    for (const key in spriteRect) spriteRect[key] *= 2
  }

  canvas.width = spriteRect.width
  canvas.height = spriteRect.height
  ctx = canvas.getContext('2d')
  uiAsset = config.uiAsset

  container.find('.header-content').prepend(canvas)
  percentNum = $('.header-fade-percent-num')
  percentNum.html((100 - config.settings.fading) | 0)
}

// NOTE: empty function in original (w) — preserved as no-op
function postSetup() {}

function render() {
  const ratio = fadeState.fading / 100
  const filledWidth = spriteRect.width * ratio
  ctx.clearRect(0, 0, spriteRect.width, spriteRect.height)
  ctx.drawImage(
    uiAsset,
    spriteRect.x,
    spriteRect.y,
    spriteRect.width,
    spriteRect.height,
    0,
    0,
    spriteRect.width,
    spriteRect.height,
  )
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = '#404040'
  ctx.fillRect(filledWidth, 0, spriteRect.width - filledWidth, spriteRect.height)
  ctx.restore()
}

// NOTE: param `duration` compared to undeclared `s` in original (always undefined),
// so calling animateFading() with no arg yields duration=2; otherwise uses `duration`. Preserved.
function animateFading(duration) {
  animator.to(fadeState, {
    duration: duration === undefined ? 2 : duration,
    fading: targetFading,
    ease: 'circ.out',
    onUpdate: render,
  })
}

function show() {
  container.show()
  animator.fromTo(container[0], { opacity: 0 }, { duration: 0.5, opacity: 1, ease: 'none' })
  animateFading()
}

function showBg() {
  animator.to(bg[0], { duration: 1.3, scaleY: 1, ease: 'circ.out' })
}

function hideBg() {
  animator.to(bg[0], { duration: 1.3, scaleY: 0, ease: 'circ.out' })
}

function updateFading(ratio) {
  const next = ratio * 100
  if (ratio * 100 !== config.settings.fading) {
    animator.killTweensOf(fadeState)
    fadeState.fading = next
    if (ctx) render()
  }
}

function changeHeight(height) {
  container.height(height)
}

export const header = {
  preInit,
  init,
  render,
  animateFading,
  show,
  showBg,
  hideBg,
  updateFading,
  changeHeight,
}
