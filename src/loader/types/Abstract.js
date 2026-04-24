export class AbstractItem {
  static type = null
  static extensions = []
  static added = {}
  static loaded = {}

  static test() {
    return false
  }

  static retrieve() {
    return false
  }

  constructor(url) {
    if (!url) return
    this.url = url
    AbstractItem.added[url] = this
  }

  load(callback) {
    this.callback = callback
  }

  onLoad() {
    if (this.isLoaded) return
    this.isLoaded = true
    AbstractItem.loaded[this.url] = this
    this.callback?.(this)
  }
}
