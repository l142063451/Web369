// Smart & Carbon-Free features domain types
export interface EmissionFactor {
  id: string
  category: string
  subcategory: string
  factor: number // kg CO2e per unit
  unit: string
  description: string
  source?: string
  updatedAt: Date
  updatedBy: string
}

export interface CarbonCalculationInput {
  electricity: number // kWh
  lpg: number // kg  
  transport: {
    car: number // km
    bike: number // km
    bus: number // km
  }
  waste: {
    organic: number // kg
    plastic: number // kg
    paper: number // kg
  }
  water: number // liters
}

export interface CarbonCalculationResult {
  id: string
  userId?: string
  sessionId: string
  input: CarbonCalculationInput
  emissions: {
    electricity: number
    lpg: number
    transport: number
    waste: number
    water: number
    total: number
  }
  recommendations: CarbonRecommendation[]
  calculatedAt: Date
}

export interface CarbonRecommendation {
  category: string
  impact: 'high' | 'medium' | 'low'
  description: string
  potentialSaving: number // kg CO2e per year
  difficulty: 'easy' | 'moderate' | 'challenging'
}

export interface SolarCalculationInput {
  roofArea: number // m2
  usablePct: number // percentage
  location: string
  orientation?: 'north' | 'south' | 'east' | 'west'
  tilt?: number // degrees
  shadingFactor?: number // 0-1
}

export interface SolarCalculationResult {
  id: string
  userId?: string
  sessionId: string
  input: SolarCalculationInput
  results: {
    usableArea: number // m2
    systemCapacity: number // kWp
    annualGeneration: number // kWh/year
    monthlyGeneration: number[] // 12 months
    co2Reduction: number // kg/year
    paybackPeriod: number // years
    roi: number // percentage
    totalSavings20Years: number // INR
  }
  calculatedAt: Date
}

export interface TreePledge {
  id: string
  userId: string
  name: string
  email: string
  phone?: string
  treesToPlant: number
  location?: string
  species?: string[]
  message?: string
  status: 'pending' | 'approved' | 'rejected'
  plantingDate?: Date
  verificationPhoto?: string
  moderatedBy?: string
  moderatedAt?: Date
  moderationNotes?: string
  createdAt: Date
}

export interface WaterUsageInput {
  household: {
    members: number
    drinking: number // L/day per person
    cooking: number // L/day
    bathing: number // L/day per person  
    washing: number // L/day
    cleaning: number // L/day
  }
  garden: {
    area: number // m2
    plants: string[]
    watering: number // L/day
  }
}

export interface RWHCalculationInput {
  roofArea: number // m2
  annualRainfall: number // mm
  runoffCoeff: number // 0-1
  storageCapacity: number // L
  location: string
}

export interface WaterCalculationResult {
  id: string
  userId?: string
  sessionId: string
  usage: WaterUsageInput
  rwh?: RWHCalculationInput
  results: {
    dailyConsumption: number // L/day
    monthlyConsumption: number // L/month
    annualConsumption: number // L/year
    rwhPotential?: number // L/year
    savingsPercentage?: number // %
    costSavings?: number // INR/year
    recommendations: WaterRecommendation[]
  }
  calculatedAt: Date
}

export interface WaterRecommendation {
  category: string
  description: string
  potentialSaving: number // L/day
  implementation: string
  cost?: string
}

export interface WasteGameScore {
  id: string
  userId?: string
  sessionId: string
  level: number
  score: number
  correctSorts: number
  incorrectSorts: number
  timeSpent: number // seconds
  items: WasteGameItem[]
  completedAt: Date
}

export interface WasteGameItem {
  id: string
  name: string
  category: 'organic' | 'plastic' | 'paper' | 'metal' | 'glass' | 'hazardous' | 'e-waste'
  playerChoice: string
  correct: boolean
  points: number
}

export interface SmartFeatureConfig {
  emissionFactors: Record<string, EmissionFactor>
  solarParams: {
    wpPerM2: number // Watts peak per m2
    specificYield: number // kWh/kWp/year for location
    performanceRatio: number // 0-1
    costPerWatt: number // INR/Wp
    maintenanceRate: number // %/year
    degradationRate: number // %/year
    electricityRate: number // INR/kWh
  }
  waterParams: {
    avgRainfall: number // mm/year for location
    runoffCoeff: number // default for concrete roofs
    waterRate: number // INR/1000L
  }
}