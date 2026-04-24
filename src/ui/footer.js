import $ from 'jquery'
import setParam from 'mout/queryString/setParam'
import { config } from '../config.js'
import { inputController } from '../controllers/inputController.js'
import { uiController } from '../controllers/uiController.js'
import { soundController } from '../controllers/soundController.js'
import { trackEvent, trackPage } from '../controllers/trackingController.js'
import { socialShare } from '../utils/socialUtils.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { EKTweener } from '../ektweener.js'

const trackHandlers = { trackPage, trackEvent }

let container
let bg
let langItems
let shareBtn
let creditsLink
let termsLink
let soundBtn

function preInit() {
  container = $('.footer')
  preloaderController.add(container)
}

function init() {
  bindElements()
  bindEvents()
  if (!config.DISABLE_SOUND_ON_START) soundController.unmute(0)
}

function bindElements() {
  bg = $('.footer-bg')
  langItems = $('.footer-link-lang-item:not(.selected)')
  shareBtn = $('.footer-share')
  soundBtn = $('.footer-sound-btn')
  termsLink = $('.footer-link-terms')
  creditsLink = $('.footer-link-credits')
}

function bindEvents() {
  inputController.add(shareBtn, 'click', onShareClick)
  inputController.add(langItems, 'click', onLangClick)
  inputController.add(soundBtn, 'click', onSoundClick)
  inputController.add(termsLink, 'click', onTermsClick)
  // NOTE: original never wires creditsLink to onCreditsClick — dead fn preserved below
  container.find('.track-link').each(function () {
    inputController.add(this, 'click', onTrackLinkClick)
    this._url = $(this).attr('href')
    $(this).css('cursor', 'pointer').removeAttr('href')
  })
  soundController.onMuteToggled.add(onMuteToggled)
}

function onMuteToggled(muted) {
  soundBtn.toggleClass('selected', !muted)
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
  const $link = $(this)
  const trackType = $link.data('trackType')
  const data = {}
  data[trackType === 'trackPage' ? 'trackPage' : 'trackCat'] = $link.data('trackValue')
  trackHandlers[trackType](data)
  if (this._url) window.open(this._url)
}

function onShareClick() {
  const $btn = $(this)
  const type = $btn.data('type')
  socialShare(
    type,
    '',
    type === 'twitter' ? window.TWITTER_SITE_DESCRIPTION : window.SITE_DESCRIPTION,
  )
}

function show() {
  EKTweener.fromTo(container, 0.5, { opacity: 0 }, { opacity: 1, ease: 'linear' })
  container.show()
}

function showBg() {
  EKTweener.to(bg, 1.3, { transform3d: 'scale3d(1,1,1)' })
}

function hideBg() {
  EKTweener.to(bg, 1.3, { transform3d: 'scale3d(1,0,1)' })
}

function updateFading(ratio) {
  $('head').append(`<style>.footer-fade-item{opacity: ${ratio * 0.5}}</style>`)
}

function changeHeight(height) {
  container.height(height)
}

function onLangClick() {
  const $item = $(this)
  const langId = $item.data('id')
  const urlSuffix = $item.data('urlSuffix')
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
