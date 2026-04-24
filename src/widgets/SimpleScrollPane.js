import { config } from '../config.js'
import { inputController } from '../controllers/inputController.js'
import { stageReference } from '../stageReference.js'

const DELTA_LOG_SIZE = 5

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value
}

function pickMoveStrategy() {
  if (config.transform3DStyle) {
    const prop = config.transform3DStyle
    return (style, y) => {
      style[prop] = `translate3d(0,${y}px,0)`
    }
  }
  if (config.transformStyle) {
    const prop = config.transformStyle
    return (style, y) => {
      style[prop] = `translate(0,${y}px)`
    }
  }
  return (style, y) => {
    style.top = `${y}px`
  }
}

export class SimpleScrollPane {
  constructor(wrapper, moveContainer, indicator) {
    this.wrapper = wrapper
    this.moveContainer = moveContainer
    this.moveContainerStyle = moveContainer[0].style
    this.indicator = indicator
    this.indicatorStyle = indicator[0].style

    wrapper[0].scrollpane = this

    this._tPos = 0
    this._tRatio = 0
    this._pos = 0
    this._ratio = 0
    this._easeRatio = 1
    this._boundEaseRatio = 0.4
    this._momentumEaseRatio = 0.08
    this._isRendering = false
    this.isBound = false
    this.onUpdateCallback = null

    this.deltaYLog = []
    this.deltaTimeLog = []
    this.deltaIndex = 0

    this._isActive = true
    this._clampWheel = true

    this._moveElementTo = pickMoveStrategy()
  }

  init() {
    inputController.add(this.wrapper, 'down', this._onDown.bind(this))
    inputController.add(this.wrapper, 'wheel', this._onWheel.bind(this))
    inputController.onMove.add(this._onMove, this)
    inputController.onUp.add(this._onUp, this)
  }

  _onDown(event) {
    if (!this._isActive || this.movableHeight < 1) return
    this.isInverted = event.target === this.indicator[0]
    this.isDown = true
  }

  _onWheel(delta) {
    this.moveToPos(this._tPos + delta * 50, undefined, this._clampWheel)
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this._pos, this._ratio + delta * 0.1)
    }
  }

  _onMove(event) {
    if (!this._isActive || !this.isDown || !inputController.isScrollV || this.movableHeight < 1) {
      return
    }

    if (!this.hasMoved) {
      this.deltaYLog = []
      this.deltaTimeLog = []
      this.deltaIndex = 0
    }

    const sign = this.isInverted ? -1 : 1
    this.deltaYLog[this.deltaIndex] = event.deltaY * sign
    this.deltaTimeLog[this.deltaIndex] = event.deltaTime
    this.deltaIndex += 1
    if (this.deltaIndex === DELTA_LOG_SIZE - 1) {
      this.deltaIndex = 0
    }

    this.hasMoved = true
    this.moveToPos(
      this._tPos +
        event.deltaY *
          (this.isInverted ? -this.movableHeight / this.indicatorMovableHeight : 1),
      0.5,
    )
  }

  _onUp(event) {
    this.isDown = false
    if (!this._isActive || !this.hasMoved || this.movableHeight < 1) return
    this.hasMoved = false

    const sign = this.isInverted ? -1 : 1
    let distanceY = event.deltaY * sign
    let distanceTime = event.deltaTime

    let i = Math.max(this.deltaIndex, this.deltaYLog.length)
    while (i--) {
      distanceY += this.deltaYLog[i]
      distanceTime += this.deltaTimeLog[i]
    }

    const target = this._tPos + (distanceY / distanceTime) * 200
    this.moveToPos(target, this._momentumEaseRatio)
  }

  onResize() {
    this.visibleHeight = this.wrapper.height()
    this.height = this.moveContainer.height()
    this.movableHeight = Math.max(0, this.height - this.visibleHeight)
    this.isMovable = this.movableHeight > 0

    this.indicatorHeight = Math.min(1, this.visibleHeight / this.height) * this.visibleHeight
    this.indicatorMovableHeight = this.visibleHeight - this.indicatorHeight
    this.indicator.height(this.indicatorHeight)

    if (this.indicator.parent()[0] === this.wrapper[0]) {
      this.indicator.toggle(this.isMovable)
    } else {
      this.indicator.parent().toggle(this.isMovable)
    }

    this.moveToRatio(this._tRatio, 1)
  }

  render() {
    this._pos += (this._tPos - this._pos) * this._easeRatio
    this._ratio = this._pos / this.movableHeight

    if (!this.isDown && (!this.isBound || this._isRendering)) {
      if (this._ratio > 0) {
        this._tRatio -= this._tRatio * this._boundEaseRatio
        this._tPos = this._tRatio * this.movableHeight
      } else if (this._ratio < -1) {
        this._tRatio += (-1 - this._tRatio) * this._boundEaseRatio
        this._tPos = this._tRatio * this.movableHeight
      }
    }

    if (this.isBound) this._bound()

    const outOfBounds = this._tPos < -this.movableHeight - 1 || this._tPos > 1

    if (!this._isRendering) {
      if (outOfBounds || Math.abs(this._tPos - this._pos) > 1) {
        this._isRendering = true
        stageReference.onRender.add(this.render, this)
      }
    } else if (!outOfBounds && Math.abs(this._tPos - this._pos) < 1) {
      if (!this.isDown) this._bound()
      this._pos = this._tPos | 0
      this._isRendering = false
      stageReference.onRender.remove(this.render, this)
    }

    this._moveToPos()
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this._pos, this._ratio)
    }
  }

  _bound() {
    if (this._ratio > 0) {
      this._pos = this._tPos = this._ratio = this._tRatio = 0
    } else if (this._ratio < -1) {
      this._ratio = this._tRatio = -1
      this._pos = this._tPos = this._tRatio * this.movableHeight
    }
  }

  moveToRatio(ratio, easeRatio) {
    this.moveToPos(ratio * this.movableHeight, easeRatio)
  }

  moveToPos(pos, easeRatio, clampWithinBounds) {
    this._easeRatio = easeRatio === undefined ? 1 : easeRatio
    this._tPos = pos
    this._tRatio = this._tPos / (this.movableHeight > 0 ? this.movableHeight : 1)

    if (clampWithinBounds) {
      this._tRatio = clamp(this._tRatio, -1, 0)
      this._tPos = this._tRatio * this.movableHeight
    }

    if (!this._isRendering) this.render()
  }

  _moveToPos() {
    this._moveElementTo(this.moveContainerStyle, this._pos | 0)
    this._moveElementTo(this.indicatorStyle, (this.indicatorMovableHeight * -this._ratio) | 0)
  }

  setActive(active) {
    this._isActive = active
    this.isDown = false
  }
}

export default SimpleScrollPane
