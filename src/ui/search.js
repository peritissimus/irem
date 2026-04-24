import { trim, interpolate } from '../utils/native.js'
import { config } from '../config.js'
import { uiController } from '../controllers/uiController.js'
import { inputController } from '../controllers/inputController.js'
import { scene3dController } from '../controllers/scene3dController.js'
import { postController } from '../controllers/postController.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { animator } from '../animation/animator.js'
import {
  hide as hideElement,
  qs,
  qsa,
  setText,
  show as showElement,
  toggleClass,
  withDescendants,
} from '../utils/dom.js'
import { jsonp } from '../utils/jsonp.js'

const BASE_FONT_SIZE = 100

// NOTE: original declared `var c` in the factory body but never assigned it.
//       It is referenced by `hide()` and `onAutoCompleteSuccess()` purely as an
//       implicit `undefined` sentinel — the comparisons `e === c` and
//       `S.length === c` are intentionally-or-accidentally always falsy when
//       lengths are involved. Preserved verbatim via `UNDECLARED_C`.
const UNDECLARED_C = undefined

let container
let centerWrapper
let inputDummy
let inputWrapper
let inputEl
let placeholderEl
let lineEl
let hintEl
let searchBtn
let notFoundEl
let notFoundTemplate
let lastSearchedTag
let emptyMarker

function preInit() {
  container = qs('.search')
  // matches original: T = $('<p>&#8203;</p>').text() — the zero-width space char
  emptyMarker = '\u200b'
  preloaderController.add(withDescendants(container))
}

function init() {
  initElements()
  initEvents()
}

function initElements() {
  centerWrapper = qs('.search-center-wrapper')
  inputWrapper = qs('.search-input-wrapper')
  inputDummy = qs('.search-input-dummy')
  inputEl = qs('.search-input')
  placeholderEl = qs('.search-input-placeholder')
  lineEl = qs('.search-line')
  hintEl = qsa('.search-hint')
  searchBtn = qs('.search-btn')
  notFoundEl = qs('.search-not-found')
  notFoundTemplate = notFoundEl.innerHTML
}

function initEvents() {
  inputEl.addEventListener('input', onInput)
  inputEl.addEventListener('keypress', onInput)
  inputEl.addEventListener('focus', onFocus)
  inputEl.addEventListener('blur', onBlur)
  inputController.add(container, 'click', onContainerClick)
  inputController.add(inputWrapper, 'click', onInputWrapperClick)
  hintEl.forEach((hint) => inputController.add(hint, 'click', onHintClick))
  inputController.add(searchBtn, 'click', onSearchBtnClick)
  postController.onPostSearchBegan.add(onPostSearchBegan)
  postController.onPostsSearched.add(onPostsSearched)
  postController.onPostsSearchErrored.add(onPostsSearchErrored)
}

function onSearchBtnClick() {
  onInput({ which: 13 })
}

function onContainerClick(event) {
  if (event.target !== this) return
  if (container.classList.contains('not-found')) {
    // NOTE: original calls `v()` here, where `v` is the search-input-wrapper
    //       jQuery object — invoking it as a function throws TypeError.
    //       Preserved literally.
    inputWrapper()
  } else {
    uiController.hideSearch()
    scene3dController.enableControl()
  }
}

function onInputWrapperClick() {
  if (!container.classList.contains('not-found')) return
  uiController.hideNavSearchItem()
  toggleClass(container, 'not-found', false)
  setText(inputEl, emptyMarker)
  inputEl.focus()
  moveCaretToEnd(inputEl)
}

function onPostSearchBegan() {
  uiController.hideNavSearchItem()
}

function onPostsSearched(result) {
  if (result.all.length > 0) uiController.hideSearch()
  if (result.parsedTagName !== '') {
    if (result.all.length > 0) scene3dController.showSearchedPosts(result.all)
    uiController.showNavSearchItem(result.tagName)
    notFoundEl.innerHTML = interpolate(notFoundTemplate, {
      interpolation: result.tagName,
    })
    toggleClass(container, 'not-found', !result.all.length)
  }
}

function onPostsSearchErrored(_error) {
  // intentionally empty in original
}

function show() {
  toggleClass(container, 'not-found', false)
  placeholderEl.style.visibility = 'visible'
  setText(inputEl, '')
  setHintDisplay('none')
  postController.parsedTagName = ''
  lastSearchedTag = null
  showElement(container)
  animator.killTweensOf(container, 'opacity')
  animator.fromTo(
    container,
    { opacity: 0 },
    { duration: 0.5, opacity: 1, ease: 'none' },
  )
  // NOTE: original `transform3d: 'translateZ(0)'` wrote a full `translateZ(0)`
  // transform, implicitly resetting any residual scale left by hide(). Migrated
  // to an explicit scale reset alongside the z-translation.
  animator.killTweensOf(centerWrapper, 'scale,scaleX,scaleY,z')
  animator.set(centerWrapper, { scale: 1, z: 0 })
  // NOTE: original `scale3d(0, 1, 1)` -> `scale3d(1, 1, 1)` only varies X; Y and
  // Z stay at identity, so only scaleX is animated.
  animator.killTweensOf(lineEl, 'scaleX')
  animator.fromTo(
    lineEl,
    { scaleX: 0 },
    { duration: 0.5, scaleX: 1, ease: 'circ.out' },
  )
  animator.killTweensOf(inputWrapper, 'opacity')
  animator.set(inputWrapper, { opacity: 0 })
  animator.to(inputWrapper, {
    duration: 0.5,
    delay: 0.5,
    opacity: 1,
    ease: 'circ.out',
  })
  inputEl.focus()
}

function hide(duration) {
  // Original: `e = e === c ? .5 : e` where `c` is undefined — so this
  // collapses to "default to 0.5 if no arg passed". Preserved literally.
  duration = duration === UNDECLARED_C ? 0.5 : duration
  animator.killTweensOf(container, 'opacity')
  animator.to(container, { duration, opacity: 0, ease: 'none' })
  // NOTE: original `scale3d(.85, .85, 1)` leaves Z at identity; migrated to
  // gsap `scale` (shorthand for scaleX + scaleY).
  animator.killTweensOf(centerWrapper, 'scale,scaleX,scaleY')
  animator.to(centerWrapper, {
    duration,
    scale: 0.85,
    ease: 'circ.out',
    onComplete() {
      hideElement(container)
    },
  })
}

function onBlur() {
  onInput({ which: 1 })
  const text = inputEl.textContent
  const trimmed = trim(text, ['-'])
  if (trimmed !== text) setText(inputEl, trimmed)
  placeholderEl.style.visibility =
    trimmed.length > 0 && trimmed !== ' ' ? 'hidden' : 'visible'
}

// NOTE: defined in original but never invoked — preserved
function selectAll(node) { // eslint-disable-line no-unused-vars
  const range = document.createRange()
  range.selectNodeContents(node)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
}

function moveCaretToEnd(node) {
  if (
    typeof window.getSelection !== 'undefined' &&
    typeof document.createRange !== 'undefined'
  ) {
    const range = document.createRange()
    range.selectNodeContents(node)
    range.collapse(false)
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
  } else if (typeof document.body.createTextRange !== 'undefined') {
    const range = document.body.createTextRange()
    range.moveToElementText(node)
    range.collapse(false)
    range.select()
  }
}

function onFocus() {
  const text = inputEl.textContent
  if (text === '' || text === ' ') {
    setText(inputEl, emptyMarker)
    moveCaretToEnd(inputEl)
  }
}

function onInput(event) {
  if (container.classList.contains('not-found')) {
    onInputWrapperClick()
    return
  }
  const html = inputEl.innerHTML
  const text = inputEl.textContent
  if (html.indexOf('<br>') > -1) {
    inputEl.innerHTML = text.replace('<br>', '')
    moveCaretToEnd(inputEl)
    return
  }

  let url
  let normalized = text
    .replace(' ', '-')
    .replace(/[-!$%^&*()_+|~=`{}[\]:";'<>?,./]/g, '-')
  normalized = normalized.replace(emptyMarker, '-')
  normalized = normalized.replace(/\s+/g, '-')
  normalized = normalized.replace('--', '-')

  let fontSize = BASE_FONT_SIZE
  inputDummy.style.fontSize = `${fontSize}px`
  setText(inputDummy, text)
  let measuredWidth
  for (;;) {
    measuredWidth = inputDummy.offsetWidth + 22
    if (!(measuredWidth > 530)) break
    fontSize -= 1
    inputDummy.style.fontSize = `${fontSize}px`
  }
  inputEl.style.fontSize = fontSize + 'px'
  inputEl.style[config.transform3DStyle] =
    'translate3d(0,' + ((BASE_FONT_SIZE - fontSize) >> 1) + 'px,0)'

  const trimmedLower = trim(normalized.toLowerCase(), ['-'])

  if (event.which === 13) {
    url = 'api/'
    if (trimmedLower.length > 0) url += '/' + trimmedLower
    postController.searchPosts(trimmedLower)
    normalized = trim(normalized, ['-'])
  }

  if (lastSearchedTag !== trimmedLower && event.which !== 13) {
    if (trimmedLower.length >= 3) {
      setTimeout(function pollAutoComplete() {
        if (lastSearchedTag === trimmedLower) {
          url = 'api/auto-complete-tags/' + trimmedLower
          jsonp(`${url}?ln=${config.LANG}`, {
            success: onAutoCompleteSuccess,
            error: onAutoCompleteError,
          })
        }
      }, 100)
    } else {
      setHintDisplay('none')
    }
  }
  lastSearchedTag = trimmedLower

  if (text !== normalized) {
    setText(inputEl, normalized)
    moveCaretToEnd(inputEl)
  }
  if (normalized === '') {
    setText(inputEl, emptyMarker)
    moveCaretToEnd(inputEl)
  }
  if (normalized.length > 1 && normalized.substr(0, 1) === '-') {
    setText(inputEl, normalized.substr(1))
    moveCaretToEnd(inputEl)
  }
  placeholderEl.style.visibility =
    normalized.length > 0 && normalized !== '-' ? 'hidden' : 'visible'
}

function onAutoCompleteError(error) {
  uiController.showErrorMsgs(error?.errorMsg)
}

function onAutoCompleteSuccess(response) {
  // NOTE: original guard `S.length === c` compares a number to undefined —
  //       always false. Effectively only the `S.length < 3` branch can fire.
  //       Preserved literally.
  if (lastSearchedTag.length === UNDECLARED_C || lastSearchedTag.length < 3) {
    setHintDisplay('none')
    return
  }
  if (response.success) {
    const lower = lastSearchedTag.toLowerCase()
    if (response.data.tagFragment === lower) {
      const list = response.data.list
      const offset = lastSearchedTag.length
      hintEl.forEach((hint, i) => {
        const tag = list[i]
        if (tag) {
          hint._tag = tag
          hint.innerHTML = lastSearchedTag + tag.substr(offset)
        }
        hint.style.display = tag ? 'inline' : 'none'
      })
    }
  } else {
    onAutoCompleteError(response)
  }
}

function onHintClick() {
  lastSearchedTag = ''
  setText(inputEl, this.textContent)
  onInput({ which: 13 })
}

function setHintDisplay(display) {
  hintEl.forEach((hint) => {
    hint.style.display = display
  })
}

export const search = {
  get container() {
    return container
  },
  preInit,
  init,
  show,
  hide,
}

export default search
