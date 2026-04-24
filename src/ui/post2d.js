import $ from 'jquery'
import signals from 'signals'
import bind from 'mout/function/bind'
import { config } from '../config.js'
import { uiController } from '../controllers/uiController.js'
import { postController } from '../controllers/postController.js'
import { searchPostParticles } from '../scene3d/searchPostParticles.js'
import { inputController } from '../controllers/inputController.js'
import { scene3dController } from '../controllers/scene3dController.js'
import { trackPage } from '../controllers/trackingController.js'
import { preloaderController } from '../controllers/preloaderController.js'
import { socialShare } from '../utils/socialUtils.js'
import { EKTweener } from '../ektweener.js'

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
  container = $('.post-2d')
  _containerStyle = container[0].style
  preloaderController.add(container)
}

function init() {
  initElements()
  initEvents()
}

function initElements() {
  imgEl = $('.post-2d-img')
  centerWrapper = $('.post-2d-center-wrapper')
  _centerWrapperStyle = centerWrapper[0].style
  contentWrapper = $('.post-2d-content-wrapper')
  shareBtn = $('.post-2d-share-btn')
  matchedWrapper = $('.post-2d-matched-wrapper')
  matchedNumEl = $('.post-2d-matched-num')
  matchedSingularEl = $('.post-2d-matched-singular')
  matchedPluralEl = $('.post-2d-matched-plural')
  matchedTagEl = $('.post-2d-matched-tag')
  messageEl = $('.post-2d-message')
  nameEl = $('.post-2d-name')
  closeCircleBtn = $('.post-2d-close-btn')[0].circleBtn
}

function initEvents() {
  closeCircleBtn.onClicked.add(onCloseClicked)
  inputController.add(container, 'click', function onContainerClick(event) {
    if (event.target === this) onCloseClicked()
  })
  inputController.add(shareBtn, 'click', onShareClicked)
}

function onShareClicked() {
  const $this = $(this)
  const type = $this.data('type')
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

  imgEl.css('backgroundImage', 'none')
  imgEl.css({
    backgroundImage: 'url(' + imgUrl + ')',
    width: post.resized_img_width,
    height: post.resized_img_height,
  })
  centerWrapper.css({
    width: +post.resized_img_width + CONTENT_WIDTH,
    height: +post.resized_img_height,
    marginLeft: (-post.resized_img_width - CONTENT_WIDTH) >> 1,
    marginTop: -post.resized_img_height >> 1,
  })
  nameEl.text(post.name)

  if (!post.tags && !post.isLoadingTags) {
    post.isLoadingTags = true
    postController.searchRelatedTags(post, onRelatedTagsLoaded)
  }
  if (!post.msgItem) buildMessageItem(post)
  updateMessage()
}

function show(post) {
  trackPage({ trackPage: 'memory-view' })
  container.show()
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
  EKTweener.fromTo(
    centerWrapper,
    1,
    { opacity: 0 },
    { opacity: 1, ease: 'linear' },
  )
  EKTweener.to(contentWrapper, 0, { width: 0 })
  EKTweener.to(contentWrapper, 0.6, { delay: 0.4, width: CONTENT_WIDTH })
  contentWrapper[0].scrollpane.onResize()
}

function onRelatedTagsLoaded(post) {
  buildMessageItem(post)
  if (post === preShowPost) updateMessage()
}

function buildMessageItem(post) {
  let html = $('<div>').text(post.text).html()
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
  post.msgItem = $('<div>').html(html)
  post.msgItem.find('.post-2d-message-tag').each(function attachTagHandlers() {
    inputController.add(this, 'over', bind(onTagOver, this))
    inputController.add(this, 'out', bind(onTagOut, this))
    inputController.add(this, 'click', bind(onTagClick, this))
  })
}

function onTagOver() {
  if (contentWrapper[0].scrollpane.isDown) return
  $(this).addClass('hover')
  const tagName = decodeURIComponent($(this).data('tagName'))
  const tagCount = decodeURIComponent($(this).data('tagPostsCount'))
  matchedNumEl.text(tagCount)
  matchedTagEl.text(tagName)
  matchedWrapper.show()
  matchedSingularEl.css('display', tagCount === 1 ? 'inline' : 'none')
  matchedPluralEl.css('display', tagCount > 1 ? 'inline' : 'none')
}

function onTagOut() {
  $(this).removeClass('hover')
  matchedWrapper.hide()
}

function onTagClick() {
  postController.searchPosts($(this).data('tagName'))
  hide()
}

function updateMessage() {
  messageEl.find('> *').detach()
  messageEl.append(preShowPost.msgItem)
}

function hide() {
  if (history.replaceState) {
    history.replaceState(null, '', config.SITE_URL + '/')
  }
  onHidden.dispatch()
  EKTweener.to(centerWrapper, 0.5, {
    opacity: 0,
    ease: 'linear',
    onComplete() {
      container.hide()
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
