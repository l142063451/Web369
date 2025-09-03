import {
  rwh,
  solarFromArea,
  electricityEmissions,
  lpgEmissions,
  transportEmissions,
  wasteEmissions,
  waterEmissions,
  solarPaybackPeriod,
  solarCO2Reduction,
  householdWaterUsage,
  monthlySolarDistribution,
  defaultEmissionFactors,
  defaultSolarParams,
  defaultWaterParams
} from '@/lib/smart/formulas'

describe('Green Formulas', () => {
  describe('Rainwater Harvesting (RWH)', () => {
    test('should calculate RWH potential correctly', () => {
      // Test case: 100m² roof, 1000mm rainfall, 0.85 runoff coefficient
      const result = rwh(1000, 100, 0.85)
      expect(result).toBe(85000) // 85,000 liters
    })

    test('should handle zero values', () => {
      expect(rwh(0, 100, 0.85)).toBe(0)
      expect(rwh(1000, 0, 0.85)).toBe(0)
    })

    test('should throw error for invalid parameters', () => {
      expect(() => rwh(-100, 100, 0.85)).toThrow('Invalid RWH parameters')
      expect(() => rwh(1000, -100, 0.85)).toThrow('Invalid RWH parameters')
      expect(() => rwh(1000, 100, 1.5)).toThrow('Invalid RWH parameters')
      expect(() => rwh(1000, 100, -0.1)).toThrow('Invalid RWH parameters')
    })

    test('should match real-world example', () => {
      // Real example: 200m² roof in Uttarakhand (1200mm rainfall)
      const result = rwh(1200, 200, 0.8)
      expect(result).toBe(192000) // 192,000 liters annually
    })
  })

  describe('Solar Energy Calculations', () => {
    test('should calculate solar system parameters correctly', () => {
      const result = solarFromArea(100, 70, 175, 1650, 0.8)
      
      expect(result.usableArea).toBe(70) // 70m² usable
      expect(result.kWp).toBe(12.25) // 12.25 kWp system
      expect(result.annualYield).toBe(16170) // 16,170 kWh/year
    })

    test('should handle edge cases', () => {
      const result = solarFromArea(50, 60, 150, 1500, 0.75)
      
      expect(result.usableArea).toBe(30)
      expect(result.kWp).toBe(4.5)
      expect(result.annualYield).toBe(5062.5)
    })

    test('should throw error for invalid parameters', () => {
      expect(() => solarFromArea(-100, 70, 175, 1650, 0.8)).toThrow('Invalid solar parameters')
      expect(() => solarFromArea(100, 120, 175, 1650, 0.8)).toThrow('Invalid solar parameters')
      expect(() => solarFromArea(100, 70, -175, 1650, 0.8)).toThrow('Invalid solar parameters')
      expect(() => solarFromArea(100, 70, 175, -1650, 0.8)).toThrow('Invalid solar parameters')
      expect(() => solarFromArea(100, 70, 175, 1650, 1.5)).toThrow('Invalid solar parameters')
    })
  })

  describe('Carbon Emissions Calculations', () => {
    test('should calculate electricity emissions', () => {
      const result = electricityEmissions(100, 0.82)
      expect(result).toBe(82) // 82 kg CO2e for 100 kWh
    })

    test('should calculate LPG emissions', () => {
      const result = lpgEmissions(14.2, 2.98)
      expect(result).toBeCloseTo(42.316) // Standard LPG cylinder
    })

    test('should calculate transport emissions', () => {
      // Car: 100km at 0.171 kg CO2e/km
      expect(transportEmissions(100, 0.171)).toBeCloseTo(17.1)
      
      // Bike: 100km at 0.089 kg CO2e/km
      expect(transportEmissions(100, 0.089)).toBeCloseTo(8.9)
    })

    test('should calculate waste emissions', () => {
      // Plastic waste: 1kg at 6.0 kg CO2e/kg
      expect(wasteEmissions(1, 6.0)).toBe(6.0)
      
      // Organic waste: 5kg at 0.57 kg CO2e/kg
      expect(wasteEmissions(5, 0.57)).toBeCloseTo(2.85)
    })

    test('should calculate water emissions', () => {
      // 1000L at 0.298 kg CO2e/1000L
      expect(waterEmissions(1000, 0.298)).toBeCloseTo(0.298)
      
      // Test default emission factor
      expect(waterEmissions(2000)).toBeCloseTo(0.596)
    })

    test('should throw errors for negative values', () => {
      expect(() => electricityEmissions(-100, 0.82)).toThrow('Invalid electricity parameters')
      expect(() => lpgEmissions(-5, 2.98)).toThrow('Invalid LPG parameters')
      expect(() => transportEmissions(-100, 0.171)).toThrow('Invalid transport parameters')
      expect(() => wasteEmissions(-1, 6.0)).toThrow('Invalid waste parameters')
      expect(() => waterEmissions(-1000, 0.298)).toThrow('Invalid water parameters')
    })
  })

  describe('Solar Economics', () => {
    test('should calculate payback period correctly', () => {
      // System cost: ₹400,000, Annual savings: ₹50,000, Maintenance: 2%
      const result = solarPaybackPeriod(400000, 50000, 0.02)
      expect(result).toBeCloseTo(9.52, 1) // ~9.5 years
    })

    test('should handle cases where system never pays back', () => {
      // High maintenance, low savings
      const result = solarPaybackPeriod(400000, 5000, 0.05)
      expect(result).toBe(Infinity)
    })

    test('should throw errors for invalid parameters', () => {
      expect(() => solarPaybackPeriod(-400000, 50000, 0.02)).toThrow('Invalid payback calculation parameters')
      expect(() => solarPaybackPeriod(400000, -50000, 0.02)).toThrow('Invalid payback calculation parameters')
    })
  })

  describe('CO2 Reduction Calculations', () => {
    test('should calculate CO2 reduction from solar', () => {
      const result = solarCO2Reduction(10000, 0.82)
      expect(result).toBe(8200) // 8,200 kg CO2e annually
    })

    test('should use default emission factor', () => {
      const result = solarCO2Reduction(5000)
      expect(result).toBe(4100) // Using default 0.82 factor
    })

    test('should throw error for invalid parameters', () => {
      expect(() => solarCO2Reduction(-5000, 0.82)).toThrow('Invalid CO2 reduction parameters')
      expect(() => solarCO2Reduction(5000, -0.82)).toThrow('Invalid CO2 reduction parameters')
    })
  })

  describe('Water Usage Calculations', () => {
    test('should calculate household water usage', () => {
      const usage = householdWaterUsage(4, {
        drinking: 3,
        cooking: 10,
        bathing: 40,
        washing: 30,
        cleaning: 15
      })
      
      // 4 * 3 + 10 + 4 * 40 + 30 + 15 = 12 + 10 + 160 + 30 + 15 = 227L/day
      expect(usage).toBe(227)
    })

    test('should handle single person household', () => {
      const usage = householdWaterUsage(1, {
        drinking: 3,
        cooking: 5,
        bathing: 35,
        washing: 10,
        cleaning: 5
      })
      
      expect(usage).toBe(58) // 3 + 5 + 35 + 10 + 5
    })

    test('should throw error for invalid members', () => {
      expect(() => householdWaterUsage(-1, {
        drinking: 3, cooking: 10, bathing: 40, washing: 30, cleaning: 15
      })).toThrow('Invalid number of members')
    })
  })

  describe('Monthly Solar Distribution', () => {
    test('should distribute solar generation across months', () => {
      const distribution = monthlySolarDistribution(12000)
      
      // Should have 12 months
      expect(distribution).toHaveLength(12)
      
      // Total should equal input (within rounding)
      const total = distribution.reduce((sum, month) => sum + month, 0)
      expect(total).toBeCloseTo(12000, 1)
      
      // Peak months (March-May) should have higher generation
      expect(distribution[2]).toBeGreaterThan(distribution[0]) // March > January
      expect(distribution[4]).toBeGreaterThan(distribution[6]) // May > July (monsoon)
    })

    test('should handle zero generation', () => {
      const distribution = monthlySolarDistribution(0)
      expect(distribution.every(month => month === 0)).toBe(true)
    })

    test('should throw error for negative generation', () => {
      expect(() => monthlySolarDistribution(-1000)).toThrow('Invalid annual generation')
    })
  })

  describe('Default Parameters', () => {
    test('should have valid default emission factors', () => {
      expect(defaultEmissionFactors.electricity).toBeGreaterThan(0)
      expect(defaultEmissionFactors.lpg).toBeGreaterThan(0)
      expect(defaultEmissionFactors['transport.car']).toBeGreaterThan(0)
      expect(defaultEmissionFactors.water).toBeGreaterThan(0)
    })

    test('should have valid default solar parameters', () => {
      expect(defaultSolarParams.wpPerM2).toBeGreaterThan(0)
      expect(defaultSolarParams.specificYield).toBeGreaterThan(0)
      expect(defaultSolarParams.performanceRatio).toBeGreaterThan(0)
      expect(defaultSolarParams.performanceRatio).toBeLessThanOrEqual(1)
      expect(defaultSolarParams.costPerWatt).toBeGreaterThan(0)
    })

    test('should have valid default water parameters', () => {
      expect(defaultWaterParams.avgRainfall).toBeGreaterThan(0)
      expect(defaultWaterParams.runoffCoeff).toBeGreaterThan(0)
      expect(defaultWaterParams.runoffCoeff).toBeLessThanOrEqual(1)
      expect(defaultWaterParams.waterRate).toBeGreaterThan(0)
    })
  })

  describe('Real-world Validation', () => {
    test('should match typical Indian household carbon footprint', () => {
      // Typical Indian household: ~3 tonnes CO2e/year
      const monthlyElectricity = electricityEmissions(200, 0.82) // 164 kg
      const monthlyLPG = lpgEmissions(14.2, 2.98) // 42.3 kg
      const monthlyTransport = transportEmissions(500, 0.171) // 85.5 kg
      
      const monthlyTotal = monthlyElectricity + monthlyLPG + monthlyTransport
      const annualTotal = monthlyTotal * 12 // ~3.5 tonnes
      
      expect(annualTotal).toBeGreaterThan(3000) // > 3 tonnes
      expect(annualTotal).toBeLessThan(5000) // < 5 tonnes
    })

    test('should match solar system economics in India', () => {
      // 5kW system: ~₹250,000, generates ~7500 kWh/year
      const generation = solarFromArea(100, 65, 175, 1500, 0.8)
      expect(generation.kWp).toBeCloseTo(11.375, 1)
      
      // Payback should be 5-8 years for good systems
      const payback = solarPaybackPeriod(250000, 45000, 0.02)
      expect(payback).toBeGreaterThan(5)
      expect(payback).toBeLessThan(8)
    })

    test('should validate RWH potential for Uttarakhand', () => {
      // 150m² house in Uttarakhand should collect ~144,000L annually
      const potential = rwh(1200, 150, 0.8)
      expect(potential).toBeCloseTo(144000) // 144,000L
      
      // Should meet a significant portion of household water needs
      const householdAnnual = householdWaterUsage(4, {
        drinking: 3, cooking: 10, bathing: 35, washing: 25, cleaning: 10
      }) * 365
      
      const percentage = (potential / householdAnnual) * 100
      expect(percentage).toBeGreaterThan(50) // At least 50% coverage
      expect(percentage).toBeLessThan(300) // Less than 300% (reasonable upper bound)
    })
  })
})