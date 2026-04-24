import { config } from '../config.js'
import $ from 'jquery'

const DEV_LOG_ENABLED = false

function isLocalDev() {
  return config.IS_DEV && config.ENV_ID === 'edanlocal'
}

function pushToGaq(args) {
  const gaq = window._gaq
  if (gaq && typeof gaq.push === 'function') {
    gaq.push(args)
  }
}

export function trackPage(data) {
  const pageName = data.trackPage

  if (isLocalDev()) {
    if (DEV_LOG_ENABLED) {
      console.log('### TRACK PAGE ###')
      console.log(`track page: ${pageName}`)
      console.log('###')
    }
    return
  }

  pushToGaq(['_trackPageview', pageName])
}

export function trackEvent(data) {
  const parts = [data.trackCat, `click - ${data.trackCat}`]
  if (data.trackLabel) parts.push(data.trackLabel)

  if (isLocalDev()) {
    if (DEV_LOG_ENABLED) {
      console.log('### TRACK EVENT ###')
      console.log(`track event: ${parts.join('-')}`)
      console.log('###')
    }
    return
  }

  pushToGaq(['_trackEvent', ...parts])
}

export function track(data) {
  if (data.trackPage) {
    trackPage(data)
  } else if (data.tracAction) {
    trackEvent(data)
  } else if (DEV_LOG_ENABLED) {
    console.log('## ERROR missing tracking parameters')
  }
}

export function trackDom(element) {
  track($(element).data())
}

export const trackingController = {
  trackPage,
  trackEvent,
  trackDom,
  track,
}
