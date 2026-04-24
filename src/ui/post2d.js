import signals from '../events/signal.js'
import { config } from '../config.js'
import { uiController } from '../controllers/uiController.js'
import { postController } from '../controllers/postController.js'
import { searchPostParticles } from '../scene3d/searchPostParticles.js'
import { inputController } from '../controllers/inputController.js'
import { scene3dController } from '../controllers/scene3dController.js'
import { trackPage } from '../controllers/trackingController.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { socialShare } from '../utils/socialUtils.js'
import { animator } from '../animation/animator.js'
import { hide as hideElement, qs, setText, show as showElement, withDescendants } from '../utils/dom.js'

const CONTENT_WIDTH = 348

let container
// NOTE: containerStyle is assigned in preInit but never read in original — preserved
let _containerStyle
let imgEl
let centerWrapper
// NOTE: centerWrapperStyle is assigned in initElements but never read in original — preserved
let _centerWrapperStyle
let contentWrapper
let shareBtn
let closeCircleBtn
let matchedWrapper
let matchedNumEl
let matchedSingularEl
let matchedPluralEl
let matchedTagEl
let messageEl
let nameEl
let currentPost
let preShowPost

export const onHidden = new signals.Signal()

function preInit() {
  container = qs('.post-2d')
  _containerStyle = container.style
  preloaderController.add(withDescendants(container))
}

function init() {
  initElements()
  initEvents()
}

function initElements() {
  imgEl = qs('.post-2d-img')
  centerWrapper = qs('.post-2d-center-wrapper')
  _centerWrapperStyle = centerWrapper.style
  contentWrapper = qs('.post-2d-content-wrapper')
  shareBtn = qs('.post-2d-share-btn')
  matchedWrapper = qs('.post-2d-matched-wrapper')
  matchedNumEl = qs('.post-2d-matched-num')
  matchedSingularEl = qs('.post-2d-matched-singular')
  matchedPluralEl = qs('.post-2d-matched-plural')
  matchedTagEl = qs('.post-2d-matched-tag')
  messageEl = qs('.post-2d-message')
  nameEl = qs('.post-2d-name')
  closeCircleBtn = qs('.post-2d-close-btn').circleBtn
}

function initEvents() {
  closeCircleBtn.onClicked.add(onCloseClicked)
  inputController.add(container, 'click', function onContainerClick(event) {
    if (event.target === this) onCloseClicked()
  })
  inputController.add(shareBtn, 'click', onShareClicked)
}

function onShareClicked() {
  const type = this.dataset.type
  // NOTE: TWITTER_POST_DESCRIPTION and POST_DESCRIPTION are undeclared globals
  //       in the original — would throw ReferenceError if invoked. Preserved.
  socialShare(
    type,
    '/memory/' + (parseInt(currentPost.id, 10) + config.POST_ID_OFFSET),
    type === 'twitter' ? TWITTER_POST_DESCRIPTION : POST_DESCRIPTION,
  )
}

function onCloseClicked() {
  if (!searchPostParticles.visible) scene3dController.enableControl()
  uiController.hidePost2d()
}

function preShow(post) {
  preShowPost = post
  const imgUrl =
    window.__STATIC_POST_IMAGE ||
    window.__UPLOADS_ROOT + 'posts/' + post.img + '/resized.jpg'

  imgEl.style.backgroundImage = 'none'
  imgEl.style.backgroundImage = `url(${imgUrl})`
  imgEl.style.width = `${post.resized_img_width}px`
  imgEl.style.height = `${post.resized_img_height}px`
  centerWrapper.style.width = `${+post.resized_img_width + CONTENT_WIDTH}px`
  centerWrapper.style.height = `${+post.resized_img_height}px`
  centerWrapper.style.marginLeft = `${(-post.resized_img_width - CONTENT_WIDTH) >> 1}px`
  centerWrapper.style.marginTop = `${-post.resized_img_height >> 1}px`
  setText(nameEl, post.name)

  if (!post.tags && !post.isLoadingTags) {
    post.isLoadingTags = true
    postController.searchRelatedTags(post, onRelatedTagsLoaded)
  }
  if (!post.msgItem) buildMessageItem(post)
  updateMessage()
}

function show(post) {
  trackPage({ trackPage: 'memory-view' })
  showElement(container)
  currentPost = post
  if (history.replaceState) {
    history.replaceState(
      null,
      '',
      config.SITE_URL +
        '/memory/' +
        (parseInt(post.id, 10) + config.POST_ID_OFFSET),
    )
  }
  animator.killTweensOf(centerWrapper, 'opacity')
  animator.fromTo(centerWrapper, { opacity: 0 }, { duration: 1, opacity: 1, ease: 'none' })
  animator.killTweensOf(contentWrapper, 'width')
  animator.set(contentWrapper, { width: 0 })
  animator.to(contentWrapper, {
    duration: 0.6,
    delay: 0.4,
    width: CONTENT_WIDTH,
    ease: 'circ.out',
  })
  contentWrapper.scrollpane.onResize()
}

function onRelatedTagsLoaded(post) {
  buildMessageItem(post)
  if (post === preShowPost) updateMessage()
}

function buildMessageItem(post) {
  let html = escapeHtml(post.text)
  if (post.tags) {
    const tagCounts = post.tags
    const tagNames = []
    for (const name in tagCounts) {
      if (tagCounts[name] > 1) tagNames.push(name)
    }
    if (tagNames.length > 0) {
      const pattern = tagNames.join('|')
      html = html.replace(
        new RegExp('(\\b|#)(' + pattern + ')\\b', 'gi'),
        function (match) {
          const lower = match.toLowerCase()
          return (
            '<span class="post-2d-message-tag" data-tag-name="' +
            encodeURIComponent(lower) +
            '" data-tag-posts-count="' +
            encodeURIComponent(tagCounts[lower]) +
            '">' +
            match +
            '</span>'
          )
        },
      )
    }
  }
  post.msgItem = document.createElement('div')
  post.msgItem.innerHTML = html
  post.msgItem.querySelectorAll('.post-2d-message-tag').forEach((tag) => {
    inputController.add(tag, 'over', onTagOver)
    inputController.add(tag, 'out', onTagOut)
    inputController.add(tag, 'click', onTagClick)
  })
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function onTagOver() {
  if (contentWrapper.scrollpane.isDown) return
  this.classList.add('hover')
  const tagName = decodeURIComponent(this.dataset.tagName)
  const tagCount = decodeURIComponent(this.dataset.tagPostsCount)
  setText(matchedNumEl, tagCount)
  setText(matchedTagEl, tagName)
  showElement(matchedWrapper)
  matchedSingularEl.style.display = tagCount === 1 ? 'inline' : 'none'
  matchedPluralEl.style.display = tagCount > 1 ? 'inline' : 'none'
}

function onTagOut() {
  this.classList.remove('hover')
  hideElement(matchedWrapper)
}

function onTagClick() {
  postController.searchPosts(this.dataset.tagName)
  hide()
}

function updateMessage() {
  messageEl.replaceChildren(preShowPost.msgItem)
}

function hide() {
  if (history.replaceState) {
    history.replaceState(null, '', config.SITE_URL + '/')
  }
  onHidden.dispatch()
  animator.killTweensOf(centerWrapper, 'opacity')
  animator.to(centerWrapper, {
    duration: 0.5,
    opacity: 0,
    ease: 'none',
    onComplete() {
      hideElement(container)
    },
  })
}

function updateFading(_value) {
  // intentionally empty in original
}

export const post2d = {
  get container() {
    return container
  },
  onHidden,
  preInit,
  init,
  preShow,
  show,
  hide,
  updateFading,
}

export default post2d
