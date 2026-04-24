import { AbstractItem } from './Abstract.js'

function generateCallbackName() {
  return `_jsonp${Date.now()}${(Math.random() * 1e8) | 0}`
}

export class JSONPItem extends AbstractItem {
  static type = 'jsonp'
  static extensions = []

  static retrieve(target) {
    if (typeof target === 'string' && target.indexOf('=') > -1) {
      return [target]
    }
    return false
  }

  load(callback) {
    super.load(callback)

    const equalsIndex = this.url.lastIndexOf('=') + 1
    const urlPrefix = this.url.substr(0, equalsIndex)
    let callbackName = this.url.substr(equalsIndex)

    if (callbackName.length === 0) {
      callbackName = generateCallbackName()
      this.jsonpCallback = callback
    } else {
      this.jsonpCallback = window[callbackName]
    }

    window[callbackName] = (data) => {
      this.content = data
      this.onLoad(data)
    }

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = urlPrefix + callbackName
    document.getElementsByTagName('head')[0].appendChild(script)
  }

  onLoad(data) {
    this.jsonpCallback?.(data)
    super.onLoad()
  }
}
