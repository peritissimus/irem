import signals from '../events/signal.js'

const HANDLER_TYPES = ['over', 'out', 'tap', 'click', 'down', 'move', 'up', 'wheel']

const hasTouch = 'ontouchstart' in window

const POINTER_EVENT_NAMES = hasTouch
  ? { over: ['touchstart', 'mouseenter'], out: ['touchend', 'mouseleave'] }
  : { over: ['mouseenter'], out: ['mouseleave'] }

const INTERACTIVE_NODE_NAMES = ['input', 'select', 'label', 'option', 'textarea']
const DEFAULT_PREVENT_DEFAULT_NODE_NAMES = ['input', 'select', 'label', 'textarea', 'option']
const ALWAYS_ALLOW_DEFAULT_NODE_NAMES = ['source', 'object', 'iframe']

let isPressing = false
let skipPreventDefault = false

let distanceStartTime = 0
let distanceStartX = 0
let distanceStartY = 0

let lastMoveTime = 0
let lastMoveX = 0
let lastMoveY = 0

export const inputController = {
  hasTouch,
  onDown: new signals.Signal(),
  onMove: new signals.Signal(),
  onUp: new signals.Signal(),
  onSwipeH: new signals.Signal(),
  onSwipeV: new signals.Signal(),
  isDown: false,
  isScrollH: false,
  isScrollV: false,
  isFirstTouch: undefined,
  deltaX: 0,
  deltaY: 0,
  deltaTime: 0,
  downBubbleHistory: [],
  currentBubbleHistory: [],
  lastUpTime: 0,
  isOnSwipePane: false,
  elems: [],
  disablePreventDefault: false,
  clickTime: 500,
  clickDistance: 40,
  add: addInput,
  remove: removeInput,
}

function addInput(target, type, handler) {
  if (!target) return

  target[`__${type}`] = handler
  if (type === 'over' || type === 'out') {
    for (const eventName of POINTER_EVENT_NAMES[type]) {
      target.addEventListener(eventName, handler, false)
    }
  }
  target.__hasInput = true
  inputController.elems.push(target)
}

function removeInput(target, type) {
  if (!target) return

  if (type) {
    if ((type === 'over' || type === 'out') && target[`__${type}`]) {
      for (const eventName of POINTER_EVENT_NAMES[type]) {
        target.removeEventListener(eventName, target[`__${type}`], false)
      }
    }
    target[`__${type}`] = undefined
  } else {
    if (target.__over) {
      for (const eventName of POINTER_EVENT_NAMES.over) {
        target.removeEventListener(eventName, target.__over, false)
      }
    }
    if (target.__out) {
      for (const eventName of POINTER_EVENT_NAMES.out) {
        target.removeEventListener(eventName, target.__out, false)
      }
    }
    for (const handlerType of HANDLER_TYPES) {
      target[`__${handlerType}`] = undefined
    }
    target.__hasInput = false
  }

  const allCleared = HANDLER_TYPES.every((handlerType) => !target[`__${handlerType}`])
  if (allCleared) {
    const index = inputController.elems.indexOf(target)
    if (index !== -1) inputController.elems.splice(index, 1)
  }
}

function wrapPreventDefault(event) {
  return () => {
    if (inputController.disablePreventDefault) return
    if (event.preventDefault) {
      event.preventDefault()
    } else {
      event.returnValue = false
    }
  }
}

function shouldAllowNativeDefault(target, isMove) {
  if (target.__skipPreventDefault) return true
  const nodeName = target.nodeName.toLowerCase()
  if (ALWAYS_ALLOW_DEFAULT_NODE_NAMES.includes(nodeName)) return true
  if (isMove) return false
  return target.contentEditable === 'true' || DEFAULT_PREVENT_DEFAULT_NODE_NAMES.includes(nodeName)
}

function processEvent(rawEvent, dispatch) {
  const event = rawEvent || window.event
  const normalized = {
    originalEvent: event,
    button: event.button,
    preventDefault: wrapPreventDefault(event),
  }
  const type = event.type
  const now = (normalized.currentTime = Date.now())
  const isDownPhase = type.indexOf('start') > -1 || type.indexOf('down') > -1
  const isUpPhase = type.indexOf('end') > -1 || type.indexOf('up') > -1
  const isMovePhase = type.indexOf('move') > -1
  const isTouch = (normalized.isTouch = type.indexOf('touch') > -1)

  if (inputController.isFirstTouch === undefined) {
    inputController.isFirstTouch = isTouch
  }

  let x
  let y
  let target

  if (isTouch) {
    const touch = event.touches.length ? event.touches[0] : event.changedTouches[0]
    normalized.x = x = touch.pageX
    normalized.y = y = touch.pageY
    normalized.target = target = touch.target
  } else {
    normalized.x = x = event.pageX
    normalized.y = y = event.pageY
    normalized.target = target = event.target || event.srcElement
  }

  const bubbleHistory = []
  let hasUnhandledNodeBlocker = false
  let walker = target
  while (walker) {
    bubbleHistory.unshift(walker)
    if (!hasUnhandledNodeBlocker && shouldAllowNativeDefault(walker, isMovePhase)) {
      hasUnhandledNodeBlocker = normalized.isSkipPreventDefault = true
    }
    walker = walker.parentNode
  }
  inputController.currentBubbleHistory = bubbleHistory
  normalized.bubbleHistory = bubbleHistory

  if (isDownPhase) {
    isPressing = true
    distanceStartTime = lastMoveTime = now
    distanceStartX = lastMoveX = x
    distanceStartY = lastMoveY = y
    inputController.downBubbleHistory = bubbleHistory

    for (let i = bubbleHistory.length - 1; i >= 0; i -= 1) {
      const node = bubbleHistory[i]
      if (isTouch && node.__over) {
        normalized.currentTarget = node
        node.__over.call(node, normalized)
      }
      if (node.__down) {
        normalized.currentTarget = node
        node.__down.call(node, normalized)
      }
    }

    skipPreventDefault = hasUnhandledNodeBlocker
  }

  if (!skipPreventDefault) {
    normalized.preventDefault()
  }

  if (isPressing) {
    normalized.distanceTime = now - distanceStartTime
    normalized.distanceX = x - distanceStartX
    normalized.distanceY = y - distanceStartY
    normalized.distance = Math.sqrt(
      (x - distanceStartX) * (x - distanceStartX) +
        (y - distanceStartY) * (y - distanceStartY),
    )
  }

  normalized.deltaTime = now - lastMoveTime
  normalized.deltaX = x - lastMoveX
  normalized.deltaY = y - lastMoveY
  lastMoveTime = now
  lastMoveX = x
  lastMoveY = y

  if (isUpPhase) {
    isPressing = false
  }

  dispatch(normalized)
}

function onDownRaw(event) {
  return processEvent.call(this, event, (normalized) => {
    const nodeName = normalized.target.nodeName.toLowerCase()
    if (
      document.activeElement &&
      !INTERACTIVE_NODE_NAMES.includes(nodeName) &&
      normalized.target.contentEditable !== 'true'
    ) {
      const activeNodeName = document.activeElement.nodeName.toLowerCase()
      if (activeNodeName !== 'body') {
        document.activeElement.blur()
      }
    }
    inputController.onDown.dispatch(normalized)
  })
}

function onMoveRaw(event) {
  return processEvent.call(this, event, (normalized) => {
    inputController.onMove.dispatch(normalized)
  })
}

function onUpRaw(event) {
  return processEvent.call(this, event, (normalized) => {
    inputController.onUp.dispatch(normalized)
  })
}

function onWheelRaw(rawEvent) {
  const event = rawEvent || window.event
  let delta = event.wheelDelta
  if (delta) {
    delta /= 120
  } else {
    delta = -event.detail / 3
  }

  const history = inputController.currentBubbleHistory
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const node = history[i]
    if (node.__wheel) {
      node.__wheel.call(node, delta)
    }
  }
}

function onGestureChange(event) {
  if (inputController.disablePreventDefault) return
  if (event.preventDefault) {
    event.preventDefault()
  } else {
    event.returnValue = false
  }
}

function handleDownSignal(normalized) {
  inputController.isDown = true
  const history = normalized.bubbleHistory
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const node = history[i]
    if (node.__tap) {
      normalized.currentTarget = node
      node.__tap.call(node, normalized)
    }
  }
}

function handleMoveSignal(normalized) {
  inputController.currentBubbleHistory = normalized.bubbleHistory
  inputController.deltaX = normalized.deltaX
  inputController.deltaY = normalized.deltaY
  inputController.deltaTime = normalized.deltaTime
  inputController.distanceX = normalized.distanceX
  inputController.distanceY = normalized.distanceY
  inputController.distanceTime = normalized.distanceTime

  if (!inputController.isScrollH && !inputController.isScrollV && normalized.distance > 80) {
    if (Math.abs(normalized.distanceX) > Math.abs(normalized.distanceY)) {
      inputController.isScrollH = true
      inputController.onSwipeH.dispatch(normalized)
    } else {
      inputController.isScrollV = true
      inputController.onSwipeV.dispatch(normalized)
    }
  }

  const history = normalized.bubbleHistory
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const node = history[i]
    if (node.__move) {
      normalized.currentTarget = node
      node.__move.call(node, normalized)
    }
  }
}

function handleUpSignal(normalized) {
  inputController.isDown = false
  inputController.distanceTime = normalized.distanceTime

  const history = normalized.bubbleHistory
  const downHistory = inputController.downBubbleHistory

  const isClick = (normalized.isClick =
    normalized.distanceTime !== null &&
    normalized.distanceTime < inputController.clickTime &&
    normalized.distance < inputController.clickDistance)

  normalized.isDoubleClick = normalized.currentTime - inputController.lastUpTime < 400

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const node = history[i]

    if (normalized.isTouch && node.__out) {
      normalized.currentTarget = node
      node.__out.call(node, normalized)
    }

    if (node.__up) {
      normalized.currentTarget = node
      node.__up.call(node, normalized)
    }

    if (isClick && node.__click) {
      for (let j = downHistory.length - 1; j >= 0; j -= 1) {
        if (downHistory[j] === node) {
          normalized.currentTarget = node
          node.__click.call(node, normalized)
          break
        }
      }
    }
  }

  inputController.isScrollH = false
  inputController.isScrollV = false
  inputController.lastUpTime = normalized.currentTime
}

function initEventListeners() {
  document.ondragstart = () => false

  if (hasTouch) {
    document.addEventListener('touchstart', onDownRaw, false)
    document.addEventListener('touchmove', onMoveRaw, false)
    document.addEventListener('touchend', onUpRaw, false)
    document.addEventListener('mousedown', onDownRaw, false)
    document.addEventListener('mousemove', onMoveRaw, false)
    document.addEventListener('mouseup', onUpRaw, false)
    document.addEventListener('gesturechange', onGestureChange, false)
  } else {
    document.addEventListener('mousedown', onDownRaw, false)
    document.addEventListener('mousemove', onMoveRaw, false)
    document.addEventListener('mouseup', onUpRaw, false)
    document.addEventListener('mousewheel', onWheelRaw, false)
    document.addEventListener('DOMMouseScroll', onWheelRaw, false)
  }

  inputController.onDown.add(handleDownSignal)
  inputController.onMove.add(handleMoveSignal)
  inputController.onUp.add(handleUpSignal)
}

initEventListeners()
