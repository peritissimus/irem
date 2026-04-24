import $ from 'jquery'
import { bind, get } from '../utils/native.js'
import { config } from '../config.js'
import { stepCircle } from '../scene3d/stepCircle.js'
import { stepController } from '../controllers/stepController.js'
import { uiController } from '../controllers/uiController.js'
import { inputController } from '../controllers/inputController.js'
import { facebook } from '../socials/facebook.js'
import { instagram } from '../socials/instagram.js'
import { animator } from '../animation/animator.js'

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
  container = $('.add-steps-upload-methods')
  selectionContainer = $('.add-steps-upload-methods-selection-container')
  circleBtns = $('.add-steps-upload-methods-icons-container .circle-btn')
  facebookSymbol = $('.circle-btn-symbol-facebook')
  instagramSymbol = $('.circle-btn-symbol-instagram')
  localSymbol = $('.circle-btn-symbol-local')
  textsContainer = $('.add-steps-upload-methods-texts-container')
  localForm = $('.add-steps-upload-methods-local-form')
  localInput = $('#local-upload')
  albumContainer = $('.add-steps-upload-methods-album-container')
  scrollPane = $('.add-steps-upload-methods-items-scroll-wrapper')[0].scrollpane
  scrollPane.onUpdateCallback = onScrollUpdate
  itemsContainer = $('.add-steps-upload-methods-items-container-inner')
  itemTemplate = $('.add-steps-upload-methods-item').remove()
  albumCloseBtn = $('.add-steps-upload-methods-album-close-btn')
  _albumOpenBtn = $('.add-steps-upload-methods-album-footer-btn-album-open')
  photoBackBtn = $('.add-steps-upload-methods-album-footer-btn-photo-back')
  photoOpenBtn = $('.add-steps-upload-methods-album-footer-btn-photo-open')
  loadingEl = $('.add-steps-upload-methods-loading')
}

function bindEvents() {
  circleBtns.each(function () {
    this.circleBtn.onOvered.add(onIconOver)
    this.circleBtn.onOuted.add(onIconOut)
    this.circleBtn.onClicked.add(onIconClick)
  })
  localInput.change(onLocalInputChange)
  instagram.onRetrievedSuccess.add(onInstagramSuccess)
  instagram.onRetrievedFailed.add(onInstagramFailed)
  facebook.onRetrievedSuccess.add(onFacebookSuccess)
  facebook.onRetrievedFailed.add(onFacebookFailed)
  inputController.add(albumCloseBtn, 'click', onAlbumClose)
  inputController.add(photoOpenBtn, 'click', onPhotoOpen)
  inputController.add(photoBackBtn, 'click', onPhotoBack)
}

function onPhotoOpen() {
  const selected = $('.add-steps-upload-methods-item.is-selected')
  if (selected.length > 0) doUpload(selected.data('img'))
}

function onPhotoBack() {
  currentView = savedAlbumView
  itemsContainer.find('> *').remove()
  albumContainer.removeClass('has-selected')
  itemsContainer.append(savedAlbumItems)
  albumContainer.removeClass('is-facebook is-instagram is-photos is-albums')
  albumContainer.addClass('is-' + currentView.type)
  albumContainer.addClass('is-' + currentView.social)
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
  if (!iconLocked) setSelectionType(circleBtn.target.data('id'))
}

function onIconOut() {
  if (!iconLocked) setSelectionType('default')
}

function onIconClick(circleBtn) {
  const type = circleBtn.target.data('id')
  if (type === 'facebook') {
    uiController.lock('facebook-load')
    facebook.retrieveImages({ type: 'albums' })
  } else if (type === 'instagram') {
    instagram.retrieveImages()
  } else {
    localInput.val(null)
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
  node
    .find('.add-steps-upload-methods-item-image')
    .css('backgroundImage', 'url(' + url + ')')
}

function renderView(view) {
  const isSwitch =
    currentView.type !== view.type || currentView.social !== view.social
  animator.killTweensOf(albumContainer[0], 'opacity')
  animator.to(albumContainer[0], { duration: 0.5, opacity: 1, ease: 'none' })

  if (isSwitch) {
    if (view.social === 'facebook' && view.type === 'photos') {
      savedAlbumView = currentView
      savedAlbumItems = itemsContainer.find('> *')
      savedAlbumItems.detach()
    } else {
      itemsContainer.find('> *').remove()
    }
    albumContainer.removeClass('has-selected')
  }

  albumContainer.removeClass('is-facebook is-instagram is-photos is-albums')
  albumContainer.addClass('is-' + view.type)
  albumContainer.addClass('is-' + view.social)

  let node
  let item
  const items = view.items
  for (let i = 0, len = items.length; i < len; i++) {
    item = items[i]
    node = itemTemplate.clone()
    node.data('img', item.img)
    node.find('.add-steps-upload-methods-item-name').text(item.text)
    if (view.social === 'facebook' && view.type === 'albums') {
      node.data('id', item.id)
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
  albumContainer.show()
  scrollPane.onResize()
  scrollPane.moveToPos(restoredPos, 1)
}

function onItemClick() {
  const $item = $(this)
  if (
    albumContainer.hasClass('is-albums') &&
    albumContainer.hasClass('is-facebook')
  ) {
    facebook.retrieveImages({ type: 'photos', albumId: $item.data('id') })
  } else {
    $('.add-steps-upload-methods-item').removeClass('is-selected')
    $item.addClass('is-selected')
    albumContainer.addClass('has-selected')
  }
}

function onAlbumClose() {
  resetAlbumState()
}

function resetAlbumState() {
  currentView = {}
  albumContainer.removeClass('has-selected')
  albumContainer.hide()
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
  const ajaxOptions = {
    url: 'api/upload-image',
    type: 'POST',
    dataType: 'json',
    success: onUploadSuccess,
    error: onUploadError,
    cache: false,
    contentType: false,
    processData: false,
  }
  if (typeof fileOrUrl === 'string') {
    formData = new FormData()
    formData.append('url', fileOrUrl)
  } else {
    formData = new FormData(localForm[0])
    ajaxOptions.mimeType = 'multipart/form-data'
  }
  formData.append('ln', config.LANG)
  ajaxOptions.data = formData
  showUploading()
  $.ajax(ajaxOptions)
}

function showUploading() {
  uiController.lock('upload-image')
  loadingEl.show()
  animator.killTweensOf(loadingEl[0], 'opacity')
  animator.set(loadingEl[0], { opacity: 0 })
  animator.to(loadingEl[0], {
    duration: 0.5,
    delay: 0.3,
    opacity: 1,
    ease: 'none',
  })
  animator.killTweensOf(selectionContainer[0], 'opacity')
  animator.to(selectionContainer[0], {
    duration: 0.3,
    opacity: 0,
    ease: 'none',
  })
  animator.killTweensOf(albumContainer[0], 'opacity')
  animator.to(albumContainer[0], {
    duration: 0.3,
    opacity: 0,
    ease: 'none',
    onComplete() {
      albumContainer.hide()
    },
  })
}

function hideUploading() {
  uiController.unlock('upload-image')
  loadingEl.hide()
  animator.killTweensOf(loadingEl[0], 'opacity')
  animator.to(loadingEl[0], { duration: 0.5, opacity: 0, ease: 'none' })
  animator.killTweensOf(selectionContainer[0], 'opacity')
  animator.to(selectionContainer[0], {
    duration: 0.3,
    opacity: 1,
    ease: 'none',
  })
  animator.killTweensOf(albumContainer[0], 'opacity')
  animator.to(albumContainer[0], { duration: 0.3, opacity: 1, ease: 'none' })
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
  container.show()
  setSelectionType('default')
  iconLocked = false
  animator.killTweensOf(loadingEl[0], 'opacity')
  animator.set(loadingEl[0], { opacity: 0 })
  animator.killTweensOf(selectionContainer[0], 'opacity')
  animator.set(selectionContainer[0], { opacity: 1 })
  animator.killTweensOf(albumContainer[0], 'opacity')
  animator.set(albumContainer[0], { opacity: 0 })
  albumContainer.hide()
  itemsContainer.find('> *').remove()
  // NOTE: original used `transform3d: 'translate3d(Xpx,0,0)'` — migrated to
  // gsap's `x` shorthand. Original fromTo omitted `ease` on toVars, which
  // falls back to EKTweener's default (`easeOutCirc`) — preserved as `circ.out`.
  animator.killTweensOf(facebookSymbol[0], 'x,opacity')
  animator.fromTo(
    facebookSymbol[0],
    { x: 60, opacity: 0 },
    { duration: 0.5, x: 0, opacity: 1, ease: 'circ.out' },
  )
  animator.killTweensOf(instagramSymbol[0], 'opacity')
  animator.fromTo(
    instagramSymbol[0],
    { opacity: 0 },
    { duration: 0.5, opacity: 1, ease: 'none' },
  )
  animator.killTweensOf(localSymbol[0], 'x,opacity')
  animator.fromTo(
    localSymbol[0],
    { x: -60, opacity: 0 },
    { duration: 0.5, x: 0, opacity: 1, ease: 'circ.out' },
  )
  animator.killTweensOf(textsContainer[0], 'opacity')
  animator.fromTo(
    textsContainer[0],
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
  container.removeClass('is-default is-facebook is-instagram is-local')
  if (type) container.addClass('is-' + type)
}

function hide() {
  setSelectionType()
  container.hide()
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

export const uploadMethodsStep = {
  id: 'upload-methods',
  animationIndex: 2,
  indicatorIndex: 0,
  init,
  show,
  hide,
  onBGClick,
}
