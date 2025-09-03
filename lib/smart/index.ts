// Smart Features Coordination Service
import type { 
  SmartFeatureConfig,
  CarbonCalculationResult,
  SolarCalculationResult,
  TreePledge,
  WasteGameScore,
  WaterCalculationResult
} from './types'
import { CarbonCalculatorService } from './carbon-calculator'
import { SolarWizardService } from './solar-wizard'
import { TreePledgeService } from './tree-pledge'
import { WasteGameService } from './waste-game'
import { WaterTrackerService } from './water-tracker'
import { defaultEmissionFactors, defaultSolarParams, defaultWaterParams } from './formulas'

/**
 * Smart Features Service
 * Central coordination point for all smart and carbon-free features
 */
export class SmartFeaturesService {
  private carbonCalculator: CarbonCalculatorService
  private solarWizard: SolarWizardService
  private treePledgeService: TreePledgeService
  private wasteGame: WasteGameService
  private waterTracker: WaterTrackerService
  private config: SmartFeatureConfig
  
  constructor(customConfig?: Partial<SmartFeatureConfig>) {
    // Initialize configuration with defaults
    this.config = {
      emissionFactors: this.transformEmissionFactors(defaultEmissionFactors),
      solarParams: { ...defaultSolarParams },
      waterParams: { ...defaultWaterParams },
      ...customConfig
    }
    
    // Initialize individual services with configuration
    this.carbonCalculator = new CarbonCalculatorService(this.config.emissionFactors)
    this.solarWizard = new SolarWizardService(this.config.solarParams)
    this.treePledgeService = new TreePledgeService()
    this.wasteGame = new WasteGameService()
    this.waterTracker = new WaterTrackerService(this.config.waterParams)
  }
  
  /**
   * Transform flat emission factors to EmissionFactor objects
   */
  private transformEmissionFactors(flatFactors: Record<string, number>) {
    const factors: Record<string, any> = {}
    
    Object.entries(flatFactors).forEach(([key, value]) => {
      const parts = key.split('.')
      const category = parts[0]
      const subcategory = parts[1] || 'default'
      
      factors[key] = {
        id: key,
        category,
        subcategory,
        factor: value,
        unit: this.getUnitForCategory(category),
        description: this.getDescriptionForFactor(key),
        updatedAt: new Date(),
        updatedBy: 'system'
      }
    })
    
    return factors
  }
  
  /**
   * Get unit for emission category
   */
  private getUnitForCategory(category: string): string {
    const units = {
      electricity: 'kWh',
      lpg: 'kg',
      transport: 'km',
      waste: 'kg', 
      water: '1000L'
    }
    return units[category as keyof typeof units] || 'unit'
  }
  
  /**
   * Get description for emission factor
   */
  private getDescriptionForFactor(key: string): string {
    const descriptions = {
      'electricity': 'Grid electricity consumption',
      'lpg': 'LPG cooking fuel',
      'transport.car': 'Private car travel',
      'transport.bike': 'Motorcycle/scooter travel',
      'transport.bus': 'Bus travel',
      'transport.train': 'Train travel',
      'waste.organic': 'Organic waste decomposition',
      'waste.plastic': 'Plastic waste lifecycle',
      'waste.paper': 'Paper waste lifecycle',
      'waste.metal': 'Metal waste recycling',
      'waste.glass': 'Glass waste recycling',
      'water': 'Water treatment and distribution'
    }
    return descriptions[key as keyof typeof descriptions] || 'Emission factor'
  }
  
  // Carbon Calculator Methods
  async calculateCarbonFootprint(...args: Parameters<CarbonCalculatorService['calculateCarbonFootprint']>) {
    return this.carbonCalculator.calculateCarbonFootprint(...args)
  }
  
  calculateReductionPotential(result: CarbonCalculationResult) {
    return this.carbonCalculator.calculateReductionPotential(result)
  }
  
  compareFootprints(current: CarbonCalculationResult, previous: CarbonCalculationResult) {
    return this.carbonCalculator.compareFootprints(current, previous)
  }
  
  // Solar Wizard Methods
  async calculateSolarSystem(...args: Parameters<SolarWizardService['calculateSolarSystem']>) {
    return this.solarWizard.calculateSolarSystem(...args)
  }
  
  generateSolarRecommendations(result: SolarCalculationResult) {
    return this.solarWizard.generateRecommendations(result)
  }
  
  compareSolarScenarios(scenarios: SolarCalculationResult[]) {
    return this.solarWizard.compareScenarios(scenarios)
  }
  
  // Tree Pledge Methods
  async createTreePledge(...args: Parameters<TreePledgeService['createPledge']>) {
    return this.treePledgeService.createPledge(...args)
  }
  
  async moderateTreePledge(...args: Parameters<TreePledgeService['moderatePledge']>) {
    return this.treePledgeService.moderatePledge(...args)
  }
  
  async getTreePledgeStats() {
    return this.treePledgeService.getPledgeStats()
  }
  
  async getApprovedTreePledges(...args: Parameters<TreePledgeService['getApprovedPledges']>) {
    return this.treePledgeService.getApprovedPledges(...args)
  }
  
  getTreeSpecies() {
    return this.treePledgeService.getCommonSpecies()
  }
  
  calculateTreeEnvironmentalImpact(totalTrees: number) {
    return this.treePledgeService.calculateEnvironmentalImpact(totalTrees)
  }
  
  // Waste Game Methods
  startWasteGame(level?: number, userId?: string) {
    return this.wasteGame.startNewGame(level, userId)
  }
  
  async submitWasteGameResults(...args: Parameters<WasteGameService['submitGameResults']>) {
    return this.wasteGame.submitGameResults(...args)
  }
  
  async getWasteGameLeaderboard(...args: Parameters<WasteGameService['getLeaderboard']>) {
    return this.wasteGame.getLeaderboard(...args)
  }
  
  getWasteTips() {
    return this.wasteGame.getWasteTips()
  }
  
  async getWasteGameUserStats(userId: string) {
    return this.wasteGame.getUserStats(userId)
  }
  
  // Water Tracker Methods
  async calculateWaterUsage(...args: Parameters<WaterTrackerService['calculateWaterUsage']>) {
    return this.waterTracker.calculateWaterUsage(...args)
  }
  
  getWaterUsageBreakdown(...args: Parameters<WaterTrackerService['getUsageBreakdown']>) {
    return this.waterTracker.getUsageBreakdown(...args)
  }
  
  calculateOptimalRWH(...args: Parameters<WaterTrackerService['calculateOptimalRWH']>) {
    return this.waterTracker.calculateOptimalRWH(...args)
  }
  
  getWaterConservationTips() {
    return this.waterTracker.getConservationTips()
  }
  
  /**
   * Get comprehensive dashboard data
   */
  async getSmartFeaturesDashboard(userId?: string): Promise<{
    carbonFootprint?: CarbonCalculationResult
    solarPotential?: SolarCalculationResult
    treePledgeStats: any
    waterUsage?: WaterCalculationResult
    wasteGameStats?: any
    environmentalImpact: {
      co2Saved: number
      treesPlanted: number
      waterSaved: number
      wasteRecycled: number
    }
  }> {
    try {
      // Get latest user data (this would come from database in real implementation)
      const treePledgeStats = await this.getTreePledgeStats()
      
      // Calculate environmental impact
      const environmentalImpact = {
        co2Saved: 0, // Would be calculated from user's carbon reductions
        treesPlanted: treePledgeStats.totalTrees,
        waterSaved: 0, // Would be calculated from RWH and conservation
        wasteRecycled: 0 // Would be calculated from waste game participation
      }
      
      return {
        treePledgeStats,
        environmentalImpact
      }
      
    } catch (error) {
      throw new Error(`Failed to get dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Get configuration for admin interface
   */
  getConfiguration(): SmartFeatureConfig {
    return {
      emissionFactors: { ...this.config.emissionFactors },
      solarParams: { ...this.config.solarParams },
      waterParams: { ...this.config.waterParams }
    }
  }
  
  /**
   * Update configuration (admin only)
   */
  updateConfiguration(updates: Partial<SmartFeatureConfig>): void {
    if (updates.emissionFactors) {
      this.config.emissionFactors = { ...this.config.emissionFactors, ...updates.emissionFactors }
      this.carbonCalculator.updateEmissionFactors(
        Object.fromEntries(
          Object.entries(updates.emissionFactors).map(([k, v]) => [k, v.factor])
        )
      )
    }
    
    if (updates.solarParams) {
      this.config.solarParams = { ...this.config.solarParams, ...updates.solarParams }
      this.solarWizard.updateSolarParams(updates.solarParams)
    }
    
    if (updates.waterParams) {
      this.config.waterParams = { ...this.config.waterParams, ...updates.waterParams }
      this.waterTracker.updateWaterParams(updates.waterParams)
    }
  }
  
  /**
   * Generate comprehensive sustainability report
   */
  async generateSustainabilityReport(userId: string, timeframe: 'month' | 'quarter' | 'year' = 'month'): Promise<{
    period: string
    carbonFootprint: {
      current: number
      previous: number
      reduction: number
      percentChange: number
    }
    renewableEnergy: {
      solarGenerated: number
      gridOffset: number
      co2Avoided: number
    }
    waterConservation: {
      rwhCollected: number
      savings: number
      efficiency: number
    }
    wasteManagement: {
      recycled: number
      composted: number
      diversionRate: number
    }
    treePlanting: {
      pledged: number
      planted: number
      co2Absorption: number
    }
    recommendations: string[]
    score: number
  }> {
    // This would integrate with database to get real user data
    // For now, return a comprehensive mock report structure
    
    const period = `${timeframe} ending ${new Date().toISOString().split('T')[0]}`
    
    return {
      period,
      carbonFootprint: {
        current: 850,  // kg CO2e
        previous: 950,
        reduction: 100,
        percentChange: -10.5
      },
      renewableEnergy: {
        solarGenerated: 450, // kWh
        gridOffset: 0.65, // 65% of electricity from solar
        co2Avoided: 369 // kg CO2e
      },
      waterConservation: {
        rwhCollected: 2400, // liters
        savings: 1200, // liters from conservation
        efficiency: 0.78 // 78% efficiency
      },
      wasteManagement: {
        recycled: 45, // kg
        composted: 32, // kg
        diversionRate: 0.85 // 85% diverted from landfill
      },
      treePlanting: {
        pledged: 15,
        planted: 12,
        co2Absorption: 264 // kg CO2e annually
      },
      recommendations: [
        'Continue solar energy usage - you\'re already offsetting 65% of electricity',
        'Increase composting - aim for 90% organic waste diversion',
        'Complete tree planting pledge - 3 trees remaining',
        'Consider greywater reuse system for additional water savings',
        'Reduce transport emissions by using public transport 2 more days per week'
      ],
      score: 82 // Overall sustainability score out of 100
    }
  }
}

// Default instance with default configuration
export const smartFeatures = new SmartFeaturesService()

// Individual service exports for direct access
export { carbonCalculator } from './carbon-calculator'
export { solarWizard } from './solar-wizard'
export { treePledgeService } from './tree-pledge'
export { wasteGameService } from './waste-game'
export { waterTracker } from './water-tracker'