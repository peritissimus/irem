import { Easing, Group, Tween } from '@tweenjs/tween.js'

const DEFAULT_SUFFIX = {
  width: 'px',
  height: 'px',
  top: 'px',
  left: 'px',
  bottom: 'px',
  right: 'px',
  marginTop: 'px',
  marginLeft: 'px',
  marginBottom: 'px',
  marginRight: 'px',
  paddingTop: 'px',
  paddingLeft: 'px',
  paddingBottom: 'px',
  paddingRight: 'px',
  fontSize: 'px',
  size: 'px',
}

const RESERVED_KEYS = new Set([
  'appliedTarget',
  'delay',
  'ease',
  'onComplete',
  'onCompleteParams',
  'onStart',
  'onStartParams',
  'onUpdate',
  'onUpdateParams',
  'plugin',
  'prefix',
  'skipHTMLParsing',
  'suffix',
  'yoyo',
])

const IDENTITY_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

export function createEKTweenerAdapter(globalObject = window) {
  const documentObject = globalObject.document
  const group = new Group()
  const recordsByTarget = new WeakMap()
  let frameId = null

  const styleProbe = documentObject.createElement('div').style
  const transformProperty = resolveStyleProperty('transform')

  const api = {
    HTMLPlugins: {},
    HTMLStyleAlias: {
      transform3d: transformProperty,
    },
    HTMLPrefixedStyle: ['transform'],
    HTMLSuffix: DEFAULT_SUFFIX,
    getPropertyName,
    getStyle,
    to,
    fromTo,
    killTweensOf,
    getTweens,
    getTween,
  }

  function to(target, duration, data = {}) {
    return createTween(target, duration, null, data)
  }

  function fromTo(target, duration, fromData = {}, toData = {}) {
    return createTween(target, duration, fromData, toData)
  }

  function createTween(target, duration, fromData, data) {
    if (isJQuery(target)) {
      const tweens = []
      target.each(function eachTarget() {
        tweens.push(createTween(this, duration, fromData, data))
      })
      return tweens.length > 1 ? tweens : tweens[0]
    }

    const normalizedData = { ...(data || {}) }
    const isStyleTarget = isElement(target) && normalizedData.skipHTMLParsing !== 1
    const appliedTarget = isStyleTarget
      ? target.style
      : normalizedData.appliedTarget || target
    const descriptors = buildDescriptors(
      target,
      appliedTarget,
      normalizedData,
      fromData,
      isStyleTarget,
    )

    if (!descriptors.length) {
      return null
    }

    stopOverlappingTweens(target, descriptors)

    const durationMs = Math.max(0, (duration || 0) * 1000)
    const delayMs = Math.max(0, (normalizedData.delay || 0) * 1000)
    const progress = { value: 0 }
    const record = {
      _target: target,
      _appliedTarget: appliedTarget,
      descriptors,
      isFinished: false,
      properties: Object.fromEntries(descriptors.map((descriptor) => [descriptor.name, true])),
      kill() {
        this.tween?.stop()
        removeRecord(target, this)
        this.isFinished = true
      },
      pause() {
        this.tween?.pause()
      },
      resume() {
        this.tween?.resume()
      },
      removeProperties(properties) {
        if (!properties) {
          this.descriptors = []
          return 0
        }

        this.descriptors = this.descriptors.filter((descriptor) => !(descriptor.name in properties))
        this.properties = Object.fromEntries(
          this.descriptors.map((descriptor) => [descriptor.name, true]),
        )
        return this.descriptors.length
      },
    }

    const runStart = () => {
      callCallback(record, normalizedData.onStart, normalizedData.onStartParams)
    }
    const runUpdate = () => {
      applyDescriptors(record.descriptors, progress.value)
      callCallback(record, normalizedData.onUpdate, normalizedData.onUpdateParams)
    }
    const runComplete = () => {
      applyDescriptors(record.descriptors, normalizedData.yoyo ? 0 : 1)
      callCallback(record, normalizedData.onUpdate, normalizedData.onUpdateParams)
      callCallback(record, normalizedData.onComplete, normalizedData.onCompleteParams)
      record.isFinished = true
      removeRecord(target, record)
    }

    if (durationMs === 0 && delayMs === 0) {
      runStart()
      progress.value = 1
      runComplete()
      return record
    }

    const tween = new Tween(progress)
      .to({ value: 1 }, durationMs)
      .delay(delayMs)
      .easing(resolveEase(normalizedData.ease))
      .onStart(runStart)
      .onUpdate(runUpdate)
      .onComplete(runComplete)

    record.tween = tween
    addRecord(target, record)
    group.add(tween)
    tween.start()
    ensureLoop()

    return record
  }

  function buildDescriptors(target, appliedTarget, data, fromData, isStyleTarget) {
    const descriptors = []
    const source = data || {}

    for (const key of Object.keys(source)) {
      if (RESERVED_KEYS.has(key)) {
        continue
      }

      const name = isStyleTarget ? getPropertyName(key) : key
      const toValue = source[key]
      const fromValue = fromData && key in fromData ? fromData[key] : undefined

      descriptors.push(
        isStyleTarget
          ? buildStyleDescriptor(target, appliedTarget, key, name, fromValue, toValue, data)
          : buildObjectDescriptor(appliedTarget, key, fromValue, toValue, data),
      )
    }

    return descriptors.filter(Boolean)
  }

  function buildObjectDescriptor(target, key, fromValue, toValue, data) {
    const start = toNumber(fromValue ?? target[key])
    const end = toNumber(toValue)

    return {
      name: key,
      start,
      end,
      apply(value) {
        target[key] = formatValue(interpolate(start, end, value), key, data)
      },
    }
  }

  function buildStyleDescriptor(target, style, key, property, fromValue, toValue, data) {
    if (key === 'transform3d' || property === transformProperty) {
      const start = matrixForStyleValue(target, property, fromValue)
      const end = matrixForStyleValue(target, property, toValue)

      return {
        name: property,
        start,
        end,
        apply(value) {
          style[property] = matrixToCss(interpolateArray(start, end, value))
        },
      }
    }

    if (property === 'color' || property === 'backgroundColor') {
      const start = colorToRgb(fromValue ?? getStyle(property, target))
      const end = colorToRgb(toValue)

      return {
        name: property,
        start,
        end,
        apply(value) {
          style[property] = rgbToHex(interpolateArray(start, end, value))
        },
      }
    }

    const start = toNumber(fromValue ?? getStyle(property, target))
    const end = toNumber(toValue)

    return {
      name: property,
      start,
      end,
      apply(value) {
        style[property] = formatValue(interpolate(start, end, value), property, data)
      },
    }
  }

  function applyDescriptors(descriptors, value) {
    for (const descriptor of descriptors) {
      descriptor.apply(value)
    }
  }

  function stopOverlappingTweens(target, descriptors) {
    const activeTweens = getTweens(target)
    if (!activeTweens) {
      return
    }

    const names = new Set(descriptors.map((descriptor) => descriptor.name))
    for (const record of [...activeTweens]) {
      if (record.descriptors.some((descriptor) => names.has(descriptor.name))) {
        record.kill()
      }
    }
  }

  function addRecord(target, record) {
    let records = recordsByTarget.get(target)
    if (!records) {
      records = new Set()
      recordsByTarget.set(target, records)
    }
    records.add(record)
  }

  function removeRecord(target, record) {
    const records = recordsByTarget.get(target)
    records?.delete(record)
  }

  function killTweensOf(target) {
    if (isJQuery(target)) {
      target.each(function eachTarget() {
        killTweensOf(this)
      })
      return
    }

    const records = getTweens(target)
    if (!records) {
      return
    }

    for (const record of [...records]) {
      record.kill()
    }
  }

  function getTweens(target) {
    if (!target) {
      return null
    }

    return recordsByTarget.get(target) || null
  }

  function getTween(target, property) {
    const records = getTweens(target)
    if (!records) {
      return null
    }

    const name = getPropertyName(property)
    for (const record of records) {
      if (record.descriptors.some((descriptor) => descriptor.name === name)) {
        return record
      }
    }

    return null
  }

  function ensureLoop() {
    if (frameId !== null) {
      return
    }

    const tick = () => {
      group.update()
      frameId = group.getAll().length ? globalObject.requestAnimationFrame(tick) : null
    }

    frameId = globalObject.requestAnimationFrame(tick)
  }

  function getPropertyName(property) {
    if (property === 'transform3d') {
      return transformProperty
    }

    return resolveStyleProperty(property)
  }

  function resolveStyleProperty(property) {
    if (property in styleProbe) {
      return property
    }

    const capitalized = property.charAt(0).toUpperCase() + property.slice(1)
    for (const prefix of ['webkit', 'Moz', 'ms', 'O']) {
      const prefixed = `${prefix}${capitalized}`
      if (prefixed in styleProbe) {
        return prefixed
      }
    }

    return property
  }

  function getStyle(property, element) {
    const cssProperty = property.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
    return globalObject.getComputedStyle(element, null).getPropertyValue(cssProperty)
  }

  function matrixForStyleValue(target, property, value) {
    if (typeof value === 'undefined') {
      return parseMatrix(getStyle(property, target))
    }

    if (!documentObject.body) {
      return parseMatrix(value)
    }

    const probe = documentObject.createElement('div')
    probe.style.position = 'absolute'
    probe.style.left = '-9000px'
    probe.style.top = '-9000px'
    probe.style[property] = value
    documentObject.body.appendChild(probe)
    const matrix = parseMatrix(getStyle(property, probe))
    probe.remove()
    return matrix
  }

  function parseMatrix(value) {
    if (!value || value === 'none') {
      return [...IDENTITY_MATRIX]
    }

    const values = value.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) || []

    if (value.startsWith('matrix3d') && values.length === 16) {
      return values
    }

    if (value.startsWith('matrix') && values.length === 6) {
      const [a, b, c, d, e, f] = values
      return [a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, e, f, 0, 1]
    }

    return [...IDENTITY_MATRIX]
  }

  return api
}

function isJQuery(value) {
  return Boolean(value?.jquery && typeof value.each === 'function')
}

function isElement(value) {
  return Boolean(value?.nodeType === 1 && value?.style)
}

function callCallback(record, callback, params) {
  if (typeof callback === 'function') {
    callback.apply(record, params || [])
  }
}

function resolveEase(ease) {
  if (typeof ease === 'function') {
    return (amount) => ease(amount, 0, 1, 1)
  }

  return EASES[ease] || EASES.easeOutCirc
}

function toNumber(value) {
  const number = parseFloat(value)
  return Number.isFinite(number) ? number : 0
}

function interpolate(start, end, value) {
  return start + (end - start) * value
}

function interpolateArray(start, end, value) {
  return start.map((item, index) => interpolate(item, end[index] ?? item, value))
}

function formatValue(value, property, data) {
  const prefix = data.prefix?.[property] || ''
  const suffix = data.suffix?.[property] || DEFAULT_SUFFIX[property] || ''
  if (!prefix && !suffix) {
    return value
  }
  return `${prefix}${value}${suffix}`
}

function matrixToCss(values) {
  return `matrix3d(${values.join(',')})`
}

function colorToRgb(value) {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return [0, 0, 0]
  }

  if (value.startsWith('#')) {
    if (value.length === 4) {
      return [
        parseInt(value[1] + value[1], 16),
        parseInt(value[2] + value[2], 16),
        parseInt(value[3] + value[3], 16),
      ]
    }

    if (value.length === 7) {
      return [
        parseInt(value.slice(1, 3), 16),
        parseInt(value.slice(3, 5), 16),
        parseInt(value.slice(5, 7), 16),
      ]
    }
  }

  const rgb = value.match(/\d+/g)
  return rgb ? rgb.slice(0, 3).map(Number) : [0, 0, 0]
}

function rgbToHex(values) {
  return `#${values
    .map((value) =>
      Math.max(0, Math.min(255, value | 0))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

function outIn(outEase, inEase) {
  return (amount) =>
    amount < 0.5 ? outEase(amount * 2) / 2 : inEase(amount * 2 - 1) / 2 + 0.5
}

const EASES = {
  linear: Easing.Linear.None,
  easeInQuad: Easing.Quadratic.In,
  easeOutQuad: Easing.Quadratic.Out,
  easeInOutQuad: Easing.Quadratic.InOut,
  easeOutInQuad: outIn(Easing.Quadratic.Out, Easing.Quadratic.In),
  easeInCubic: Easing.Cubic.In,
  easeOutCubic: Easing.Cubic.Out,
  easeInOutCubic: Easing.Cubic.InOut,
  easeOutInCubic: outIn(Easing.Cubic.Out, Easing.Cubic.In),
  easeInQuart: Easing.Quartic.In,
  easeOutQuart: Easing.Quartic.Out,
  easeInOutQuart: Easing.Quartic.InOut,
  easeOutInQuart: outIn(Easing.Quartic.Out, Easing.Quartic.In),
  easeInQuint: Easing.Quintic.In,
  easeOutQuint: Easing.Quintic.Out,
  easeInOutQuint: Easing.Quintic.InOut,
  easeOutInQuint: outIn(Easing.Quintic.Out, Easing.Quintic.In),
  easeInSine: Easing.Sinusoidal.In,
  easeOutSine: Easing.Sinusoidal.Out,
  easeInOutSine: Easing.Sinusoidal.InOut,
  easeOutInSine: outIn(Easing.Sinusoidal.Out, Easing.Sinusoidal.In),
  easeInExpo: Easing.Exponential.In,
  easeOutExpo: Easing.Exponential.Out,
  easeInOutExpo: Easing.Exponential.InOut,
  easeOutInExpo: outIn(Easing.Exponential.Out, Easing.Exponential.In),
  easeInCirc: Easing.Circular.In,
  easeOutCirc: Easing.Circular.Out,
  easeInOutCirc: Easing.Circular.InOut,
  easeOutInCirc: outIn(Easing.Circular.Out, Easing.Circular.In),
  easeInElastic: Easing.Elastic.In,
  easeOutElastic: Easing.Elastic.Out,
  easeInOutElastic: Easing.Elastic.InOut,
  easeOutInElastic: outIn(Easing.Elastic.Out, Easing.Elastic.In),
  easeInBack: Easing.Back.In,
  easeOutBack: Easing.Back.Out,
  easeInOutBack: Easing.Back.InOut,
  easeOutInBack: outIn(Easing.Back.Out, Easing.Back.In),
  easeInBounce: Easing.Bounce.In,
  easeOutBounce: Easing.Bounce.Out,
  easeInOutBounce: Easing.Bounce.InOut,
  easeOutInBounce: outIn(Easing.Bounce.Out, Easing.Bounce.In),
}
