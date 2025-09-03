// Carbon Calculator Service
import { v4 as uuidv4 } from 'uuid'
import type { 
  CarbonCalculationInput, 
  CarbonCalculationResult, 
  CarbonRecommendation,
  EmissionFactor 
} from './types'
import { 
  electricityEmissions,
  lpgEmissions, 
  transportEmissions,
  wasteEmissions,
  waterEmissions,
  defaultEmissionFactors
} from './formulas'
import { auditLogger } from '@/lib/audit/logger'

/**
 * Carbon Calculator Service
 * Provides comprehensive carbon footprint calculations with admin-configurable factors
 */
export class CarbonCalculatorService {
  private emissionFactors: Record<string, number>
  
  constructor(customFactors?: Record<string, EmissionFactor>) {
    // Initialize with default factors, allow admin override
    this.emissionFactors = { ...defaultEmissionFactors }
    
    if (customFactors) {
      // Override with admin-configured factors
      Object.values(customFactors).forEach(factor => {
        const key = `${factor.category}.${factor.subcategory}`
        this.emissionFactors[key] = factor.factor
      })
    }
  }
  
  /**
   * Calculate comprehensive carbon footprint
   */
  async calculateCarbonFootprint(
    input: CarbonCalculationInput,
    userId?: string,
    sessionId?: string
  ): Promise<CarbonCalculationResult> {
    try {
      // Validate input
      this.validateInput(input)
      
      // Calculate emissions by category
      const electricityEmission = electricityEmissions(
        input.electricity, 
        this.emissionFactors.electricity
      )
      
      const lpgEmission = lpgEmissions(
        input.lpg,
        this.emissionFactors.lpg
      )
      
      const transportEmission = 
        transportEmissions(input.transport.car, this.emissionFactors['transport.car'] || defaultEmissionFactors.transport.car) +
        transportEmissions(input.transport.bike, this.emissionFactors['transport.bike'] || defaultEmissionFactors.transport.bike) +
        transportEmissions(input.transport.bus, this.emissionFactors['transport.bus'] || defaultEmissionFactors.transport.bus)
      
      const wasteEmission =
        wasteEmissions(input.waste.organic, this.emissionFactors['waste.organic'] || defaultEmissionFactors.waste.organic) +
        wasteEmissions(input.waste.plastic, this.emissionFactors['waste.plastic'] || defaultEmissionFactors.waste.plastic) +
        wasteEmissions(input.waste.paper, this.emissionFactors['waste.paper'] || defaultEmissionFactors.waste.paper)
      
      const waterEmission = waterEmissions(
        input.water,
        this.emissionFactors.water
      )
      
      const totalEmissions = electricityEmission + lpgEmission + transportEmission + wasteEmission + waterEmission
      
      // Generate recommendations based on emissions profile
      const recommendations = this.generateRecommendations(input, {
        electricity: electricityEmission,
        lpg: lpgEmission,
        transport: transportEmission,
        waste: wasteEmission,
        water: waterEmission,
        total: totalEmissions
      })
      
      const result: CarbonCalculationResult = {
        id: uuidv4(),
        userId,
        sessionId: sessionId || uuidv4(),
        input,
        emissions: {
          electricity: electricityEmission,
          lpg: lpgEmission,
          transport: transportEmission,
          waste: wasteEmission,
          water: waterEmission,
          total: totalEmissions
        },
        recommendations,
        calculatedAt: new Date()
      }
      
      // Audit log the calculation
      await auditLogger.log({
        entity: 'CarbonCalculation',
        entityId: result.id,
        action: 'CREATE',
        userId: userId || 'anonymous',
        metadata: {
          totalEmissions,
          categories: Object.keys(input),
          sessionId
        }
      })
      
      return result
      
    } catch (error) {
      throw new Error(`Carbon calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Generate personalized recommendations based on emission profile
   */
  private generateRecommendations(
    input: CarbonCalculationInput,
    emissions: CarbonCalculationResult['emissions']
  ): CarbonRecommendation[] {
    const recommendations: CarbonRecommendation[] = []
    const { electricity, lpg, transport, waste, water, total } = emissions
    
    // Electricity recommendations (highest impact typically)
    if (electricity > total * 0.4) { // More than 40% of footprint
      recommendations.push({
        category: 'electricity',
        impact: 'high',
        description: 'Switch to LED bulbs and use energy-efficient appliances. Consider solar panels for long-term savings.',
        potentialSaving: electricity * 0.3 * 12, // 30% annual reduction
        difficulty: 'easy'
      })
    }
    
    // Transport recommendations
    if (transport > total * 0.25) { // More than 25% of footprint
      if (input.transport.car > input.transport.bike + input.transport.bus) {
        recommendations.push({
          category: 'transport',
          impact: 'high', 
          description: 'Use public transport or bike for short distances. Consider carpooling or electric vehicles.',
          potentialSaving: transport * 0.4 * 12, // 40% annual reduction
          difficulty: 'moderate'
        })
      }
    }
    
    // Waste recommendations
    if (waste > total * 0.15) { // More than 15% of footprint
      recommendations.push({
        category: 'waste',
        impact: 'medium',
        description: 'Implement composting for organic waste and reduce plastic usage. Recycle paper and metals.',
        potentialSaving: waste * 0.5 * 12, // 50% annual reduction
        difficulty: 'easy'
      })
    }
    
    // LPG recommendations
    if (lpg > total * 0.2) { // More than 20% of footprint
      recommendations.push({
        category: 'cooking',
        impact: 'medium',
        description: 'Use pressure cookers and efficient cooking methods. Consider induction cooking with solar power.',
        potentialSaving: lpg * 0.25 * 12, // 25% annual reduction
        difficulty: 'moderate'
      })
    }
    
    // Water recommendations (usually smaller impact but important)
    if (water > 0) {
      recommendations.push({
        category: 'water',
        impact: 'low',
        description: 'Install rainwater harvesting and use water-saving fixtures. Reuse greywater for gardens.',
        potentialSaving: water * 0.3 * 12, // 30% annual reduction
        difficulty: 'challenging'
      })
    }
    
    // Always add a general high-impact recommendation
    recommendations.push({
      category: 'renewable',
      impact: 'high',
      description: 'Install rooftop solar panels to offset your electricity consumption with clean energy.',
      potentialSaving: electricity * 12, // Offset all electricity emissions
      difficulty: 'challenging'
    })
    
    // Sort by potential impact
    return recommendations
      .sort((a, b) => b.potentialSaving - a.potentialSaving)
      .slice(0, 5) // Top 5 recommendations
  }
  
  /**
   * Validate carbon calculation input
   */
  private validateInput(input: CarbonCalculationInput): void {
    if (!input) {
      throw new Error('Input is required')
    }
    
    if (input.electricity < 0) {
      throw new Error('Electricity consumption cannot be negative')
    }
    
    if (input.lpg < 0) {
      throw new Error('LPG consumption cannot be negative')
    }
    
    if (!input.transport || 
        input.transport.car < 0 || 
        input.transport.bike < 0 || 
        input.transport.bus < 0) {
      throw new Error('Transport data is invalid')
    }
    
    if (!input.waste ||
        input.waste.organic < 0 ||
        input.waste.plastic < 0 ||
        input.waste.paper < 0) {
      throw new Error('Waste data is invalid')
    }
    
    if (input.water < 0) {
      throw new Error('Water consumption cannot be negative')
    }
  }
  
  /**
   * Get emission factors (for admin configuration)
   */
  getEmissionFactors(): Record<string, number> {
    return { ...this.emissionFactors }
  }
  
  /**
   * Update emission factors (admin only)
   */
  updateEmissionFactors(factors: Record<string, number>): void {
    this.emissionFactors = { ...this.emissionFactors, ...factors }
  }
  
  /**
   * Calculate carbon footprint reduction potential
   */
  calculateReductionPotential(current: CarbonCalculationResult): number {
    const recommendations = current.recommendations
    const totalPotential = recommendations.reduce((sum, rec) => sum + rec.potentialSaving, 0)
    
    return Math.min(totalPotential, current.emissions.total * 12) // Max 100% reduction
  }
  
  /**
   * Compare carbon footprints (for progress tracking)
   */
  compareFootprints(current: CarbonCalculationResult, previous: CarbonCalculationResult): {
    change: number
    percentage: number
    improved: boolean
  } {
    const change = current.emissions.total - previous.emissions.total
    const percentage = (change / previous.emissions.total) * 100
    const improved = change < 0
    
    return { change, percentage, improved }
  }
}

// Default instance with default factors
export const carbonCalculator = new CarbonCalculatorService()