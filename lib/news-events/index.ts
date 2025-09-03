/**
 * News, Events, and Notices Services Index
 * PR12 - News/Notices/Events Implementation
 */

export * from './news-service'
export * from './events-service'
export * from './notices-service'

// Re-export common types and constants
export type { News, NewsStatus } from './news-service'
export type { Event, EventRSVP, RSVPStatus } from './events-service'  
export type { Notice } from './notices-service'
export { NOTICE_CATEGORIES } from './notices-service'