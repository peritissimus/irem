export const UPLOADS_ROOT =
  'https://web.archive.org/web/20140624131123im_/http://i-remember.fr/uploads/'
export const STATIC_POST_IMAGE = '/img/thumbnail.png'

export function installArchiveGlobals(signals) {
  window.signals = signals
  window._gaq = Array.isArray(window._gaq) ? window._gaq : []
  window.__UPLOADS_ROOT = UPLOADS_ROOT
  window.__STATIC_POST_IMAGE = STATIC_POST_IMAGE
  window.__DISABLE_ARCHIVE_AUDIO__ = true
  window.__DISABLE_ARCHIVE_SOCIALS__ = true
}

export function installModernizrShim() {
  const probe = document.createElement('div').style
  const prefixes = ['webkit', 'Moz', 'ms', 'O']
  const audioProbe = document.createElement('audio')
  const canPlayAudio =
    typeof audioProbe.canPlayType === 'function'
      ? (mime) => audioProbe.canPlayType(mime).replace(/^no$/, '') !== ''
      : () => false

  const prefixed = (prop) => {
    if (prop in probe) {
      return prop
    }

    const capitalized = prop.charAt(0).toUpperCase() + prop.slice(1)
    for (const prefix of prefixes) {
      const candidate = `${prefix}${capitalized}`
      if (candidate in probe) {
        return candidate
      }
    }

    return false
  }

  window.Modernizr = {
    prefixed,
    csstransforms3d: Boolean(prefixed('perspective')),
    audio: {
      ogg: canPlayAudio('audio/ogg; codecs="vorbis"'),
      mp3: canPlayAudio('audio/mpeg;'),
    },
  }
}

export function installArchiveApiShim() {
  const archivedPosts = Array.isArray(window.DEFAULT_POSTS?.data?.posts)
    ? window.DEFAULT_POSTS.data.posts
    : []
  const postIds = new Set(archivedPosts.map((post) => String(post.id)))
  const stopWords = new Set([
    'about',
    'after',
    'again',
    'all',
    'also',
    'and',
    'are',
    'because',
    'been',
    'before',
    'being',
    'from',
    'have',
    'just',
    'like',
    'that',
    'their',
    'them',
    'then',
    'there',
    'they',
    'this',
    'with',
    'when',
    'where',
    'will',
    'your',
  ])
  const tagIndex = new Map()
  const relatedTagIndex = new Map()

  for (const post of archivedPosts) {
    const tags = extractTags(post, stopWords)
    relatedTagIndex.set(String(post.id), tags)

    for (const tag of tags) {
      const posts = tagIndex.get(tag)
      if (posts) {
        posts.push(post)
      } else {
        tagIndex.set(tag, [post])
      }
    }
  }

  window.__IREM_ARCHIVE_API__ = (request) => {
    const resolved = resolveArchiveRequest(request)
    if (!resolved) return null
    return buildArchiveResponse(
      resolved,
      request,
      archivedPosts,
      postIds,
      tagIndex,
      relatedTagIndex,
    )
  }
}

function resolveArchiveRequest(request) {
  if (!request?.url) return null
  const url = new URL(request.url, window.location.href)
  return isArchiveApiRequest(url) ? url : null
}

function isArchiveApiRequest(url) {
  return url.origin === window.location.origin && url.pathname.startsWith('/api/')
}

function buildArchiveResponse(
  url,
  request,
  archivedPosts,
  postIds,
  tagIndex,
  relatedTagIndex,
) {
  const requestParams = new URLSearchParams(url.search)
  if (request.data && typeof request.data === 'object' && !(request.data instanceof FormData)) {
    for (const [key, value] of Object.entries(request.data)) {
      if (value != null) {
        requestParams.set(key, String(value))
      }
    }
  }

  const pathname = url.pathname
  if (pathname === '/api/search-posts') {
    return buildSearchResponse(requestParams.get('tagName') || '', archivedPosts)
  }

  if (pathname.startsWith('/api/search-posts/')) {
    return buildSearchResponse(
      decodeURIComponent(pathname.slice('/api/search-posts/'.length)),
      archivedPosts,
      tagIndex,
    )
  }

  if (pathname.startsWith('/api/related-post-count/')) {
    const postId = pathname.slice('/api/related-post-count/'.length)
    return {
      success: 1,
      data: buildRelatedTagCounts(postId, postIds, tagIndex, relatedTagIndex),
      input: {
        postId,
      },
    }
  }

  if (pathname.startsWith('/api/auto-complete-tags/')) {
    const fragment = normalizeTag(pathname.slice('/api/auto-complete-tags/'.length))
    return {
      success: 1,
      data: {
        tagFragment: fragment,
        list: findTagSuggestions(fragment, tagIndex),
      },
      input: {
        tagFragment: fragment,
      },
    }
  }

  if (pathname === '/api/upload-image' || pathname === '/api/post') {
    return {
      success: 0,
      errorMsg: 'Submitting new memories is unavailable in this archive build.',
      input: {},
    }
  }

  return {
    success: 0,
    errorMsg: 'unexpected',
    input: {},
  }
}

function buildSearchResponse(requestedTag, archivedPosts, tagIndex = null) {
  const normalizedTag = normalizeTag(requestedTag)
  const posts =
    normalizedTag === ''
      ? archivedPosts
      : (tagIndex?.get(normalizedTag) || [])

  return {
    success: 1,
    data: {
      tagName: normalizedTag,
      posts,
    },
    input: {
      tagName: requestedTag,
    },
  }
}

function buildRelatedTagCounts(postId, postIds, tagIndex, relatedTagIndex) {
  if (!postIds.has(String(postId))) {
    return {}
  }

  const counts = {}
  for (const tag of relatedTagIndex.get(String(postId)) || []) {
    const total = tagIndex.get(tag)?.length || 0
    if (total > 1) {
      counts[tag] = total
    }
  }

  return counts
}

function findTagSuggestions(fragment, tagIndex) {
  if (fragment.length < 3) {
    return []
  }

  return [...tagIndex.entries()]
    .filter(([tag]) => tag.startsWith(fragment))
    .sort((left, right) => {
      if (right[1].length !== left[1].length) {
        return right[1].length - left[1].length
      }

      return left[0].localeCompare(right[0])
    })
    .slice(0, 5)
    .map(([tag]) => tag)
}

function extractTags(post, stopWords) {
  const text = `${post?.name || ''} ${post?.text || ''}`.toLowerCase()
  const matches = text.match(/[\p{L}\p{N}]+/gu) || []
  const tags = new Set()

  for (const match of matches) {
    if (match.length < 3 || stopWords.has(match)) {
      continue
    }

    tags.add(match)
  }

  return [...tags]
}

function normalizeTag(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}
