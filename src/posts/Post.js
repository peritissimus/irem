import signals from 'signals'
import { config } from '../config.js'
import { preloaderController } from '../controllers/preloaderController.js'

// NOTE: the original factory used `mout/object/mixIn` and `mout/function/bind`.
// `mixIn(this, {}, data)` is functionally equivalent to `Object.assign(this, data)`
// (the empty `{}` middle arg was vestigial), and `bind` is just `.bind()`.

export class Post {
  constructor(data) {
    this.isThumbStartLoading = false
    this.isThumbLoaded = false
    this.isLargeStartLoading = false
    this.isLargeLoaded = false
    this.isActive = false
    Object.assign(this, data)
    this.onThumbPreloaded = new signals.Signal()
    this.onLargePreloaded = new signals.Signal()
  }

  _getImageURL() {
    return (
      window.__STATIC_POST_IMAGE ||
      `${config.UPLOADS_FOLDER}posts/${this.img}/thumb.jpg`
    )
  }

  preloadThumb(callback) {
    if (callback) this.onThumbPreloaded.add(callback)
    // NOTE: original checks `isLargeStartLoading` before setting
    // `isThumbStartLoading` — looks like a copy/paste bug. Preserved.
    if (this.isLargeStartLoading) return
    this.isThumbStartLoading = true
    preloaderController.loadSingle(
      this._getImageURL(),
      this._onThumbPreload.bind(this),
    )
  }

  preloadLarge(callback) {
    // NOTE: original does `this._onLargePreload.add(callback)` but
    // `_onLargePreload` is a method, not a signal. Almost certainly meant
    // `this.onLargePreloaded`. Preserved as a latent bug — calling this with
    // a callback throws at runtime in the original too.
    if (callback) this._onLargePreload.add(callback)
    if (this.isLargeStartLoading) return
    this.isLargeStartLoading = true
    preloaderController.loadSingle(
      this._getImageURL(),
      this._onLargePreload.bind(this),
    )
  }

  _onThumbPreload(event) {
    this.isThumbLoaded = true
    this.thumb = event.content
    this.onThumbPreloaded.dispatch(event)
  }

  _onLargePreload(event) {
    this.isLargeLoaded = true
    this.large = event.content
    this.onLargePreloaded.dispatch(event)
  }
}

export default Post
