import $ from 'jquery'
import signals from '../../events/signal.js'
import { config } from '../../config.js'
import { inputController } from '../../controllers/inputController.js'
import { animator } from '../../animation/animator.js'

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
    el[0].circleBtn = this

    this.size = el.data('size') || 44
    this.strokeWidth = el.data('strokeWidth') || 2
    this.strokeWidthOffset = el.data('strokeWidthOffset') || 1
    this.innerSize = this.size - (this.strokeWidth + this.strokeWidthOffset) * 2

    this.iconWrapper = el.find('.circle-btn-icon-wrapper')
    this.iconWrapper.css({ width: this.innerSize, height: this.innerSize })

    this.outline = $('<canvas class="circle-btn-outline"></canvas>')[0]
    $(this.outline).css({
      left: -this.strokeWidth - this.strokeWidthOffset,
      top: -this.strokeWidth - this.strokeWidthOffset,
    })
    this.outline.width = this.outline.height = this.size
    this.outlineCtx = this.outline.getContext('2d')
    this.iconWrapper.prepend(this.outline)

    this.iconStyle = this.iconWrapper.find('.circle-btn-icon')[0].style
    this.transform3DStyle = config.transform3DStyle

    this.isDimmed = el.hasClass('circle-btn-style-dim')
    this.isDisable = el.hasClass('circle-btn-state-disable')
    this.isActive = true
    this.hoverAnimation = 0

    this.onOvered = new signals.Signal()
    this.onOuted = new signals.Signal()
    this.onClicked = new signals.Signal()

    this.boundRender = this.render.bind(this)
    inputController.add(el, 'over', this._onOver.bind(this))
    inputController.add(el, 'out', this._onOut.bind(this))
    inputController.add(el, 'click', this._onClick.bind(this))

    this.render()
  }

  _onOver() {
    if (this.isDisable || !this.isActive) return

    this.target.addClass('hover')
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
    this.target.removeClass('hover')
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
    this.target.removeClass('circle-btn-state-disable')
  }

  disable() {
    this.isDisable = true
    this.target.addClass('circle-btn-state-disable')
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
