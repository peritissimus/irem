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
    if (message.type() === 'error') consoleErrors.push(message.text())
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
  } else {
    await expect(page.locator('html')).toHaveClass(/not-support-webgl/)
  }

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
