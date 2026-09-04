import { chromium } from '@playwright/test'
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const outputDir = path.join(__dirname, '..', '.qa', 'responsive')
const baseUrl = (process.env.QA_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const email = process.env.QA_EMAIL ?? 'admin@koperasi.local'
const password = process.env.QA_PASSWORD ?? 'password'

const viewports = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-landscape-1024', width: 1024, height: 768 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1536', width: 1536, height: 960 },
]

async function assertServerReady() {
  try {
    const response = await fetch(`${baseUrl}/login`, { redirect: 'manual' })
    if (!response.ok && response.status < 300) {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    throw new Error(
      `Dev server belum siap di ${baseUrl}. Jalankan "npm.cmd run dev" dulu. Detail: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

async function launchBrowser() {
  const attempts = [
    process.env.PLAYWRIGHT_CHANNEL,
    'msedge',
    'chrome',
    undefined,
  ].filter((channel, index, items) => items.indexOf(channel) === index)

  const errors = []
  for (const channel of attempts) {
    try {
      return await chromium.launch({
        headless: true,
        ...(channel ? { channel } : {}),
      })
    } catch (error) {
      errors.push(`${channel ?? 'bundled chromium'}: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`)
    }
  }

  throw new Error(
    `Tidak bisa membuka Chromium/Edge untuk QA responsive.\n${errors.join('\n')}\n` +
      'Coba install browser Playwright dengan: npx.cmd playwright install chromium'
  )
}

async function findImportFiles() {
  if (process.env.QA_IMPORT_FILES) {
    return process.env.QA_IMPORT_FILES
      .split(/[;,]/)
      .filter(Boolean)
      .map((file) => file.trim())
      .filter(Boolean)
      .map((file) => path.resolve(rootDir, file))
  }

  const entries = await readdir(rootDir)
  return entries
    .filter((file) => /^untuk kk mbek.*\.xlsx$/i.test(file) && !file.startsWith('~$'))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => path.join(rootDir, file))
}

async function openImportReview(page, importFiles) {
  await page.goto(`${baseUrl}/import`, { waitUntil: 'networkidle' })

  if (importFiles.length === 0) {
    throw new Error(
      'File Excel contoh tidak ditemukan. Simpan file "untuk kk mbek*.xlsx" di root repo, ' +
        'atau set QA_IMPORT_FILES="file1.xlsx;file2.xlsx".'
    )
  }

  const previewResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/v1/import-batches/preview') && response.request().method() === 'POST',
    { timeout: 120_000 }
  )
  await page.locator('input[type="file"]').setInputFiles(importFiles)
  const previewResponse = await previewResponsePromise
  const previewPayload = await previewResponse.json().catch(() => null)
  const previewBatchId = previewPayload?.data?.id

  const reviewButton = page.getByRole('button', { name: 'Review warning' })
  await reviewButton.waitFor({ state: 'visible', timeout: 90_000 })
  await reviewButton.click()
  await page.locator('.import-review-viewport').waitFor({ state: 'visible', timeout: 20_000 })

  return typeof previewBatchId === 'string' ? previewBatchId : null
}

async function inspectLayout(page, { requireReview = true, requirePreflight = false } = {}) {
  return page.evaluate(({ requireReview, requirePreflight }) => {
    const viewportWidth = window.innerWidth
    const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
    const overflowX = Math.max(0, Math.round(documentWidth - viewportWidth))

    const isVisible = (element) => {
      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
    }

    const describe = (element) => ({
      tag: element.tagName.toLowerCase(),
      className: typeof element.className === 'string' ? element.className.slice(0, 120) : '',
      text: (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80),
      rect: (() => {
        const rect = element.getBoundingClientRect()
        return {
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      })(),
    })

    const isInsideHorizontalScroller = (element) => {
      let parent = element.parentElement
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent)
        const canScroll = ['auto', 'scroll'].includes(style.overflowX)
        if (canScroll && parent.scrollWidth > parent.clientWidth + 2) return true
        parent = parent.parentElement
      }
      return false
    }

    const overflowElements = Array.from(document.body.querySelectorAll('*'))
      .filter((element) => isVisible(element))
      .filter((element) => !isInsideHorizontalScroller(element))
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        return rect.left < -2 || rect.right > viewportWidth + 2
      })
      .slice(0, 8)
      .map(describe)

    const smallTargets = Array.from(document.querySelectorAll('button, select, input:not([type="checkbox"]), a[href], [role="button"]'))
      .filter((element) => isVisible(element) && !element.classList.contains('sr-only'))
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        return rect.width < 34 || rect.height < 34
      })
      .slice(0, 8)
      .map(describe)

    const reviewRows = document.querySelectorAll('.import-review-row').length
    const reviewViewport = document.querySelector('.import-review-viewport')
    const preflight = document.querySelector('.import-preflight')
    const reviewViewportRect = reviewViewport?.getBoundingClientRect()
    const bottomNav = document.querySelector('.mobile-bottom-nav, .bottom-nav')
    const bottomNavRect = bottomNav?.getBoundingClientRect()
    const viewportBlocksBottomNav = Boolean(
      reviewViewportRect &&
      bottomNavRect &&
      bottomNavRect.top < reviewViewportRect.bottom &&
      bottomNavRect.bottom > reviewViewportRect.top
    )

    return {
      overflowX,
      overflowElements,
      smallTargets,
      reviewRows,
      virtualWindowOk: !requireReview || (reviewRows > 0 && reviewRows <= 32),
      preflightOk: !requirePreflight || Boolean(preflight),
      viewportBlocksBottomNav,
      url: window.location.href,
    }
  }, { requireReview, requirePreflight })
}

await assertServerReady()
await mkdir(outputDir, { recursive: true })

const browser = await launchBrowser()
const failures = []
const rows = []
const importFiles = await findImportFiles()
let previewBatchId = null

try {
  const context = await browser.newContext({
    viewport: { width: viewports[0].width, height: viewports[0].height },
    deviceScaleFactor: 1,
  })

  const loginResponse = await context.request.post(`${baseUrl}/api/v1/auth/login`, {
    data: { email, password },
  })
  if (!loginResponse.ok()) {
    throw new Error(`Login QA gagal untuk ${email}: HTTP ${loginResponse.status()}`)
  }

  const page = await context.newPage()
  previewBatchId = await openImportReview(page, importFiles)

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    const reviewResult = await inspectLayout(page, { requireReview: true })
    const reviewScreenshotPath = path.join(outputDir, `review-${viewport.name}.png`)
    await page.screenshot({ path: reviewScreenshotPath, fullPage: true })

    const nextButton = page.getByRole('button', { name: 'Lanjut simpan' })
    await nextButton.click()
    await page.locator('.import-preflight').waitFor({ state: 'visible', timeout: 20_000 })
    const commitResult = await inspectLayout(page, { requireReview: false, requirePreflight: true })
    const commitScreenshotPath = path.join(outputDir, `commit-${viewport.name}.png`)
    await page.screenshot({ path: commitScreenshotPath, fullPage: true })
    await page.getByRole('button', { name: 'Kembali' }).click()
    await page.locator('.import-review-viewport').waitFor({ state: 'visible', timeout: 20_000 })

    const combinedResults = [
      { mode: 'review', result: reviewResult },
      { mode: 'commit', result: commitResult },
    ]

    const issues = []
    for (const item of combinedResults) {
      if (item.result.overflowX > 2) issues.push(`${item.mode}: overflow-x ${item.result.overflowX}px`)
      if (item.result.overflowElements.length > 0) issues.push(`${item.mode}: ${item.result.overflowElements.length} elemen keluar viewport`)
      if (item.result.smallTargets.length > 0) issues.push(`${item.mode}: ${item.result.smallTargets.length} touch target <34px`)
      if (!item.result.virtualWindowOk) issues.push(`${item.mode}: virtual rows tidak normal (${item.result.reviewRows})`)
      if (!item.result.preflightOk) issues.push(`${item.mode}: preflight panel tidak tampil`)
      if (item.result.viewportBlocksBottomNav) issues.push(`${item.mode}: bottom nav menutupi review viewport`)
    }

    rows.push({
      viewport: `${viewport.width}x${viewport.height}`,
      screenshot: `${reviewScreenshotPath}; ${commitScreenshotPath}`,
      issues,
    })

    if (issues.length > 0) {
      failures.push({ viewport, result: reviewResult, commitResult, issues })
    }
  }

  if (previewBatchId) {
    await context.request.delete(`${baseUrl}/api/v1/import-batches/${previewBatchId}`).catch(() => null)
  }
  await context.close()
} finally {
  await browser.close()
}

console.log('\nResponsive QA Import')
for (const row of rows) {
  console.log(`${row.viewport.padEnd(10)} ${row.issues.length === 0 ? 'OK' : row.issues.join('; ')}`)
}
console.log(`\nScreenshots: ${outputDir}`)

if (failures.length > 0) {
  console.error('\nDetail gagal:')
  for (const failure of failures) {
    console.error(`\n${failure.viewport.name} (${failure.viewport.width}x${failure.viewport.height})`)
    console.error(failure.issues.join('; '))
    if (failure.result.overflowElements.length > 0) {
      console.error('Overflow:', JSON.stringify(failure.result.overflowElements, null, 2))
    }
    if (failure.result.smallTargets.length > 0) {
      console.error('Touch target kecil:', JSON.stringify(failure.result.smallTargets, null, 2))
    }
  }
  process.exit(1)
}
