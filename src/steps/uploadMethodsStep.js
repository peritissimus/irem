import { bind, get } from '../utils/native.js'
import { config } from '../config.js'
import { stepCircle } from '../scene3d/stepCircle.js'
import { stepController } from '../controllers/stepController.js'
import { uiController } from '../controllers/uiController.js'
import { inputController } from '../controllers/inputController.js'
import { facebook } from '../socials/facebook.js'
import { instagram } from '../socials/instagram.js'
import { animator } from '../animation/animator.js'
import {
  hide as hideElement,
  qs,
  qsa,
  setText,
  show as showElement,
  toggleClass,
} from '../utils/dom.js'
import { requestJson } from '../utils/request.js'

// NOTE: original AMD factory captured `t.transform3DStyle` and
// `t.ERROR_MESSAGES` at module-load time — both are read inside functions
// here instead, to honor the lazy `config` rule.

const MAX_FILE_SIZE = 5242880
const MIN_DIMENSION = 512
const MAX_DIMENSION = 5000

let container
let selectionContainer
let circleBtns
let facebookSymbol
let instagramSymbol
let localSymbol
let textsContainer
let localForm
let localInput
let albumContainer
let scrollPane
let itemsContainer
let itemTemplate
let albumCloseBtn
let _albumOpenBtn // NOTE: cached but never wired in original — preserved
let photoBackBtn
let photoOpenBtn
let loadingEl

let iconLocked = false // NOTE: original `O` flag — set to false in show(),
                       // checked in over/out handlers, never set to true
                       // anywhere in the chunk. Preserved verbatim.
let currentView = {}
let savedAlbumView = {}
let savedAlbumItems
let isLoadingMore = false

function init() {
  cacheElements()
  bindEvents()
}

function cacheElements() {
  container = qs('.add-steps-upload-methods')
  selectionContainer = qs('.add-steps-upload-methods-selection-container')
  circleBtns = qsa('.add-steps-upload-methods-icons-container .circle-btn')
  facebookSymbol = qs('.circle-btn-symbol-facebook')
  instagramSymbol = qs('.circle-btn-symbol-instagram')
  localSymbol = qs('.circle-btn-symbol-local')
  textsContainer = qs('.add-steps-upload-methods-texts-container')
  localForm = qs('.add-steps-upload-methods-local-form')
  localInput = qs('#local-upload')
  albumContainer = qs('.add-steps-upload-methods-album-container')
  scrollPane = qs('.add-steps-upload-methods-items-scroll-wrapper').scrollpane
  scrollPane.onUpdateCallback = onScrollUpdate
  itemsContainer = qs('.add-steps-upload-methods-items-container-inner')
  itemTemplate = qs('.add-steps-upload-methods-item')
  itemTemplate.remove()
  albumCloseBtn = qs('.add-steps-upload-methods-album-close-btn')
  _albumOpenBtn = qs('.add-steps-upload-methods-album-footer-btn-album-open')
  photoBackBtn = qs('.add-steps-upload-methods-album-footer-btn-photo-back')
  photoOpenBtn = qs('.add-steps-upload-methods-album-footer-btn-photo-open')
  loadingEl = qs('.add-steps-upload-methods-loading')
}

function bindEvents() {
  circleBtns.forEach((button) => {
    button.circleBtn.onOvered.add(onIconOver)
    button.circleBtn.onOuted.add(onIconOut)
    button.circleBtn.onClicked.add(onIconClick)
  })
  localInput.addEventListener('change', onLocalInputChange)
  instagram.onRetrievedSuccess.add(onInstagramSuccess)
  instagram.onRetrievedFailed.add(onInstagramFailed)
  facebook.onRetrievedSuccess.add(onFacebookSuccess)
  facebook.onRetrievedFailed.add(onFacebookFailed)
  inputController.add(albumCloseBtn, 'click', onAlbumClose)
  inputController.add(photoOpenBtn, 'click', onPhotoOpen)
  inputController.add(photoBackBtn, 'click', onPhotoBack)
}

function onPhotoOpen() {
  const selected = qs('.add-steps-upload-methods-item.is-selected')
  if (selected) doUpload(selected.dataset.img)
}

function onPhotoBack() {
  currentView = savedAlbumView
  itemsContainer.replaceChildren()
  toggleClass(albumContainer, 'has-selected', false)
  itemsContainer.append(...savedAlbumItems)
  setAlbumClasses(currentView)
  scrollPane.onResize()
}

function onScrollUpdate(_event, pos) {
  if (
    !isLoadingMore &&
    pos < -1 &&
    !uiController.isLocked &&
    currentView.loadMore
  ) {
    isLoadingMore = true
    setTimeout(() => {
      isLoadingMore = false
    }, 1000)
    currentView.loadMore()
  }
}

function onIconOver(circleBtn) {
  if (!iconLocked) setSelectionType(circleBtn.el.dataset.id)
}

function onIconOut() {
  if (!iconLocked) setSelectionType('default')
}

function onIconClick(circleBtn) {
  const type = circleBtn.el.dataset.id
  if (type === 'facebook') {
    uiController.lock('facebook-load')
    facebook.retrieveImages({ type: 'albums' })
  } else if (type === 'instagram') {
    instagram.retrieveImages()
  } else {
    localInput.value = ''
  }
}

function onFacebookSuccess(response) {
  uiController.unlock('facebook-load')
  const data = response.data
  const items = []
  let entry
  let i
  let len

  if (data.length > 0) {
    const kind = data[0].images ? 'photos' : 'albums'
    const cursor = get(response, 'paging.cursors.after')
    const params = { type: kind, after: cursor }

    if (kind === 'albums') {
      for (i = 0, len = data.length; i < len; i++) {
        entry = data[i]
        if (get(entry, 'cover_photo')) {
          items.push({
            id: get(entry, 'id'),
            text: get(entry, 'name'),
            thumb: get(entry, 'cover_photo'),
          })
        }
      }
    } else {
      for (i = 0, len = data.length; i < len; i++) {
        entry = data[i]
        items.push({
          text: get(entry, 'name'),
          thumb: facebook.getThumbUrl(entry),
          img: get(entry, 'source'),
        })
      }
      params.albumId = get(response, 'paging.next')
      if (params.albumId) {
        params.albumId = params.albumId.split('/')[3]
      } else {
        params.albumId = '0'
      }
    }

    renderView({
      type: kind,
      social: 'facebook',
      loadMore: cursor ? bind(facebook.retrieveImages, facebook, params) : null,
      items,
    })
  }
}

function onInstagramSuccess(response) {
  const nextMaxId = get(response, 'pagination.next_max_id')
  const data = response.data
  const items = []
  let entry

  for (let i = 0, len = data ? data.length : 0; i < len; i++) {
    entry = data[i]
    if (entry.type === 'image') {
      items.push({
        text: get(entry, 'caption.text'),
        thumb: get(entry, 'images.low_resolution.url'),
        img: get(entry, 'images.standard_resolution.url'),
      })
    }
  }

  renderView({
    type: 'photos',
    social: 'instagram',
    loadMore: nextMaxId
      ? bind(instagram.retrieveImages, instagram, { max_id: nextMaxId })
      : null,
    items,
  })
}

function setItemImage(node, url) {
  qs('.add-steps-upload-methods-item-image', node).style.backgroundImage =
    `url(${url})`
}

function renderView(view) {
  const isSwitch =
    currentView.type !== view.type || currentView.social !== view.social
  animator.killTweensOf(albumContainer, 'opacity')
  animator.to(albumContainer, { duration: 0.5, opacity: 1, ease: 'none' })

  if (isSwitch) {
    if (view.social === 'facebook' && view.type === 'photos') {
      savedAlbumView = currentView
      savedAlbumItems = Array.from(itemsContainer.children)
      itemsContainer.replaceChildren()
    } else {
      itemsContainer.replaceChildren()
    }
    toggleClass(albumContainer, 'has-selected', false)
  }

  setAlbumClasses(view)

  let node
  let item
  const items = view.items
  for (let i = 0, len = items.length; i < len; i++) {
    item = items[i]
    node = itemTemplate.cloneNode(true)
    node.dataset.img = item.img
    setText(qs('.add-steps-upload-methods-item-name', node), item.text)
    if (view.social === 'facebook' && view.type === 'albums') {
      node.dataset.id = item.id
      facebook.getImageUrl(item.thumb, setItemImage, node)
    } else {
      setItemImage(node, item.thumb)
    }
    inputController.add(node, 'click', onItemClick)
    itemsContainer.append(node)
  }

  const restoredPos = isSwitch ? 0 : scrollPane._tPos
  // NOTE: original calls `e.items.unshift(_.items)` — unshifts the previous
  // items *array* (not its members), which prepends a single nested array.
  // Looks like a latent bug, preserved verbatim.
  if (!isSwitch) view.items.unshift(currentView.items)
  currentView = view
  showElement(albumContainer)
  scrollPane.onResize()
  scrollPane.moveToPos(restoredPos, 1)
}

function onItemClick() {
  if (
    albumContainer.classList.contains('is-albums') &&
    albumContainer.classList.contains('is-facebook')
  ) {
    facebook.retrieveImages({ type: 'photos', albumId: this.dataset.id })
  } else {
    qsa('.add-steps-upload-methods-item').forEach((item) => {
      toggleClass(item, 'is-selected', false)
    })
    toggleClass(this, 'is-selected', true)
    toggleClass(albumContainer, 'has-selected', true)
  }
}

function onAlbumClose() {
  resetAlbumState()
}

function resetAlbumState() {
  currentView = {}
  toggleClass(albumContainer, 'has-selected', false)
  hideElement(albumContainer)
}

// NOTE: empty function in original (Z) — instagram failure handler
function onInstagramFailed() {}

function onFacebookFailed() {
  uiController.unlock('facebook-load')
}

function onLocalInputChange() {
  const file = this.files[0]
  const size = file.size
  const errorMessages = config.ERROR_MESSAGES
  if (size > MAX_FILE_SIZE) {
    uiController.showErrorMsgs(errorMessages.imageSizeNotValid)
    return
  }
  const reader = new FileReader()
  const img = new Image()
  reader.onload = (event) => {
    img.src = event.target.result
  }
  img.onload = () => {
    if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
      uiController.showErrorMsgs(errorMessages.imageResolutionNotValid)
    } else if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
      uiController.showErrorMsgs(errorMessages.imageResolutionNotValid)
    } else {
      doUpload(file)
    }
  }
  img.onerror = () => {
    uiController.showErrorMsgs(errorMessages.incorrectImageFormat)
  }
  reader.readAsDataURL(file)
}

function doUpload(fileOrUrl) {
  let formData
  if (typeof fileOrUrl === 'string') {
    formData = new FormData()
    formData.append('url', fileOrUrl)
  } else {
    formData = new FormData(localForm)
  }
  formData.append('ln', config.LANG)
  showUploading()
  requestJson('api/upload-image', {
    method: 'POST',
    data: formData,
    success: onUploadSuccess,
    error: onUploadError,
  })
}

function showUploading() {
  uiController.lock('upload-image')
  showElement(loadingEl)
  animator.killTweensOf(loadingEl, 'opacity')
  animator.set(loadingEl, { opacity: 0 })
  animator.to(loadingEl, {
    duration: 0.5,
    delay: 0.3,
    opacity: 1,
    ease: 'none',
  })
  animator.killTweensOf(selectionContainer, 'opacity')
  animator.to(selectionContainer, {
    duration: 0.3,
    opacity: 0,
    ease: 'none',
  })
  animator.killTweensOf(albumContainer, 'opacity')
  animator.to(albumContainer, {
    duration: 0.3,
    opacity: 0,
    ease: 'none',
    onComplete() {
      hideElement(albumContainer)
    },
  })
}

function hideUploading() {
  uiController.unlock('upload-image')
  hideElement(loadingEl)
  animator.killTweensOf(loadingEl, 'opacity')
  animator.to(loadingEl, { duration: 0.5, opacity: 0, ease: 'none' })
  animator.killTweensOf(selectionContainer, 'opacity')
  animator.to(selectionContainer, {
    duration: 0.3,
    opacity: 1,
    ease: 'none',
  })
  animator.killTweensOf(albumContainer, 'opacity')
  animator.to(albumContainer, { duration: 0.3, opacity: 1, ease: 'none' })
}

function onUploadSuccess(response) {
  if (response.success) {
    uiController.unlock('upload-image')
    stepController.data.fileId = response.data.fileId
    const img = new Image()
    img.onload = () => {
      stepController.data.image = img
      stepController.goToStep('adjustment')
    }
    img.src = 'uploads/tmp/' + response.data.fileId + '/resized.jpg'
    if (img.width) img.onload()
  } else {
    onUploadError(response)
  }
}

function onUploadError(response) {
  uiController.showError(response)
  hideUploading()
}

function show() {
  stepController.disableBackBtn()
  stepController.disableValidateBtn()
  stepController.hideBackBtn()
  stepController.hideValidateBtn()
  showElement(container)
  setSelectionType('default')
  iconLocked = false
  animator.killTweensOf(loadingEl, 'opacity')
  animator.set(loadingEl, { opacity: 0 })
  animator.killTweensOf(selectionContainer, 'opacity')
  animator.set(selectionContainer, { opacity: 1 })
  animator.killTweensOf(albumContainer, 'opacity')
  animator.set(albumContainer, { opacity: 0 })
  hideElement(albumContainer)
  itemsContainer.replaceChildren()
  // NOTE: original used `transform3d: 'translate3d(Xpx,0,0)'` — migrated to
  // gsap's `x` shorthand. Original fromTo omitted `ease` on toVars, which
  // falls back to EKTweener's default (`easeOutCirc`) — preserved as `circ.out`.
  animator.killTweensOf(facebookSymbol, 'x,opacity')
  animator.fromTo(
    facebookSymbol,
    { x: 60, opacity: 0 },
    { duration: 0.5, x: 0, opacity: 1, ease: 'circ.out' },
  )
  animator.killTweensOf(instagramSymbol, 'opacity')
  animator.fromTo(
    instagramSymbol,
    { opacity: 0 },
    { duration: 0.5, opacity: 1, ease: 'none' },
  )
  animator.killTweensOf(localSymbol, 'x,opacity')
  animator.fromTo(
    localSymbol,
    { x: -60, opacity: 0 },
    { duration: 0.5, x: 0, opacity: 1, ease: 'circ.out' },
  )
  animator.killTweensOf(textsContainer, 'opacity')
  animator.fromTo(
    textsContainer,
    { opacity: 0 },
    { duration: 0.2, opacity: 1, ease: 'none' },
  )
  animator.killTweensOf(stepCircle.uniforms.focusRatio, 'value')
  animator.to(stepCircle.uniforms.focusRatio, {
    duration: 0.3,
    value: 1,
    ease: 'power2.out',
  })
}

function setSelectionType(type) {
  container.classList.remove(
    'is-default',
    'is-facebook',
    'is-instagram',
    'is-local',
  )
  if (type) container.classList.add('is-' + type)
}

function hide() {
  setSelectionType()
  hideElement(container)
  resetAlbumState()
  animator.killTweensOf(stepCircle.uniforms.focusRatio, 'value')
  animator.to(stepCircle.uniforms.focusRatio, {
    duration: 0.3,
    value: 0,
    ease: 'power2.in',
  })
}

function onBGClick() {
  if (currentView.type) onAlbumClose()
  else stepController.hide()
}

function setAlbumClasses(view) {
  albumContainer.classList.remove(
    'is-facebook',
    'is-instagram',
    'is-photos',
    'is-albums',
  )
  albumContainer.classList.add('is-' + view.type, 'is-' + view.social)
}

export const uploadMethodsStep = {
  id: 'upload-methods',
  animationIndex: 2,
  indicatorIndex: 0,
  init,
  show,
  hide,
  onBGClick,
}
