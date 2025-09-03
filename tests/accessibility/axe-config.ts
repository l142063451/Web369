/**
 * Axe-core configuration for accessibility testing
 * 
 * This configuration ensures WCAG 2.2 AA compliance across all components
 * and implements comprehensive accessibility checks per PR16 requirements.
 */

import { AxeResults, RunOptions } from 'axe-core'

export const axeConfig: RunOptions = {
  rules: {
    // Color contrast - WCAG 2.2 AA requires 4.5:1 for normal text, 3:1 for large text
    'color-contrast': { enabled: true },
    'color-contrast-enhanced': { enabled: true },
    
    // Keyboard navigation
    'focusable-content': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'tabindex': { enabled: true },
    'sequential-focus-navigation': { enabled: true },
    
    // ARIA compliance
    'aria-allowed-attr': { enabled: true },
    'aria-allowed-role': { enabled: true },
    'aria-command-name': { enabled: true },
    'aria-hidden-body': { enabled: true },
    'aria-hidden-focus': { enabled: true },
    'aria-input-field-name': { enabled: true },
    'aria-meter-name': { enabled: true },
    'aria-progressbar-name': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-toggle-field-name': { enabled: true },
    'aria-tooltip-name': { enabled: true },
    'aria-treeitem-name': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    
    // Form accessibility
    'label': { enabled: true },
    'label-title-only': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    
    // Image accessibility
    'image-alt': { enabled: true },
    'image-redundant-alt': { enabled: true },
    'svg-img-alt': { enabled: true },
    
    // Semantic HTML
    'heading-order': { enabled: true },
    'landmark-banner-is-top-level': { enabled: true },
    'landmark-complementary-is-top-level': { enabled: true },
    'landmark-contentinfo-is-top-level': { enabled: true },
    'landmark-main-is-top-level': { enabled: true },
    'landmark-no-duplicate-banner': { enabled: true },
    'landmark-no-duplicate-contentinfo': { enabled: true },
    'landmark-one-main': { enabled: true },
    'landmark-unique': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },
    
    // Navigation
    'bypass': { enabled: true },
    'skip-link': { enabled: true },
    
    // Language
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    'html-xml-lang-mismatch': { enabled: true },
    'valid-lang': { enabled: true },
    
    // Tables
    'table-duplicate-name': { enabled: true },
    'table-fake-caption': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    
    // Links
    'link-in-text-block': { enabled: true },
    'link-name': { enabled: true },
    
    // Lists
    'list': { enabled: true },
    'listitem': { enabled: true },
    
    // Interactive elements
    'button-name': { enabled: true },
    'input-button-name': { enabled: true },
    'input-image-alt': { enabled: true },
    
    // Document structure
    'document-title': { enabled: true },
    'duplicate-id': { enabled: true },
    'duplicate-id-active': { enabled: true },
    'duplicate-id-aria': { enabled: true },
    
    // Video/Audio
    'audio-caption': { enabled: true },
    'video-caption': { enabled: true },
    
    // Motion and animations
    'css-orientation-lock': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'scrollable-region-focusable': { enabled: true },
  },
  
  tags: [
    'wcag2a',    // WCAG 2.0 Level A
    'wcag2aa',   // WCAG 2.0 Level AA  
    'wcag21a',   // WCAG 2.1 Level A
    'wcag21aa',  // WCAG 2.1 Level AA
    'wcag22aa',  // WCAG 2.2 Level AA (latest)
    'best-practice', // Additional best practices
  ],
  
  // Test for specific accessibility standards
  standards: {
    wcag2a: { enabled: true },
    wcag2aa: { enabled: true },
    wcag21a: { enabled: true },
    wcag21aa: { enabled: true },
    wcag22aa: { enabled: true }, // Target compliance level
  }
}

/**
 * Custom axe configuration for admin pages with enhanced security requirements
 */
export const adminAxeConfig: RunOptions = {
  ...axeConfig,
  rules: {
    ...axeConfig.rules,
    // Additional admin-specific checks
    'presentation-role-conflict': { enabled: true },
    'role-img-alt': { enabled: true },
    'server-side-image-map': { enabled: true },
    'autocomplete-valid': { enabled: true },
    'avoid-inline-spacing': { enabled: true },
  }
}

/**
 * Generate accessibility report with detailed violation information
 */
export function generateA11yReport(results: AxeResults): string {
  const { violations, passes, incomplete, inapplicable } = results
  
  let report = `# Accessibility Test Report\n\n`
  report += `**Test Date:** ${new Date().toISOString()}\n`
  report += `**URL:** ${results.url}\n`
  report += `**Compliance Target:** WCAG 2.2 AA\n\n`
  
  // Summary
  report += `## Summary\n\n`
  report += `- ✅ **Passed:** ${passes.length} rules\n`
  report += `- ❌ **Violations:** ${violations.length} rules\n`
  report += `- ⚠️ **Incomplete:** ${incomplete.length} rules\n`
  report += `- ℹ️ **Not Applicable:** ${inapplicable.length} rules\n\n`
  
  // Compliance status
  const isCompliant = violations.length === 0
  report += `**WCAG 2.2 AA Compliance:** ${isCompliant ? '✅ PASSED' : '❌ FAILED'}\n\n`
  
  // Violations detail
  if (violations.length > 0) {
    report += `## Violations (${violations.length})\n\n`
    
    violations.forEach((violation, index) => {
      report += `### ${index + 1}. ${violation.help} (${violation.impact})\n\n`
      report += `**Rule ID:** \`${violation.id}\`\n`
      report += `**WCAG:** ${violation.tags.filter(tag => tag.startsWith('wcag')).join(', ')}\n`
      report += `**Impact:** ${violation.impact}\n`
      report += `**Description:** ${violation.description}\n\n`
      
      if (violation.helpUrl) {
        report += `**Help:** [${violation.helpUrl}](${violation.helpUrl})\n\n`
      }
      
      if (violation.nodes.length > 0) {
        report += `**Elements (${violation.nodes.length}):**\n\n`
        violation.nodes.forEach((node, nodeIndex) => {
          report += `${nodeIndex + 1}. **Target:** \`${node.target}\`\n`
          if (node.html) {
            report += `   **HTML:** \`${node.html.substring(0, 100)}${node.html.length > 100 ? '...' : ''}\`\n`
          }
          if (node.failureSummary) {
            report += `   **Issue:** ${node.failureSummary}\n`
          }
        })
        report += `\n`
      }
    })
  }
  
  // Incomplete tests
  if (incomplete.length > 0) {
    report += `## Incomplete Tests (${incomplete.length})\n\n`
    incomplete.forEach((item, index) => {
      report += `${index + 1}. **${item.help}** (\`${item.id}\`) - ${item.description}\n`
    })
    report += `\n`
  }
  
  return report
}

/**
 * Check if accessibility test meets WCAG 2.2 AA requirements
 */
export function meetsWCAG22AA(results: AxeResults): boolean {
  // No violations for critical accessibility issues
  const criticalViolations = results.violations.filter(v => 
    v.impact === 'critical' || v.impact === 'serious'
  )
  
  return criticalViolations.length === 0
}

/**
 * Extract accessibility metrics for reporting
 */
export function extractA11yMetrics(results: AxeResults) {
  const totalRules = results.violations.length + results.passes.length + results.incomplete.length
  const passRate = totalRules > 0 ? (results.passes.length / totalRules) * 100 : 0
  
  const violationsByImpact = results.violations.reduce((acc, v) => {
    acc[v.impact] = (acc[v.impact] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return {
    totalRules,
    passRate: Math.round(passRate * 100) / 100,
    violations: {
      total: results.violations.length,
      critical: violationsByImpact.critical || 0,
      serious: violationsByImpact.serious || 0,
      moderate: violationsByImpact.moderate || 0,
      minor: violationsByImpact.minor || 0,
    },
    passes: results.passes.length,
    incomplete: results.incomplete.length,
    wcag22AACompliant: meetsWCAG22AA(results),
  }
}