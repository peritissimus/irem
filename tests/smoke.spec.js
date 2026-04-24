import { expect, test } from '@playwright/test'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(rootDir, 'dist')
const contentTypes = new Map([
  ['.css', 'text/css'],
  ['.html', 'text/html'],
  ['.js', 'text/javascript'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.ttf', 'font/ttf'],
  ['.woff', 'font/woff'],
])
const allowedConsoleErrors = new Set()

test('boots the archived app shell without runtime errors', async ({ page }) => {
  const pageErrors = []
  const consoleErrors = []

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname !== 'irem-smoke.local') {
      await route.fulfill({ status: 204, body: '' })
      return
    }

    const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)
    const filePath = path.resolve(distDir, pathname.slice(1))
    if (!filePath.startsWith(distDir) || !existsSync(filePath)) {
      await route.fulfill({ status: 404, body: 'not found' })
      return
    }

    await route.fulfill({
      path: filePath,
      contentType: contentTypes.get(path.extname(filePath)) || 'application/octet-stream',
    })
  })

  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })
  page.on('console', (message) => {
    const text = message.text()
    if (message.type() === 'error' && !allowedConsoleErrors.has(text)) {
      consoleErrors.push(text)
    }
  })

  await page.goto('/')

  await expect(page.locator('.app')).toHaveCount(1)
  await expect(page.locator('.base-3d-container')).toHaveCount(1)
  await expect(page.locator('.preloader')).toHaveCount(1)
  await expect(page.locator('.header')).toHaveCount(1)
  await expect(page.locator('.nav')).toHaveCount(1)
  await expect(page.locator('.footer')).toHaveCount(1)
  await expect(page.locator('.post-2d')).toHaveCount(1)

  await expect.poll(() => page.evaluate(() => window.__IREM_RUNTIME__)).toBe('esm')

  const webglSupported = await page.evaluate(() => Boolean(window.SUPPORT_WEBGL))
  if (webglSupported) {
    await expect(page.locator('.base-3d-container canvas')).toHaveCount(1)
    await expect(page.locator('.app')).toHaveClass(/show/)

    // Let the animated boot sequence settle before sampling pixels or screenshotting.
    await page.waitForTimeout(1000)

    // Canvas non-blank check: read a handful of pixels from the WebGL back-buffer
    // inside a requestAnimationFrame callback so the drawing buffer is still intact.
    const canvasAnalysis = await page.evaluate(
      () =>
        new Promise((resolve) => {
          requestAnimationFrame(() => {
            const canvas = document.querySelector('.base-3d-container canvas')
            if (!canvas) {
              resolve({ error: 'no canvas' })
              return
            }
            const gl =
              canvas.getContext('webgl2', { preserveDrawingBuffer: true }) ||
              canvas.getContext('webgl', { preserveDrawingBuffer: true }) ||
              canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true })
            const width = canvas.width
            const height = canvas.height
            const coords = [
              [0.25, 0.25],
              [0.5, 0.5],
              [0.75, 0.75],
              [0.25, 0.75],
              [0.75, 0.25],
              [0.5, 0.25],
              [0.5, 0.75],
            ]
            const samples = []
            if (gl && typeof gl.readPixels === 'function') {
              const buf = new Uint8Array(4)
              for (const [fx, fy] of coords) {
                const px = Math.max(0, Math.min(width - 1, Math.floor(width * fx)))
                // WebGL origin is bottom-left; flip the Y coordinate.
                const py = Math.max(0, Math.min(height - 1, Math.floor(height * (1 - fy))))
                gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf)
                samples.push([buf[0], buf[1], buf[2], buf[3]])
              }
            } else {
              // Fallback: draw onto a 2D canvas and sample there.
              const off = document.createElement('canvas')
              off.width = width
              off.height = height
              const ctx = off.getContext('2d')
              ctx.drawImage(canvas, 0, 0)
              for (const [fx, fy] of coords) {
                const px = Math.max(0, Math.min(width - 1, Math.floor(width * fx)))
                const py = Math.max(0, Math.min(height - 1, Math.floor(height * fy)))
                const data = ctx.getImageData(px, py, 1, 1).data
                samples.push([data[0], data[1], data[2], data[3]])
              }
            }
            const hasNonZeroAlpha = samples.some((p) => p[3] > 0)
            const hasNonZeroColor = samples.some((p) => p[0] > 0 || p[1] > 0 || p[2] > 0)
            const [r, g, b, a] = samples[0] || [0, 0, 0, 0]
            const allSame = samples.every((p) => p[0] === r && p[1] === g && p[2] === b && p[3] === a)
            resolve({ width, height, samples, hasNonZeroAlpha, hasNonZeroColor, allSame })
          })
        }),
    )
    expect(canvasAnalysis.error).toBeUndefined()
    expect(canvasAnalysis.width).toBeGreaterThan(0)
    expect(canvasAnalysis.height).toBeGreaterThan(0)
    expect(canvasAnalysis.hasNonZeroAlpha).toBe(true)
    // A fully uniform canvas (single color, e.g. clear-to-black) means nothing rendered.
    expect(
      canvasAnalysis.allSame && !canvasAnalysis.hasNonZeroColor,
      `canvas appears blank: ${JSON.stringify(canvasAnalysis.samples)}`,
    ).toBe(false)
    expect(
      canvasAnalysis.allSame,
      `canvas is uniformly one color: ${JSON.stringify(canvasAnalysis.samples)}`,
    ).toBe(false)

    // Visual regression baseline — catches regressions that slip past DOM assertions.
    await expect(page).toHaveScreenshot('boot.png', { maxDiffPixelRatio: 0.02 })
  } else {
    await expect(page.locator('html')).toHaveClass(/not-support-webgl/)
  }

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
