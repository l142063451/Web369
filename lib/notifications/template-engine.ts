/**
 * Advanced template engine for notification content processing
 * Supports variable substitution, conditional logic, and formatting
 */

import { TemplateError } from './types'

export interface TemplateContext {
  user?: {
    name?: string
    email?: string
    phone?: string
    locale?: string
    [key: string]: any
  }
  app?: {
    name: string
    url: string
    version?: string
  }
  date?: {
    now: string
    formatted?: string
  }
  [key: string]: any
}

export class TemplateEngine {
  private static readonly VARIABLE_REGEX = /\{\{([^}]+)\}\}/g
  private static readonly CONDITIONAL_REGEX = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g
  private static readonly UNLESS_REGEX = /\{\{#unless\s+([^}]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g
  private static readonly EACH_REGEX = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g

  /**
   * Process template with variable substitution and logic
   */
  static process(template: string, context: TemplateContext, templateId?: string): string {
    try {
      let processed = template

      // Process conditionals first
      processed = this.processConditionals(processed, context)
      processed = this.processUnless(processed, context)
      processed = this.processEach(processed, context)

      // Process simple variables
      processed = this.processVariables(processed, context)

      // Process formatters
      processed = this.processFormatters(processed, context)

      return processed.trim()
    } catch (error) {
      throw new TemplateError(
        `Template processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        templateId || 'unknown',
        this.extractVariables(template)
      )
    }
  }

  /**
   * Extract all variable names from template
   */
  static extractVariables(template: string): string[] {
    const variables = new Set<string>()
    const matches = template.match(this.VARIABLE_REGEX)
    
    if (matches) {
      matches.forEach(match => {
        const variable = match.replace(/[{}]/g, '').trim()
        // Remove formatters
        const cleanVariable = variable.split('|')[0].trim()
        variables.add(cleanVariable)
      })
    }

    return Array.from(variables)
  }

  /**
   * Validate template syntax
   */
  static validate(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    try {
      // Check for unbalanced braces
      const openBraces = (template.match(/\{\{/g) || []).length
      const closeBraces = (template.match(/\}\}/g) || []).length
      
      if (openBraces !== closeBraces) {
        errors.push(`Unbalanced braces: ${openBraces} opening vs ${closeBraces} closing`)
      }

      // Check for unclosed conditionals
      const ifCount = (template.match(/\{\{#if/g) || []).length
      const endifCount = (template.match(/\{\{\/if\}\}/g) || []).length
      
      if (ifCount !== endifCount) {
        errors.push(`Unmatched if statements: ${ifCount} opening vs ${endifCount} closing`)
      }

      // Check for unclosed unless
      const unlessCount = (template.match(/\{\{#unless/g) || []).length
      const endUnlessCount = (template.match(/\{\{\/unless\}\}/g) || []).length
      
      if (unlessCount !== endUnlessCount) {
        errors.push(`Unmatched unless statements: ${unlessCount} opening vs ${endUnlessCount} closing`)
      }

      // Check for unclosed each
      const eachCount = (template.match(/\{\{#each/g) || []).length
      const endEachCount = (template.match(/\{\{\/each\}\}/g) || []).length
      
      if (eachCount !== endEachCount) {
        errors.push(`Unmatched each statements: ${eachCount} opening vs ${endEachCount} closing`)
      }

      return { valid: errors.length === 0, errors }
    } catch (error) {
      errors.push(`Syntax validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { valid: false, errors }
    }
  }

  /**
   * Get template preview with sample data
   */
  static preview(template: string, sampleData?: Partial<TemplateContext>): string {
    const defaultContext: TemplateContext = {
      user: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+91 9876543210',
        locale: 'en'
      },
      app: {
        name: 'Ummid Se Hari',
        url: 'https://ummid-se-hari.com',
        version: '1.0.0'
      },
      date: {
        now: new Date().toLocaleString('en-IN'),
        formatted: new Date().toLocaleDateString('en-IN')
      },
      ...sampleData
    }

    return this.process(template, defaultContext)
  }

  /**
   * Private processing methods
   */
  private static processConditionals(template: string, context: TemplateContext): string {
    return template.replace(this.CONDITIONAL_REGEX, (match, condition, content) => {
      if (this.evaluateCondition(condition.trim(), context)) {
        return content
      }
      return ''
    })
  }

  private static processUnless(template: string, context: TemplateContext): string {
    return template.replace(this.UNLESS_REGEX, (match, condition, content) => {
      if (!this.evaluateCondition(condition.trim(), context)) {
        return content
      }
      return ''
    })
  }

  private static processEach(template: string, context: TemplateContext): string {
    return template.replace(this.EACH_REGEX, (match, arrayPath, content) => {
      const array = this.getNestedValue(context, arrayPath.trim())
      
      if (!Array.isArray(array)) {
        return ''
      }

      return array.map((item, index) => {
        const itemContext = {
          ...context,
          this: item,
          '@index': index,
          '@first': index === 0,
          '@last': index === array.length - 1
        }
        
        return this.process(content, itemContext)
      }).join('')
    })
  }

  private static processVariables(template: string, context: TemplateContext): string {
    return template.replace(this.VARIABLE_REGEX, (match, variable) => {
      const trimmedVariable = variable.trim()
      
      // Check for formatters
      const parts = trimmedVariable.split('|')
      const variablePath = parts[0].trim()
      const formatters = parts.slice(1).map((f: string) => f.trim())

      let value = this.getNestedValue(context, variablePath)

      // Apply formatters
      formatters.forEach((formatter: string) => {
        value = this.applyFormatter(value, formatter)
      })

      return value !== undefined && value !== null ? String(value) : ''
    })
  }

  private static processFormatters(template: string, context: TemplateContext): string {
    // Additional formatter processing can be added here
    return template
  }

  private static evaluateCondition(condition: string, context: TemplateContext): boolean {
    try {
      // Simple condition evaluation
      // Supports: variable, !variable, variable === 'value', variable !== 'value'
      
      if (condition.startsWith('!')) {
        const variable = condition.slice(1).trim()
        const value = this.getNestedValue(context, variable)
        return !value
      }

      if (condition.includes('===')) {
        const [left, right] = condition.split('===').map(s => s.trim())
        const leftValue = this.getNestedValue(context, left)
        const rightValue = right.startsWith('"') && right.endsWith('"') 
          ? right.slice(1, -1) 
          : this.getNestedValue(context, right)
        return leftValue === rightValue
      }

      if (condition.includes('!==')) {
        const [left, right] = condition.split('!==').map(s => s.trim())
        const leftValue = this.getNestedValue(context, left)
        const rightValue = right.startsWith('"') && right.endsWith('"') 
          ? right.slice(1, -1) 
          : this.getNestedValue(context, right)
        return leftValue !== rightValue
      }

      // Simple boolean check
      const value = this.getNestedValue(context, condition)
      return Boolean(value)
    } catch {
      return false
    }
  }

  private static getNestedValue(obj: any, path: string): any {
    if (path === 'this') return obj.this || obj

    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object') {
        return current[key]
      }
      return undefined
    }, obj)
  }

  private static applyFormatter(value: any, formatter: string): any {
    const [formatterName, ...args] = formatter.split(':')
    
    switch (formatterName.trim()) {
      case 'upper':
        return String(value).toUpperCase()
      
      case 'lower':
        return String(value).toLowerCase()
      
      case 'title':
        return String(value).replace(/\w\S*/g, txt => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        )
      
      case 'truncate':
        const length = args[0] ? parseInt(args[0]) : 50
        const str = String(value)
        return str.length > length ? str.substring(0, length) + '...' : str
      
      case 'date':
        const format = args[0] || 'en-IN'
        if (value instanceof Date) {
          return value.toLocaleDateString(format)
        }
        const date = new Date(value)
        return isNaN(date.getTime()) ? value : date.toLocaleDateString(format)
      
      case 'currency':
        const currency = args[0] || 'INR'
        const locale = args[1] || 'en-IN'
        const num = parseFloat(value)
        if (isNaN(num)) return value
        return new Intl.NumberFormat(locale, { 
          style: 'currency', 
          currency 
        }).format(num)
      
      case 'default':
        return value || args[0] || ''
      
      default:
        return value
    }
  }
}

/**
 * Convenience function for template processing
 */
export function processTemplate(
  template: string, 
  context: TemplateContext, 
  templateId?: string
): string {
  return TemplateEngine.process(template, context, templateId)
}

/**
 * Validate template syntax
 */
export function validateTemplate(template: string) {
  return TemplateEngine.validate(template)
}

/**
 * Extract variables from template
 */
export function extractVariables(template: string): string[] {
  return TemplateEngine.extractVariables(template)
}

/**
 * Preview template with sample data
 */
export function previewTemplate(template: string, sampleData?: Partial<TemplateContext>): string {
  return TemplateEngine.preview(template, sampleData)
}