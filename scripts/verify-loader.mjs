// Smoke test: ensure the loader modules import cleanly and expose the expected surface.
// We can't actually load images/audio/JSONP in Node, so we stub DOM bits and check shape.

globalThis.window = globalThis
globalThis.document = {
  createElement: (tag) => ({ tagName: tag.toUpperCase(), appendChild() {} }),
  getElementsByTagName: () => [{ appendChild() {} }],
}
globalThis.Image = class {
  constructor() {
    this.width = 0
    this.height = 0
  }
}
globalThis.Audio = class {
  constructor() {
    this.src = ''
  }
  load() {}
}
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' })

const { AbstractItem } = await import('../src/loader/types/Abstract.js')
const { ImageItem } = await import('../src/loader/types/ImageItem.js')
const { JSONPItem } = await import('../src/loader/types/JSONPItem.js')
const { AudioItem } = await import('../src/loader/types/AudioItem.js')
const { quickLoader } = await import('../src/loader/quickLoader.js')

const checks = [
  ['AbstractItem is class', typeof AbstractItem === 'function'],
  ['ImageItem extends AbstractItem', new ImageItem('a.png') instanceof AbstractItem],
  ['JSONPItem type', JSONPItem.type === 'jsonp'],
  ['AudioItem extensions', JSON.stringify(AudioItem.extensions) === '["mp3","ogg"]'],
  ['quickLoader.VERSION', quickLoader.VERSION === '1.0.0'],
  ['_added is shared with AbstractItem.added', quickLoader._added === AbstractItem.added],
  ['_loaded is shared with AbstractItem.loaded', quickLoader._loaded === AbstractItem.loaded],
  ['quickLoader.add exists', typeof quickLoader.add === 'function'],
  ['quickLoader.start exists', typeof quickLoader.start === 'function'],
  ['ImageItem.retrieve("foo.png")', JSON.stringify(ImageItem.retrieve('foo.png')) === '["foo.png"]'],
  ['JSONPItem.retrieve("api?cb=")', JSON.stringify(JSONPItem.retrieve('api?cb=')) === '["api?cb="]'],
  ['JSONPItem.retrieve("foo.png")', JSONPItem.retrieve('foo.png') === false],
  ['AudioItem.retrieve("foo.mp3")', JSON.stringify(AudioItem.retrieve('foo.mp3')) === '["foo.mp3"]'],
]

// Test abstract _added registration
AbstractItem.added = {}
AbstractItem.loaded = {}
// Re-link quickLoader's references (since we overwrote the originals):
quickLoader._added = AbstractItem.added
quickLoader._loaded = AbstractItem.loaded

const imgA = new ImageItem('a.png')
const imgB = new ImageItem('b.png')
checks.push(['constructor registers in _added', AbstractItem.added['a.png'] === imgA && AbstractItem.added['b.png'] === imgB])

// Test add() triggers addSingle
AbstractItem.added = {}
quickLoader._added = AbstractItem.added
quickLoader._weight = 0
const batches = quickLoader.add(['x.png', 'y.png'])
checks.push([
  'add() produces 2 batches',
  batches.length === 2 && batches[0].type === 'image' && batches[0].items[0] === 'x.png',
])
checks.push(['weight increments for 2 new items', quickLoader._weight === 2])

let failed = 0
for (const [name, ok] of checks) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`)
  if (!ok) failed += 1
}
console.log(`\n${checks.length - failed}/${checks.length} passed`)
process.exit(failed ? 1 : 0)
