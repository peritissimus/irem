import $ from 'jquery'
import { config } from '../config.js'
import { scene3dController } from '../controllers/scene3dController.js'
import { inputController } from '../controllers/inputController.js'
import { tutorialController } from '../controllers/tutorialController.js'
import { uiController } from '../controllers/uiController.js'
import { stepController } from '../controllers/stepController.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { animator } from '../animation/animator.js'

let container
// NOTE: navIconWrapper is assigned in preInit but never read in original — preserved
let _navIconWrapper
let _navMapWrapper
let navMapBtn
let navSearchWrapper
let navSearchBtn
let navSearchCircleBtn
let navSearchItem
let navSearchItemText
let navSearchItemCloseBtn
let navSearchItemLine
// NOTE: navAddWrapper is assigned in init but never read in original — preserved
let _navAddWrapper
let navAddBtn
let navAddCircleBtn
// NOTE: mapBtnScale is stored by scaleMapBtn but never read elsewhere — preserved
let _mapBtnScale = 1

function preInit() {
  container = $('.nav')
  navSearchWrapper = $('.nav-search-wrapper')
  _navIconWrapper = container.find('.circle-btn-icon-wrapper')
  preloaderController.add(container)
}

function init() {
  initElements()
  initEvents()
}

function initElements() {
  navSearchBtn = $('.nav-search-btn')
  _navMapWrapper = $('.nav-map-wrapper')
  navMapBtn = $('.nav-map-btn')
  navSearchCircleBtn = navSearchBtn[0].circleBtn
  navSearchItem = $('.nav-search-item')
  navSearchItemText = $('.nav-search-item-text')
  navSearchItemCloseBtn = $('.nav-search-item-close-btn')
  navSearchItemLine = $('.nav-search-item-line')
  _navAddWrapper = $('.nav-add-wrapper')
  navAddBtn = $('.nav-add-btn')
  navAddCircleBtn = navAddBtn[0].circleBtn
}

function initEvents() {
  inputController.add(navMapBtn, 'click', onMapBtnClick)
  inputController.add(navSearchItemCloseBtn, 'click', onSearchItemCloseClick)
  navSearchCircleBtn.onClicked.add(onSearchBtnClicked)
  navAddCircleBtn.onClicked.add(onAddBtnClicked)
}

function onSearchItemCloseClick() {
  uiController.hidePost2d()
  hideSearchItem()
  scene3dController.hideSearchedPosts()
  scene3dController.resetCamera({
    hasControl: true,
    lockControl: true,
    duration: 2,
    controller: {
      blurBlendRatio: 1,
      zoom: 0,
      targetZoom: 0,
      cameraSwingRadius: 0.6,
    },
  })
}

function onMapBtnClick(event) {
  if (!scene3dController.hasControl) return

  const horizontalDist = config.SCENE_CAMERA_HORIZONTAL_DISTANCE
  const verticalBase = config.SCENE_CAMERA_VERTICAL_BASE_DISTANCE
  const offset = navMapBtn.offset()
  const nx = (event.x - offset.left) / 46 - 1
  const ny = (event.y - offset.top) / 46 - 1
  const cameraTargetPosition = scene3dController.cameraTargetPosition
  const angle =
    Math.atan2(ny, nx) - Math.PI / 2 + scene3dController.lookAtHorizontalAngle
  const distance = Math.sqrt(nx * nx + ny * ny) * 1e3
  const dx = -Math.sin(angle) * distance
  const dz = Math.cos(angle) * distance

  scene3dController.moveTo({
    hasControl: true,
    lockControl: false,
    controller: { targetZoom: 0 },
    camera: {
      x: cameraTargetPosition.x + dx,
      y: verticalBase,
      z: cameraTargetPosition.z + dz,
    },
    lookAt: {
      x: cameraTargetPosition.x - Math.sin(angle) * horizontalDist + dx,
      y: verticalBase,
      z: cameraTargetPosition.z + Math.cos(angle) * horizontalDist + dz,
    },
  })
}

function onSearchBtnClicked() {
  tutorialController.completeAll()
  uiController.hidePost2d()
  uiController.showSearch()
  hideSearchItem()
  scene3dController.hideSearchedPosts()
  scene3dController.resetCamera({
    hasControl: false,
    lockControl: true,
    duration: 2,
    canInteractiveWithPost: true,
  })
}

function onAddBtnClicked() {
  tutorialController.completeAll()
  uiController.hidePost2d()
  uiController.hideSearch()
  stepController.show('upload-methods')
  uiController.hideNav()
  hideSearchItem()
  scene3dController.hideSearchedPosts()
}

function show() {
  scene3dController.showMap()
  container.show()
}

function hide() {
  scene3dController.hideMap()
  container.hide()
}

function scaleMapBtn(scale) {
  _mapBtnScale = scale
  if (navMapBtn) {
    navMapBtn[0].style[config.transform3DStyle] = `scale3d(${scale},${scale},1)`
  }
}

function updateFading(_value) {
  // intentionally empty in original
}

function showSearchItem(text) {
  navSearchWrapper.addClass('has-item')
  navSearchItem.show()
  navSearchItemText.text(text)
  animator.killTweensOf(navSearchItem[0], 'opacity')
  animator.fromTo(navSearchItem[0], { opacity: 0 }, { duration: 0.2, opacity: 1, ease: 'none' })
  animator.killTweensOf(navSearchItemLine[0], 'width')
  animator.set(navSearchItemLine[0], { width: 0 })
  animator.to(navSearchItemLine[0], {
    duration: 0.2,
    delay: 0.15,
    width: navSearchItem.width(),
    ease: 'circ.out',
  })
}

function hideSearchItem() {
  navSearchWrapper.removeClass('has-item')
  animator.killTweensOf(navSearchItem[0], 'opacity')
  animator.to(navSearchItem[0], {
    duration: 0.2,
    opacity: 0,
    ease: 'none',
    onComplete() {
      navSearchItem.hide()
    },
  })
}

export const nav = {
  get container() {
    return container
  },
  preInit,
  init,
  show,
  hide,
  scaleMapBtn,
  updateFading,
  showSearchItem,
  hideSearchItem,
}

export default nav
