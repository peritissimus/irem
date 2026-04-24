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
    img.src = this.url
    if (img.width) {
      this.onLoad()
    } else {
      img.onload = () => this.onLoad()
    }
  }

  onLoad() {
    this.width = this.content.width
    this.height = this.content.height
    super.onLoad()
  }
}
