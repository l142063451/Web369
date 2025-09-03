/**
 * Accessibility Tests with Playwright and Axe
 * 
 * Comprehensive E2E accessibility testing for WCAG 2.2 AA compliance
 * Tests all key pages and admin interfaces per PR16 requirements
 */

import { test, expect, Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { axeConfig, adminAxeConfig, generateA11yReport, extractA11yMetrics } from '../accessibility/axe-config'
import fs from 'fs'
import path from 'path'

// Test configuration
const WCAG_22_AA_THRESHOLD = 0 // Zero violations for WCAG 2.2 AA compliance
const REPORT_DIR = path.join(__dirname, '../../accessibility-reports')

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true })
}

/**
 * Run accessibility test on a page and generate report
 */
async function testPageAccessibility(
  page: Page, 
  pageName: string, 
  isAdmin = false,
  customConfig?: any
) {
  const config = isAdmin ? adminAxeConfig : axeConfig
  const axeBuilder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  
  if (customConfig) {
    axeBuilder.configure(customConfig)
  } else {
    axeBuilder.configure(config)
  }
  
  const results = await axeBuilder.analyze()
  const metrics = extractA11yMetrics(results)
  
  // Generate detailed report
  const report = generateA11yReport(results)
  const reportPath = path.join(REPORT_DIR, `${pageName}-accessibility-report.md`)
  fs.writeFileSync(reportPath, report)
  
  // Log metrics for CI
  console.log(`\n🔍 Accessibility Test Results for ${pageName}:`)
  console.log(`   ✅ Passed: ${metrics.passes} rules`)
  console.log(`   ❌ Violations: ${metrics.violations.total} (Critical: ${metrics.violations.critical}, Serious: ${metrics.violations.serious})`)
  console.log(`   📊 Pass Rate: ${metrics.passRate}%`)
  console.log(`   🎯 WCAG 2.2 AA: ${metrics.wcag22AACompliant ? 'PASSED' : 'FAILED'}`)
  console.log(`   📋 Report: ${reportPath}`)
  
  return { results, metrics }
}

/**
 * Wait for page to be fully loaded and stable
 */
async function waitForPageReady(page: Page) {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle')
  
  // Wait for any loading spinners to disappear
  await page.waitForFunction(() => {
    const spinners = document.querySelectorAll('[data-testid="loading"], .animate-spin, [aria-label*="loading" i]')
    return spinners.length === 0
  }, { timeout: 5000 })
    .catch(() => {
      // Continue if no spinners found or timeout
    })
}

test.describe('Accessibility Tests - WCAG 2.2 AA Compliance', () => {
  
  test('Homepage accessibility', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)
    
    const { results, metrics } = await testPageAccessibility(page, 'homepage')
    
    // Assert WCAG 2.2 AA compliance
    expect(metrics.wcag22AACompliant, 
      `Homepage failed WCAG 2.2 AA with ${metrics.violations.critical} critical and ${metrics.violations.serious} serious violations`
    ).toBe(true)
    
    // Check for specific accessibility features
    await expect(page.locator('h1')).toBeVisible() // Page should have h1
    await expect(page.locator('[lang]')).toHaveCount(1) // HTML should have lang attribute
    
    // Skip to main content link
    const skipLink = page.locator('text="Skip to main content"')
    if (await skipLink.count() > 0) {
      await expect(skipLink).toBeVisible()
    }
  })
  
  test('Admin login accessibility', async ({ page }) => {
    await page.goto('/admin')
    await waitForPageReady(page)
    
    const { results, metrics } = await testPageAccessibility(page, 'admin-login', true)
    
    expect(metrics.wcag22AACompliant).toBe(true)
    
    // Check form accessibility
    const emailInput = page.locator('input[type="email"]')
    if (await emailInput.count() > 0) {
      await expect(emailInput).toHaveAttribute('aria-label')
    }
    
    // Password input accessibility
    const passwordInputs = page.locator('input[type="password"]')
    for (const input of await passwordInputs.all()) {
      await expect(input).toHaveAttribute('aria-label')
    }
  })
  
  test('Services catalog accessibility', async ({ page }) => {
    await page.goto('/services')
    await waitForPageReady(page)
    
    const { results, metrics } = await testPageAccessibility(page, 'services')
    
    expect(metrics.wcag22AACompliant).toBe(true)
    
    // Check interactive elements have accessible names
    const buttons = page.locator('button')
    for (const button of await buttons.all()) {
      const hasAccessibleName = await button.getAttribute('aria-label') ||
                               await button.textContent() ||
                               await button.getAttribute('title')
      expect(hasAccessibleName).toBeTruthy()
    }
  })
  
  test('Projects and maps accessibility', async ({ page }) => {
    await page.goto('/projects')
    await waitForPageReady(page)
    
    // Wait for map to load
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 10000 })
      .catch(() => {
        // Continue if map doesn't load
      })
    
    const { results, metrics } = await testPageAccessibility(page, 'projects-maps')
    
    expect(metrics.wcag22AACompliant).toBe(true)
  })
  
  test('Directory accessibility', async ({ page }) => {
    await page.goto('/directory')
    await waitForPageReady(page)
    
    const { results, metrics } = await testPageAccessibility(page, 'directory')
    
    expect(metrics.wcag22AACompliant).toBe(true)
    
    // Check if cards have proper headings
    const directoryCards = page.locator('[data-testid="directory-card"]')
    if (await directoryCards.count() > 0) {
      for (const card of await directoryCards.all()) {
        const hasHeading = await card.locator('h2, h3, h4, h5, h6').count() > 0
        expect(hasHeading).toBeTruthy()
      }
    }
  })
  
  test('Forms accessibility', async ({ page }) => {
    // Test dynamic form creation page
    await page.goto('/services')
    await waitForPageReady(page)
    
    // Click on first service if available
    const serviceButtons = page.locator('[data-testid="service-button"]')
    if (await serviceButtons.count() > 0) {
      await serviceButtons.first().click()
      await waitForPageReady(page)
      
      const { results, metrics } = await testPageAccessibility(page, 'service-form')
      
      expect(metrics.wcag22AACompliant).toBe(true)
      
      // Check form labels
      const inputs = page.locator('input, select, textarea')
      for (const input of await inputs.all()) {
        const hasLabel = await input.getAttribute('aria-label') ||
                         await input.getAttribute('aria-labelledby') ||
                         await input.getAttribute('placeholder')
        expect(hasLabel).toBeTruthy()
      }
    }
  })
  
  test('Schemes eligibility checker accessibility', async ({ page }) => {
    await page.goto('/schemes')
    await waitForPageReady(page)
    
    const { results, metrics } = await testPageAccessibility(page, 'schemes')
    
    expect(metrics.wcag22AACompliant).toBe(true)
  })

})

test.describe('Admin Panel Accessibility Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock authentication for admin tests
    await page.addInitScript(() => {
      localStorage.setItem('test-mode', 'true')
    })
  })
  
  test('Admin dashboard accessibility', async ({ page }) => {
    await page.goto('/admin')
    await waitForPageReady(page)
    
    const { results, metrics } = await testPageAccessibility(page, 'admin-dashboard', true)
    
    expect(metrics.wcag22AACompliant).toBe(true)
    
    // Check navigation landmark
    await expect(page.locator('nav')).toBeVisible()
    
    // Check main content area
    await expect(page.locator('main')).toBeVisible()
  })
  
  test('Admin navigation accessibility', async ({ page }) => {
    await page.goto('/admin')
    await waitForPageReady(page)
    
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    
    // Check if navigation items are focusable
    const navItems = page.locator('nav a, nav button')
    for (const item of await navItems.all()) {
      const isFocusable = await item.getAttribute('tabindex') !== '-1'
      expect(isFocusable).toBeTruthy()
    }
    
    const { results, metrics } = await testPageAccessibility(page, 'admin-navigation', true)
    expect(metrics.wcag22AACompliant).toBe(true)
  })
  
  test('Content manager accessibility', async ({ page }) => {
    await page.goto('/admin/content')
    await waitForPageReady(page)
    
    const { results, metrics } = await testPageAccessibility(page, 'admin-content', true)
    
    expect(metrics.wcag22AACompliant).toBe(true)
    
    // Check if rich text editor is accessible
    const editor = page.locator('[data-testid="tiptap-editor"]')
    if (await editor.count() > 0) {
      await expect(editor).toHaveAttribute('role')
    }
  })
  
  test('Form builder accessibility', async ({ page }) => {
    await page.goto('/admin/forms')
    await waitForPageReady(page)
    
    const { results, metrics } = await testPageAccessibility(page, 'admin-forms', true)
    
    expect(metrics.wcag22AACompliant).toBe(true)
  })
  
  test('Notifications center accessibility', async ({ page }) => {
    await page.goto('/admin/notifications')
    await waitForPageReady(page)
    
    const { results, metrics } = await testPageAccessibility(page, 'admin-notifications', true)
    
    expect(metrics.wcag22AACompliant).toBe(true)
    
    // Check if tabbed interface is accessible
    const tabs = page.locator('[role="tab"]')
    if (await tabs.count() > 0) {
      for (const tab of await tabs.all()) {
        await expect(tab).toHaveAttribute('aria-selected')
        await expect(tab).toHaveAttribute('aria-controls')
      }
    }
  })
})

test.describe('Keyboard Navigation Tests', () => {
  
  test('Homepage keyboard navigation', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)
    
    // Start keyboard navigation
    await page.keyboard.press('Tab')
    
    // Check if skip link is the first focusable element
    const firstFocused = await page.locator(':focus').textContent()
    
    // Continue tabbing through interactive elements
    const interactiveElements = page.locator('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const count = await interactiveElements.count()
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      await page.keyboard.press('Tab')
      
      // Check if focused element is visible
      const focused = page.locator(':focus')
      await expect(focused).toBeVisible()
      
      // Check if focus indicator is visible (should have outline or ring)
      const focusStyles = await focused.evaluate((el) => {
        const styles = window.getComputedStyle(el)
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow,
        }
      })
      
      const hasFocusIndicator = focusStyles.outline !== 'none' || 
                               focusStyles.outlineWidth !== '0px' ||
                               focusStyles.boxShadow.includes('ring') ||
                               focusStyles.boxShadow.includes('outline')
      
      expect(hasFocusIndicator).toBeTruthy()
    }
  })
  
  test('Admin panel keyboard navigation', async ({ page }) => {
    await page.goto('/admin')
    await waitForPageReady(page)
    
    // Test keyboard navigation in admin interface
    await page.keyboard.press('Tab')
    
    // Test arrow key navigation in menus if present
    const menuItems = page.locator('[role="menuitem"]')
    if (await menuItems.count() > 0) {
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('Enter')
    }
  })
  
  test('Form keyboard interaction', async ({ page }) => {
    await page.goto('/services')
    await waitForPageReady(page)
    
    // Navigate to a form
    const serviceButtons = page.locator('[data-testid="service-button"]')
    if (await serviceButtons.count() > 0) {
      await serviceButtons.first().click()
      await waitForPageReady(page)
      
      // Test keyboard navigation through form
      const formInputs = page.locator('input, select, textarea, button')
      const inputCount = await formInputs.count()
      
      if (inputCount > 0) {
        await page.keyboard.press('Tab')
        
        for (let i = 0; i < Math.min(inputCount, 5); i++) {
          const focused = page.locator(':focus')
          await expect(focused).toBeVisible()
          
          // Test space/enter interaction for buttons
          const tagName = await focused.evaluate(el => el.tagName.toLowerCase())
          if (tagName === 'button') {
            await page.keyboard.press('Space')
          }
          
          await page.keyboard.press('Tab')
        }
      }
    }
  })
  
})

test.describe('Color Contrast Tests', () => {
  
  test('Homepage color contrast', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)
    
    // Axe will check color contrast as part of WCAG 2.2 AA
    const axeBuilder = new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
    
    const results = await axeBuilder.analyze()
    const contrastViolations = results.violations.filter(v => v.id === 'color-contrast')
    
    expect(contrastViolations.length).toBe(0)
  })
  
  test('Admin interface color contrast', async ({ page }) => {
    await page.goto('/admin')
    await waitForPageReady(page)
    
    const axeBuilder = new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
    
    const results = await axeBuilder.analyze()
    const contrastViolations = results.violations.filter(v => v.id === 'color-contrast')
    
    expect(contrastViolations.length).toBe(0)
  })
  
})

// Generate summary report after all tests
test.afterAll(async () => {
  const summaryPath = path.join(REPORT_DIR, 'accessibility-summary.md')
  const summary = `
# Accessibility Test Summary

**Test Date:** ${new Date().toISOString()}
**Target Compliance:** WCAG 2.2 AA
**Framework:** Playwright + Axe-core

## Test Coverage

- ✅ Homepage accessibility
- ✅ Admin authentication
- ✅ Services catalog
- ✅ Projects and maps
- ✅ Directory
- ✅ Dynamic forms
- ✅ Admin dashboard
- ✅ Admin navigation
- ✅ Content manager
- ✅ Form builder
- ✅ Notifications center
- ✅ Keyboard navigation
- ✅ Color contrast

## Reports Generated

Individual accessibility reports have been generated for each tested page in the \`accessibility-reports\` directory.

## Next Steps

1. Review any violations in individual reports
2. Fix accessibility issues identified
3. Re-run tests to verify compliance
4. Update components to maintain accessibility standards

For detailed results, check the individual report files.
`
  
  fs.writeFileSync(summaryPath, summary)
  console.log(`\n📊 Accessibility test summary generated: ${summaryPath}`)
})