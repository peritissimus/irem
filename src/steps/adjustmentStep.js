import $ from 'jquery'
import clamp from 'mout/math/clamp'
// NOTE: mout/math/lerp was declared as an AMD dep but never invoked — preserved
import lerp from 'mout/math/lerp' // eslint-disable-line no-unused-vars
// NOTE: original imported `mout/math/norm`, but that mout helper throws outside
//       [min,max]. The original always wrapped it in a clamp anyway, so we
//       inline a clampedNorm helper here per project convention.
import { config } from '../config.js'
import { stepController } from '../controllers/stepController.js'
import { inputController } from '../controllers/inputController.js'
import { postSubmitCircle } from '../scene3d/postSubmitCircle.js'
import { animator } from '../animation/animator.js'
import { stageReference } from '../stageReference.js'

const PI = Math.PI
const CANVAS_SIZE = 290
const CANVAS_CENTER = 145

// Sprite atlas coords. Mutated in initCanvas() if running on a retina display
// (matches the original's `for (var i in e) e[i] *= 2` retina branch).
const SPRITE_FRAME = { x: 261, y: 38, width: 139, height: 79 }
const SPRITE_DRAG = { x: 343, y: 0, width: 22, height: 30 }
const SPRITE_FINGER = { x: 368, y: 0, width: 29, height: 29 }
const SPRITES = [SPRITE_FRAME, SPRITE_DRAG, SPRITE_FINGER]

let container
let canvas
let ctx
let isDown = false
let renderedX = 0
let renderedY = 0
let targetX = 0
let targetY = 0
let uiAssetImage
let isRetina
let imagePadding
let halfRangeX = 0
let halfRangeY = 0
let imageWidth = 0
let imageHeight = 0
let scaleRatio = 1
let drawnWidth = 0
let drawnHeight = 0
// NOTE: this flag is assigned but never read in the original — preserved
let _isReady = false
const tweenState = { animation: 0 }
let tutorialPlayed

function init() {
  container = $('.add-steps-adjustment')
  initCanvas()
  initEvents()
}

function initCanvas() {
  canvas = document.createElement('canvas')
  canvas.width = canvas.height = CANVAS_SIZE
  ctx = canvas.getContext('2d')
  ctx.lineCap = 'round'
  container.append(canvas)
  uiAssetImage = config.uiAsset
  isRetina = config.isRetina
  imagePadding = config.POST_IMAGE_PADDING
  if (isRetina) {
    for (let i = 0, n = SPRITES.length; i < n; i++) {
      const sprite = SPRITES[i]
      for (const k in sprite) sprite[k] *= 2
    }
  }
}

function initEvents() {
  inputController.add(canvas, 'down', onDown)
  inputController.onMove.add(onMove)
  inputController.onUp.add(onUp)
}

function onDown() {
  isDown = true
}

function onMove(event) {
  if (!isDown) return
  targetX = clamp(targetX + event.deltaX / halfRangeX, -1, 1)
  targetY = clamp(targetY + event.deltaY / halfRangeY, -1, 1)
}

function onUp() {
  if (isDown) isDown = false
}

function computeLayout() {
  const image = stepController.data.image
  if (!image) return
  imageWidth = image.width
  imageHeight = image.height
  const innerSize = Math.min(imageWidth, imageHeight) - imagePadding * 2
  scaleRatio = CANVAS_SIZE / innerSize
  drawnWidth = imageWidth * scaleRatio
  drawnHeight = imageHeight * scaleRatio
  halfRangeX = (imageWidth - innerSize) / 2
  halfRangeY = (imageHeight - innerSize) / 2
}

function show() {
  renderedX = renderedY = targetX = targetY = 0
  _isReady = false
  animator.killTweensOf(container[0], 'opacity')
  animator.set(container[0], { opacity: 1 })
  computeLayout()
  canvas.style.display = 'block'
  container.show()
  startTutorialIntro()
  stageReference.onRender.add(render)
}

function hide() {
  _isReady = false
  animator.killTweensOf(container[0], 'opacity')
  animator.to(container[0], {
    duration: 0.5,
    opacity: 0,
    ease: 'none',
    onComplete() {
      container.hide()
      stageReference.onRender.remove(render)
    },
  })
}

function startTutorialIntro() {
  // First read of config.SKIP_ADJUSTMENT_TUTORIALS is lazy because config is
  // empty at module load. After the first intro plays, the local flag stays true.
  if (tutorialPlayed === undefined) {
    tutorialPlayed = config.SKIP_ADJUSTMENT_TUTORIALS
  }
  animator.killTweensOf(tweenState, 'animation')
  animator.fromTo(
    tweenState,
    { animation: 0 },
    {
      duration: tutorialPlayed ? 0 : 3.5,
      animation: 1,
      ease: 'none',
      onComplete() {
        stepController.enableBackBtn()
        stepController.enableValidateBtn()
        stepController.showBackBtn(onBackBtn)
        stepController.showValidateBtn(onValidateBtn)
        tutorialPlayed = true
        _isReady = true
        animator.killTweensOf(tweenState, 'animation')
        animator.to(tweenState, { duration: 0.5, animation: 2, ease: 'none' })
      },
    },
  )
}

function onBackBtn() {
  stepController.goToStep('upload-methods')
}

function onValidateBtn() {
  stepController.data.imgOffsetX = -renderedX
  stepController.data.imgOffsetY = -renderedY
  const submitCtx = postSubmitCircle.ctx
  submitCtx.save()
  submitCtx.translate(
    renderedX * halfRangeX * scaleRatio,
    renderedY * halfRangeY * scaleRatio,
  )
  submitCtx.drawImage(
    stepController.data.image,
    postSubmitCircle.SIZE / 2 - drawnWidth / 2,
    postSubmitCircle.SIZE / 2 - drawnHeight / 2,
    drawnWidth,
    drawnHeight,
  )
  submitCtx.restore()
  postSubmitCircle.uniforms.texture.value.needsUpdate = true
  animator.killTweensOf(postSubmitCircle.uniforms.fade, 'value')
  animator.set(postSubmitCircle.uniforms.fade, { value: 1 })
  animator.killTweensOf(postSubmitCircle.uniforms.animation, 'value')
  animator.fromTo(
    postSubmitCircle.uniforms.animation,
    { value: 0 },
    { duration: 0.35, value: 1, ease: 'none' },
  )
  canvas.style.display = 'none'
  stepController.goToStep('message')
}

function clampedNorm(value, min, max) {
  return clamp((value - min) / (max - min), 0, 1)
}

// NOTE: defined in the original but never invoked — preserved
function easeOutCubic(t) { // eslint-disable-line no-unused-vars
  t = t - 1
  return t * t * t + 1
}

function easeInOutCos(t) {
  return -(Math.cos(PI * t) - 1) / 2
}

function drawSprite(sprite) {
  if (isRetina) {
    ctx.drawImage(
      uiAssetImage,
      sprite.x, sprite.y, sprite.width, sprite.height,
      -sprite.width / 4, -sprite.height / 4,
      sprite.width / 2, sprite.height / 2,
    )
  } else {
    ctx.drawImage(
      uiAssetImage,
      sprite.x, sprite.y, sprite.width, sprite.height,
      -sprite.width / 2, -sprite.height / 2,
      sprite.width, sprite.height,
    )
  }
}

function render() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  const animation = tweenState.animation
  let t
  let dx
  let dy

  // Phase 2 (animation > 1): user image clipped into the circular mask
  if (animation > 1) {
    const alpha = animation - 1
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(CANVAS_CENTER, CANVAS_CENTER, 140, 0, 2 * Math.PI, false)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-in'
    const image = stepController.data.image
    if (image) {
      renderedX += (targetX - renderedX) * 0.2
      renderedY += (targetY - renderedY) * 0.2
      ctx.translate(
        renderedX * halfRangeX * scaleRatio,
        renderedY * halfRangeY * scaleRatio,
      )
      ctx.drawImage(
        image,
        CANVAS_CENTER - drawnWidth / 2,
        CANVAS_CENTER - drawnHeight / 2,
        drawnWidth,
        drawnHeight,
      )
    }
    ctx.restore()
  }

  // Always-on dashed circle
  ctx.beginPath()
  ctx.strokeStyle = 'rgba(255,255,255,.5)'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 5])
  ctx.arc(CANVAS_CENTER, CANVAS_CENTER, 144.5, 0, 2 * Math.PI, false)
  ctx.stroke()

  // Phase 1 (animation < 2): tutorial overlay
  if (animation < 2) {
    ctx.save()
    ctx.globalAlpha = 1 - clampedNorm(animation, 1, 2)
    const a = clamp(animation, 0, 1)

    ctx.beginPath()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.setLineDash([])
    ctx.arc(
      CANVAS_CENTER,
      CANVAS_CENTER,
      141.5,
      -PI / 2,
      -PI / 2 + Math.PI * 2 * a,
      false,
    )
    ctx.stroke()

    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255,255,255,.25)'
    ctx.lineWidth = 1
    ctx.setLineDash([3])
    ctx.arc(CANVAS_CENTER, CANVAS_CENTER, 47, 0, 2 * Math.PI, false)
    ctx.stroke()

    // Frame outline rect (slow timings: 0.1-0.425 / 0.5-0.925)
    ctx.save()
    ctx.translate(CANVAS_CENTER, CANVAS_CENTER)
    if (a < 0.5) {
      t = easeInOutCos(clampedNorm(a, 0.1, 0.425))
      dx = 0
      dy = t * 40
    } else if (a < 0.925) {
      t = easeInOutCos(clampedNorm(a, 0.5, 0.925))
      dx = t * 10
      dy = 40 + t * -50
      t = Math.sin((t * PI) / 2) * 1 - t
      dx += t * 60
    } else {
      dx = 10
      dy = -10
    }
    ctx.translate(dx, dy)
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255,255,255,.25)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    if (isRetina) {
      ctx.rect(
        -SPRITE_FRAME.width / 4,
        -SPRITE_FRAME.height / 4,
        SPRITE_FRAME.width / 2,
        SPRITE_FRAME.height / 2,
      )
    } else {
      ctx.rect(
        -SPRITE_FRAME.width / 2,
        -SPRITE_FRAME.height / 2,
        SPRITE_FRAME.width,
        SPRITE_FRAME.height,
      )
    }
    ctx.stroke()
    ctx.restore()

    // Frame sprite + drag-finger sprite (faster timings: 0.1-0.3 / 0.5-0.8)
    ctx.save()
    ctx.translate(CANVAS_CENTER, CANVAS_CENTER)
    if (a < 0.5) {
      t = easeInOutCos(clampedNorm(a, 0.1, 0.3))
      dx = 0
      dy = t * 40
    } else if (a < 0.8) {
      t = easeInOutCos(clampedNorm(a, 0.5, 0.8))
      dx = t * 10
      dy = 40 + t * -50
      t = Math.sin((t * PI) / 2) * 1 - t
      dx += t * 60
    } else {
      dx = 10
      dy = -10
    }
    ctx.translate(dx, dy)
    drawSprite(SPRITE_FRAME)
    if (a < 0.1) {
      t = easeInOutCos(1 - clampedNorm(a, 0, 0.1))
      dx = t * 12
      dy = t * -16
    } else if (a < 0.5) {
      t = 1 - Math.abs(clampedNorm(a, 0.35, 0.5) - 0.5) * 2
      dx = Math.sin((t * PI) / 2) * -5 - t * 3
      t = 1 - Math.abs(clampedNorm(a, 0.3, 0.5) - 0.5) * 2
      dy = Math.sin((t * PI) / 2) * 3 + t * 6
    } else {
      t = easeInOutCos(clampedNorm(a, 0.8, 1))
      dx = t * 8
      dy = t * -10
    }
    ctx.translate(40 + dx, 0 + dy)
    drawSprite(SPRITE_DRAG)
    ctx.restore()
    ctx.restore()
  }

  // Always-on finger sprite at center
  ctx.save()
  ctx.translate(CANVAS_CENTER, CANVAS_CENTER)
  drawSprite(SPRITE_FINGER)
  ctx.restore()
}

export const adjustmentStep = {
  id: 'adjustment',
  animationIndex: 3,
  indicatorIndex: 0,
  init,
  show,
  hide,
  render,
}

export default adjustmentStep
