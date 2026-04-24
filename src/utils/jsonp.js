function makeCallbackName() {
  return `__iremJsonp${Date.now()}${(Math.random() * 1e8) | 0}`
}

function withCallback(url, callbackName) {
  if (/[?&]callback=\?/.test(url)) {
    return url.replace(
      /([?&]callback=)\?/,
      `$1${encodeURIComponent(callbackName)}`,
    )
  }
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}callback=${encodeURIComponent(callbackName)}`
}

export function jsonp(url, { success, error } = {}) {
  const callbackName = makeCallbackName()
  const script = document.createElement('script')

  function cleanup() {
    script.remove()
    delete window[callbackName]
  }

  window[callbackName] = (response) => {
    cleanup()
    success?.(response)
  }

  script.onerror = () => {
    cleanup()
    error?.()
  }
  script.src = withCallback(url, callbackName)
  document.head.append(script)
}
