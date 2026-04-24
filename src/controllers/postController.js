import signals from '../events/signal.js'
import { config } from '../config.js'
import { Post } from '../posts/Post.js'
import { jsonp } from '../utils/jsonp.js'

// NOTE: original factory listed `uiController`, `inputController`, and
// `widgets/SimpleScrollPane` as deps — none were referenced in the body.
// Dropped. `mout/string/trim` replaced with native `String.prototype.trim`.

function parseTagName(tag) {
  return tag
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const onPostSearchBegan = new signals.Signal()
const onPostsSearched = new signals.Signal()
const onPostsSearchErrored = new signals.Signal()

let takeIndex = 0
let loadMorePrevLength = 0
let isLoading = false

function init() {
  processResponse(window.DEFAULT_POSTS)
  const seed = postController.DEFAULT_POST
  if (seed && seed.success) {
    postController.DEFAULT_POST = createOrGetPost(seed.data)
  } else {
    postController.DEFAULT_POST = false
  }
}

function loadMore() {
  if (isLoading || postController.isTagNamePostsRetrievedAll['']) return
  isLoading = true
  const list = postController.tagNamedPosts['']
  loadMorePrevLength = list.length
  const lastId =
    list && loadMorePrevLength > 0 ? list[loadMorePrevLength - 1].id : -1
  jsonp(
    `api/search-posts?ln=${config.LANG}&lastId=${lastId}&tagName=&callback=?`,
    {
      success(response) {
        isLoading = false
        processResponse(response, true)
        takeIndex = loadMorePrevLength
      },
      error() {
        isLoading = false
      },
    },
  )
}

function searchPosts(rawTag) {
  let tag = rawTag
  let parsed
  if (tag === undefined) {
    tag = ''
    parsed = ''
  } else {
    parsed = parseTagName(tag)
  }
  if (parsed === '' || postController.parsedTagName === parsed) return

  // NOTE: original assigned `parsedTagName = r` (the raw tag) rather than
  // the parsed version (`i`), and dispatches `parsedTagName: r` too.
  // Preserved verbatim — the dedupe check above compares parsed-to-parsed
  // but the stored/emitted value is the raw tag.
  postController.tagName = tag
  postController.parsedTagName = tag
  onPostSearchBegan.dispatch({ tagName: tag, parsedTagName: tag })

  // NOTE: original computed a `lastId` local here from the existing pool but
  // never used it in the URL — dead work, dropped.

  jsonp(
    `api/search-posts${tag === '' ? '' : `/${tag}`}?ln=${config.LANG}&tagName=${tag}&callback=?`,
    {
      success(response) {
        processResponse(response)
      },
      error() {
        onSearchError({ input: { tagName: tag } })
      },
    },
  )
}

function onSearchError(response) {
  onPostsSearchErrored.dispatch({ tagName: response.input.tagName })
}

function processResponse(response, isAppend) {
  if (response.success) {
    const posts = response.data.posts
    const inputTagName = response.input.tagName
    const resultTagName = response.data.tagName
    const limit = config.POST_SEARCH_RESULT_MAX
    if (posts.length === 0 || posts.length < limit) {
      postController.isTagNamePostsRetrievedAll[resultTagName] = true
    }
    for (let i = 0, len = posts.length; i < len; i++) {
      posts[i] = createOrGetPost(posts[i])
    }
    let merged = postController.tagNamedPosts[resultTagName] || []
    // NOTE: merges only when the result tag is falsy (the default "" pool) OR
    // when the existing pool is empty. If a tag already has posts, subsequent
    // results are silently dropped from the cache. Preserved verbatim.
    if (!resultTagName || merged.length === 0) {
      merged = postController.tagNamedPosts[resultTagName] = merged.concat(posts)
    }
    if (!isAppend) {
      onPostsSearched.dispatch({
        all: merged,
        posts,
        tagName: inputTagName,
        parsedTagName: resultTagName,
        isLastSearch: postController.parsedTagName === resultTagName,
        isRetrievedAll:
          !!postController.isTagNamePostsRetrievedAll[resultTagName],
      })
    }
  } else if (!isAppend) {
    onSearchError(response)
  }
}

function createOrGetPost(data) {
  const id = data.id
  let post = postController.posts[id]
  if (!post) {
    post = postController.posts[id] = new Post(data)
    post.preloadThumb()
  }
  return post
}

function parseSubmittedPost(data) {
  const post = createOrGetPost(data)
  const tags = data.tags
  let bucket
  if (tags) {
    // NOTE: `bucket` is still `undefined` inside this loop — the original
    // forgot to assign `bucket = tagNamedPosts[tagKey]` before the concat,
    // so `[post].concat(undefined)` yields `[post, undefined]`. Preserved.
    // Also: `for…in` on `tags` suggests tags is an object map rather than an
    // array (iterating keys).
    for (const tagKey in tags) {
      if (postController.tagNamedPosts[tagKey]) {
        postController.tagNamedPosts[tagKey] = [post].concat(bucket)
      }
    }
  }
  bucket = postController.tagNamedPosts[''] || []
  postController.tagNamedPosts[''] = [post].concat(bucket)
}

function searchRelatedTags(post, callback) {
  jsonp(`api/related-post-count/${post.id}?ln=${config.LANG}&callback=?`, {
    success(response) {
      if (response && response.success) post.tags = response.data
      callback(post)
    },
    error() {
      callback(post)
    },
  })
}

function takePost() {
  const list = postController.tagNamedPosts['']
  let post = list[takeIndex]
  if (!post) {
    takeIndex = 0
    post = list[0]
    loadMore()
  }
  takeIndex++
  return post
}

export const postController = {
  DEFAULT_POST: window.DEFAULT_POST,
  tagNamedPosts: {},
  posts: {},
  isTagNamePostsRetrievedAll: {},
  tagName: '',
  parsedTagName: '',
  onPostSearchBegan,
  onPostsSearched,
  onPostsSearchErrored,
  init,
  searchPosts,
  parseSubmittedPost,
  searchRelatedTags,
  takePost,
}
