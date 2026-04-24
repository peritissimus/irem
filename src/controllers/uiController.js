import { config } from '../config.js'
import { CircleBtn } from '../ui/com/CircleBtn.js'
import { preloader } from '../ui/preloader.js'
import { header } from '../ui/header.js'
import { footer } from '../ui/footer.js'
import { terms } from '../ui/terms.js'
import { nav } from '../ui/nav.js'
import { search } from '../ui/search.js'
import { credit } from '../ui/credit.js'
import { errorBlocker } from '../ui/errorBlocker.js'
import { post2d } from '../ui/post2d.js'
import { scene3dController } from './scene3dController.js'
import { stageReference } from '../stageReference.js'
import { hide as hideElement, qs, qsa, show as showElement } from '../utils/dom.js'

let mouseBlocker
let lockToken

function preInit() {
  mouseBlocker = qs('.mouse-blocker')
  qsa('.circle-btn', config.appContainer).forEach((target) => {
    new CircleBtn({ target })
  })
  preloader.init()
  header.preInit()
  footer.preInit()
  terms.preInit()
  nav.preInit()
  search.preInit()
  errorBlocker.preInit()
  post2d.preInit()
  credit.preInit()
  updateFading()
}

function init() {
  header.init()
  footer.init()
  terms.init()
  nav.init()
  search.init()
  errorBlocker.init()
  post2d.init()
  credit.init()
  stageReference.onResize.add(onResize)
  onResize()
  showHeaderFooter()
}

function showHeaderFooter() {
  header.show()
  footer.show()
}

function showTerms() {
  terms.show()
}

function hideTerms() {
  terms.hide()
}

function showNav() {
  nav.show()
  header.showBg()
  footer.showBg()
}

function hideNav() {
  nav.hide()
  header.hideBg()
  footer.hideBg()
}

function showNavSearchItem(item) {
  nav.showSearchItem(item)
}

function hideNavSearchItem() {
  nav.hideSearchItem()
}

function scaleMapBtn(scale) {
  nav.scaleMapBtn(scale)
}

function showSearch() {
  scene3dController.disableControl()
  search.show()
}

function hideSearch() {
  search.hide()
}

function preShowPost2d(post) {
  scene3dController.disableControl()
  post2d.preShow(post)
}

function showPost2d(post) {
  post2d.show(post)
}

function hidePost2d() {
  post2d.hide()
}

function showCredit() {
  credit.show()
}

function hideCredit() {
  credit.hide()
}

function lock(token) {
  if (!token) token = +new Date() + Math.random()
  lockToken = token
  uiController.isLocked = true
  showElement(mouseBlocker)
  return token
}

function unlock(token) {
  if (token === lockToken) {
    uiController.isLocked = false
    lockToken = undefined
    hideElement(mouseBlocker)
  }
}

function showError(event, callback) {
  showErrorMsgs(event.errorMsg, callback)
}

function showErrorMsgs(messages, callback) {
  errorBlocker.show(messages, callback)
}

function hideError() {
  errorBlocker.hide()
}

function onResize() {
  const height = stageReference.windowHeight
  let newHeight
  if (height < 700) newHeight = 100
  else newHeight = 140 + (100 * (height - 700)) / 630
  header.changeHeight(newHeight)
  footer.changeHeight(newHeight)
}

function updateFading(value) {
  const ratio = (value === undefined ? config.settings.fading : value) / 100
  header.updateFading(ratio)
  footer.updateFading(ratio)
  nav.updateFading(ratio)
  post2d.updateFading(ratio)
}

export const uiController = {
  isLocked: false,
  preInit,
  init,
  showTerms,
  hideTerms,
  showHeaderFooter,
  preShowPost2d,
  showPost2d,
  hidePost2d,
  showNav,
  hideNav,
  showNavSearchItem,
  hideNavSearchItem,
  scaleMapBtn,
  showSearch,
  hideSearch,
  lock,
  unlock,
  showError,
  showErrorMsgs,
  hideError,
  errorHandler: errorBlocker.errorHandler,
  updateFading,
  showCredit,
  hideCredit,
}
