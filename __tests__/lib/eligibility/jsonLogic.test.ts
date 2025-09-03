import { 
  evaluateEligibility, 
  testEligibilityRule, 
  validateRule, 
  commonRulePatterns 
} from '@/lib/eligibility/jsonLogic'

describe('JSON-Logic Eligibility Service', () => {
  describe('evaluateEligibility', () => {
    it('should evaluate simple age rule correctly', () => {
      const rule = { '>=': [{ var: 'age' }, 18] }
      const answers = { age: 25 }

      const result = evaluateEligibility(rule, answers)

      expect(result.eligible).toBe(true)
      expect(result.details.rule).toEqual(rule)
      expect(result.details.answers).toEqual(answers)
      expect(result.details.explanation).toContain('meet all the eligibility criteria')
    })

    it('should evaluate complex AND rule correctly', () => {
      const rule = {
        and: [
          { '>=': [{ var: 'age' }, 18] },
          { '<': [{ var: 'annualIncome' }, 500000] },
          { in: [{ var: 'category' }, ['sc', 'st', 'obc']] }
        ]
      }
      
      const answers = { 
        age: 25, 
        annualIncome: 300000, 
        category: 'sc' 
      }

      const result = evaluateEligibility(rule, answers)

      expect(result.eligible).toBe(true)
    })

    it('should handle failing eligibility', () => {
      const rule = { '>=': [{ var: 'age' }, 65] }
      const answers = { age: 30 }

      const result = evaluateEligibility(rule, answers)

      expect(result.eligible).toBe(false)
      expect(result.details.explanation).toContain('do not meet some')
      expect(result.details.nextSteps?.[0]).toContain('Review your answers')
    })

    it('should throw error for invalid rule', () => {
      const invalidRule = { invalidOperator: 'test' }
      const answers = { age: 25 }

      expect(() => {
        evaluateEligibility(invalidRule, answers)
      }).toThrow('Invalid eligibility rule')
    })
  })

  describe('testEligibilityRule', () => {
    it('should test rule with multiple scenarios', () => {
      const rule = { '>=': [{ var: 'age' }, 18] }
      const testData = [
        { input: { age: 25 }, expectedOutput: true },
        { input: { age: 16 }, expectedOutput: false },
        { input: { age: 18 }, expectedOutput: true }
      ]

      const result = testEligibilityRule(rule, testData)

      expect(result.passed).toBe(true)
      expect(result.results).toHaveLength(3)
      expect(result.results[0].passed).toBe(true)
      expect(result.results[1].passed).toBe(true)
      expect(result.results[2].passed).toBe(true)
    })

    it('should detect failing test cases', () => {
      const rule = { '>=': [{ var: 'age' }, 18] }
      const testData = [
        { input: { age: 25 }, expectedOutput: false }, // This should fail
        { input: { age: 16 }, expectedOutput: false }
      ]

      const result = testEligibilityRule(rule, testData)

      expect(result.passed).toBe(false)
      expect(result.results[0].passed).toBe(false)
      expect(result.results[1].passed).toBe(true)
    })
  })

  describe('validateRule', () => {
    it('should validate correct JSON-Logic rule', () => {
      const rule = { '>=': [{ var: 'age' }, 18] }
      
      const result = validateRule(rule)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject null/undefined rule', () => {
      const result1 = validateRule(null)
      const result2 = validateRule(undefined)
      
      expect(result1.valid).toBe(false)
      expect(result2.valid).toBe(false)
      expect(result1.errors[0]).toContain('Rule must be a valid object')
    })

    it('should reject primitive values', () => {
      const result = validateRule('invalid')
      
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Rule must be a valid object')
    })
  })

  describe('commonRulePatterns', () => {
    it('should generate age range pattern correctly', () => {
      const pattern = commonRulePatterns.ageRange(18, 65)
      
      expect(pattern).toEqual({
        and: [
          { '>=': [{ var: 'age' }, 18] },
          { '<=': [{ var: 'age' }, 65] }
        ]
      })
    })

    it('should generate income below pattern correctly', () => {
      const pattern = commonRulePatterns.incomeBelow(500000)
      
      expect(pattern).toEqual({
        '<': [{ var: 'annualIncome' }, 500000]
      })
    })

    it('should generate category pattern correctly', () => {
      const categories = ['sc', 'st', 'obc']
      const pattern = commonRulePatterns.hasCategory(categories)
      
      expect(pattern).toEqual({
        in: [{ var: 'category' }, categories]
      })
    })

    it('should generate residence pattern correctly', () => {
      const areas = ['damday-chuanala', 'gangolihat']
      const pattern = commonRulePatterns.residentOf(areas)
      
      expect(pattern).toEqual({
        in: [{ var: 'residenceArea' }, areas]
      })
    })
  })

  describe('Integration Tests', () => {
    it('should handle complex multi-criteria scheme', () => {
      // Simulate a real government scheme: 
      // Senior citizen scheme for residents with low income
      const rule = {
        and: [
          { '>=': [{ var: 'age' }, 60] }, // Senior citizen
          { '<': [{ var: 'annualIncome' }, 300000] }, // Low income
          { in: [{ var: 'residenceArea' }, ['damday-chuanala', 'gangolihat']] } // Local resident
        ]
      }

      // Test eligible candidate
      const eligibleAnswers = {
        age: 65,
        annualIncome: 200000,
        residenceArea: 'damday-chuanala'
      }

      const eligibleResult = evaluateEligibility(rule, eligibleAnswers)
      expect(eligibleResult.eligible).toBe(true)

      // Test ineligible candidate (too young)
      const ineligibleAnswers = {
        age: 45,
        annualIncome: 200000,
        residenceArea: 'damday-chuanala'
      }

      const ineligibleResult = evaluateEligibility(rule, ineligibleAnswers)
      expect(ineligibleResult.eligible).toBe(false)
    })

    it('should validate and test a scheme rule end-to-end', () => {
      const rule = commonRulePatterns.ageRange(18, 35) // Youth scheme

      // Validate the rule
      const validation = validateRule(rule)
      expect(validation.valid).toBe(true)

      // Test with various scenarios
      const testData = [
        { input: { age: 25 }, expectedOutput: true },
        { input: { age: 17 }, expectedOutput: false },
        { input: { age: 36 }, expectedOutput: false },
        { input: { age: 18 }, expectedOutput: true },
        { input: { age: 35 }, expectedOutput: true }
      ]

      const testResults = testEligibilityRule(rule, testData)
      expect(testResults.passed).toBe(true)

      // Evaluate actual eligibility
      const youngApplicant = evaluateEligibility(rule, { age: 22 })
      expect(youngApplicant.eligible).toBe(true)
    })
  })
})