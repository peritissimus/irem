import { AbstractItem } from './Abstract.js'
import { getStyle } from '../browser/getStyle.js'

const BACKGROUND_IMAGE_URL = /s?url\(\s*?['"]?([^;]*?)['"]?\s*?\)/g

export class ImageItem extends AbstractItem {
  static type = 'image'
  static extensions = ['jpg', 'gif', 'png']

  static retrieve(target) {
    if (target?.nodeType && target.style) {
      const urls = []
      if (target.nodeName.toLowerCase() === 'img' && target.src.indexOf(';') < 0) {
        urls.push(target.src)
      }
      getStyle(target)
        .getPropertyValue('background-image')
        .replace(BACKGROUND_IMAGE_URL, (_match, url) => {
          urls.push(url)
          return ''
        })
      return urls.length > 0 ? urls : false
    }

    if (typeof target === 'string') {
      return [target]
    }

    return false
  }

  load(callback) {
    super.load(callback)
    const img = (this.content = new Image())
    img.onload = () => this.onLoad()
    img.onerror = () => {
      this.error = true
      // Replace broken Image with a 1×1 transparent canvas so any
      // downstream drawImage / texture-upload call gets a valid source
      // instead of throwing "Passed-in image is broken". Consumers that
      // care can check `item.error`.
      const fallback = document.createElement('canvas')
      fallback.width = 1
      fallback.height = 1
      this.content = fallback
      this.onLoad()
    }
    img.src = this.url
    if (img.complete && img.naturalWidth) {
      this.onLoad()
    }
  }

  onLoad() {
    this.width = this.content.width
    this.height = this.content.height
    super.onLoad()
  }
}
