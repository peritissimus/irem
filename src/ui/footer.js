import { setParam } from '../utils/native.js'
import { config } from '../config.js'
import { inputController } from '../controllers/inputController.js'
import { uiController } from '../controllers/uiController.js'
import { soundController } from '../controllers/soundController.js'
import { trackEvent, trackPage } from '../controllers/trackingController.js'
import { socialShare } from '../utils/socialUtils.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { animator } from '../animation/animator.js'
import { qs, qsa, setHeight, show as showElement, toggleClass, withDescendants } from '../utils/dom.js'

const trackHandlers = { trackPage, trackEvent }

let container
let bg
let langItems
let shareBtn
let _creditsLink
let termsLink
let soundBtn

function preInit() {
  container = qs('.footer')
  preloaderController.add(withDescendants(container))
}

function init() {
  bindElements()
  bindEvents()
  if (!config.DISABLE_SOUND_ON_START) soundController.unmute(0)
}

function bindElements() {
  bg = qs('.footer-bg')
  langItems = qsa('.footer-link-lang-item:not(.selected)')
  shareBtn = qsa('.footer-share')
  soundBtn = qs('.footer-sound-btn')
  termsLink = qs('.footer-link-terms')
  _creditsLink = qs('.footer-link-credits')
}

function bindEvents() {
  shareBtn.forEach((node) => inputController.add(node, 'click', onShareClick))
  langItems.forEach((node) => inputController.add(node, 'click', onLangClick))
  if (soundBtn) inputController.add(soundBtn, 'click', onSoundClick)
  if (termsLink) inputController.add(termsLink, 'click', onTermsClick)
  // NOTE: original never wires creditsLink to onCreditsClick — dead fn preserved below
  qsa('.track-link', container).forEach((link) => {
    inputController.add(link, 'click', onTrackLinkClick)
    link._url = link.getAttribute('href')
    link.style.cursor = 'pointer'
    link.removeAttribute('href')
  })
  soundController.onMuteToggled.add(onMuteToggled)
}

function onMuteToggled(muted) {
  if (!soundBtn) return
  toggleClass(soundBtn, 'selected', !muted)
}

function onSoundClick() {
  soundController.toggleMute()
}

// NOTE: dead fn in original — never wired to creditsLink. Preserved.
// eslint-disable-next-line no-unused-vars
function onCreditsClick() {
  uiController.showCredit()
}

function onTermsClick() {
  uiController.showTerms()
}

function onTrackLinkClick(e) {
  e.preventDefault()
  const trackType = this.dataset.trackType
  const data = {}
  data[trackType === 'trackPage' ? 'trackPage' : 'trackCat'] = this.dataset.trackValue
  trackHandlers[trackType](data)
  if (this._url) window.open(this._url)
}

function onShareClick() {
  const type = this.dataset.type
  socialShare(
    type,
    '',
    type === 'twitter' ? config.TWITTER_SITE_DESCRIPTION : config.SITE_DESCRIPTION,
  )
}

function show() {
  showElement(container)
  animator.fromTo(container, { opacity: 0 }, { duration: 0.5, opacity: 1, ease: 'none' })
}

function showBg() {
  animator.to(bg, { duration: 1.3, scaleY: 1, ease: 'circ.out' })
}

function hideBg() {
  animator.to(bg, { duration: 1.3, scaleY: 0, ease: 'circ.out' })
}

function updateFading(ratio) {
  const style = document.createElement('style')
  style.textContent = `.footer-fade-item{opacity: ${ratio * 0.5}}`
  document.head.append(style)
}

function changeHeight(height) {
  setHeight(container, height)
}

function onLangClick() {
  const langId = this.dataset.id
  const urlSuffix = this.dataset.urlSuffix
  const queryString = window.location.href.split('?')[1]
  trackEvent({ trackCat: 'footer-langselector' })
  setTimeout(() => {
    window.location.href = config.BASE_URL + urlSuffix + setParam(queryString || '', 'ln', langId)
  }, 500)
}

export const footer = {
  preInit,
  init,
  show,
  showBg,
  hideBg,
  updateFading,
  changeHeight,
}
