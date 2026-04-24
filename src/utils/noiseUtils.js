const F2 = 0.366025403784439
const G2 = 0.211324865405187
const G2_DOUBLE_MINUS_ONE = -0.577350269189626
const GRADIENT_SCALE = 1.79284291400159
const HASH_SCALE = 0.024390243902439
const DECAY = 0.85373472095314

function mod289(value) {
  return value - Math.floor(value / 289) * 289
}

function permute(value) {
  return mod289(value * (value * 34 + 1))
}

function cornerContribution(t, seed, dx, dy) {
  if (t <= 0) {
    return 0
  }

  let g = permute(seed) * HASH_SCALE
  g = (g - Math.floor(g)) * 2 - 1

  const h = Math.abs(g) - 0.5
  g -= Math.floor(g + 0.5)

  return t * t * t * t * (GRADIENT_SCALE - DECAY * (g * g + h * h)) * (g * dx + h * dy)
}

export function snoise2D(x, y) {
  const skew = (x + y) * F2
  let i = Math.floor(x + skew)
  let j = Math.floor(y + skew)

  const unskew = (i + j) * G2
  const x0 = x - i + unskew
  const y0 = y - j + unskew

  const i1 = x0 > y0 ? 1 : 0
  const j1 = 1 - i1

  const x1 = x0 + G2 - i1
  const y1 = y0 + G2 - j1
  const x2 = x0 + G2_DOUBLE_MINUS_ONE
  const y2 = y0 + G2_DOUBLE_MINUS_ONE

  i = mod289(i)
  j = mod289(j)

  let total = 0
  total += cornerContribution(0.5 - x1 * x1 - y1 * y1, permute(j + j1) + i + i1, x1, y1)
  total += cornerContribution(0.5 - x2 * x2 - y2 * y2, permute(j + 1) + i + 1, x2, y2)
  total += cornerContribution(0.5 - x0 * x0 - y0 * y0, permute(j) + i, x0, y0)

  return total * 130
}
