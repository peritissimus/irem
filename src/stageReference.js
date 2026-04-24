import signals from 'signals'

const onResize = new signals.Signal()
const onRender = new signals.Signal()

export const stageReference = {
  windowWidth: 0,
  windowHeight: 0,
  stageWidth: 0,
  stageHeight: 0,
  resizeActive: true,
  orientationchangeActive: true,
  isRendering: false,
  onResize,
  onRender,
  init,
  startRender,
  stopRender,
  renderOnce,
}

function updateDimensions() {
  const width =
    'innerWidth' in window
      ? window.innerWidth
      : document.documentElement
        ? document.documentElement.clientWidth
        : document.body.clientWidth

  const height =
    'innerWidth' in window
      ? window.innerHeight
      : document.documentElement
        ? document.documentElement.clientHeight
        : document.body.clientHeight

  stageReference.windowWidth = width
  stageReference.windowHeight = height
  stageReference.stageWidth = width < stageReference.minWidth ? stageReference.minWidth : width
  stageReference.stageHeight =
    height < stageReference.minHeight ? stageReference.minHeight : height
}

function tick() {
  if (!stageReference.isRendering) return
  window.requestAnimationFrame(tick)
  onRender.dispatch()
}

function init() {
  window.addEventListener(
    'resize',
    () => {
      if (stageReference.resizeActive) onResize.dispatch('resize')
    },
    false,
  )
  window.addEventListener(
    'orientationchange',
    () => {
      if (stageReference.orientationchangeActive) onResize.dispatch('orientationchange')
    },
    false,
  )

  onResize.add(updateDimensions)
  updateDimensions()
}

function startRender() {
  stageReference.isRendering = true
  tick()
}

function stopRender() {
  stageReference.isRendering = false
}

function renderOnce() {
  onRender.dispatch()
}
