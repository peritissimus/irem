import $ from 'jquery'
import trim from 'mout/string/trim'
// NOTE: mout/object/get was declared as an AMD dep but never invoked — preserved
import get from 'mout/object/get' // eslint-disable-line no-unused-vars
import isArray from 'mout/lang/isArray'
import interpolate from 'mout/string/interpolate'
import { config } from '../config.js'
import { stepController } from '../controllers/stepController.js'
import { inputController } from '../controllers/inputController.js'
import { postController } from '../controllers/postController.js'
import { uiController } from '../controllers/uiController.js'
import { EKTweener } from '../ektweener.js'

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
  container = $('.add-steps-message')
  // matches original: M = $('<p>&#8203;</p>').text() — the zero-width space char
  emptyMarker = $('<p>&#8203;</p>').text()
  initElements()
  initEvents()
}

function initElements() {
  itemsWrapper = $('.add-steps-message-items-wrapper')
  nameWrapper = $('.add-steps-message-name-wrapper')
  nameInput = nameWrapper.find('.add-steps-message-input')
  emailWrapper = $('.add-steps-message-email-wrapper')
  emailInput = emailWrapper.find('.add-steps-message-input')
  messageWrapper = $('.add-steps-message-message-wrapper')
  messagePrefix = messageWrapper.find('.add-steps-message-message-prefix')
  messageInput = messageWrapper.find('.add-steps-message-input')
  messageScrollpane = messageWrapper[0].scrollpane
  nameDefaultHTML = nameInput.html()
  emailDefaultHTML = emailInput.html()
  messageDefaultHTML = messageInput.html()
  termsWrapper = $('.add-steps-message-terms')
  termsAcceptEl = $('.add-steps-message-terms-i-accept')
  termsLinkEl = $('.add-steps-message-terms-link')
  // NOTE: original selector lists `.add-steps-message-input` three times rather
  //       than naming the three fields individually — preserved verbatim.
  allInputsAndTerms = $(
    '.add-steps-message-input, .add-steps-message-input, .add-steps-message-input, .add-steps-message-terms-i-accept',
  )

  nameInput[0].__focusY = 110
  nameInput[0].__id = 'name'
  nameInput[0].__container = nameWrapper
  nameInput[0].__defaultHTML = nameDefaultHTML
  nameInput[0].__defaultText = trim(nameInput.text())

  emailInput[0].__focusY = 63
  emailInput[0].__id = 'email'
  emailInput[0].__container = emailWrapper
  emailInput[0].__defaultHTML = emailDefaultHTML
  emailInput[0].__defaultText = trim(emailInput.text())

  messageInput[0].__focusY = 23
  messageInput[0].__id = 'message'
  messageInput[0].__container = messageWrapper
  messageInput[0].__defaultHTML = messageDefaultHTML
  messageInput[0].__defaultText = trim(messageInput.text())

  termsAcceptEl[0].__focusY = 23
  termsAcceptEl[0].__id = 'terms'
  termsAcceptEl[0].__container = termsWrapper

  allInputsAndTerms.each(function registerField() {
    fieldsById[this.__id] = this
  })
}

function initEvents() {
  allInputsAndTerms.focus(function onFieldFocus() {
    focusField(this.__id, 0.5)
  })
  nameInput
    .add(emailInput)
    .add(messageInput)
    .on('input', onInputChange)
  nameInput.add(emailInput).on('keypress', function onKeypress(event) {
    if (event.which === 13) return false
    this.__skipLineBreakParsing = true
    return true
  })
  inputController.add(termsLinkEl, 'click', onTermsLinkClick)
  inputController.add(termsAcceptEl, 'click', onTermsAcceptClick)
  nameInput.blur(validateName)
  emailInput.blur(validateEmail)
  messageInput.blur(validateMessage)
}

function onTermsLinkClick() {
  focusField('terms', 0.5)
  uiController.showTerms()
}

function onTermsAcceptClick() {
  focusField('terms', 0.5)
  termsAcceptEl.toggleClass('selected')
  if (isTermsAccepted()) stepController.enableValidateBtn()
  else stepController.disableValidateBtn()
}

function onInputChange() {
  const html = $(this).html()
  let text = $(this).text()
  if (html.indexOf('<br>') > -1 || html.lastIndexOf('<div>') !== -1) {
    this.innerHTML = text
    moveCaretToEnd(this)
  }
  text = trim($(this).text())
  if (text.length === 0 && this.__id !== 'message') {
    $(this).html(this.__defaultHTML)
    selectAll(this)
  }
  this.__skipLineBreakParsing = false
  if (this === messageInput[0]) messageScrollpane.onResize()
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
  EKTweener.to(itemsWrapper, duration, {
    transform3d: 'translate3d(0, ' + field.__focusY + 'px, 0)',
  })

  if (id === 'name') {
    if (!validateName()) {
      nameInput.text(emptyMarker)
      moveCaretToEnd(nameInput[0])
    }
  } else if (id === 'email') {
    if (emailInput.text() === emailInput[0].__defaultText) {
      emailInput.text(emptyMarker)
      moveCaretToEnd(emailInput[0])
    }
  } else if (id === 'message') {
    // NOTE: original does not call moveCaretToEnd in the message branch — preserved
    if (!validateMessage()) messageInput.text(emptyMarker)
  }

  let focusedIndex = -1
  allInputsAndTerms.removeClass('focus')
  allInputsAndTerms.each(function findIndex(i) {
    if (this === field) {
      focusedIndex = i
      return false
    }
  })
  allInputsAndTerms.each(function fadeField(i) {
    if (i > focusedIndex + 1) {
      EKTweener.to(this.__container, duration, {
        opacity: 0,
        ease: 'linear',
        onComplete() {
          // NOTE: `_appliedTarget` is a property the EKTweener sets on its
          // tween context to expose the resolved style object — preserved.
          this._appliedTarget.visibility = 'hidden'
        },
      })
    } else {
      this.__container.css('visibility', 'visible')
      EKTweener.to(this.__container, duration, {
        opacity: i === focusedIndex ? 1 : 0.75,
        ease: 'linear',
      })
    }
    this.__container.toggleClass('focus', i === focusedIndex)
  })
}

function show() {
  stepController.enableBackBtn()
  stepController.disableValidateBtn()
  stepController.showBackBtn(onBackBtn)
  stepController.showValidateBtn(onValidateBtn)
  container.show()
  messageInput.css({ textIndent: messagePrefix.width() + 5 })
  reset()
}

function validateName() {
  let text = trim(nameInput.text())
  text = text.replace(emptyMarker, '')
  const valid = text.length > 1 && text !== nameInput[0].__defaultText
  nameWrapper.toggleClass('completed', valid)
  if (!valid) nameInput.html(nameInput[0].__defaultHTML)
  return valid
}

function validateEmail() {
  let text = trim(emailInput.text())
  text = text.replace(emptyMarker, '')
  // NOTE: the original regex character class contains `&amp;` (HTML-encoded
  //       ampersand) — almost certainly an extraction/source artifact, but
  //       preserved verbatim per project rules. Effect: literal `&`, `a`, `m`,
  //       `p`, `;` are all accepted in the local-part instead of just `&`.
  const valid =
    /^[a-zA-Z0-9.!#$%&amp;'*+\-\/=?\^_`{|}~\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*$/.test(
      text,
    )
  emailWrapper.toggleClass('completed', valid)
  if (!valid) emailInput.html(emailInput[0].__defaultHTML)
  return valid
}

function validateMessage() {
  let text = trim(messageInput.text())
  text = text.replace(emptyMarker, '')
  const valid = text.length > 0 && text !== messageInput[0].__defaultText
  messageWrapper.toggleClass('completed', valid)
  if (!valid) messageInput.html(messageInput[0].__defaultHTML)
  return valid
}

function onBackBtn() {
  stepController.goToStep('adjustment')
}

function isTermsAccepted() {
  return termsAcceptEl.hasClass('selected')
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
  formData.append('name', nameInput.text().replace(/(\u00a0|\u200b)/g, ''))
  formData.append('email', emailInput.text().replace(/(\u00a0|\u200b)/g, ''))
  formData.append('message', messageInput.text().replace(/(\u00a0|\u200b)/g, ''))
  formData.append('imgOffsetX', stepController.data.imgOffsetX)
  formData.append('imgOffsetY', stepController.data.imgOffsetY)
  formData.append('fileId', stepController.data.fileId)
  uiController.lock('post-submit')
  $.ajax({
    url: 'api/post',
    type: 'POST',
    dataType: 'json',
    success: onPostSuccess,
    data: formData,
    error: onPostError,
    cache: false,
    contentType: false,
    processData: false,
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
  nameInput.html(nameDefaultHTML)
  emailInput.html(emailDefaultHTML)
  messageInput.html(messageDefaultHTML)
  nameWrapper.removeClass('completed')
  emailWrapper.removeClass('completed')
  messageWrapper.removeClass('completed')
  termsAcceptEl.removeClass('selected')
  focusField('name', 0)
  validateName()
}

function hide() {
  container.hide()
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
