import $ from 'jquery'
import clamp from 'mout/math/clamp'
import { config } from '../config.js'
import { stageReference } from '../stageReference.js'
import { EKTweener } from '../ektweener.js'

// NOTE: original imported `mout/math/norm` which throws outside [min, max]
// (differs from the archived bundle). Replaced with the local
// `clampedNorm` helper. Also dropped unused module-local `u`.

const TWO_PI = Math.PI * 2
const CANVAS_SIZE = 160
const CANVAS_CENTER = CANVAS_SIZE / 2
const PAGE_IDS = ['nav', 'zoom', 'click']

const cursorSprite = { x: 110, y: 160, width: 39, height: 70 }
const ringSprite = { x: 170, y: 160, width: 44, height: 28 }
const SPRITES = [cursorSprite, ringSprite]

let container
let pageElements = {}
let pages = []
let currentPage
let currentPageId
let canvasContexts = {}
let frameCounts = {}
let elapsed = 0
let lastTime = 0
let isRetina

function clampedNorm(value, min, max) {
  const ratio = (value - min) / (max - min)
  if (ratio < 0) return 0
  if (ratio > 1) return 1
  return ratio
}

function easeInOutCubic(t) {
  if ((t /= 0.5) < 1) return 0.5 * t * t * t
  t -= 2
  return 0.5 * (t * t * t + 2)
}

function easeOutCubic(t) {
  t -= 1
  return t * t * t + 1
}

function init() {
  container = $('.tutorials')
  setupPages()
  postSetup()
}

function setupPages() {
  isRetina = config.isRetina

  let id
  let pageEl
  let canvas
  for (let i = 0, len = PAGE_IDS.length; i < len; i++) {
    id = PAGE_IDS[i]
    pageEl = $('.tutoral-page-' + id)
    canvas = document.createElement('canvas')
    canvas.width = canvas.height = CANVAS_SIZE
    pageEl.find('.tutorial-page-icon').append(canvas)
    canvasContexts[id] = canvas.getContext('2d')
    pages.push((pageElements[id] = pageEl[0]))
    pageEl[0].__id = id
    frameCounts[id] = 0
  }

  if (isRetina) {
    for (let i = 0, len = SPRITES.length; i < len; i++) {
      const sprite = SPRITES[i]
      for (const key in sprite) sprite[key] *= 2
    }
  }
}

// NOTE: empty function in original (L) — preserved as no-op.
function postSetup() {}

function complete(id) {
  const el = pageElements[id]
  if (el && !el.__completed) {
    el.__completed = true
    tutorialController.completed[id] = true
    const allDone = (tutorialController.allCompleted = areAllCompleted())
    if (currentPage === el) {
      if (allDone) hide()
      else switchToPage(firstUncompleted())
    }
  }
}

function areAllCompleted() {
  if (tutorialController.allCompleted) return true
  for (let i = 0, len = pages.length; i < len; i++) {
    if (!pages[i].__completed) return false
  }
  return true
}

function firstUncompleted() {
  let last
  for (let i = 0, len = pages.length; i < len; i++) {
    last = pages[i]
    if (!last.__completed) return last
  }
  return last
}

function show() {
  if (tutorialController.allCompleted) return
  lastTime = +new Date()
  container.show()
  EKTweener.to(container, 0.5, { opacity: 1, ease: 'linear' })
  switchToPage(firstUncompleted())
  stageReference.onRender.add(renderTick)
}

function drawSprite(ctx, sprite) {
  const uiAsset = config.uiAsset
  if (isRetina) {
    ctx.drawImage(
      uiAsset,
      sprite.x,
      sprite.y,
      sprite.width,
      sprite.height,
      -sprite.width / 4,
      -sprite.height / 4,
      sprite.width / 2,
      sprite.height / 2,
    )
  } else {
    ctx.drawImage(
      uiAsset,
      sprite.x,
      sprite.y,
      sprite.width,
      sprite.height,
      -sprite.width / 2,
      -sprite.height / 2,
      sprite.width,
      sprite.height,
    )
  }
}

function renderTick() {
  const ctx = canvasContexts[currentPageId]
  let frame = frameCounts[currentPageId]++
  let t
  const now = +new Date()

  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1
  ctx.fillStyle = '#fff'

  const dt = now - lastTime
  const beforeBucket = ~~(elapsed / 1000 / 4)
  elapsed += dt
  const afterBucket = ~~(elapsed / 1000 / 4)
  lastTime = now

  if (beforeBucket !== afterBucket) {
    if (afterBucket === 1) complete(PAGE_IDS[0])
    else if (afterBucket === 2) complete(PAGE_IDS[1])
    else if (afterBucket >= 3) {
      tutorialController.allCompleted = true
      hide()
    }
    return
  }

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  ctx.save()
  ctx.translate(CANVAS_CENTER, CANVAS_CENTER)

  if (currentPageId === 'nav') {
    frame = clamp(frame, 0, 200)
    t = (frame % 100) * 2.5
    ctx.save()
    ctx.translate(0, -64)
    drawWavePattern(ctx, t)
    ctx.restore()
    ctx.save()
    ctx.rotate(Math.PI / 2)
    ctx.translate(0, -64)
    drawWavePattern(ctx, t)
    ctx.restore()
    ctx.save()
    ctx.rotate(Math.PI)
    ctx.translate(0, -64)
    drawWavePattern(ctx, t)
    ctx.restore()
    ctx.save()
    ctx.rotate(-Math.PI / 2)
    ctx.translate(0, -64)
    drawWavePattern(ctx, t)
    ctx.restore()
    ctx.translate(0, 50)
    t = (frame * 0.05) % 10
    t = clampedNorm(t, 2, 9)
    ctx.rotate(((-Math.sin(t * Math.PI * 2) * 10) / 180) * Math.PI)
    ctx.translate(0, -50)
    ctx.beginPath()
    ctx.arc(0, -20, 2.5, 0, TWO_PI, false)
    ctx.fill()
    drawSprite(ctx, cursorSprite)
    ctx.restore()
  }

  if (currentPageId === 'zoom') {
    frame = clamp(frame, 0, 200)
    t = ((frame / 2) % 100) * 5
    ctx.save()
    ctx.translate(0, -60)
    drawWavePattern(ctx, t)
    ctx.restore()
    t = (((frame / 2 + 50) % 100)) * 5
    ctx.save()
    ctx.rotate(Math.PI)
    ctx.translate(0, -12)
    drawWavePattern(ctx, t)
    ctx.restore()
    ctx.beginPath()
    t = (frame % 200) * 5
    let arcOffset = clampedNorm(t, 0, 100) * (Math.PI / 2)
    arcOffset += clampedNorm(t, 400, 600) * Math.PI
    arcOffset += clampedNorm(t, 900, 1000) * (Math.PI / 2)
    ctx.arc(0, -20 - Math.sin(arcOffset) * 5, 2.5, 0, TWO_PI, false)
    ctx.fill()
    drawSprite(ctx, cursorSprite)
  }

  if (currentPageId === 'click') {
    frame = clamp(frame, 0, 200)
    ctx.save()
    drawSprite(ctx, ringSprite)
    t = frame % 100
    t = t < 20 ? 1 : clampedNorm(t, 20, 30)
    const yScale = Math.abs(Math.sin((t * Math.PI) / 2))
    ctx.scale(1, yScale)
    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()
    ctx.arc(0, -11, 25, 0, TWO_PI, true)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0, 11, 25, 0, TWO_PI, false)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.scale(1, yScale)
    ctx.beginPath()
    ctx.arc(0, 11, 25, 0, TWO_PI, true)
    ctx.clip()
    ctx.beginPath()
    ctx.arc(0, -11, 25, 0, TWO_PI, false)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, -11, 25, 0, TWO_PI, true)
    ctx.clip()
    ctx.beginPath()
    ctx.arc(0, 11, 25, 0, TWO_PI, false)
    ctx.stroke()
    ctx.restore()

    t = clampedNorm(frame % 200, 20, 40)
    ctx.save()
    ctx.translate(0, -20)
    drawArrow(ctx, t)
    ctx.restore()
    ctx.save()
    ctx.rotate(Math.PI / 2)
    ctx.translate(0, -20)
    drawArrow(ctx, t)
    ctx.restore()
    ctx.save()
    ctx.rotate(Math.PI)
    ctx.translate(0, -20)
    drawArrow(ctx, t)
    ctx.restore()
    ctx.save()
    ctx.rotate(-Math.PI / 2)
    ctx.translate(0, -20)
    drawArrow(ctx, t)
    ctx.restore()

    t = clampedNorm(frame % 200, 25, 45)
    ctx.save()
    ctx.rotate(Math.PI / 4)
    ctx.translate(0, -20)
    drawArrow(ctx, t)
    ctx.restore()
    ctx.save()
    ctx.rotate((Math.PI * 3) / 4)
    ctx.translate(0, -20)
    drawArrow(ctx, t)
    ctx.restore()
    ctx.save()
    ctx.rotate((Math.PI * 5) / 4)
    ctx.translate(0, -20)
    drawArrow(ctx, t)
    ctx.restore()
    ctx.save()
    ctx.rotate((Math.PI * 7) / 4)
    ctx.translate(0, -20)
    drawArrow(ctx, t)
    ctx.restore()
  }

  ctx.restore()
}

function drawWavePattern(ctx, t) {
  let radius
  ctx.save()

  ctx.globalAlpha = 1 - Math.abs(clampedNorm(t, 0, 100) - 0.5) * 2
  radius = clampedNorm(t, 0, 50)
  ctx.beginPath()
  ctx.arc(0, 18, 1.75 * radius, 0, TWO_PI, false)
  ctx.fill()

  ctx.globalAlpha = 1 - Math.abs(clampedNorm(t, 25, 125) - 0.5) * 2
  radius = clampedNorm(t, 25, 75)
  ctx.beginPath()
  ctx.arc(0, 13, 1.75 * radius, 0, TWO_PI, false)
  ctx.fill()

  ctx.globalAlpha = 1 - Math.abs(clampedNorm(t, 50, 150) - 0.5) * 2
  radius = clampedNorm(t, 50, 100)
  ctx.beginPath()
  ctx.arc(0, 8, 1.75 * radius, 0, TWO_PI, false)
  ctx.fill()

  ctx.globalAlpha = 1 - Math.abs(clampedNorm(t, 75, 175) - 0.5) * 2
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-2.75, 2.75)
  ctx.lineTo(-1.375, 4.125)
  ctx.lineTo(0, 2.75)
  ctx.lineTo(1.375, 4.125)
  ctx.lineTo(2.75, 2.75)
  ctx.lineTo(0, 0)
  ctx.fill()

  ctx.restore()
}

function drawArrow(ctx, t) {
  const inner = easeInOutCubic(t)
  ctx.save()
  ctx.globalAlpha = 1 - Math.abs(t - 0.5) * 2
  ctx.beginPath()
  ctx.moveTo(0, -60 * easeOutCubic(t))
  ctx.lineTo(-0.75, -60 * inner)
  ctx.lineTo(0.75, -60 * inner)
  ctx.fill()
  ctx.restore()
}

function hide() {
  stageReference.onRender.remove(renderTick)
  EKTweener.to(container, 0.5, {
    opacity: 0,
    ease: 'linear',
    onComplete() {
      container.hide()
    },
  })
}

function completeAll() {
  tutorialController.allCompleted = true
}

function switchToPage(pageEl) {
  if (pageEl === currentPage) return
  if (currentPage) fadeOutPage(currentPage)
  currentPage = pageEl
  currentPageId = pageEl.__id
  frameCounts[currentPageId] = 0
  EKTweener.to(pageEl, 0.3, { opacity: 1, ease: 'linear' })
}

function fadeOutPage(pageEl) {
  EKTweener.to(pageEl, 0.3, { opacity: 0, ease: 'linear' })
}

export const tutorialController = {
  allCompleted: false,
  completed: {},
  init,
  complete,
  show,
  hide,
  completeAll,
}
