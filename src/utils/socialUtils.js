import { config } from '../config.js'
import { trackEvent } from '../controllers/trackingController.js'

const TRACK_CATEGORY = {
  facebook: 'memory-share-fb',
  twitter: 'memory-share-tw',
  gplus: 'memory-share-g',
}

const TWITTER_BASE = 'https://web.archive.org/web/20140806221657/http://twitter.com/#!/'
const TWITTER_SEARCH_BASE =
  'https://web.archive.org/web/20140806221657/http://search.twitter.com/search?q='

export function parseTweet(text, target) {
  return text
    .replace(
      /[@]+[A-Za-z0-9-_]+/g,
      (match) =>
        `<a target="${target}" href="${TWITTER_BASE}${match.replace('@', '')}">${match}</a>`,
    )
    .replace(
      /[#]+[A-Za-z0-9-_]+/g,
      (match) =>
        `<a target="${target}" href="${TWITTER_SEARCH_BASE}${match.replace('#', '')}"">${match}</a>`,
    )
}

export function parseLinks(text) {
  return text.replace(
    /[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~?/.=]+/g,
    (match) => `<a target="_blank" href="${match}">${match}</a>`,
  )
}

export function getFacebookShareLink(url) {
  return (
    `https://www.facebook.com/dialog/feed?app_id=${config.FACEBOOK_ID}` +
    `&link=${encodeURIComponent(url)}` +
    `&redirect_uri=${encodeURIComponent(config.BASE_URL)}/close.html`
  )
}

export function getGplusShareLink(url) {
  return `https://plus.google.com/share?url=${encodeURIComponent(url)}`
}

export function getTwitterShareLink(url, text) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)} ${encodeURIComponent(url)}`
}

export function getPinterestShareLink(url, description, media) {
  return (
    `http://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}` +
    `&media=${media}` +
    `&description=${encodeURIComponent(description)}`
  )
}

function decodeHtml(rawHtml) {
  const span = document.createElement('span')
  span.innerHTML = rawHtml
  return span.textContent
}

export function socialShare(type, path, rawMessage) {
  const message = rawMessage ? decodeHtml(rawMessage) : ''
  const safePath = path || ''
  const shareUrl = config.SITE_URL + safePath

  const subject = ''
  const body = ''
  const media = ''

  trackEvent({ trackCat: TRACK_CATEGORY[type] })

  switch (type) {
    case 'facebook':
      window.open(getFacebookShareLink(shareUrl), 'share', 'width=640,height=480')
      break
    case 'twitter':
      window.open(getTwitterShareLink(shareUrl, message), 'share', 'width=640,height=480')
      break
    case 'pinterest':
      window.open(getPinterestShareLink(shareUrl, body, media), 'share', 'width=640,height=480')
      break
    case 'gplus':
      window.open(getGplusShareLink(shareUrl), 'share', 'width=640,height=480')
      break
    case 'email':
      window.location.href =
        `mailto:?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}[${encodeURIComponent(shareUrl)}]`
      break
  }
}

window.socialShare = socialShare
