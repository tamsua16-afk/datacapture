import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

async function run() {
  const artifactDir = path.join(process.cwd(), 'data', 'artifacts')
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true })
  }

  const browser = await chromium.launch({ headless: true })

  // Mobile viewport: 390x844
  const contextMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  const pageMobile = await contextMobile.newPage()
  await pageMobile.goto('http://localhost:3000/login')
  
  // Login as staff
  await pageMobile.fill('input[type="email"]', 'staff@demo.local')
  await pageMobile.fill('input[type="password"]', 'demo1234')
  await pageMobile.click('button[type="submit"]')
  await pageMobile.waitForTimeout(1000)

  // Navigate to mobile capture page
  await pageMobile.goto('http://localhost:3000/mobile/transactions/new')
  await pageMobile.waitForTimeout(1000)

  const mobileScreenshotPath = path.join(process.cwd(), 'mobile_capture_390x844.png')
  await pageMobile.screenshot({ path: mobileScreenshotPath, fullPage: true })
  console.log('Mobile screenshot saved to:', mobileScreenshotPath)

  // Step 1 -> Step 2
  await pageMobile.click('.doc-type-card')
  await pageMobile.click('button:has-text("Tiếp theo")')
  await pageMobile.waitForTimeout(500)
  const mobileStep2Path = path.join(process.cwd(), 'mobile_capture_step2.png')
  await pageMobile.screenshot({ path: mobileStep2Path, fullPage: true })
  console.log('Mobile step 2 screenshot saved to:', mobileStep2Path)

  await contextMobile.close()

  // Desktop viewport: 1366x768
  const contextDesktop = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  })
  const pageDesktop = await contextDesktop.newPage()
  await pageDesktop.goto('http://localhost:3000/login')
  await pageDesktop.fill('input[type="email"]', 'staff@demo.local')
  await pageDesktop.fill('input[type="password"]', 'demo1234')
  await pageDesktop.click('button[type="submit"]')
  await pageDesktop.waitForTimeout(1000)

  await pageDesktop.goto('http://localhost:3000/mobile/transactions/new')
  await pageDesktop.waitForTimeout(1000)

  const desktopScreenshotPath = path.join(process.cwd(), 'desktop_capture_1366x768.png')
  await pageDesktop.screenshot({ path: desktopScreenshotPath, fullPage: true })
  console.log('Desktop screenshot saved to:', desktopScreenshotPath)

  await contextDesktop.close()
  await browser.close()
}

run().catch((err) => {
  console.error('Error running screenshot script:', err)
  process.exit(1)
})
