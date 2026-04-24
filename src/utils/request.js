export function requestJson(url, { method = 'GET', data, success, error } = {}) {
  const archivePayload = window.__IREM_ARCHIVE_API__?.({ url, data })
  if (archivePayload) {
    setTimeout(() => {
      if (archivePayload.success) success?.(archivePayload)
      else error?.(archivePayload)
    }, 0)
    return
  }

  fetch(url, {
    method,
    body: data,
    headers: {
      Accept: 'application/json',
    },
  })
    .then((response) => response.json())
    .then((payload) => {
      if (payload?.success) success?.(payload)
      else error?.(payload)
    })
    .catch((err) => {
      error?.({ success: 0, errorMsg: 'unexpected', error: err })
    })
}
