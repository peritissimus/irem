import signals from '../events/signal.js'
import { jsonp } from '../utils/jsonp.js'

// NOTE: original deps included `config` (never referenced in the body — dropped),
// `mout/queryString/encode` (inlined as `encodeQueryString` below), and
// `mout/function/bind` (replaced with native `Function.prototype.bind`).

function encodeQueryString(obj) {
  const parts = []
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    }
  }
  return parts.length ? `?${parts.join('&')}` : ''
}

const onRetrievedSuccess = new signals.Signal()
const onRetrievedFailed = new signals.Signal()

let isLoading = false
let pendingParams
let isFBInitialized = false
let hasUserAuthorized = false

function init() {
  if (window.__DISABLE_ARCHIVE_SOCIALS__) return

  window.fbAsyncInit = function () {
    FB.init({ appId: FACEBOOK_ID, status: true, xfbml: true })
    isFBInitialized = true
    FB.getLoginStatus((response) => {
      if (response.authResponse) {
        facebook.userID = response.authResponse.userID
        facebook.accessToken = response.authResponse.accessToken
        hasUserAuthorized = true
      }
    })
  }

  // inject the FB JS SDK
  ;(function (doc, tag, id) {
    const first = doc.getElementsByTagName(tag)[0]
    if (doc.getElementById(id)) return
    const script = doc.createElement(tag)
    script.id = id
    script.src =
      '//web.archive.org/web/20140806221657/http://connect.facebook.net/en_US/all.js'
    first.parentNode.insertBefore(script, first)
  })(document, 'script', 'facebook-jssdk')
}

function retrieveImages(params) {
  if (window.__DISABLE_ARCHIVE_SOCIALS__) {
    onRetrievedFailed.dispatch()
    return
  }
  if (isLoading || !isFBInitialized) return
  isLoading = true
  pendingParams = params
  if (!hasUserAuthorized) {
    login()
    return
  }

  const type = params.type
  delete params.type
  params.access_token = facebook.accessToken
  params.limit = 25

  // NOTE: original leaked `url` to the global scope (missing `var`) — declared
  // locally here so ESM strict mode doesn't throw. Functional behavior
  // (request URL) is unchanged.
  let url
  if (type === 'albums') {
    url = `https://web.archive.org/web/20140806221657/https://graph.facebook.com/${facebook.userID}/albums`
  } else {
    url = `https://web.archive.org/web/20140806221657/https://graph.facebook.com/${params.albumId}/photos`
  }

  jsonp(url + encodeQueryString(params), {
    success(response) {
      isLoading = false
      if (response.data) onRetrievedSuccess.dispatch(response)
      else onRetrievedFailed.dispatch()
    },
    error() {
      isLoading = false
      onRetrievedFailed.dispatch()
    },
  })
}

function getImageUrl(photoId, handler, ctx) {
  if (window.__DISABLE_ARCHIVE_SOCIALS__) {
    onRetrievedFailed.dispatch()
    return
  }
  FB.api(`/${photoId}?fields=picture`, onGotImage.bind(ctx, handler))
  jsonp(
    `https://web.archive.org/web/20140806221657/https://graph.facebook.com/${photoId}?access_token=${facebook.accessToken}`,
    {
      success: onGotImage.bind(ctx, handler),
    },
  )
}

function onGotImage(handler, response) {
  const images = response.images
  if (images) handler.call(this, this, getThumbUrl(response))
}

function getThumbUrl(response) {
  const images = response && response.images
  let result
  if (images) {
    for (let i = 0, len = images.length; i < len; i++) {
      // NOTE: original duplicated each width comparison
      // (`w>200 && w>200 && w<600 && w<600`) — typo preserved verbatim.
      if (
        images[i].width > 200 &&
        images[i].width > 200 &&
        images[i].width < 600 &&
        images[i].width < 600
      ) {
        result = images[i].source
      }
    }
  }
  return result || response.picture
}

function login() {
  if (window.__DISABLE_ARCHIVE_SOCIALS__) {
    onRetrievedFailed.dispatch()
    return
  }
  FB.login(
    (response) => {
      if (response.authResponse) {
        facebook.userID = response.authResponse.userID
        facebook.accessToken = response.authResponse.accessToken
        isLoading = false
        hasUserAuthorized = true
        retrieveImages(pendingParams)
      } else {
        isLoading = false
        hasUserAuthorized = false
        onRetrievedFailed.dispatch()
      }
    },
    { scope: 'user_photos,friends_photos' },
  )
}

// NOTE: `hasLoggedIn` on the exports was set to `false` at factory time in the
// original but never toggled — only the factory-local `hasUserAuthorized` flag
// is actually updated. Preserved.
export const facebook = {
  hasLoggedIn: false,
  accessToken: undefined,
  userID: undefined,
  onRetrievedSuccess,
  onRetrievedFailed,
  retrieveImages,
  getImageUrl,
  getThumbUrl,
}

init()
