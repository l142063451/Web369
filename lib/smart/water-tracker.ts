// Water Tracker and RWH Service
import { v4 as uuidv4 } from 'uuid'
import type { 
  WaterUsageInput, 
  RWHCalculationInput,
  WaterCalculationResult, 
  WaterRecommendation 
} from './types'
import { 
  rwh, 
  householdWaterUsage, 
  defaultWaterParams 
} from './formulas'
import { createAuditLog } from '@/lib/audit/logger'

/**
 * Water Tracker and RWH Service
 * Tracks water consumption and calculates rainwater harvesting potential
 */
export class WaterTrackerService {
  private waterParams: typeof defaultWaterParams
  
  constructor(customParams?: Partial<typeof defaultWaterParams>) {
    this.waterParams = { ...defaultWaterParams, ...customParams }
  }
  
  /**
   * Calculate comprehensive water usage and RWH potential
   */
  async calculateWaterUsage(
    usage: WaterUsageInput,
    rwhInput?: RWHCalculationInput,
    userId?: string,
    sessionId?: string
  ): Promise<WaterCalculationResult> {
    try {
      // Validate inputs
      this.validateWaterUsage(usage)
      if (rwhInput) {
        this.validateRWHInput(rwhInput)
      }
      
      // Calculate daily household consumption
      const householdConsumption = householdWaterUsage(
        usage.household.members,
        {
          drinking: usage.household.drinking,
          cooking: usage.household.cooking,
          bathing: usage.household.bathing,
          washing: usage.household.washing,
          cleaning: usage.household.cleaning
        }
      )
      
      // Calculate garden consumption
      const gardenConsumption = this.calculateGardenConsumption(usage.garden)
      
      // Total daily consumption
      const dailyConsumption = householdConsumption + gardenConsumption
      const monthlyConsumption = dailyConsumption * 30.44 // Average days per month
      const annualConsumption = dailyConsumption * 365
      
      // Calculate RWH potential if roof data provided
      let rwhPotential: number | undefined
      let savingsPercentage: number | undefined
      let costSavings: number | undefined
      
      if (rwhInput) {
        rwhPotential = rwh(
          rwhInput.annualRainfall || this.waterParams.avgRainfall,
          rwhInput.roofArea,
          rwhInput.runoffCoeff || this.waterParams.runoffCoeff
        )
        
        // Calculate potential savings
        savingsPercentage = Math.min(100, (rwhPotential / annualConsumption) * 100)
        
        // Cost savings calculation
        const waterSavingsLiters = Math.min(rwhPotential, annualConsumption)
        costSavings = (waterSavingsLiters / 1000) * this.waterParams.waterRate
      }
      
      // Generate personalized recommendations
      const recommendations = this.generateWaterRecommendations(
        usage,
        dailyConsumption,
        rwhInput
      )
      
      const result: WaterCalculationResult = {
        id: uuidv4(),
        userId,
        sessionId: sessionId || uuidv4(),
        usage,
        rwh: rwhInput,
        results: {
          dailyConsumption,
          monthlyConsumption,
          annualConsumption,
          rwhPotential,
          savingsPercentage,
          costSavings,
          recommendations
        },
        calculatedAt: new Date()
      }
      
      // Audit log the calculation
      await createAuditLog({
        actorId: userId || 'anonymous',
        action: 'CREATE',
        resource: 'WaterCalculation',
        resourceId: result.id,
        metadata: {
          dailyConsumption,
          rwhPotential,
          savingsPercentage,
          sessionId
        }
      })
      
      return result
      
    } catch (error) {
      throw new Error(`Water calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Calculate garden water consumption
   */
  private calculateGardenConsumption(garden: WaterUsageInput['garden']): number {
    if (!garden.area || garden.area <= 0) return 0
    
    // Base consumption: 2-3 L/m² for garden areas
    let baseConsumption = garden.area * 2.5
    
    // Adjust for plant types
    let plantMultiplier = 1.0
    
    if (garden.plants.some(plant => 
      ['lawn', 'grass', 'turf'].some(keyword => 
        plant.toLowerCase().includes(keyword)
      )
    )) {
      plantMultiplier = 1.5 // Lawns need more water
    }
    
    if (garden.plants.some(plant => 
      ['vegetables', 'tomato', 'potato', 'crops'].some(keyword => 
        plant.toLowerCase().includes(keyword)
      )
    )) {
      plantMultiplier = Math.max(plantMultiplier, 1.3) // Vegetables need regular water
    }
    
    if (garden.plants.some(plant => 
      ['cactus', 'succulent', 'drought'].some(keyword => 
        plant.toLowerCase().includes(keyword)
      )
    )) {
      plantMultiplier = 0.5 // Drought-resistant plants
    }
    
    return Math.max(baseConsumption * plantMultiplier, garden.watering)
  }
  
  /**
   * Generate personalized water recommendations
   */
  private generateWaterRecommendations(
    usage: WaterUsageInput,
    dailyConsumption: number,
    rwhInput?: RWHCalculationInput
  ): WaterRecommendation[] {
    const recommendations: WaterRecommendation[] = []
    
    // High consumption warnings
    const perPersonConsumption = dailyConsumption / usage.household.members
    
    if (perPersonConsumption > 150) {
      recommendations.push({
        category: 'consumption',
        description: 'Your daily water consumption is above average. Consider water-saving measures.',
        potentialSaving: dailyConsumption * 0.2, // 20% potential saving
        implementation: 'Install low-flow fixtures, fix leaks, and use water-efficient appliances',
        cost: '₹5,000 - ₹15,000'
      })
    }
    
    // Bathing recommendations
    if (usage.household.bathing > 50) {
      recommendations.push({
        category: 'bathing',
        description: 'Reduce shower time or use a bucket for bathing to save water.',
        potentialSaving: usage.household.members * Math.max(0, usage.household.bathing - 40),
        implementation: 'Use low-flow showerheads or switch to bucket baths',
        cost: '₹1,000 - ₹3,000'
      })
    }
    
    // RWH recommendations
    if (rwhInput && rwhInput.roofArea > 50) {
      const potential = rwh(
        rwhInput.annualRainfall || this.waterParams.avgRainfall,
        rwhInput.roofArea,
        rwhInput.runoffCoeff || this.waterParams.runoffCoeff
      )
      
      recommendations.push({
        category: 'rainwater',
        description: `Install rainwater harvesting system. You can collect ${Math.round(potential).toLocaleString()} liters annually.`,
        potentialSaving: Math.min(potential / 365, dailyConsumption),
        implementation: 'Install gutters, pipes, and storage tanks with filtration system',
        cost: '₹25,000 - ₹1,00,000 (depending on storage capacity)'
      })
    }
    
    // Garden optimization
    if (usage.garden.area > 0 && usage.garden.watering > usage.garden.area * 2) {
      recommendations.push({
        category: 'gardening',
        description: 'Optimize garden watering with drip irrigation or mulching.',
        potentialSaving: Math.max(0, usage.garden.watering - usage.garden.area * 2),
        implementation: 'Install drip irrigation, use mulch, choose native plants',
        cost: '₹2,000 - ₹8,000'
      })
    }
    
    // Greywater reuse
    if (dailyConsumption > 200) {
      const greyWaterPotential = (usage.household.bathing + usage.household.washing) * 0.8
      recommendations.push({
        category: 'greywater',
        description: 'Reuse greywater from kitchen and bathroom for garden and cleaning.',
        potentialSaving: greyWaterPotential,
        implementation: 'Install simple greywater filtration and distribution system',
        cost: '₹8,000 - ₹20,000'
      })
    }
    
    // Water quality improvement
    recommendations.push({
      category: 'quality',
      description: 'Install water purification system to ensure safe drinking water.',
      potentialSaving: 0, // Health benefit, not water saving
      implementation: 'UV purifier, RO system, or ceramic filters based on water quality',
      cost: '₹3,000 - ₹25,000'
    })
    
    // Sort by potential savings (highest first)
    return recommendations
      .sort((a, b) => b.potentialSaving - a.potentialSaving)
      .slice(0, 5) // Top 5 recommendations
  }
  
  /**
   * Get water usage breakdown by category
   */
  getUsageBreakdown(usage: WaterUsageInput): {
    category: string
    litersPerDay: number
    percentage: number
    perPersonLiters?: number
  }[] {
    const household = usage.household
    const garden = usage.garden
    
    const categories = [
      {
        category: 'Drinking',
        litersPerDay: household.members * household.drinking,
        perPersonLiters: household.drinking
      },
      {
        category: 'Cooking',
        litersPerDay: household.cooking
      },
      {
        category: 'Bathing', 
        litersPerDay: household.members * household.bathing,
        perPersonLiters: household.bathing
      },
      {
        category: 'Washing',
        litersPerDay: household.washing
      },
      {
        category: 'Cleaning',
        litersPerDay: household.cleaning
      },
      {
        category: 'Gardening',
        litersPerDay: this.calculateGardenConsumption(garden)
      }
    ]
    
    const totalUsage = categories.reduce((sum, cat) => sum + cat.litersPerDay, 0)
    
    return categories.map(cat => ({
      ...cat,
      percentage: totalUsage > 0 ? (cat.litersPerDay / totalUsage) * 100 : 0
    }))
  }
  
  /**
   * Calculate optimal RWH system design
   */
  calculateOptimalRWH(
    roofArea: number,
    annualConsumption: number,
    location?: string
  ): {
    recommendedCapacity: number // Liters
    estimatedCost: number // INR
    paybackPeriod: number // Years
    components: string[]
  } {
    const rainfall = this.waterParams.avgRainfall
    const runoffCoeff = this.waterParams.runoffCoeff
    
    // Calculate maximum harvestable water
    const maxHarvestable = rwh(rainfall, roofArea, runoffCoeff)
    
    // Recommended storage capacity: 10-20% of annual harvesting potential
    // or 1 month of consumption, whichever is smaller
    const monthlyConsumption = annualConsumption / 12
    const recommendedCapacity = Math.min(
      maxHarvestable * 0.15, // 15% of annual potential
      monthlyConsumption * 1.5 // 1.5 months consumption
    )
    
    // Estimate cost (₹300-500 per 1000L storage + installation)
    const costPerLiter = 0.4 // ₹0.40 per liter capacity
    const baseCost = 15000 // Gutters, pipes, first flush diverter
    const estimatedCost = baseCost + (recommendedCapacity * costPerLiter)
    
    // Calculate payback period
    const annualSavings = (Math.min(maxHarvestable, annualConsumption) / 1000) * this.waterParams.waterRate
    const paybackPeriod = annualSavings > 0 ? estimatedCost / annualSavings : Infinity
    
    const components = [
      'Roof gutters and downpipes',
      'First flush diverter',
      'Storage tank(s)',
      'Filtration system',
      'Distribution pump',
      'Overflow management'
    ]
    
    if (recommendedCapacity > 10000) {
      components.push('Underground storage tank')
    }
    
    return {
      recommendedCapacity: Math.round(recommendedCapacity),
      estimatedCost: Math.round(estimatedCost),
      paybackPeriod: Math.round(paybackPeriod * 10) / 10,
      components
    }
  }
  
  /**
   * Validate water usage input
   */
  private validateWaterUsage(usage: WaterUsageInput): void {
    if (!usage.household) {
      throw new Error('Household data is required')
    }
    
    if (usage.household.members < 1 || usage.household.members > 20) {
      throw new Error('Number of household members must be between 1 and 20')
    }
    
    if (usage.household.drinking < 0 || usage.household.drinking > 10) {
      throw new Error('Drinking water per person must be between 0 and 10 liters/day')
    }
    
    if (usage.household.bathing < 0 || usage.household.bathing > 200) {
      throw new Error('Bathing water per person must be between 0 and 200 liters/day')
    }
    
    if (usage.garden.area < 0 || usage.garden.area > 10000) {
      throw new Error('Garden area must be between 0 and 10,000 m²')
    }
  }
  
  /**
   * Validate RWH input
   */
  private validateRWHInput(rwh: RWHCalculationInput): void {
    if (rwh.roofArea <= 0 || rwh.roofArea > 10000) {
      throw new Error('Roof area must be between 0 and 10,000 m²')
    }
    
    if (rwh.runoffCoeff && (rwh.runoffCoeff < 0 || rwh.runoffCoeff > 1)) {
      throw new Error('Runoff coefficient must be between 0 and 1')
    }
    
    if (rwh.storageCapacity && rwh.storageCapacity < 0) {
      throw new Error('Storage capacity cannot be negative')
    }
    
    if (rwh.annualRainfall && (rwh.annualRainfall < 0 || rwh.annualRainfall > 10000)) {
      throw new Error('Annual rainfall must be between 0 and 10,000 mm')
    }
  }
  
  /**
   * Get water conservation tips
   */
  getConservationTips(): { category: string; tips: string[] }[] {
    return [
      {
        category: 'Kitchen',
        tips: [
          'Use a basin to wash dishes instead of running tap',
          'Steam vegetables instead of boiling in lots of water',
          'Reuse water from washing rice and vegetables for plants',
          'Fix dripping taps immediately - a drop per second wastes 5L daily'
        ]
      },
      {
        category: 'Bathroom',
        tips: [
          'Take shorter showers - reduce by 2 minutes to save 40L',
          'Turn off tap while brushing teeth and soaping',
          'Use a bucket for bathing instead of shower',
          'Install low-flow showerheads and dual-flush toilets'
        ]
      },
      {
        category: 'Laundry',
        tips: [
          'Wash full loads in washing machines',
          'Reuse rinse water for initial wash of next load',
          'Use eco-friendly detergents to enable greywater reuse',
          'Air dry clothes instead of using dryers'
        ]
      },
      {
        category: 'Garden',
        tips: [
          'Water plants early morning or late evening',
          'Use drip irrigation or soaker hoses',
          'Mulch around plants to retain moisture',
          'Choose native, drought-resistant plants'
        ]
      },
      {
        category: 'Rainwater Harvesting',
        tips: [
          'Install gutters on all roof edges',
          'Use first flush diverters to improve water quality',
          'Regular maintenance of tanks and filters',
          'Consider underground storage for larger capacity'
        ]
      }
    ]
  }
  
  /**
   * Get water parameters for admin configuration
   */
  getWaterParams(): typeof defaultWaterParams {
    return { ...this.waterParams }
  }
  
  /**
   * Update water parameters (admin only)
   */
  updateWaterParams(params: Partial<typeof defaultWaterParams>): void {
    this.waterParams = { ...this.waterParams, ...params }
  }
}

// Default instance
export const waterTracker = new WaterTrackerService()