// Import-smoke + shape verification for soundController and preloaderController.
//
// trackingController and inputController both transitively import jQuery 1.11,
// which demands a real DOM at load time (Sizzle accesses document.childNodes
// during module evaluation). Stubbing that would require jsdom; not worth the
// dependency. Those two are verified in the browser at cutover.

globalThis.window = globalThis
globalThis.document = {
  body: { style: {} },
  documentElement: { clientWidth: 1024, clientHeight: 768 },
  addEventListener: () => {},
  createElement: () => ({ style: {} }),
}
globalThis.Audio = class {
  constructor() {
    this.volume = 1
    this.loop = false
    this.readyState = 0
  }
  play() {}
  load() {}
}
window.Modernizr = { audio: { mp3: true }, prefixed: (x) => x, csstransforms3d: true }
window.requestAnimationFrame = (cb) => setTimeout(cb, 0)
window.__DISABLE_ARCHIVE_AUDIO__ = true

const checks = []

// soundController
const sc = await import('../src/controllers/soundController.js')
checks.push(['soundController singleton exists', typeof sc.soundController === 'object'])
checks.push(['soundController.isMute starts true', sc.soundController.isMute === true])
checks.push(['soundController.globalVolume starts 0', sc.soundController.globalVolume === 0])
checks.push([
  'soundController.onMuteToggled is a Signal',
  typeof sc.soundController.onMuteToggled.dispatch === 'function',
])

// init with archive audio disabled should early-return, leaving isMute true
sc.soundController.init()
checks.push(['init no-op when archive audio disabled', sc.soundController.isMute === true])

// mute/unmute dispatch onMuteToggled
let muteToggles = []
sc.soundController.onMuteToggled.add((value) => muteToggles.push(value))
sc.soundController.unmute()
sc.soundController.mute(0)
checks.push([
  'mute/unmute dispatch onMuteToggled(true/false)',
  muteToggles.length === 2 && muteToggles[0] === false && muteToggles[1] === true,
])

// toggleMute flips
muteToggles = []
sc.soundController.toggleMute()
checks.push(['toggleMute fires', muteToggles.length === 1])

// preloaderController
const pc = await import('../src/controllers/preloaderController.js')
const pl = pc.preloaderController

checks.push(['SKIP_ANIMATION is true', pl.SKIP_ANIMATION === true])
checks.push(['preloaded starts false', pl.preloaded === false])
checks.push([
  '6 signals present',
  [
    'onReadyLoading',
    'onReadyLoaded',
    'onReadyComplete',
    'onLoading',
    'onLoaded',
    'onLoadComplete',
  ].every((name) => typeof pl[name].dispatch === 'function'),
])

// getImageSize returns object with undefined fields (latent bug preserved)
const size = pl.getImageSize('missing.png')
checks.push([
  'getImageSize returns {width: undefined, height: undefined}',
  size.width === undefined && size.height === undefined,
])

// Simulate quickLoader signaling progress via the ready signals chain
let readyLoadingValues = []
let readyLoadedFired = 0
let readyCompleteFired = 0
pl.onReadyLoading.add((v) => readyLoadingValues.push(v))
pl.onReadyLoaded.add(() => (readyLoadedFired += 1))
pl.onReadyComplete.add(() => (readyCompleteFired += 1))

// Manually mimic what quickLoader.start's progress handler would do:
// SKIP_ANIMATION=true makes it return the `direct` handler; invoking with 0.5 then 1 should behave correctly.
// The handler is constructed via preStart → quickLoader.start(handler). But we can't trigger quickLoader
// itself without queued items. Instead: rebuild the handler by importing preloaderController's internal
// makeProgressHandler indirectly — since it's not exported, we test via the end-to-end effect.

// Easier: verify the documented effect — that dispatching the completion marker correctly fires loaded+complete.
// We can call preStart with an empty queue, which triggers start() → direct(1) immediately? No — quickLoader
// only calls the handler via onItemLoaded per item. With no items, the handler is never called.

// So: just verify preStart() doesn't throw.
try {
  pl.preStart()
  checks.push(['preStart() runs without throwing on empty queue', true])
} catch (err) {
  checks.push([`preStart() threw: ${err.message}`, false])
}

let failed = 0
for (const [name, ok] of checks) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`)
  if (!ok) failed += 1
}
console.log(`\n${checks.length - failed}/${checks.length} passed`)
process.exit(failed ? 1 : 0)
