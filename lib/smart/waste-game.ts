// Waste Segregation Game Service
import { v4 as uuidv4 } from 'uuid'
import type { WasteGameScore, WasteGameItem } from './types'
import { createAuditLog } from '@/lib/audit/logger'

/**
 * Waste Segregation Game Service
 * Interactive drag-and-drop game for learning waste segregation
 */
export class WasteGameService {
  private gameItems: WasteGameItem[]
  
  constructor() {
    this.gameItems = this.initializeGameItems()
  }
  
  /**
   * Initialize game items database
   */
  private initializeGameItems(): WasteGameItem[] {
    return [
      // Organic Waste
      { id: '1', name: 'Banana Peel', category: 'organic', playerChoice: '', correct: false, points: 0 },
      { id: '2', name: 'Vegetable Scraps', category: 'organic', playerChoice: '', correct: false, points: 0 },
      { id: '3', name: 'Tea Leaves', category: 'organic', playerChoice: '', correct: false, points: 0 },
      { id: '4', name: 'Eggshells', category: 'organic', playerChoice: '', correct: false, points: 0 },
      { id: '5', name: 'Rice Remains', category: 'organic', playerChoice: '', correct: false, points: 0 },
      { id: '6', name: 'Fruit Peels', category: 'organic', playerChoice: '', correct: false, points: 0 },
      { id: '7', name: 'Flowers', category: 'organic', playerChoice: '', correct: false, points: 0 },
      { id: '8', name: 'Leaves', category: 'organic', playerChoice: '', correct: false, points: 0 },
      
      // Plastic Waste
      { id: '9', name: 'Water Bottle', category: 'plastic', playerChoice: '', correct: false, points: 0 },
      { id: '10', name: 'Shopping Bag', category: 'plastic', playerChoice: '', correct: false, points: 0 },
      { id: '11', name: 'Food Container', category: 'plastic', playerChoice: '', correct: false, points: 0 },
      { id: '12', name: 'Shampoo Bottle', category: 'plastic', playerChoice: '', correct: false, points: 0 },
      { id: '13', name: 'Plastic Wrap', category: 'plastic', playerChoice: '', correct: false, points: 0 },
      { id: '14', name: 'Milk Pouch', category: 'plastic', playerChoice: '', correct: false, points: 0 },
      { id: '15', name: 'Pen', category: 'plastic', playerChoice: '', correct: false, points: 0 },
      { id: '16', name: 'Toys', category: 'plastic', playerChoice: '', correct: false, points: 0 },
      
      // Paper Waste
      { id: '17', name: 'Newspaper', category: 'paper', playerChoice: '', correct: false, points: 0 },
      { id: '18', name: 'Cardboard Box', category: 'paper', playerChoice: '', correct: false, points: 0 },
      { id: '19', name: 'Office Paper', category: 'paper', playerChoice: '', correct: false, points: 0 },
      { id: '20', name: 'Magazine', category: 'paper', playerChoice: '', correct: false, points: 0 },
      { id: '21', name: 'Paper Bags', category: 'paper', playerChoice: '', correct: false, points: 0 },
      { id: '22', name: 'Notebooks', category: 'paper', playerChoice: '', correct: false, points: 0 },
      { id: '23', name: 'Pizza Box', category: 'paper', playerChoice: '', correct: false, points: 0 },
      { id: '24', name: 'Tissue Paper', category: 'paper', playerChoice: '', correct: false, points: 0 },
      
      // Metal Waste
      { id: '25', name: 'Aluminum Can', category: 'metal', playerChoice: '', correct: false, points: 0 },
      { id: '26', name: 'Tin Can', category: 'metal', playerChoice: '', correct: false, points: 0 },
      { id: '27', name: 'Copper Wire', category: 'metal', playerChoice: '', correct: false, points: 0 },
      { id: '28', name: 'Steel Utensils', category: 'metal', playerChoice: '', correct: false, points: 0 },
      { id: '29', name: 'Bottle Caps', category: 'metal', playerChoice: '', correct: false, points: 0 },
      { id: '30', name: 'Foil Paper', category: 'metal', playerChoice: '', correct: false, points: 0 },
      
      // Glass Waste
      { id: '31', name: 'Glass Bottle', category: 'glass', playerChoice: '', correct: false, points: 0 },
      { id: '32', name: 'Broken Glass', category: 'glass', playerChoice: '', correct: false, points: 0 },
      { id: '33', name: 'Mirror', category: 'glass', playerChoice: '', correct: false, points: 0 },
      { id: '34', name: 'Glass Jars', category: 'glass', playerChoice: '', correct: false, points: 0 },
      { id: '35', name: 'Light Bulbs', category: 'glass', playerChoice: '', correct: false, points: 0 },
      
      // Hazardous Waste
      { id: '36', name: 'Batteries', category: 'hazardous', playerChoice: '', correct: false, points: 0 },
      { id: '37', name: 'Medicine', category: 'hazardous', playerChoice: '', correct: false, points: 0 },
      { id: '38', name: 'Paint Cans', category: 'hazardous', playerChoice: '', correct: false, points: 0 },
      { id: '39', name: 'Chemicals', category: 'hazardous', playerChoice: '', correct: false, points: 0 },
      { id: '40', name: 'CFL Bulbs', category: 'hazardous', playerChoice: '', correct: false, points: 0 },
      
      // E-Waste
      { id: '41', name: 'Mobile Phone', category: 'e-waste', playerChoice: '', correct: false, points: 0 },
      { id: '42', name: 'Computer Parts', category: 'e-waste', playerChoice: '', correct: false, points: 0 },
      { id: '43', name: 'Chargers', category: 'e-waste', playerChoice: '', correct: false, points: 0 },
      { id: '44', name: 'Television', category: 'e-waste', playerChoice: '', correct: false, points: 0 },
      { id: '45', name: 'Headphones', category: 'e-waste', playerChoice: '', correct: false, points: 0 }
    ]
  }
  
  /**
   * Start a new game session
   */
  startNewGame(level: number = 1, userId?: string): {
    sessionId: string
    items: WasteGameItem[]
    level: number
    timeLimit: number
    instructions: string
  } {
    const sessionId = uuidv4()
    
    // Select items based on difficulty level
    const itemsForLevel = this.getItemsForLevel(level)
    
    // Shuffle items
    const shuffledItems = this.shuffleArray([...itemsForLevel])
    
    return {
      sessionId,
      items: shuffledItems,
      level,
      timeLimit: this.getTimeLimitForLevel(level),
      instructions: this.getInstructionsForLevel(level)
    }
  }
  
  /**
   * Submit game results and calculate score
   */
  async submitGameResults(
    sessionId: string,
    playerChoices: { itemId: string; choice: string }[],
    timeSpent: number,
    level: number,
    userId?: string
  ): Promise<WasteGameScore> {
    try {
      // Validate and calculate results
      const gameItems = this.calculateResults(playerChoices)
      const score = this.calculateScore(gameItems, timeSpent, level)
      
      const gameScore: WasteGameScore = {
        id: uuidv4(),
        userId,
        sessionId,
        level,
        score: score.totalScore,
        correctSorts: score.correctSorts,
        incorrectSorts: score.incorrectSorts,
        timeSpent,
        items: gameItems,
        completedAt: new Date()
      }
      
      // TODO: Save to database
      // await prisma.wasteGameScore.create({ data: gameScore })
      
      // Audit log the game completion
      await createAuditLog({
        actorId: userId || 'anonymous',
        action: 'CREATE',
        resource: 'WasteGameScore',
        resourceId: gameScore.id,
        metadata: {
          level,
          score: score.totalScore,
          accuracy: (score.correctSorts / (score.correctSorts + score.incorrectSorts)) * 100,
          timeSpent
        }
      })
      
      return gameScore
      
    } catch (error) {
      throw new Error(`Failed to submit game results: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Get items for specific difficulty level
   */
  private getItemsForLevel(level: number): WasteGameItem[] {
    switch (level) {
      case 1:
        // Beginner: 8 items, basic categories (organic, plastic, paper)
        return [
          ...this.gameItems.filter(item => item.category === 'organic').slice(0, 3),
          ...this.gameItems.filter(item => item.category === 'plastic').slice(0, 3),
          ...this.gameItems.filter(item => item.category === 'paper').slice(0, 2)
        ]
      case 2:
        // Intermediate: 12 items, add metal and glass
        return [
          ...this.gameItems.filter(item => item.category === 'organic').slice(0, 3),
          ...this.gameItems.filter(item => item.category === 'plastic').slice(0, 3),
          ...this.gameItems.filter(item => item.category === 'paper').slice(0, 2),
          ...this.gameItems.filter(item => item.category === 'metal').slice(0, 2),
          ...this.gameItems.filter(item => item.category === 'glass').slice(0, 2)
        ]
      case 3:
        // Advanced: 16 items, add hazardous and e-waste
        return [
          ...this.gameItems.filter(item => item.category === 'organic').slice(0, 3),
          ...this.gameItems.filter(item => item.category === 'plastic').slice(0, 3),
          ...this.gameItems.filter(item => item.category === 'paper').slice(0, 2),
          ...this.gameItems.filter(item => item.category === 'metal').slice(0, 2),
          ...this.gameItems.filter(item => item.category === 'glass').slice(0, 2),
          ...this.gameItems.filter(item => item.category === 'hazardous').slice(0, 2),
          ...this.gameItems.filter(item => item.category === 'e-waste').slice(0, 2)
        ]
      case 4:
        // Expert: 20+ items, all categories, tricky items
        return this.gameItems.slice(0, 20)
      default:
        return this.getItemsForLevel(1)
    }
  }
  
  /**
   * Get time limit for level (in seconds)
   */
  private getTimeLimitForLevel(level: number): number {
    switch (level) {
      case 1: return 120 // 2 minutes
      case 2: return 180 // 3 minutes  
      case 3: return 240 // 4 minutes
      case 4: return 300 // 5 minutes
      default: return 120
    }
  }
  
  /**
   * Get instructions for level
   */
  private getInstructionsForLevel(level: number): string {
    switch (level) {
      case 1:
        return 'Drag each waste item to the correct bin: Organic (green), Plastic (blue), Paper (yellow).'
      case 2:
        return 'Sort waste into 5 categories: Organic, Plastic, Paper, Metal, and Glass. Some items might be tricky!'
      case 3:
        return 'Advanced sorting! Include Hazardous and E-Waste categories. Be careful with batteries and electronics.'
      case 4:
        return 'Expert level: All 7 waste categories. Perfect accuracy needed for high scores!'
      default:
        return 'Sort the waste items into correct bins. Good luck!'
    }
  }
  
  /**
   * Calculate game results
   */
  private calculateResults(playerChoices: { itemId: string; choice: string }[]): WasteGameItem[] {
    return playerChoices.map(choice => {
      const item = this.gameItems.find(item => item.id === choice.itemId)
      if (!item) {
        throw new Error(`Invalid item ID: ${choice.itemId}`)
      }
      
      const correct = item.category === choice.choice
      const points = this.calculateItemPoints(correct, item.category)
      
      return {
        ...item,
        playerChoice: choice.choice,
        correct,
        points
      }
    })
  }
  
  /**
   * Calculate points for individual item
   */
  private calculateItemPoints(correct: boolean, category: string): number {
    if (!correct) return 0
    
    // Different point values for different categories
    const categoryPoints = {
      organic: 10,
      plastic: 15,
      paper: 10,
      metal: 20,
      glass: 15,
      hazardous: 30, // Higher points for hazardous waste (more important)
      'e-waste': 25
    }
    
    return categoryPoints[category as keyof typeof categoryPoints] || 10
  }
  
  /**
   * Calculate total score with bonuses
   */
  private calculateScore(
    items: WasteGameItem[], 
    timeSpent: number, 
    level: number
  ): {
    totalScore: number
    correctSorts: number
    incorrectSorts: number
    accuracyBonus: number
    speedBonus: number
  } {
    const correctSorts = items.filter(item => item.correct).length
    const incorrectSorts = items.filter(item => !item.correct).length
    const baseScore = items.reduce((sum, item) => sum + item.points, 0)
    
    // Accuracy bonus
    const accuracy = correctSorts / items.length
    const accuracyBonus = Math.round(baseScore * accuracy * 0.5) // Up to 50% bonus
    
    // Speed bonus (based on time limit)
    const timeLimit = this.getTimeLimitForLevel(level)
    const speedRatio = Math.max(0, (timeLimit - timeSpent) / timeLimit)
    const speedBonus = Math.round(baseScore * speedRatio * 0.3) // Up to 30% bonus
    
    // Level multiplier
    const levelMultiplier = 1 + (level - 1) * 0.2 // 20% increase per level
    
    const totalScore = Math.round((baseScore + accuracyBonus + speedBonus) * levelMultiplier)
    
    return {
      totalScore,
      correctSorts,
      incorrectSorts,
      accuracyBonus,
      speedBonus
    }
  }
  
  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
  
  /**
   * Get game leaderboard
   */
  async getLeaderboard(level?: number, limit: number = 10): Promise<{
    scores: WasteGameScore[]
    userRank?: number
  }> {
    // TODO: Query database for real leaderboard
    // const scores = await prisma.wasteGameScore.findMany({
    //   where: level ? { level } : {},
    //   orderBy: { score: 'desc' },
    //   take: limit,
    //   include: { user: { select: { name: true } } }
    // })
    
    // Mock leaderboard data
    const mockScores: WasteGameScore[] = [
      {
        id: uuidv4(),
        sessionId: 'session1',
        level: level || 1,
        score: 450,
        correctSorts: 16,
        incorrectSorts: 2,
        timeSpent: 95,
        items: [],
        completedAt: new Date()
      },
      {
        id: uuidv4(),
        sessionId: 'session2', 
        level: level || 1,
        score: 420,
        correctSorts: 15,
        incorrectSorts: 3,
        timeSpent: 110,
        items: [],
        completedAt: new Date()
      }
    ]
    
    return {
      scores: mockScores,
      userRank: 5 // Mock user rank
    }
  }
  
  /**
   * Get waste segregation tips
   */
  getWasteTips(): { category: string; tips: string[] }[] {
    return [
      {
        category: 'Organic',
        tips: [
          'Compost kitchen scraps to create nutrient-rich soil',
          'Include fruit peels, vegetable scraps, tea leaves, and coffee grounds',
          'Avoid putting oils or dairy products in compost',
          'Turn compost regularly for faster decomposition'
        ]
      },
      {
        category: 'Plastic',
        tips: [
          'Clean containers before recycling',
          'Remove labels when possible',
          'Avoid single-use plastics - carry reusable bags and bottles',
          'Check recycling codes - not all plastics are recyclable'
        ]
      },
      {
        category: 'Paper',
        tips: [
          'Remove staples and tape before recycling',
          'Newspaper and magazines can be recycled easily',
          'Wax-coated paper is not recyclable',
          'Reuse paper for notes or crafts before recycling'
        ]
      },
      {
        category: 'Metal',
        tips: [
          'Aluminum cans are 100% recyclable',
          'Clean food containers before recycling',
          'Copper and brass have high scrap value',
          'Steel items can be recycled indefinitely'
        ]
      },
      {
        category: 'Glass',
        tips: [
          'Remove caps and lids before recycling',
          'Different colored glass should be separated',
          'Broken glass should be wrapped safely',
          'Glass can be recycled endlessly without quality loss'
        ]
      },
      {
        category: 'Hazardous',
        tips: [
          'Never throw batteries in regular trash',
          'Return medicines to pharmacies for safe disposal',
          'Paint and chemicals need special disposal centers',
          'CFL bulbs contain mercury - handle carefully'
        ]
      },
      {
        category: 'E-Waste',
        tips: [
          'Donate working electronics to extend their life',
          'Remove personal data before disposal',
          'Many retailers offer e-waste collection programs',
          'E-waste contains valuable materials that can be recovered'
        ]
      }
    ]
  }
  
  /**
   * Get user's game statistics
   */
  async getUserStats(userId: string): Promise<{
    gamesPlayed: number
    averageScore: number
    bestScore: number
    accuracyRate: number
    favoriteLevel: number
    totalTimePlayed: number
  }> {
    // TODO: Query database for real user stats
    // Mock user statistics
    return {
      gamesPlayed: 23,
      averageScore: 380,
      bestScore: 465,
      accuracyRate: 82.5,
      favoriteLevel: 2,
      totalTimePlayed: 3240 // seconds
    }
  }
}

// Default instance
export const wasteGameService = new WasteGameService()