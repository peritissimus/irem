import { expect, test } from '@playwright/test'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Route-interception setup is copied verbatim from tests/smoke.spec.js so the
// flows tests boot the archived app shell the same way the smoke test does.
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

// The preloader plays a scripted ~14s text sequence before appInit runs, so
// each flow test needs more than Playwright's 30s default to reach the UI
// state it drives.
test.describe.configure({ timeout: 60_000 })

async function bootApp(page) {
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

  // Confirm runtime wiring before proceeding.
  await expect.poll(() => page.evaluate(() => window.__IREM_RUNTIME__)).toBe('esm')

  const webglSupported = await page.evaluate(() => Boolean(window.SUPPORT_WEBGL))
  // WebGL must be available to drive these UI flows — the nav and footer only
  // become interactive after the preloader hands control to the app.
  expect(webglSupported, 'flows require WebGL support').toBe(true)

  // Wait (generously) for the preloader to hand control to the app.
  // `.app.show` is added BEFORE the secondary UI-asset load finishes, so it
  // isn't sufficient on its own — we also wait for the preloader to hide
  // itself (hideElement sets display:none in preloader.finalize after
  // appInit runs) and for the add-steps container to be visible (signals that
  // stepController.show has run inside appInit).
  await expect
    .poll(() => page.evaluate(() => document.querySelector('.app')?.classList.contains('show')), {
      timeout: 15_000,
    })
    .toBe(true)

  // The preloader runs a ~14s scripted text sequence before calling
  // uiController._appInitFunc() and hiding itself; wait generously.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const el = document.querySelector('.preloader')
          if (!el) return 'missing'
          return window.getComputedStyle(el).display
        }),
      { timeout: 30_000 },
    )
    .toBe('none')

  await expect(page.locator('.add-steps')).toBeVisible({ timeout: 10_000 })

  // Let the animated boot sequence settle before interacting.
  await page.waitForTimeout(1000)

  return { pageErrors, consoleErrors }
}

async function exitAddOptionsStep(page) {
  // Initial boot lands on the add-options step (the "tell a memory / look"
  // circle). Clicking the "look" half of that circle triggers
  // stepController.hide() → uiController.showNav(), revealing the top-level
  // nav buttons needed for the nav-add / nav-search flows.
  const lookBtn = page.locator('.add-steps-add-options-look')
  await expect(lookBtn).toBeVisible()
  await lookBtn.click()

  // Wait for the add-steps fade (0.5s) and camera reset (2s) to finish, and
  // for the nav container to be revealed.
  await expect(page.locator('.nav')).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(2500)
}

test('nav add button opens the upload-methods step', async ({ page }) => {
  const { pageErrors, consoleErrors } = await bootApp(page)
  await exitAddOptionsStep(page)

  const addBtn = page.locator('.nav-add-btn')
  await expect(addBtn).toBeVisible()
  await addBtn.click()

  // The upload-methods step is the sub-section revealed inside the add-steps
  // container once stepController.show('upload-methods') runs.
  // `.add-steps-upload-methods` itself is absolutely-positioned with no
  // intrinsic width/height, so Playwright's visibility check rejects it even
  // when it's display:block — assert the display rule directly and verify a
  // child with real dimensions is visible.
  await expect(page.locator('.add-steps')).toBeVisible()
  await expect(page.locator('.add-steps-upload-methods')).toHaveCSS('display', 'block')
  await expect(page.locator('.add-steps-upload-methods-selection-container')).toBeVisible()

  // Wait for the step transition animation to settle.
  await page.waitForTimeout(1000)

  await expect(page).toHaveScreenshot('after-add-click.png', { maxDiffPixelRatio: 0.02 })

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('nav search button opens the search overlay', async ({ page }) => {
  const { pageErrors, consoleErrors } = await bootApp(page)
  await exitAddOptionsStep(page)

  const searchBtn = page.locator('.nav-search-btn')
  await expect(searchBtn).toBeVisible()
  await searchBtn.click()

  // The search overlay container is shown via display:block by uiController.
  await expect(page.locator('.search')).toBeVisible()
  await expect(page.locator('.search-input')).toBeVisible()

  await page.waitForTimeout(1000)

  await expect(page).toHaveScreenshot('after-search-click.png', { maxDiffPixelRatio: 0.02 })

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('footer excludes retired campaign links', async ({ page }) => {
  const { pageErrors, consoleErrors } = await bootApp(page)

  await expect(page.locator('.footer-logo-wrapper')).toHaveCount(0)
  await expect(page.locator('.footer-link-lang')).toHaveCount(0)
  await expect(page.locator('.footer-link-terms')).toHaveCount(0)
  await expect(page.locator('.footer-link-donate')).toHaveCount(0)
  await expect(page.locator('.footer-share')).toHaveCount(0)

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
