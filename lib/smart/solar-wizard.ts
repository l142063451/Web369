// Solar Wizard Service  
import { v4 as uuidv4 } from 'uuid'
import type { SolarCalculationInput, SolarCalculationResult } from './types'
import { 
  solarFromArea, 
  solarPaybackPeriod,
  solarCO2Reduction,
  monthlySolarDistribution,
  defaultSolarParams 
} from './formulas'
import { auditLogger } from '@/lib/audit/logger'

/**
 * Solar Wizard Service
 * Provides comprehensive solar energy system calculations and ROI analysis
 */
export class SolarWizardService {
  private solarParams: typeof defaultSolarParams
  
  constructor(customParams?: Partial<typeof defaultSolarParams>) {
    // Initialize with default parameters, allow admin override
    this.solarParams = { ...defaultSolarParams, ...customParams }
  }
  
  /**
   * Calculate complete solar system design and economics
   */
  async calculateSolarSystem(
    input: SolarCalculationInput,
    userId?: string,
    sessionId?: string
  ): Promise<SolarCalculationResult> {
    try {
      // Validate input
      this.validateInput(input)
      
      // Apply location and orientation adjustments
      const adjustedParams = this.getLocationAdjustedParams(input)
      
      // Calculate basic system parameters  
      const { usableArea, kWp, annualYield } = solarFromArea(
        input.roofArea,
        input.usablePct,
        adjustedParams.wpPerM2,
        adjustedParams.specificYield,
        adjustedParams.performanceRatio
      )
      
      // Apply shading and orientation factors
      const shadingFactor = input.shadingFactor || 1.0
      const orientationFactor = this.getOrientationFactor(input.orientation)
      const tiltFactor = this.getTiltFactor(input.tilt)
      
      const adjustedAnnualGeneration = annualYield * shadingFactor * orientationFactor * tiltFactor
      
      // Calculate monthly generation distribution
      const monthlyGeneration = monthlySolarDistribution(adjustedAnnualGeneration)
      
      // Calculate economics
      const systemCost = kWp * 1000 * adjustedParams.costPerWatt // Convert kWp to Wp
      const annualSavings = adjustedAnnualGeneration * adjustedParams.electricityRate
      const paybackPeriod = solarPaybackPeriod(systemCost, annualSavings, adjustedParams.maintenanceRate)
      
      // Calculate 20-year savings (with degradation)
      const totalSavings20Years = this.calculate20YearSavings(
        adjustedAnnualGeneration,
        systemCost,
        adjustedParams
      )
      
      // Calculate CO2 reduction
      const co2Reduction = solarCO2Reduction(adjustedAnnualGeneration)
      
      // Calculate ROI
      const roi = totalSavings20Years > systemCost ? 
        ((totalSavings20Years - systemCost) / systemCost) * 100 : 0
      
      const result: SolarCalculationResult = {
        id: uuidv4(),
        userId,
        sessionId: sessionId || uuidv4(),
        input,
        results: {
          usableArea,
          systemCapacity: kWp,
          annualGeneration: adjustedAnnualGeneration,
          monthlyGeneration,
          co2Reduction,
          paybackPeriod,
          roi,
          totalSavings20Years
        },
        calculatedAt: new Date()
      }
      
      // Audit log the calculation
      await auditLogger.log({
        entity: 'SolarCalculation', 
        entityId: result.id,
        action: 'CREATE',
        userId: userId || 'anonymous',
        metadata: {
          systemCapacity: kWp,
          annualGeneration: adjustedAnnualGeneration,
          paybackPeriod,
          sessionId
        }
      })
      
      return result
      
    } catch (error) {
      throw new Error(`Solar calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Get location-specific solar parameters
   */
  private getLocationAdjustedParams(input: SolarCalculationInput): typeof defaultSolarParams {
    let adjustedParams = { ...this.solarParams }
    
    // Location-specific adjustments for India
    switch (input.location.toLowerCase()) {
      case 'uttarakhand':
      case 'pithoragarh':
        // Hill station adjustments
        adjustedParams.specificYield = 1750 // Higher due to cooler temperatures
        break
      case 'rajasthan':
      case 'gujarat':
        // Desert regions - high irradiance but heat reduces efficiency  
        adjustedParams.specificYield = 1800
        adjustedParams.performanceRatio = 0.78
        break
      case 'kerala':
      case 'assam':
        // High rainfall regions
        adjustedParams.specificYield = 1400
        break
      default:
        // Use defaults for other locations
        break
    }
    
    return adjustedParams
  }
  
  /**
   * Get orientation factor for solar panels
   */
  private getOrientationFactor(orientation?: string): number {
    switch (orientation?.toLowerCase()) {
      case 'south':
        return 1.0 // Optimal for Northern Hemisphere
      case 'southeast':
      case 'southwest': 
        return 0.95
      case 'east':
      case 'west':
        return 0.85
      case 'north':
        return 0.60 // Poor orientation
      default:
        return 0.95 // Assume good orientation if not specified
    }
  }
  
  /**
   * Get tilt factor for solar panels
   */
  private getTiltFactor(tilt?: number): number {
    if (!tilt) return 1.0 // Optimal tilt assumed
    
    // Optimal tilt for India is approximately equal to latitude (20-30 degrees)
    const optimalTilt = 25 // Degrees for North India
    const difference = Math.abs(tilt - optimalTilt)
    
    if (difference <= 5) return 1.0
    if (difference <= 10) return 0.98
    if (difference <= 20) return 0.95
    if (difference <= 30) return 0.90
    return 0.85 // Very poor tilt
  }
  
  /**
   * Calculate 20-year savings with degradation
   */
  private calculate20YearSavings(
    initialAnnualGeneration: number,
    systemCost: number,
    params: typeof defaultSolarParams
  ): number {
    let totalSavings = 0
    let currentGeneration = initialAnnualGeneration
    
    for (let year = 1; year <= 20; year++) {
      // Apply degradation
      if (year > 1) {
        currentGeneration *= (1 - params.degradationRate)
      }
      
      // Calculate savings for this year
      const annualSavings = currentGeneration * params.electricityRate
      const maintenanceCost = systemCost * params.maintenanceRate
      const netSavings = annualSavings - maintenanceCost
      
      totalSavings += netSavings
    }
    
    return Math.max(0, totalSavings)
  }
  
  /**
   * Validate solar calculation input
   */
  private validateInput(input: SolarCalculationInput): void {
    if (!input) {
      throw new Error('Input is required')
    }
    
    if (input.roofArea <= 0) {
      throw new Error('Roof area must be positive')
    }
    
    if (input.roofArea > 10000) {
      throw new Error('Roof area too large (max 10,000 m²)')
    }
    
    if (input.usablePct <= 0 || input.usablePct > 100) {
      throw new Error('Usable percentage must be between 0 and 100')
    }
    
    if (!input.location || input.location.trim().length === 0) {
      throw new Error('Location is required')
    }
    
    if (input.tilt && (input.tilt < 0 || input.tilt > 90)) {
      throw new Error('Tilt must be between 0 and 90 degrees')
    }
    
    if (input.shadingFactor && (input.shadingFactor < 0 || input.shadingFactor > 1)) {
      throw new Error('Shading factor must be between 0 and 1')
    }
  }
  
  /**
   * Generate solar system recommendations
   */
  generateRecommendations(result: SolarCalculationResult): string[] {
    const recommendations: string[] = []
    const { systemCapacity, paybackPeriod, usableArea, annualGeneration } = result.results
    
    // System size recommendations
    if (systemCapacity < 3) {
      recommendations.push('Consider a minimum 3kW system for better economics and grid connection benefits.')
    }
    
    if (systemCapacity > 10) {
      recommendations.push('Large system detected. Consider commercial solar policies and net metering regulations.')
    }
    
    // Payback recommendations
    if (paybackPeriod > 8) {
      recommendations.push('Payback period is high. Consider energy-efficient appliances first or negotiate better solar prices.')
    } else if (paybackPeriod < 5) {
      recommendations.push('Excellent payback period! This is a financially attractive investment.')
    }
    
    // Usage recommendations
    if (usableArea / result.input.roofArea < 0.7) {
      recommendations.push('You\'re using less than 70% of roof area. Consider maximizing solar coverage for better returns.')
    }
    
    // Generation recommendations
    const monthlyGeneration = annualGeneration / 12
    if (monthlyGeneration > 500) {
      recommendations.push('High generation potential! Consider battery storage for backup power and higher savings.')
    }
    
    // General recommendations
    recommendations.push('Install high-efficiency monocrystalline panels for better long-term performance.')
    recommendations.push('Ensure proper maintenance and cleaning for optimal output.')
    recommendations.push('Consider net metering connection to sell excess power back to the grid.')
    
    return recommendations
  }
  
  /**
   * Compare different solar scenarios
   */
  compareScenarios(scenarios: SolarCalculationResult[]): {
    bestROI: SolarCalculationResult
    bestCapacity: SolarCalculationResult
    bestPayback: SolarCalculationResult
  } {
    const bestROI = scenarios.reduce((best, current) => 
      current.results.roi > best.results.roi ? current : best
    )
    
    const bestCapacity = scenarios.reduce((best, current) =>
      current.results.systemCapacity > best.results.systemCapacity ? current : best
    )
    
    const bestPayback = scenarios.reduce((best, current) =>
      current.results.paybackPeriod < best.results.paybackPeriod ? current : best
    )
    
    return { bestROI, bestCapacity, bestPayback }
  }
  
  /**
   * Get solar parameters (for admin configuration)
   */
  getSolarParams(): typeof defaultSolarParams {
    return { ...this.solarParams }
  }
  
  /**
   * Update solar parameters (admin only)
   */
  updateSolarParams(params: Partial<typeof defaultSolarParams>): void {
    this.solarParams = { ...this.solarParams, ...params }
  }
}

// Default instance
export const solarWizard = new SolarWizardService()