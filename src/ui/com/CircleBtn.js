import signals from '../../events/signal.js'
import { config } from '../../config.js'
import { inputController } from '../../controllers/inputController.js'
import { animator } from '../../animation/animator.js'
import { qs } from '../../utils/dom.js'

function clampedNorm(value, min, max) {
  const normalized = (value - min) / (max - min)
  if (normalized < 0) return 0
  if (normalized > 1) return 1
  return normalized
}

function lerp(start, end, ratio) {
  return start + (end - start) * ratio
}

function easeOutCubic(t) {
  const x = t - 1
  return x * x * x + 1
}

export class CircleBtn {
  constructor(options) {
    Object.assign(this, { target: null }, options)
    this._init()
  }

  _init() {
    const el = this.target
    this.el = el
    el.circleBtn = this

    this.size = Number(el.dataset.size) || 44
    this.strokeWidth = Number(el.dataset.strokeWidth) || 2
    this.strokeWidthOffset = Number(el.dataset.strokeWidthOffset) || 1
    this.innerSize = this.size - (this.strokeWidth + this.strokeWidthOffset) * 2

    this.iconWrapper = qs('.circle-btn-icon-wrapper', el)
    this.iconWrapper.style.width = `${this.innerSize}px`
    this.iconWrapper.style.height = `${this.innerSize}px`

    this.outline = document.createElement('canvas')
    this.outline.className = 'circle-btn-outline'
    this.outline.style.left = `${-this.strokeWidth - this.strokeWidthOffset}px`
    this.outline.style.top = `${-this.strokeWidth - this.strokeWidthOffset}px`
    this.outline.width = this.outline.height = this.size
    this.outlineCtx = this.outline.getContext('2d')
    this.iconWrapper.prepend(this.outline)

    this.iconStyle = qs('.circle-btn-icon', this.iconWrapper).style
    this.transform3DStyle = config.transform3DStyle

    this.isDimmed = el.classList.contains('circle-btn-style-dim')
    this.isDisable = el.classList.contains('circle-btn-state-disable')
    this.isActive = true
    this.hoverAnimation = 0

    this.onOvered = new signals.Signal()
    this.onOuted = new signals.Signal()
    this.onClicked = new signals.Signal()

    this.boundRender = this.render.bind(this)
    inputController.add(this.el, 'over', this._onOver.bind(this))
    inputController.add(this.el, 'out', this._onOut.bind(this))
    inputController.add(this.el, 'click', this._onClick.bind(this))

    this.render()
  }

  _onOver() {
    if (this.isDisable || !this.isActive) return

    this.el.classList.add('hover')
    this.isHover = true

    if (!this.isDimmed) {
      animator.killTweensOf(this, 'hoverAnimation')
      animator.to(this, {
        duration: 0.3,
        hoverAnimation: 1,
        onUpdate: this.boundRender,
        ease: 'none',
      })
    }

    this.onOvered.dispatch(this)
  }

  _onOut() {
    this.el.classList.remove('hover')
    this.isHover = false

    if (!this.isDimmed) {
      animator.killTweensOf(this, 'hoverAnimation')
      animator.to(this, {
        duration: 0.3,
        hoverAnimation: 0,
        onUpdate: this.boundRender,
        ease: 'none',
      })
    }

    this.onOuted.dispatch(this)
  }

  _onClick() {
    if (this.isDisable || !this.isActive) return
    this.onClicked.dispatch(this)
  }

  enable() {
    this.isDisable = false
    this.el.classList.remove('circle-btn-state-disable')
  }

  disable() {
    this.isDisable = true
    this.el.classList.add('circle-btn-state-disable')
    this._onOut()
  }

  render() {
    const ctx = this.outlineCtx
    const animation = this.hoverAnimation
    const center = this.size / 2

    const fillAlpha = lerp(0.2, 1, clampedNorm(animation, 0, 0.5))
    const outerRadius = lerp(
      center - this.strokeWidth,
      center,
      easeOutCubic(clampedNorm(animation, 0, 0.4)),
    )
    const innerRadius = lerp(
      center - this.strokeWidth - this.strokeWidthOffset,
      center - this.strokeWidth,
      easeOutCubic(clampedNorm(animation, 0.15, 0.5)),
    )

    ctx.clearRect(0, 0, this.size, this.size)
    ctx.save()
    ctx.beginPath()
    ctx.fillStyle = `rgba(255,255,255,${fillAlpha})`
    ctx.arc(center, center, outerRadius, 0, 2 * Math.PI, false)
    ctx.arc(center, center, innerRadius, 0, 2 * Math.PI, true)
    ctx.fill()
    ctx.restore()

    const iconScale = this.isHover
      ? 1 - (1 - Math.abs((clampedNorm(animation, 0, 0.7) - 0.5) * 2)) * 0.5
      : 1
    this.iconStyle[this.transform3DStyle] = `scale3d(${iconScale},${iconScale},1)`
  }
}

export default CircleBtn
