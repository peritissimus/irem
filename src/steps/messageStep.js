import { trim, isArray, interpolate } from '../utils/native.js'
import { config } from '../config.js'
import { stepController } from '../controllers/stepController.js'
import { inputController } from '../controllers/inputController.js'
import { postController } from '../controllers/postController.js'
import { uiController } from '../controllers/uiController.js'
import { animator } from '../animation/animator.js'
import {
  hide as hideElement,
  qs,
  qsa,
  show as showElement,
  toggleClass,
} from '../utils/dom.js'
import { requestJson } from '../utils/request.js'

let container
let itemsWrapper
let nameWrapper
let nameInput
let emailWrapper
let emailInput
let messageWrapper
let messagePrefix
let messageInput
let allInputsAndTerms
const fieldsById = {}
let termsWrapper
let termsAcceptEl
let termsLinkEl
let messageScrollpane
let nameDefaultHTML
let emailDefaultHTML
let messageDefaultHTML
let emptyMarker

function init() {
  container = qs('.add-steps-message')
  // matches original: M = $('<p>&#8203;</p>').text() — the zero-width space char
  emptyMarker = '\u200b'
  initElements()
  initEvents()
}

function initElements() {
  itemsWrapper = qs('.add-steps-message-items-wrapper')
  nameWrapper = qs('.add-steps-message-name-wrapper')
  nameInput = qs('.add-steps-message-input', nameWrapper)
  emailWrapper = qs('.add-steps-message-email-wrapper')
  emailInput = qs('.add-steps-message-input', emailWrapper)
  messageWrapper = qs('.add-steps-message-message-wrapper')
  messagePrefix = qs('.add-steps-message-message-prefix', messageWrapper)
  messageInput = qs('.add-steps-message-input', messageWrapper)
  messageScrollpane = messageWrapper.scrollpane
  nameDefaultHTML = nameInput.innerHTML
  emailDefaultHTML = emailInput.innerHTML
  messageDefaultHTML = messageInput.innerHTML
  termsWrapper = qs('.add-steps-message-terms')
  termsAcceptEl = qs('.add-steps-message-terms-i-accept')
  termsLinkEl = qs('.add-steps-message-terms-link')
  // NOTE: original selector lists `.add-steps-message-input` three times rather
  //       than naming the three fields individually — preserved verbatim.
  allInputsAndTerms = qsa(
    '.add-steps-message-input, .add-steps-message-input, .add-steps-message-input, .add-steps-message-terms-i-accept',
  )

  nameInput.__focusY = 110
  nameInput.__id = 'name'
  nameInput.__container = nameWrapper
  nameInput.__defaultHTML = nameDefaultHTML
  nameInput.__defaultText = trim(nameInput.textContent)

  emailInput.__focusY = 63
  emailInput.__id = 'email'
  emailInput.__container = emailWrapper
  emailInput.__defaultHTML = emailDefaultHTML
  emailInput.__defaultText = trim(emailInput.textContent)

  messageInput.__focusY = 23
  messageInput.__id = 'message'
  messageInput.__container = messageWrapper
  messageInput.__defaultHTML = messageDefaultHTML
  messageInput.__defaultText = trim(messageInput.textContent)

  termsAcceptEl.__focusY = 23
  termsAcceptEl.__id = 'terms'
  termsAcceptEl.__container = termsWrapper

  allInputsAndTerms.forEach((field) => {
    fieldsById[field.__id] = field
  })
}

function initEvents() {
  allInputsAndTerms.forEach((field) => {
    field.addEventListener('focus', function onFieldFocus() {
      focusField(this.__id, 0.5)
    })
  })
  ;[nameInput, emailInput, messageInput].forEach((input) => {
    input.addEventListener('input', onInputChange)
  })
  ;[nameInput, emailInput].forEach((input) => {
    input.addEventListener('keypress', function onKeypress(event) {
      if (event.which === 13) {
        event.preventDefault()
        return
      }
      this.__skipLineBreakParsing = true
    })
  })
  inputController.add(termsLinkEl, 'click', onTermsLinkClick)
  inputController.add(termsAcceptEl, 'click', onTermsAcceptClick)
  nameInput.addEventListener('blur', validateName)
  emailInput.addEventListener('blur', validateEmail)
  messageInput.addEventListener('blur', validateMessage)
}

function onTermsLinkClick() {
  focusField('terms', 0.5)
  uiController.showTerms()
}

function onTermsAcceptClick() {
  focusField('terms', 0.5)
  termsAcceptEl.classList.toggle('selected')
  if (isTermsAccepted()) stepController.enableValidateBtn()
  else stepController.disableValidateBtn()
}

function onInputChange() {
  const html = this.innerHTML
  let text = this.textContent
  if (html.indexOf('<br>') > -1 || html.lastIndexOf('<div>') !== -1) {
    this.innerHTML = text
    moveCaretToEnd(this)
  }
  text = trim(this.textContent)
  if (text.length === 0 && this.__id !== 'message') {
    this.innerHTML = this.__defaultHTML
    selectAll(this)
  }
  this.__skipLineBreakParsing = false
  if (this === messageInput) messageScrollpane.onResize()
}

function selectAll(node) {
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

function focusField(id, duration) {
  const field = fieldsById[id]
  // NOTE: original used `transform3d: 'translate3d(0, Ypx, 0)'` — migrated to
  // gsap's `y` which animates translateY through its transform system.
  animator.killTweensOf(itemsWrapper, 'y')
  animator.to(itemsWrapper, {
    duration,
    y: field.__focusY,
    ease: 'none',
  })

  if (id === 'name') {
    if (!validateName()) {
      nameInput.textContent = emptyMarker
      moveCaretToEnd(nameInput)
    }
  } else if (id === 'email') {
    if (emailInput.textContent === emailInput.__defaultText) {
      emailInput.textContent = emptyMarker
      moveCaretToEnd(emailInput)
    }
  } else if (id === 'message') {
    // NOTE: original does not call moveCaretToEnd in the message branch — preserved
    if (!validateMessage()) messageInput.textContent = emptyMarker
  }

  let focusedIndex = -1
  allInputsAndTerms.forEach((item) => toggleClass(item, 'focus', false))
  allInputsAndTerms.some((item, i) => {
    if (item === field) {
      focusedIndex = i
      return true
    }
    return false
  })
  allInputsAndTerms.forEach((item, i) => {
    const container = item.__container
    if (i > focusedIndex + 1) {
      animator.killTweensOf(container, 'opacity')
      animator.to(container, {
        duration,
        opacity: 0,
        ease: 'none',
        onComplete() {
          // NOTE: original set `this._appliedTarget.visibility = 'hidden'`
          // where `_appliedTarget` was the element's style object; equivalent
          // to setting CSS `visibility: hidden` on the container.
          container.style.visibility = 'hidden'
        },
      })
    } else {
      item.__container.style.visibility = 'visible'
      animator.killTweensOf(container, 'opacity')
      animator.to(container, {
        duration,
        opacity: i === focusedIndex ? 1 : 0.75,
        ease: 'none',
      })
    }
    toggleClass(item.__container, 'focus', i === focusedIndex)
  })
}

function show() {
  stepController.enableBackBtn()
  stepController.disableValidateBtn()
  stepController.showBackBtn(onBackBtn)
  stepController.showValidateBtn(onValidateBtn)
  showElement(container)
  messageInput.style.textIndent = `${messagePrefix.offsetWidth + 5}px`
  reset()
}

function validateName() {
  let text = trim(nameInput.textContent)
  text = text.replace(emptyMarker, '')
  const valid = text.length > 1 && text !== nameInput.__defaultText
  toggleClass(nameWrapper, 'completed', valid)
  if (!valid) nameInput.innerHTML = nameInput.__defaultHTML
  return valid
}

function validateEmail() {
  let text = trim(emailInput.textContent)
  text = text.replace(emptyMarker, '')
  // NOTE: the original regex character class contains `&amp;` (HTML-encoded
  //       ampersand) — almost certainly an extraction/source artifact, but
  //       preserved verbatim per project rules. Effect: literal `&`, `a`, `m`,
  //       `p`, `;` are all accepted in the local-part instead of just `&`.
  const valid =
    /^[a-zA-Z0-9.!#$%&amp;'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(
      text,
    )
  toggleClass(emailWrapper, 'completed', valid)
  if (!valid) emailInput.innerHTML = emailInput.__defaultHTML
  return valid
}

function validateMessage() {
  let text = trim(messageInput.textContent)
  text = text.replace(emptyMarker, '')
  const valid = text.length > 0 && text !== messageInput.__defaultText
  toggleClass(messageWrapper, 'completed', valid)
  if (!valid) messageInput.innerHTML = messageInput.__defaultHTML
  return valid
}

function onBackBtn() {
  stepController.goToStep('adjustment')
}

function isTermsAccepted() {
  return termsAcceptEl.classList.contains('selected')
}

function onValidateBtn() {
  const errorMessages = config.ERROR_MESSAGES
  if (!validateName()) {
    uiController.showErrorMsgs(errorMessages.name)
    return
  }
  if (!validateEmail()) {
    uiController.showErrorMsgs(errorMessages.email)
    return
  }
  if (!validateMessage()) {
    uiController.showErrorMsgs(errorMessages.message)
    return
  }
  if (!isTermsAccepted()) {
    uiController.showErrorMsgs(errorMessages.terms)
    return
  }

  const formData = new FormData()
  formData.append('ln', config.LANG)
  formData.append(
    'name',
    nameInput.textContent.replace(/(\u00a0|\u200b)/g, ''),
  )
  formData.append(
    'email',
    emailInput.textContent.replace(/(\u00a0|\u200b)/g, ''),
  )
  formData.append(
    'message',
    messageInput.textContent.replace(/(\u00a0|\u200b)/g, ''),
  )
  formData.append('imgOffsetX', stepController.data.imgOffsetX)
  formData.append('imgOffsetY', stepController.data.imgOffsetY)
  formData.append('fileId', stepController.data.fileId)
  uiController.lock('post-submit')
  requestJson('api/post', {
    method: 'POST',
    success: onPostSuccess,
    data: formData,
    error: onPostError,
  })
}

function onPostSuccess(response) {
  if (response.success) {
    postController.parseSubmittedPost(response.data)
    stepController.data.id = response.data.id
    uiController.unlock('post-submit')
    stepController.goToStep('congrats')
  } else {
    onPostError(response)
  }
}

function onPostError(response) {
  uiController.unlock('post-submit')
  let messages
  if (response && response.errorMsg) {
    messages = response.errorMsg
    if (!isArray(messages)) messages = [messages]
    const errorMessages = config.ERROR_MESSAGES
    for (let i = 0, n = messages.length; i < n; i++) {
      let key = messages[i]
      if (key === 'badWord') {
        key = interpolate(errorMessages[key], {
          interpolation: response.data.badWords.join(', '),
        })
      } else {
        key = errorMessages[key] || errorMessages.unexpected
      }
      messages[i] = key
    }
  }
  uiController.showErrorMsgs(messages)
}

function reset() {
  nameInput.innerHTML = nameDefaultHTML
  emailInput.innerHTML = emailDefaultHTML
  messageInput.innerHTML = messageDefaultHTML
  toggleClass(nameWrapper, 'completed', false)
  toggleClass(emailWrapper, 'completed', false)
  toggleClass(messageWrapper, 'completed', false)
  toggleClass(termsAcceptEl, 'selected', false)
  focusField('name', 0)
  validateName()
}

function hide() {
  hideElement(container)
}

export const messageStep = {
  id: 'message',
  animationIndex: 3,
  indicatorIndex: 1,
  init,
  show,
  hide,
}

export default messageStep
