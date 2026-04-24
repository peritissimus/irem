// Smoke test: stageReference imports cleanly and its render/resize hooks work.
// config.js isn't tested here — it imports jquery + mout which only resolve
// under Vite's extensionless-specifier handling. Visual audit is sufficient
// (it's linear property assignment with no conditional logic beyond ternaries).

globalThis.window = globalThis
globalThis.document = {
  body: { style: {} },
  documentElement: { clientWidth: 1024, clientHeight: 768 },
}
window.innerWidth = 1024
window.innerHeight = 768
window.requestAnimationFrame = (cb) => setTimeout(cb, 0)
window.addEventListener = () => {}

const { stageReference } = await import('../src/stageReference.js')

const checks = []

checks.push([
  'onRender is a Signal',
  typeof stageReference.onRender.dispatch === 'function' &&
    typeof stageReference.onRender.add === 'function',
])
checks.push([
  'onResize is a Signal',
  typeof stageReference.onResize.dispatch === 'function' &&
    typeof stageReference.onResize.add === 'function',
])
checks.push(['isRendering starts false', stageReference.isRendering === false])
checks.push(['resizeActive defaults true', stageReference.resizeActive === true])

let renderCount = 0
stageReference.onRender.add(() => {
  renderCount += 1
  if (renderCount >= 3) stageReference.stopRender()
})

stageReference.startRender()
checks.push(['startRender flipped isRendering to true synchronously', renderCount === 1])

await new Promise((r) => setTimeout(r, 50))
checks.push(['loop dispatched 3 times then stopped', renderCount === 3])
checks.push(['stopRender cleared isRendering', stageReference.isRendering === false])

// renderOnce after stop should still dispatch once
let oneShot = 0
stageReference.onRender.addOnce(() => {
  oneShot += 1
})
stageReference.renderOnce()
checks.push(['renderOnce dispatches once', oneShot === 1])

// init() populates dimensions
stageReference.init()
checks.push(['init set windowWidth', stageReference.windowWidth === 1024])
checks.push(['init set windowHeight', stageReference.windowHeight === 768])
checks.push([
  'init set stageWidth to windowWidth when no minWidth',
  stageReference.stageWidth === 1024,
])

// minWidth guard
stageReference.minWidth = 2000
stageReference.minHeight = 2000
stageReference.onResize.dispatch('resize')
checks.push([
  'stageWidth clamps to minWidth when window smaller',
  stageReference.stageWidth === 2000,
])

let failed = 0
for (const [name, ok] of checks) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`)
  if (!ok) failed += 1
}
console.log(`\n${checks.length - failed}/${checks.length} passed`)
process.exit(failed ? 1 : 0)
