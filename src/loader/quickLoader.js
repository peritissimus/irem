import { AbstractItem } from './types/Abstract.js'
import { ImageItem } from './types/ImageItem.js'
import { JSONPItem } from './types/JSONPItem.js'
import { AudioItem } from './types/AudioItem.js'

const TYPE_CLASSES = [ImageItem, JSONPItem, AudioItem]
const typesByName = Object.fromEntries(
  TYPE_CLASSES.map((TypeClass) => [TypeClass.type, TypeClass]),
)

const queue = []

function hasExtension(url, TypeClass) {
  if (!url) return false
  const { extensions } = TypeClass
  const urlLength = url.length
  for (let i = extensions.length - 1; i >= 0; i -= 1) {
    const suffix = `.${extensions[i]}`
    if (url.lastIndexOf(suffix) === urlLength - suffix.length) {
      return true
    }
  }
  return false
}

function retrieveOne(target, type) {
  if (type) {
    const items = typesByName[type].retrieve(target)
    return items ? { type, items } : undefined
  }

  for (const TypeClass of TYPE_CLASSES) {
    const candidate = TypeClass.retrieve(target)
    if (
      candidate &&
      candidate.length &&
      typeof candidate[0] === 'string' &&
      hasExtension(candidate[0], TypeClass)
    ) {
      return { type: TypeClass.type, items: candidate }
    }
  }
  return undefined
}

function retrieveAll(target, type) {
  const results = []
  const length = target?.length

  if (length && typeof target !== 'string') {
    for (let i = 0; i < length; i += 1) {
      const result = retrieveOne(target[i], type)
      if (result) results.push(result)
    }
  } else {
    const result = retrieveOne(target, type)
    if (result) results.push(result)
  }

  return results
}

function instantiate(url, type) {
  quickLoader._added[url] = new typesByName[type](url)
}

function addSingle(url, type) {
  if (!quickLoader._added[url]) {
    instantiate(url, type)
    queue.push(quickLoader._added[url])
    quickLoader._weight += 1
  }
  return quickLoader._added[url]
}

function add(target, type) {
  const batches = retrieveAll(target, type)
  for (const batch of batches) {
    for (const url of batch.items) {
      addSingle(url, batch.type)
    }
  }
  return batches
}

function loadSingle(url, callback, type) {
  if (quickLoader._loaded[url]) {
    callback.call(this, quickLoader._loaded[url])
    return
  }

  let resolvedType = type
  if (!resolvedType) {
    resolvedType = retrieveOne(url, resolvedType).type
  }

  instantiate(url, resolvedType)
  quickLoader._added[url].load(callback)
}

function onItemLoaded(item) {
  quickLoader._sum += 1
  const ratio = quickLoader._sum / quickLoader._weight

  if (ratio === 1) {
    quickLoader.isLoading = false
    quickLoader._sum = 0
    quickLoader._weight = 0
  }

  quickLoader._onLoading?.(ratio, item.url)
}

function start(onProgress) {
  quickLoader._onLoading = onProgress
  quickLoader.isLoading = true

  const snapshot = queue.splice(0, queue.length)
  while (snapshot[0]) {
    snapshot.shift().load(onItemLoaded)
  }
}

export const quickLoader = {
  VERSION: '1.0.0',
  isLoading: false,
  _added: AbstractItem.added,
  _loaded: AbstractItem.loaded,
  _sum: 0,
  _weight: 0,
  _onLoading: null,
  add,
  addSingle,
  retrieveAll,
  loadSingle,
  start,
}
