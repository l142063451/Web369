// Green calculation formulas with comprehensive unit tests
// Based on real-world emission factors and engineering calculations

/**
 * Rainwater Harvesting (RWH) calculation
 * @param rainfallMm Annual rainfall in millimeters
 * @param areaM2 Catchment area in square meters  
 * @param runoffCoeff Runoff coefficient (0.8-0.95 for concrete roofs)
 * @returns Annual water harvesting potential in liters
 */
export const rwh = (rainfallMm: number, areaM2: number, runoffCoeff: number): number => {
  if (rainfallMm < 0 || areaM2 < 0 || runoffCoeff < 0 || runoffCoeff > 1) {
    throw new Error('Invalid RWH parameters')
  }
  return rainfallMm * areaM2 * runoffCoeff
}

/**
 * Solar energy generation calculation from roof area
 * @param areaM2 Total roof area in square meters
 * @param usablePct Usable percentage of roof (typically 60-80%)
 * @param wpPerM2 Watts peak per square meter (typically 150-200 for standard panels)
 * @param specificYield Annual specific yield kWh/kWp for location (1400-1800 in India)
 * @param pr Performance ratio (0.75-0.85 for well-designed systems)
 * @returns Object with usable area, system capacity, and annual generation
 */
export const solarFromArea = (
  areaM2: number, 
  usablePct: number, 
  wpPerM2: number, 
  specificYield: number, 
  pr: number
) => {
  if (areaM2 < 0 || usablePct < 0 || usablePct > 100 || wpPerM2 < 0 || specificYield < 0 || pr < 0 || pr > 1) {
    throw new Error('Invalid solar parameters')
  }
  
  const usableArea = areaM2 * (usablePct / 100)
  const kWp = (usableArea * wpPerM2) / 1000
  const annualYield = kWp * specificYield * pr
  
  return { usableArea, kWp, annualYield }
}

/**
 * Carbon footprint calculation for electricity consumption
 * Uses India's electricity emission factor
 * @param kWh Monthly electricity consumption in kWh
 * @param emissionFactor kg CO2e per kWh (0.82 for India grid average)
 * @returns Monthly CO2 emissions in kg
 */
export const electricityEmissions = (kWh: number, emissionFactor: number = 0.82): number => {
  if (kWh < 0 || emissionFactor < 0) {
    throw new Error('Invalid electricity parameters')
  }
  return kWh * emissionFactor
}

/**
 * Carbon footprint for LPG consumption
 * @param kgLPG Monthly LPG consumption in kg
 * @param emissionFactor kg CO2e per kg LPG (2.98)
 * @returns Monthly CO2 emissions in kg
 */
export const lpgEmissions = (kgLPG: number, emissionFactor: number = 2.98): number => {
  if (kgLPG < 0 || emissionFactor < 0) {
    throw new Error('Invalid LPG parameters')
  }
  return kgLPG * emissionFactor
}

/**
 * Transport emissions calculation
 * @param distanceKm Distance traveled in km
 * @param emissionFactor kg CO2e per km (varies by vehicle type)
 * @returns CO2 emissions in kg
 */
export const transportEmissions = (distanceKm: number, emissionFactor: number): number => {
  if (distanceKm < 0 || emissionFactor < 0) {
    throw new Error('Invalid transport parameters')  
  }
  return distanceKm * emissionFactor
}

/**
 * Waste generation emissions
 * @param wasteKg Monthly waste in kg
 * @param emissionFactor kg CO2e per kg waste (varies by waste type)
 * @returns Monthly CO2 emissions in kg
 */
export const wasteEmissions = (wasteKg: number, emissionFactor: number): number => {
  if (wasteKg < 0 || emissionFactor < 0) {
    throw new Error('Invalid waste parameters')
  }
  return wasteKg * emissionFactor
}

/**
 * Water consumption emissions (treatment and distribution)
 * @param liters Monthly water consumption in liters
 * @param emissionFactor kg CO2e per 1000L (0.298 for treated water)
 * @returns Monthly CO2 emissions in kg
 */
export const waterEmissions = (liters: number, emissionFactor: number = 0.298): number => {
  if (liters < 0 || emissionFactor < 0) {
    throw new Error('Invalid water parameters')
  }
  return (liters / 1000) * emissionFactor
}

/**
 * Solar payback period calculation
 * @param systemCostINR Total system cost in INR
 * @param annualSavingsINR Annual electricity savings in INR
 * @param maintenanceRate Annual maintenance as % of system cost
 * @returns Payback period in years
 */
export const solarPaybackPeriod = (
  systemCostINR: number, 
  annualSavingsINR: number, 
  maintenanceRate: number = 0.02
): number => {
  if (systemCostINR < 0 || annualSavingsINR < 0 || maintenanceRate < 0) {
    throw new Error('Invalid payback calculation parameters')
  }
  
  const netAnnualSavings = annualSavingsINR - (systemCostINR * maintenanceRate)
  
  if (netAnnualSavings <= 0) {
    return Infinity // Never pays back
  }
  
  return systemCostINR / netAnnualSavings
}

/**
 * CO2 reduction from solar installation
 * @param annualGenerationKWh Annual solar generation in kWh  
 * @param gridEmissionFactor Grid emission factor kg CO2e/kWh
 * @returns Annual CO2 reduction in kg
 */
export const solarCO2Reduction = (
  annualGenerationKWh: number, 
  gridEmissionFactor: number = 0.82
): number => {
  if (annualGenerationKWh < 0 || gridEmissionFactor < 0) {
    throw new Error('Invalid CO2 reduction parameters')
  }
  return annualGenerationKWh * gridEmissionFactor
}

/**
 * Water usage calculation for households
 * @param members Number of household members
 * @param usageProfile Per capita usage profile
 * @returns Daily water consumption in liters
 */
export const householdWaterUsage = (
  members: number,
  usageProfile: {
    drinking: number, // L/person/day
    cooking: number, // L/day
    bathing: number, // L/person/day  
    washing: number, // L/day
    cleaning: number // L/day
  }
): number => {
  if (members < 0) {
    throw new Error('Invalid number of members')
  }
  
  return (
    members * usageProfile.drinking +
    usageProfile.cooking +
    members * usageProfile.bathing +
    usageProfile.washing +
    usageProfile.cleaning
  )
}

/**
 * Monthly solar generation distribution for India
 * Based on typical solar irradiance patterns
 * @param annualGeneration Total annual generation in kWh
 * @returns Array of 12 monthly generation values
 */
export const monthlySolarDistribution = (annualGeneration: number): number[] => {
  if (annualGeneration < 0) {
    throw new Error('Invalid annual generation')
  }
  
  // Typical monthly distribution percentages for India (must sum to 1.0)
  const monthlyPercentages = [
    0.074, // Jan
    0.078, // Feb  
    0.092, // Mar
    0.098, // Apr
    0.103, // May
    0.084, // Jun (monsoon)
    0.072, // Jul (monsoon)
    0.076, // Aug (monsoon)
    0.086, // Sep
    0.091, // Oct
    0.084, // Nov
    0.062  // Dec
  ]
  
  // Verify percentages sum to 1.0
  const sum = monthlyPercentages.reduce((a, b) => a + b, 0)
  if (Math.abs(sum - 1.0) > 0.001) {
    throw new Error('Monthly percentages must sum to 1.0')
  }
  
  return monthlyPercentages.map(pct => annualGeneration * pct)
}

/**
 * Default emission factors for India (kg CO2e per unit)
 * Flattened structure for easy configuration
 */
export const defaultEmissionFactors = {
  'electricity': 0.82, // per kWh
  'lpg': 2.98, // per kg
  'transport.car': 0.171, // per km
  'transport.bike': 0.089, // per km  
  'transport.bus': 0.105, // per km
  'transport.train': 0.041, // per km
  'waste.organic': 0.57, // per kg (decomposition)
  'waste.plastic': 6.0, // per kg (production + disposal)
  'waste.paper': 1.29, // per kg
  'waste.metal': 0.5, // per kg
  'waste.glass': 0.2, // per kg
  'water': 0.298, // per 1000L (treatment + distribution)
}

/**
 * Default solar parameters for North India (Uttarakhand region)
 */
export const defaultSolarParams = {
  wpPerM2: 175, // Watts peak per m2 
  specificYield: 1650, // kWh/kWp/year
  performanceRatio: 0.8, // System efficiency
  costPerWatt: 40, // INR per Wp installed
  maintenanceRate: 0.02, // 2% of system cost per year
  degradationRate: 0.005, // 0.5% per year
  electricityRate: 6.5, // INR per kWh
}

/**
 * Default water parameters for Uttarakhand
 */
export const defaultWaterParams = {
  avgRainfall: 1200, // mm/year
  runoffCoeff: 0.85, // for concrete roofs
  waterRate: 15, // INR per 1000L
}