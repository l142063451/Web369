import jsonLogic from 'json-logic-js'

export interface EligibilityResult {
  eligible: boolean
  details: {
    rule: unknown
    answers: Record<string, unknown>
    explanation?: string
    nextSteps?: string[]
  }
}

export function evaluateEligibility(
  rule: unknown,
  answers: Record<string, unknown>
): EligibilityResult {
  try {
    const result = jsonLogic.apply(rule as any, answers)
    
    return {
      eligible: !!result,
      details: {
        rule,
        answers,
        explanation: generateExplanation(rule, answers, !!result),
        nextSteps: generateNextSteps(rule, answers, !!result)
      }
    }
  } catch (e) {
    throw new Error(`Invalid eligibility rule: ${e instanceof Error ? e.message : String(e)}`)
  }
}

/**
 * Test a JSON-Logic rule with sample data to validate it works
 */
export function testEligibilityRule(
  rule: unknown,
  testData: Array<{ input: Record<string, unknown>; expectedOutput: boolean }>
): { passed: boolean; results: Array<{ input: Record<string, unknown>; expected: boolean; actual: boolean; passed: boolean }> } {
  const results = testData.map(({ input, expectedOutput }) => {
    try {
      const actual = !!jsonLogic.apply(rule as any, input)
      return {
        input,
        expected: expectedOutput,
        actual,
        passed: actual === expectedOutput
      }
    } catch (e) {
      return {
        input,
        expected: expectedOutput,
        actual: false,
        passed: false
      }
    }
  })

  return {
    passed: results.every(r => r.passed),
    results
  }
}

function generateExplanation(rule: unknown, answers: Record<string, unknown>, eligible: boolean): string {
  // Basic explanation generation - can be enhanced based on rule complexity
  if (eligible) {
    return 'You meet all the eligibility criteria for this scheme.'
  } else {
    return 'You do not meet some of the required criteria for this scheme.'
  }
}

function generateNextSteps(rule: unknown, answers: Record<string, unknown>, eligible: boolean): string[] {
  if (eligible) {
    return [
      'Review the required documents list',
      'Prepare all necessary documentation',
      'Click "Apply Now" to start your application'
    ]
  } else {
    return [
      'Review your answers to ensure accuracy',
      'Check if you can meet the missing criteria',
      'Contact the scheme administrator for clarification if needed'
    ]
  }
}

/**
 * Common JSON-Logic rule patterns for government schemes
 */
export const commonRulePatterns = {
  ageRange: (min: number, max: number) => ({
    and: [
      { '>=': [{ var: 'age' }, min] },
      { '<=': [{ var: 'age' }, max] }
    ]
  }),

  incomeBelow: (threshold: number) => ({
    '<': [{ var: 'annualIncome' }, threshold]
  }),

  hasCategory: (categories: string[]) => ({
    in: [{ var: 'category' }, categories]
  }),

  residentOf: (areas: string[]) => ({
    in: [{ var: 'residenceArea' }, areas]
  }),

  hasDocuments: (requiredDocs: string[]) => ({
    all: [
      requiredDocs.map(doc => ({ var: `documents.${doc}` }))
    ]
  })
}

/**
 * Validate a JSON-Logic rule structure
 */
export function validateRule(rule: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!rule || typeof rule !== 'object') {
    errors.push('Rule must be a valid object')
    return { valid: false, errors }
  }

  try {
    // Test with empty data to check if rule is valid JSON-Logic
    jsonLogic.apply(rule as any, {})
  } catch (e) {
    errors.push(`Invalid JSON-Logic syntax: ${e instanceof Error ? e.message : String(e)}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}