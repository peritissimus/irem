import $ from 'jquery'
import signals from '../events/signal.js'
import { config } from '../config.js'

// NOTE: original imported `mout/queryString/encode` — inlined below.

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
let lastParams
let selfCache

function login() {
  if (window.__DISABLE_ARCHIVE_SOCIALS__) {
    onRetrievedFailed.dispatch()
    return
  }
  const redirect = encodeURIComponent(
    `${config.BASE_URL}/api/instagram-token-callback`,
  )
  window.open(
    `https://web.archive.org/web/20140806221657/https://api.instagram.com/oauth/authorize/?client_id=${window.INSTAGRAM_ID}&redirect_uri=${redirect}&response_type=token`,
    '_blank',
    'toolbar=no,scrollbars=no,resizable=yes,width=800,height=540',
  )
}

function fetchSelf(params) {
  if (window.__DISABLE_ARCHIVE_SOCIALS__) {
    isLoading = false
    onRetrievedFailed.dispatch()
    return
  }
  $.ajax({
    type: 'GET',
    dataType: 'jsonp',
    cache: false,
    url: `https://web.archive.org/web/20140806221657/https://api.instagram.com/v1/users/self${encodeQueryString(params)}`,
    success(response) {
      isLoading = false
      if (response && response.data && response.data.id) {
        selfCache = response.data
        retrieveImages(lastParams)
      } else {
        onRetrievedFailed.dispatch()
      }
    },
    error() {
      isLoading = false
      onRetrievedFailed.dispatch()
    },
  })
}

function retrieveImages(params) {
  if (window.__DISABLE_ARCHIVE_SOCIALS__) {
    isLoading = false
    onRetrievedFailed.dispatch()
    return
  }
  if (isLoading) return
  isLoading = true
  lastParams = params || {}
  if (!instagram.token) {
    login()
    return
  }
  if (!selfCache) {
    fetchSelf({ access_token: instagram.token })
    return
  }
  lastParams.access_token = instagram.token
  $.ajax({
    type: 'GET',
    dataType: 'jsonp',
    cache: false,
    url: `https://web.archive.org/web/20140806221657/https://api.instagram.com/v1/users/${selfCache.id}/media/recent${encodeQueryString(lastParams)}`,
    success(response) {
      isLoading = false
      onRetrievedSuccess.dispatch(response)
    },
    error() {
      isLoading = false
      onRetrievedFailed.dispatch()
    },
  })
}

// OAuth popup redirects back to `/api/instagram-token-callback` which calls
// this global with the freshly captured token.
window.captureInstagramToken = function (token) {
  if (token) {
    instagram.hasLoggedIn = true
    instagram.token = token
  } else {
    instagram.hasLoggedIn = false
    instagram.token = undefined
  }
  if (instagram.hasLoggedIn) {
    isLoading = false
    retrieveImages(lastParams)
  } else {
    isLoading = false
    onRetrievedFailed.dispatch()
  }
}

export const instagram = {
  hasLoggedIn: false,
  token: undefined,
  onRetrievedSuccess,
  onRetrievedFailed,
  retrieveImages,
}
