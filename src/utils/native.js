// Native replacements for the small mout utilities this codebase uses.
// Each helper mirrors the original mout semantics as closely as practical —
// comments call out any deliberate bug-for-bug matches with the upstream.

export function trim(str, chars) {
  str = str == null ? '' : String(str)
  // Default behaviour: strip standard whitespace. mout uses a large
  // WHITE_SPACES array but `String.prototype.trim()` covers the same code
  // points that the builder actually hits in practice.
  if (chars == null) return str.trim()
  let start = 0
  let end = str.length - 1
  while (start <= end && chars.indexOf(str.charAt(start)) !== -1) start++
  while (end >= start && chars.indexOf(str.charAt(end)) !== -1) end--
  return str.substring(start, end + 1)
}

export function rtrim(str, chars) {
  str = str == null ? '' : String(str)
  if (chars == null) return str.replace(/\s+$/, '')
  let end = str.length - 1
  while (end >= 0 && chars.indexOf(str.charAt(end)) !== -1) end--
  return end >= 0 ? str.substring(0, end + 1) : ''
}

const STACHE_RE = /\{\{([^}]+)\}\}/g

export function interpolate(template, replacements, syntax) {
  template = template == null ? '' : String(template)
  return template.replace(syntax || STACHE_RE, function (_match, prop) {
    const value = get(replacements, prop)
    return value == null ? '' : String(value)
  })
}

export function bind(fn, context, ...args) {
  return Function.prototype.bind.apply(fn, [context, ...args])
}

// Bug-for-bug compatible with mout/queryString/setParam. Notably: when the
// key is absent and the url contains `=` but no `?`, mout emits `url?&k=v`.
// Callers in this project pass raw query strings (no leading `?`), so that
// quirk is part of the observable behaviour — preserved verbatim.
export function setParam(url, paramName, value) {
  url = url || ''
  const re = new RegExp('(\\?|&)' + paramName + '=[^&]*')
  const param = paramName + '=' + encodeURIComponent(value)
  if (re.test(url)) {
    return url.replace(re, '$1' + param)
  }
  if (url.indexOf('?') === -1) url += '?'
  if (url.indexOf('=') !== -1) url += '&'
  return url + param
}

export function isArray(value) {
  return Array.isArray(value)
}

// Dot-path getter. Returns undefined if obj is falsy or any intermediate
// property is null/undefined — matches mout/object/get.
export function get(obj, prop) {
  if (!obj) return undefined
  const parts = String(prop).split('.')
  const last = parts.pop()
  let current = obj
  while (parts.length) {
    const key = parts.shift()
    current = current[key]
    if (current == null) return undefined
  }
  return current[last]
}

export function clamp(val, min, max) {
  // Matches mout: val < min ? min : (val > max ? max : val). This differs
  // from Math.min(Math.max(...)) when min > max, but callers always pass a
  // well-ordered range.
  return val < min ? min : val > max ? max : val
}

// mout's signature is (ratio, start, end) — verified against node_modules.
export function lerp(ratio, start, end) {
  return start + (end - start) * ratio
}

export function mixIn(target, ...sources) {
  for (const source of sources) {
    if (source == null) continue
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key]
      }
    }
  }
  return target
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && value.constructor === Object
}

// Recursive merge: when both sides of a key are plain objects, recurse;
// otherwise replace. Matches mout/object/deepMixIn — including the fact
// that arrays are replaced wholesale, not merged element-wise.
export function deepMixIn(target, ...sources) {
  for (const source of sources) {
    if (!source) continue
    for (const key in source) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue
      const val = source[key]
      const existing = target[key]
      if (isPlainObject(val) && isPlainObject(existing)) {
        deepMixIn(existing, val)
      } else {
        target[key] = val
      }
    }
  }
  return target
}
