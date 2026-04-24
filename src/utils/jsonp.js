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
  if (handleArchiveJsonp(url, success, error)) return

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

function handleArchiveJsonp(url, success, error) {
  const archiveApi = window.__IREM_ARCHIVE_API__
  if (!archiveApi) return false

  const requestUrl = withCallback(url, makeCallbackName())
  const payload = archiveApi({ url: requestUrl })
  if (!payload) return false

  setTimeout(() => {
    if (payload.success) success?.(payload)
    else error?.(payload)
  }, 0)
  return true
}
