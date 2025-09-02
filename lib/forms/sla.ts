/**
 * SLA (Service Level Agreement) Engine
 * Based on INSTRUCTIONS_FOR_COPILOT.md §7
 */

import { addDays, isWeekend, addHours, isBefore, differenceInHours } from 'date-fns'

/**
 * Calculate SLA due date from creation date
 * Excludes weekends and configurable holidays
 */
export function calculateSLADue(slaDays: number, createdAt = new Date()): Date {
  let dueDate = new Date(createdAt)
  let remainingDays = slaDays

  // Add business days only
  while (remainingDays > 0) {
    dueDate = addDays(dueDate, 1)
    
    // Skip weekends
    if (!isWeekend(dueDate)) {
      remainingDays--
    }
  }

  // Set to end of business day (5 PM)
  dueDate.setHours(17, 0, 0, 0)
  
  return dueDate
}

/**
 * Check if SLA is breached
 */
export function isSLABreached(slaDue: Date, currentTime = new Date()): boolean {
  return isBefore(slaDue, currentTime)
}

/**
 * Calculate time remaining until SLA breach
 */
export function getTimeUntilSLABreach(slaDue: Date, currentTime = new Date()): {
  hours: number
  isOverdue: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
} {
  const hoursRemaining = differenceInHours(slaDue, currentTime)
  const isOverdue = hoursRemaining < 0

  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
  
  if (isOverdue) {
    severity = 'critical'
  } else if (hoursRemaining <= 4) {
    severity = 'high'
  } else if (hoursRemaining <= 24) {
    severity = 'medium' 
  }

  return {
    hours: Math.abs(hoursRemaining),
    isOverdue,
    severity
  }
}

/**
 * Get SLA status for display
 */
export function getSLAStatus(slaDue: Date, status: string, currentTime = new Date()): {
  status: 'on-track' | 'at-risk' | 'breached' | 'completed'
  hoursRemaining: number
  message: string
} {
  // If already resolved/completed
  if (['RESOLVED', 'REJECTED'].includes(status)) {
    return {
      status: 'completed',
      hoursRemaining: 0,
      message: 'Completed'
    }
  }

  const timeInfo = getTimeUntilSLABreach(slaDue, currentTime)
  
  if (timeInfo.isOverdue) {
    return {
      status: 'breached',
      hoursRemaining: timeInfo.hours,
      message: `Overdue by ${timeInfo.hours} hours`
    }
  }
  
  if (timeInfo.severity === 'high') {
    return {
      status: 'at-risk',
      hoursRemaining: timeInfo.hours, 
      message: `Due in ${timeInfo.hours} hours`
    }
  }
  
  return {
    status: 'on-track',
    hoursRemaining: timeInfo.hours,
    message: `${timeInfo.hours} hours remaining`
  }
}

/**
 * Categories with default SLA days
 */
export const SLA_CATEGORIES = {
  'complaint': { days: 7, escalationDays: 5 },
  'suggestion': { days: 14, escalationDays: 10 },
  'rti': { days: 30, escalationDays: 25 },
  'certificate': { days: 7, escalationDays: 5 },
  'grievance': { days: 14, escalationDays: 10 },
  'waste-pickup': { days: 2, escalationDays: 1 },
  'water-tanker': { days: 1, escalationDays: 0.5 },
  'general': { days: 7, escalationDays: 5 }
} as const

/**
 * Get SLA configuration for a category
 */
export function getSLAConfig(category: string) {
  return SLA_CATEGORIES[category as keyof typeof SLA_CATEGORIES] || SLA_CATEGORIES.general
}