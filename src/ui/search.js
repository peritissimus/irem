import $ from 'jquery'
import trim from 'mout/string/trim'
import interpolate from 'mout/string/interpolate'
import { config } from '../config.js'
import { uiController } from '../controllers/uiController.js'
import { inputController } from '../controllers/inputController.js'
import { scene3dController } from '../controllers/scene3dController.js'
import { postController } from '../controllers/postController.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { EKTweener } from '../ektweener.js'

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
  container = $('.search')
  // matches original: T = $('<p>&#8203;</p>').text() — the zero-width space char
  emptyMarker = $('<p>&#8203;</p>').text()
  preloaderController.add(container)
}

function init() {
  initElements()
  initEvents()
}

function initElements() {
  centerWrapper = $('.search-center-wrapper')
  inputWrapper = $('.search-input-wrapper')
  inputDummy = $('.search-input-dummy')
  inputEl = $('.search-input')
  placeholderEl = $('.search-input-placeholder')
  lineEl = $('.search-line')
  hintEl = $('.search-hint')
  searchBtn = $('.search-btn')
  notFoundEl = $('.search-not-found')
  notFoundTemplate = notFoundEl.html()
}

function initEvents() {
  inputEl.on('input', onInput)
  inputEl.on('keypress', onInput)
  inputEl.on('focus', onFocus)
  inputEl.on('blur', onBlur)
  inputController.add(container, 'click', onContainerClick)
  inputController.add(inputWrapper, 'click', onInputWrapperClick)
  inputController.add(hintEl, 'click', onHintClick)
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
  if (container.hasClass('not-found')) {
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
  if (!container.hasClass('not-found')) return
  uiController.hideNavSearchItem()
  container.removeClass('not-found')
  inputEl.text(emptyMarker)
  inputEl.focus()
  moveCaretToEnd(inputEl[0])
}

function onPostSearchBegan() {
  uiController.hideNavSearchItem()
}

function onPostsSearched(result) {
  if (result.all.length > 0) uiController.hideSearch()
  if (result.parsedTagName !== '') {
    if (result.all.length > 0) scene3dController.showSearchedPosts(result.all)
    uiController.showNavSearchItem(result.tagName)
    notFoundEl.html(
      interpolate(notFoundTemplate, { interpolation: result.tagName }),
    )
    container.toggleClass('not-found', !result.all.length)
  }
}

function onPostsSearchErrored(_error) {
  // intentionally empty in original
}

function show() {
  container.removeClass('not-found')
  placeholderEl.css('visibility', 'visible')
  inputEl.text('')
  hintEl.css('display', 'none')
  postController.parsedTagName = ''
  lastSearchedTag = null
  container.show()
  EKTweener.fromTo(
    container,
    0.5,
    { opacity: 0 },
    { opacity: 1, ease: 'linear' },
  )
  EKTweener.to(centerWrapper, 0, { transform3d: 'translateZ(0)' })
  EKTweener.fromTo(
    lineEl,
    0.5,
    { transform3d: 'scale3d(0, 1, 1)' },
    { transform3d: 'scale3d(1, 1, 1)' },
  )
  EKTweener.to(inputWrapper, 0, { opacity: 0 })
  EKTweener.to(inputWrapper, 0.5, { delay: 0.5, opacity: 1 })
  inputEl.focus()
}

function hide(duration) {
  // Original: `e = e === c ? .5 : e` where `c` is undefined — so this
  // collapses to "default to 0.5 if no arg passed". Preserved literally.
  duration = duration === UNDECLARED_C ? 0.5 : duration
  EKTweener.to(container, duration, { opacity: 0, ease: 'linear' })
  EKTweener.to(centerWrapper, duration, {
    transform3d: 'scale3d(.85, .85, 1)',
    onComplete() {
      container.hide()
    },
  })
}

function onBlur() {
  onInput({ which: 1 })
  const text = inputEl.text()
  const trimmed = trim(text, ['-'])
  if (trimmed !== text) inputEl.text(trimmed)
  placeholderEl.css(
    'visibility',
    trimmed.length > 0 && trimmed !== ' ' ? 'hidden' : 'visible',
  )
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
  const text = inputEl.text()
  if (text === '' || text === ' ') {
    inputEl.text(emptyMarker)
    moveCaretToEnd(inputEl[0])
  }
}

function onInput(event) {
  if (container.hasClass('not-found')) {
    onInputWrapperClick()
    return
  }
  const html = inputEl.html()
  const text = inputEl.text()
  if (html.indexOf('<br>') > -1) {
    inputEl.html(text.replace('<br>', ''))
    moveCaretToEnd(inputEl[0])
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
  inputDummy.css('fontSize', fontSize).text(text)
  let measuredWidth
  for (;;) {
    measuredWidth = inputDummy.width() + 22
    if (!(measuredWidth > 530)) break
    inputDummy.css('fontSize', (fontSize -= 1))
  }
  inputEl[0].style.fontSize = fontSize + 'px'
  inputEl[0].style[config.transform3DStyle] =
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
          $.ajax({
            url,
            type: 'get',
            data: { ln: config.LANG },
            success: onAutoCompleteSuccess,
            error: onAutoCompleteError,
            cache: false,
          })
        }
      }, 100)
    } else {
      hintEl.css('display', 'none')
    }
  }
  lastSearchedTag = trimmedLower

  if (text !== normalized) {
    inputEl.text(normalized)
    moveCaretToEnd(inputEl[0])
  }
  if (normalized === '') {
    inputEl.text(emptyMarker)
    moveCaretToEnd(inputEl[0])
  }
  if (normalized.length > 1 && normalized.substr(0, 1) === '-') {
    inputEl.text(normalized.substr(1))
    moveCaretToEnd(inputEl[0])
  }
  placeholderEl.css(
    'visibility',
    normalized.length > 0 && normalized !== '-' ? 'hidden' : 'visible',
  )
}

function onAutoCompleteError(error) {
  uiController.showErrorMsgs(error.errorMsg)
}

function onAutoCompleteSuccess(response) {
  // NOTE: original guard `S.length === c` compares a number to undefined —
  //       always false. Effectively only the `S.length < 3` branch can fire.
  //       Preserved literally.
  if (lastSearchedTag.length === UNDECLARED_C || lastSearchedTag.length < 3) {
    hintEl.css('display', 'none')
    return
  }
  if (response.success) {
    const lower = lastSearchedTag.toLowerCase()
    if (response.data.tagFragment === lower) {
      const list = response.data.list
      const offset = lastSearchedTag.length
      hintEl.each(function fillHintItem(i) {
        const tag = list[i]
        if (tag) {
          this._tag = tag
          this.innerHTML = lastSearchedTag + tag.substr(offset)
        }
        this.style.display = tag ? 'inline' : 'none'
      })
    }
  } else {
    onAutoCompleteError(response)
  }
}

function onHintClick() {
  const $this = $(this)
  lastSearchedTag = ''
  inputEl.text($this.text())
  onInput({ which: 13 })
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
