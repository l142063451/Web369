import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')
    
    // Check if the main heading is visible
    await expect(page.getByRole('heading', { name: /उम्मीद से हरी/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Ummid Se Hari/i })).toBeVisible()
    
    // Check if the description is present
    await expect(page.getByText(/Smart, Green & Transparent Village PWA/)).toBeVisible()
    
    // Check if the feature cards are present
    await expect(page.getByText(/Governance & Transparency/)).toBeVisible()
    await expect(page.getByText(/Smart & Carbon-Free/)).toBeVisible()
    await expect(page.getByText(/Citizen Services/)).toBeVisible()
  })

  test('should have proper PWA metadata', async ({ page }) => {
    await page.goto('/')
    
    // Check if PWA manifest link is present
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.webmanifest')
    
    // Check theme color meta tag
    const themeColor = page.locator('meta[name="theme-color"]')
    await expect(themeColor).toHaveAttribute('content', '#16A34A')
  })

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/')
    
    await expect(page.getByRole('heading', { name: /उम्मीद से हरी/i })).toBeVisible()
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    
    await expect(page.getByRole('heading', { name: /उम्मीद से हरी/i })).toBeVisible()
  })
})