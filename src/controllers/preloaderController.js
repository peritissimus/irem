import signals from '../events/signal.js'
import { quickLoader } from '../loader/quickLoader.js'
import { animator } from '../animation/animator.js'

const SKIP_ANIMATION = true

function makeProgressHandler(loadingSig, loadedSig, completeSig, animationDuration) {
  const duration = SKIP_ANIMATION ? 0 : animationDuration

  function direct(value) {
    loadingSig.dispatch(value)
    if (value === 1) {
      if (duration === 0) loadedSig.dispatch()
      completeSig.dispatch()
    }
  }

  if (duration === 0) return direct

  const tweenState = { percent: 0 }
  return (value) => {
    animator.killTweensOf(tweenState, 'percent')
    animator.to(tweenState, {
      duration,
      percent: value,
      ease: 'circ.out',
      onUpdate: () => direct(tweenState.percent),
    })
    if (value === 1) loadedSig.dispatch()
  }
}

function preStart() {
  quickLoader.start(
    makeProgressHandler(
      preloaderController.onReadyLoading,
      preloaderController.onReadyLoaded,
      preloaderController.onReadyComplete,
      0,
    ),
  )
}

function start() {
  quickLoader.start(
    makeProgressHandler(
      preloaderController.onLoading,
      preloaderController.onLoaded,
      preloaderController.onLoadComplete,
      1,
    ),
  )
}

function add(target, type) {
  let resolvedTarget = target
  if (target?.jquery) {
    resolvedTarget = target.add(target.find('*'))
  }
  return quickLoader.add(resolvedTarget, type)
}

function loadSingle(url, callback, type) {
  quickLoader.loadSingle(url, callback, type)
}

function getImageSize(url) {
  return {
    width: quickLoader._imageWidths?.[url],
    height: quickLoader._imageHeights?.[url],
  }
}

function getLoadedItemByURL(url) {
  return quickLoader._loaded[url]
}

export const preloaderController = {
  SKIP_ANIMATION,
  preloaded: false,
  onReadyLoading: new signals.Signal(),
  onReadyLoaded: new signals.Signal(),
  onReadyComplete: new signals.Signal(),
  onLoading: new signals.Signal(),
  onLoaded: new signals.Signal(),
  onLoadComplete: new signals.Signal(),
  preStart,
  add,
  loadSingle,
  getImageSize,
  start,
  getLoadedItemByURL,
}
