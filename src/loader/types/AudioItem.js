import { AbstractItem } from './Abstract.js'

export class AudioItem extends AbstractItem {
  static type = 'audio'
  static extensions = ['mp3', 'ogg']

  static retrieve(target) {
    return [target]
  }

  load(callback) {
    super.load(callback)

    let audio
    try {
      audio = this.content = new Audio()
    } catch {
      audio = this.content = document.createElement('audio')
    }

    const handle = () => this.onLoad()
    audio.canplaythrough = handle
    audio.load = handle
    audio.src = this.url
    audio.load()
  }

  onLoad() {
    if (this.isLoaded) return
    super.onLoad()
  }
}
