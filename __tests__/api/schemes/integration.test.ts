import { evaluateEligibility, testEligibilityRule, commonRulePatterns } from '@/lib/eligibility/jsonLogic'

describe('Schemes JSON-Logic Integration Tests', () => {
  describe('Real Government Scheme Scenarios', () => {
    it('should evaluate senior citizen pension scheme correctly', () => {
      // Real scheme criteria: Age >= 60, Income < 120000, Valid category
      const pensionScheme = {
        and: [
          { '>=': [{ var: 'age' }, 60] },
          { '<': [{ var: 'annualIncome' }, 120000] },
          { 'in': [{ var: 'category' }, ['general', 'obc', 'sc', 'st']] }
        ]
      }

      // Eligible applicant
      const eligibleApplicant = {
        age: 65,
        annualIncome: 80000,
        category: 'general'
      }

      const eligibleResult = evaluateEligibility(pensionScheme, eligibleApplicant)
      expect(eligibleResult.eligible).toBe(true)
      expect(eligibleResult.details.explanation).toContain('meet all the eligibility criteria')

      // Ineligible applicant (too young)
      const tooYoung = {
        age: 55,
        annualIncome: 80000,
        category: 'general'
      }

      const tooYoungResult = evaluateEligibility(pensionScheme, tooYoung)
      expect(tooYoungResult.eligible).toBe(false)

      // Ineligible applicant (income too high)
      const highIncome = {
        age: 65,
        annualIncome: 150000,
        category: 'general'
      }

      const highIncomeResult = evaluateEligibility(pensionScheme, highIncome)
      expect(highIncomeResult.eligible).toBe(false)
    })

    it('should evaluate solar panel subsidy scheme correctly', () => {
      // Real scheme criteria: Income <= 200000, Age >= 18, Local resident
      const solarScheme = {
        and: [
          { '<=': [{ var: 'annualIncome' }, 200000] },
          { '>=': [{ var: 'age' }, 18] },
          { 'in': [{ var: 'residenceArea' }, ['damday-chuanala', 'gangolihat']] }
        ]
      }

      // Test multiple scenarios
      const testCases = [
        {
          input: { age: 30, annualIncome: 150000, residenceArea: 'damday-chuanala' },
          expectedOutput: true
        },
        {
          input: { age: 25, annualIncome: 250000, residenceArea: 'gangolihat' },
          expectedOutput: false // income too high
        },
        {
          input: { age: 16, annualIncome: 100000, residenceArea: 'damday-chuanala' },
          expectedOutput: false // too young
        },
        {
          input: { age: 30, annualIncome: 150000, residenceArea: 'other-village' },
          expectedOutput: false // wrong location
        }
      ]

      const testResults = testEligibilityRule(solarScheme, testCases)
      expect(testResults.passed).toBe(true)
      expect(testResults.results[0].passed).toBe(true)  // eligible case
      expect(testResults.results[1].passed).toBe(true)  // high income case
      expect(testResults.results[2].passed).toBe(true)  // too young case
      expect(testResults.results[3].passed).toBe(true)  // wrong location case
    })

    it('should evaluate women entrepreneur scheme correctly', () => {
      // Real scheme criteria: Age 18-45, Female, Local resident
      const womenScheme = {
        and: [
          { '>=': [{ var: 'age' }, 18] },
          { '<=': [{ var: 'age' }, 45] },
          { '==': [{ var: 'gender' }, 'female'] },
          { 'in': [{ var: 'residenceArea' }, ['damday-chuanala', 'gangolihat']] }
        ]
      }

      // Eligible female entrepreneur
      const eligibleWoman = {
        age: 28,
        gender: 'female',
        residenceArea: 'gangolihat'
      }

      const eligibleResult = evaluateEligibility(womenScheme, eligibleWoman)
      expect(eligibleResult.eligible).toBe(true)

      // Ineligible (male applicant)
      const maleApplicant = {
        age: 28,
        gender: 'male',
        residenceArea: 'gangolihat'
      }

      const maleResult = evaluateEligibility(womenScheme, maleApplicant)
      expect(maleResult.eligible).toBe(false)

      // Ineligible (too old)
      const tooOld = {
        age: 50,
        gender: 'female',
        residenceArea: 'gangolihat'
      }

      const tooOldResult = evaluateEligibility(womenScheme, tooOld)
      expect(tooOldResult.eligible).toBe(false)
    })

    it('should handle complex farming support scheme', () => {
      // Complex multi-criteria agricultural scheme
      const farmingScheme = {
        and: [
          { '>=': [{ var: 'age' }, 18] },
          { '>=': [{ var: 'landArea' }, 0.5] },  // At least 0.5 acre
          { '==': [{ var: 'occupation' }, 'farmer'] },
          { or: [
              { '==': [{ var: 'farmingType' }, 'organic'] },
              { '==': [{ var: 'interestedInOrganic' }, true] }
            ]
          }
        ]
      }

      // Test organic farmer
      const organicFarmer = {
        age: 35,
        landArea: 2.5,
        occupation: 'farmer',
        farmingType: 'organic',
        interestedInOrganic: false
      }

      const organicResult = evaluateEligibility(farmingScheme, organicFarmer)
      expect(organicResult.eligible).toBe(true)

      // Test conventional farmer interested in organic
      const conventionalFarmer = {
        age: 40,
        landArea: 1.0,
        occupation: 'farmer',
        farmingType: 'conventional',
        interestedInOrganic: true
      }

      const conventionalResult = evaluateEligibility(farmingScheme, conventionalFarmer)
      expect(conventionalResult.eligible).toBe(true)

      // Test ineligible (not a farmer)
      const nonFarmer = {
        age: 35,
        landArea: 2.5,
        occupation: 'teacher',
        farmingType: 'organic'
      }

      const nonFarmerResult = evaluateEligibility(farmingScheme, nonFarmer)
      expect(nonFarmerResult.eligible).toBe(false)
    })
  })

  describe('Common Rule Patterns in Government Schemes', () => {
    it('should generate age-based eligibility correctly', () => {
      const youthScheme = commonRulePatterns.ageRange(18, 35)
      const seniorScheme = commonRulePatterns.ageRange(60, 100)

      // Test youth scheme
      expect(evaluateEligibility(youthScheme, { age: 25 }).eligible).toBe(true)
      expect(evaluateEligibility(youthScheme, { age: 17 }).eligible).toBe(false)
      expect(evaluateEligibility(youthScheme, { age: 40 }).eligible).toBe(false)

      // Test senior scheme  
      expect(evaluateEligibility(seniorScheme, { age: 65 }).eligible).toBe(true)
      expect(evaluateEligibility(seniorScheme, { age: 55 }).eligible).toBe(false)
    })

    it('should generate income-based eligibility correctly', () => {
      const lowIncomeScheme = commonRulePatterns.incomeBelow(200000)
      const povertyScheme = commonRulePatterns.incomeBelow(50000)

      // Test low income scheme
      expect(evaluateEligibility(lowIncomeScheme, { annualIncome: 150000 }).eligible).toBe(true)
      expect(evaluateEligibility(lowIncomeScheme, { annualIncome: 250000 }).eligible).toBe(false)

      // Test poverty scheme
      expect(evaluateEligibility(povertyScheme, { annualIncome: 30000 }).eligible).toBe(true)
      expect(evaluateEligibility(povertyScheme, { annualIncome: 80000 }).eligible).toBe(false)
    })

    it('should generate category-based eligibility correctly', () => {
      const reservedCategoryScheme = commonRulePatterns.hasCategory(['sc', 'st', 'obc'])
      const allCategoryScheme = commonRulePatterns.hasCategory(['general', 'obc', 'sc', 'st'])

      // Test reserved category scheme
      expect(evaluateEligibility(reservedCategoryScheme, { category: 'sc' }).eligible).toBe(true)
      expect(evaluateEligibility(reservedCategoryScheme, { category: 'obc' }).eligible).toBe(true)
      expect(evaluateEligibility(reservedCategoryScheme, { category: 'general' }).eligible).toBe(false)

      // Test all category scheme
      expect(evaluateEligibility(allCategoryScheme, { category: 'general' }).eligible).toBe(true)
      expect(evaluateEligibility(allCategoryScheme, { category: 'sc' }).eligible).toBe(true)
    })

    it('should generate location-based eligibility correctly', () => {
      const localScheme = commonRulePatterns.residentOf(['damday-chuanala', 'gangolihat'])
      const districtScheme = commonRulePatterns.residentOf(['pithoragarh', 'almora', 'nainital'])

      // Test local scheme
      expect(evaluateEligibility(localScheme, { residenceArea: 'damday-chuanala' }).eligible).toBe(true)
      expect(evaluateEligibility(localScheme, { residenceArea: 'gangolihat' }).eligible).toBe(true)
      expect(evaluateEligibility(localScheme, { residenceArea: 'pithoragarh' }).eligible).toBe(false)

      // Test district scheme
      expect(evaluateEligibility(districtScheme, { residenceArea: 'pithoragarh' }).eligible).toBe(true)
      expect(evaluateEligibility(districtScheme, { residenceArea: 'damday-chuanala' }).eligible).toBe(false)
    })
  })

  describe('End-to-End Scheme Evaluation', () => {
    it('should handle a complete realistic government scheme workflow', () => {
      // Comprehensive rural development scheme
      const ruralDevScheme = {
        and: [
          // Basic eligibility
          { '>=': [{ var: 'age' }, 18] },
          { '<=': [{ var: 'age' }, 60] },
          
          // Economic criteria
          { '<': [{ var: 'annualIncome' }, 300000] },
          
          // Location criteria
          { 'in': [{ var: 'residenceArea' }, ['damday-chuanala', 'gangolihat']] },
          
          // Category or profession criteria
          { or: [
              { 'in': [{ var: 'category' }, ['sc', 'st', 'obc']] },
              { '==': [{ var: 'occupation' }, 'farmer'] },
              { '==': [{ var: 'hasBusinessPlan' }, true] }
            ]
          },
          
          // Additional requirements
          { '==': [{ var: 'hasValidDocuments' }, true] }
        ]
      }

      // Test multiple applicant profiles
      const applicants = [
        {
          profile: 'Young SC farmer',
          data: {
            age: 28,
            annualIncome: 180000,
            residenceArea: 'damday-chuanala',
            category: 'sc',
            occupation: 'farmer',
            hasBusinessPlan: false,
            hasValidDocuments: true
          },
          expected: true
        },
        {
          profile: 'General category entrepreneur',
          data: {
            age: 35,
            annualIncome: 250000,
            residenceArea: 'gangolihat',
            category: 'general',
            occupation: 'business',
            hasBusinessPlan: true,
            hasValidDocuments: true
          },
          expected: true
        },
        {
          profile: 'High income applicant',
          data: {
            age: 30,
            annualIncome: 400000,
            residenceArea: 'damday-chuanala',
            category: 'general',
            occupation: 'service',
            hasBusinessPlan: false,
            hasValidDocuments: true
          },
          expected: false // Income too high
        },
        {
          profile: 'Out of area applicant',
          data: {
            age: 25,
            annualIncome: 150000,
            residenceArea: 'dehradun',
            category: 'sc',
            occupation: 'farmer',
            hasBusinessPlan: false,
            hasValidDocuments: true
          },
          expected: false // Wrong location
        },
        {
          profile: 'Documents missing',
          data: {
            age: 30,
            annualIncome: 200000,
            residenceArea: 'damday-chuanala',
            category: 'obc',
            occupation: 'farmer',
            hasBusinessPlan: false,
            hasValidDocuments: false
          },
          expected: false // No documents
        }
      ]

      applicants.forEach(applicant => {
        const result = evaluateEligibility(ruralDevScheme, applicant.data)
        expect(result.eligible).toBe(applicant.expected)
        
        if (applicant.expected) {
          expect(result.details.explanation).toContain('meet all the eligibility criteria')
          expect(result.details.nextSteps).toContain('Review the required documents list')
        } else {
          expect(result.details.explanation).toContain('do not meet some')
          expect(result.details.nextSteps?.[0]).toContain('Review your answers')
        }
      })
    })
  })
})