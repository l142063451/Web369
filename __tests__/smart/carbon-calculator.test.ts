/**
 * Carbon Calculator Service Tests
 * Part of PR17: Testing & CI Gates - Smart Features
 */

import { CarbonCalculatorService } from '@/lib/smart/carbon-calculator'
import type { CarbonCalculationInput, EmissionFactor } from '@/lib/smart/types'

// Mock the audit logger to avoid database dependencies
jest.mock('@/lib/audit/logger', () => ({
  createAuditLog: jest.fn(),
}))

describe('CarbonCalculatorService', () => {
  let service: CarbonCalculatorService

  beforeEach(() => {
    service = new CarbonCalculatorService()
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with default emission factors', () => {
      const service = new CarbonCalculatorService()
      expect(service).toBeInstanceOf(CarbonCalculatorService)
    })

    it('should allow custom emission factors override', () => {
      const customFactors: Record<string, EmissionFactor> = {
        'custom-electricity': {
          id: 'custom-electricity',
          category: 'electricity',
          subcategory: 'grid',
          factor: 0.8, // kgCO2/kWh
          unit: 'kgCO2/kWh',
          region: 'IN-UP',
          source: 'Custom Test',
          lastUpdated: new Date(),
        },
      }
      
      const serviceWithCustom = new CarbonCalculatorService(customFactors)
      expect(serviceWithCustom).toBeInstanceOf(CarbonCalculatorService)
    })
  })

  describe('calculateCarbonFootprint', () => {
    it('should calculate basic carbon footprint', async () => {
      const input: CarbonCalculationInput = {
        electricity: 300, // kWh
        lpg: 28,         // kg (approx 2 cylinders)
        transport: {
          car: 500,      // km
          bike: 200,     // km
          bus: 100,      // km
        },
        waste: {
          organic: 30,   // kg
          plastic: 10,   // kg
          paper: 10,     // kg
        },
        water: 6000,     // liters (200L/day * 30 days)
      }

      const result = await service.calculateCarbonFootprint(input, 'test-user', 'test-session')
      
      expect(result).toMatchObject({
        id: expect.any(String),
        userId: 'test-user',
        sessionId: 'test-session',
        input: input,
        emissions: expect.objectContaining({
          electricity: expect.any(Number),
          lpg: expect.any(Number),
          transport: expect.any(Number),
          waste: expect.any(Number),
          water: expect.any(Number),
          total: expect.any(Number),
        }),
        recommendations: expect.any(Array),
        calculatedAt: expect.any(Date),
      })
      
      expect(result.emissions.total).toBeGreaterThan(0)
      expect(result.recommendations.length).toBeGreaterThan(0)
    })

    it('should generate appropriate recommendations based on emissions', async () => {
      const highElectricityInput: CarbonCalculationInput = {
        electricity: 800, // High usage
        lpg: 14,         // Normal usage
        transport: {
          car: 100,      // Low usage
          bike: 50,      // Low usage
          bus: 20,       // Low usage
        },
        waste: {
          organic: 15,   // Normal
          plastic: 5,    // Normal
          paper: 5,      // Normal
        },
        water: 3000,     // Normal usage
      }

      const result = await service.calculateCarbonFootprint(highElectricityInput)
      
      // Should recommend electricity reduction
      const electricityRecommendation = result.recommendations.find(
        r => r.category === 'electricity'
      )
      expect(electricityRecommendation).toBeDefined()
      expect(electricityRecommendation?.impact).toBe('high')
    })

    it('should handle minimal input data', async () => {
      const minimalInput: CarbonCalculationInput = {
        electricity: 50,
        lpg: 0,
        transport: {
          car: 0,
          bike: 0,
          bus: 0,
        },
        waste: {
          organic: 5,
          plastic: 2,
          paper: 3,
        },
        water: 1500,
      }

      const result = await service.calculateCarbonFootprint(minimalInput)
      
      expect(result.emissions.total).toBeGreaterThan(0)
      expect(result.emissions.electricity).toBeGreaterThan(0)
      expect(result.emissions.transport).toBe(0)
    })
  })

  describe('validateInput', () => {
    it('should throw error for negative electricity usage', () => {
      const invalidInput: CarbonCalculationInput = {
        electricity: -100, // Invalid
        lpg: 10,
        transport: { car: 0, bike: 0, bus: 0 },
        waste: { organic: 10, plastic: 5, paper: 5 },
        water: 1000,
      }

      expect(() => (service as any).validateInput(invalidInput))
        .toThrow('Electricity consumption cannot be negative')
    })

    it('should throw error for negative LPG usage', () => {
      const invalidInput: CarbonCalculationInput = {
        electricity: 100,
        lpg: -10, // Invalid
        transport: { car: 0, bike: 0, bus: 0 },
        waste: { organic: 10, plastic: 5, paper: 5 },
        water: 1000,
      }

      expect(() => (service as any).validateInput(invalidInput))
        .toThrow('LPG consumption cannot be negative')
    })

    it('should throw error for invalid transport data', () => {
      const invalidInput: CarbonCalculationInput = {
        electricity: 100,
        lpg: 10,
        transport: { car: -50, bike: 0, bus: 0 }, // Invalid
        waste: { organic: 10, plastic: 5, paper: 5 },
        water: 1000,
      }

      expect(() => (service as any).validateInput(invalidInput))
        .toThrow('Transport data is invalid')
    })

    it('should throw error for negative water usage', () => {
      const invalidInput: CarbonCalculationInput = {
        electricity: 100,
        lpg: 10,
        transport: { car: 50, bike: 0, bus: 0 },
        waste: { organic: 10, plastic: 5, paper: 5 },
        water: -1000, // Invalid
      }

      expect(() => (service as any).validateInput(invalidInput))
        .toThrow('Water consumption cannot be negative')
    })
  })

  describe('getEmissionFactors', () => {
    it('should return current emission factors', () => {
      const factors = service.getEmissionFactors()
      
      expect(factors).toBeDefined()
      expect(typeof factors).toBe('object')
      expect(factors['electricity']).toBeGreaterThan(0)
      expect(factors['transport.car']).toBeGreaterThan(0)
    })
  })

  describe('updateEmissionFactors', () => {
    it('should update emission factors', () => {
      const originalFactors = service.getEmissionFactors()
      const originalElectricityFactor = originalFactors['electricity']
      
      service.updateEmissionFactors({ 'electricity': 0.9 })
      
      const updatedFactors = service.getEmissionFactors()
      expect(updatedFactors['electricity']).toBe(0.9)
      expect(updatedFactors['electricity']).not.toBe(originalElectricityFactor)
    })
  })

  describe('calculateReductionPotential', () => {
    it('should calculate potential carbon reduction', async () => {
      const input: CarbonCalculationInput = {
        electricity: 400,
        lpg: 20,
        transport: { car: 300, bike: 100, bus: 50 },
        waste: { organic: 20, plastic: 8, paper: 7 },
        water: 5000,
      }

      const result = await service.calculateCarbonFootprint(input, 'test-user')
      const potential = service.calculateReductionPotential(result)
      
      expect(potential).toBeGreaterThan(0)
      expect(potential).toBeLessThanOrEqual(result.emissions.total * 12) // Max 100% reduction
    })
  })

  describe('compareFootprints', () => {
    it('should compare two carbon footprints', async () => {
      const baseInput: CarbonCalculationInput = {
        electricity: 300,
        lpg: 15,
        transport: { car: 200, bike: 50, bus: 30 },
        waste: { organic: 15, plastic: 6, paper: 4 },
        water: 4000,
      }

      const improvedInput: CarbonCalculationInput = {
        electricity: 250, // Reduced
        lpg: 12,         // Reduced
        transport: { car: 150, bike: 80, bus: 40 }, // Mixed
        waste: { organic: 12, plastic: 4, paper: 3 }, // Reduced
        water: 3500,     // Reduced
      }

      const baseResult = await service.calculateCarbonFootprint(baseInput)
      const improvedResult = await service.calculateCarbonFootprint(improvedInput)
      
      const comparison = service.compareFootprints(improvedResult, baseResult)
      
      expect(comparison).toMatchObject({
        change: expect.any(Number),
        percentage: expect.any(Number),
        improved: expect.any(Boolean),
      })
      
      // Should show improvement (negative change)
      expect(comparison.improved).toBe(true)
      expect(comparison.change).toBeLessThan(0)
    })
  })
})