// Tree Pledge Wall Service with Moderation
import { v4 as uuidv4 } from 'uuid'
import type { TreePledge } from './types'
import { createAuditLog } from '@/lib/audit/logger'

/**
 * Tree Pledge Wall Service
 * Manages tree planting pledges with moderation workflow
 */
export class TreePledgeService {
  /**
   * Create a new tree pledge
   */
  async createPledge(pledgeData: {
    userId: string
    name: string
    email: string
    phone?: string
    treesToPlant: number
    location?: string
    species?: string[]
    message?: string
  }): Promise<TreePledge> {
    try {
      // Validate pledge data
      this.validatePledgeData(pledgeData)
      
      const pledge: TreePledge = {
        id: uuidv4(),
        userId: pledgeData.userId,
        name: pledgeData.name,
        email: pledgeData.email,
        phone: pledgeData.phone,
        treesToPlant: pledgeData.treesToPlant,
        location: pledgeData.location,
        species: pledgeData.species,
        message: pledgeData.message,
        status: 'pending',
        createdAt: new Date()
      }
      
      // TODO: Save to database
      // await prisma.treePledge.create({ data: pledge })
      
      // Audit log the pledge creation
      await createAuditLog({
        actorId: pledgeData.userId,
        action: 'CREATE',
        resource: 'TreePledge',
        resourceId: pledge.id,
        metadata: {
          treesToPlant: pledgeData.treesToPlant,
          location: pledgeData.location,
          species: pledgeData.species
        }
      })
      
      return pledge
      
    } catch (error) {
      throw new Error(`Failed to create tree pledge: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Moderate a tree pledge (admin only)
   */
  async moderatePledge(
    pledgeId: string,
    moderatorId: string,
    decision: 'approve' | 'reject',
    notes?: string
  ): Promise<TreePledge> {
    try {
      // TODO: Get pledge from database
      // const pledge = await prisma.treePledge.findUnique({ where: { id: pledgeId } })
      // if (!pledge) throw new Error('Pledge not found')
      
      // For now, create a mock pledge for demonstration
      const updatedPledge: TreePledge = {
        id: pledgeId,
        userId: 'user-id',
        name: 'User Name',
        email: 'user@example.com',
        treesToPlant: 10,
        status: decision === 'approve' ? 'approved' : 'rejected',
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
        moderationNotes: notes,
        createdAt: new Date()
      }
      
      // TODO: Update in database
      // await prisma.treePledge.update({
      //   where: { id: pledgeId },
      //   data: {
      //     status: updatedPledge.status,
      //     moderatedBy: moderatorId,
      //     moderatedAt: new Date(),
      //     moderationNotes: notes
      //   }
      // })
      
      // Audit log the moderation action
      await createAuditLog({
        actorId: moderatorId,
        action: decision === 'approve' ? 'APPROVE' : 'REJECT',
        resource: 'TreePledge',
        resourceId: pledgeId,
        metadata: {
          decision,
          notes,
          moderatorId
        }
      })
      
      return updatedPledge
      
    } catch (error) {
      throw new Error(`Failed to moderate pledge: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Add verification photo to pledge
   */
  async addVerificationPhoto(
    pledgeId: string,
    userId: string,
    photoUrl: string
  ): Promise<TreePledge> {
    try {
      // TODO: Get and update pledge from database
      // const pledge = await prisma.treePledge.findFirst({
      //   where: { id: pledgeId, userId }
      // })
      // if (!pledge) throw new Error('Pledge not found or unauthorized')
      
      const updatedPledge: TreePledge = {
        id: pledgeId,
        userId: userId,
        name: 'User Name',
        email: 'user@example.com',
        treesToPlant: 10,
        status: 'approved',
        verificationPhoto: photoUrl,
        createdAt: new Date()
      }
      
      // TODO: Update in database
      // await prisma.treePledge.update({
      //   where: { id: pledgeId },
      //   data: { verificationPhoto: photoUrl }
      // })
      
      // Audit log the verification
      await createAuditLog({
        actorId: userId,
        action: 'UPDATE',
        resource: 'TreePledge',
        resourceId: pledgeId,
        metadata: {
          action: 'verification_photo_added',
          photoUrl
        }
      })
      
      return updatedPledge
      
    } catch (error) {
      throw new Error(`Failed to add verification photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Get pledge statistics
   */
  async getPledgeStats(): Promise<{
    totalPledges: number
    totalTrees: number
    approvedPledges: number
    pendingPledges: number
    rejectedPledges: number
    speciesBreakdown: Record<string, number>
    locationBreakdown: Record<string, number>
  }> {
    // TODO: Query database for real statistics
    // For now, return mock data
    return {
      totalPledges: 127,
      totalTrees: 1834,
      approvedPledges: 89,
      pendingPledges: 31,
      rejectedPledges: 7,
      speciesBreakdown: {
        'Mango': 245,
        'Neem': 189,
        'Banyan': 156,
        'Peepal': 134,
        'Gulmohar': 98,
        'Other': 312
      },
      locationBreakdown: {
        'Damday': 567,
        'Chuanala': 423,
        'Gangolihat': 298,
        'Other Areas': 546
      }
    }
  }
  
  /**
   * Get approved pledges for public wall display
   */
  async getApprovedPledges(limit: number = 50, offset: number = 0): Promise<{
    pledges: TreePledge[]
    total: number
  }> {
    // TODO: Query database
    // const pledges = await prisma.treePledge.findMany({
    //   where: { status: 'approved' },
    //   orderBy: { createdAt: 'desc' },
    //   take: limit,
    //   skip: offset
    // })
    
    // Mock data for demonstration
    const mockPledges: TreePledge[] = [
      {
        id: uuidv4(),
        userId: 'user1',
        name: 'Rajesh Kumar',
        email: 'rajesh@example.com',
        treesToPlant: 25,
        location: 'Damday Village',
        species: ['Mango', 'Neem'],
        message: 'For a greener future of our children',
        status: 'approved',
        plantingDate: new Date('2024-07-15'),
        verificationPhoto: '/uploads/tree-verification-1.jpg',
        createdAt: new Date('2024-06-01')
      },
      {
        id: uuidv4(),
        userId: 'user2', 
        name: 'Sunita Devi',
        email: 'sunita@example.com',
        treesToPlant: 15,
        location: 'Chuanala',
        species: ['Banyan', 'Peepal'],
        message: 'Trees are life, let\'s plant more!',
        status: 'approved',
        plantingDate: new Date('2024-08-01'),
        createdAt: new Date('2024-07-10')
      }
    ]
    
    return {
      pledges: mockPledges.slice(offset, offset + limit),
      total: 89 // Mock total
    }
  }
  
  /**
   * Get pending pledges for moderation (admin only)
   */
  async getPendingPledges(): Promise<TreePledge[]> {
    // TODO: Query database
    // return await prisma.treePledge.findMany({
    //   where: { status: 'pending' },
    //   orderBy: { createdAt: 'desc' }
    // })
    
    // Mock pending pledges
    return [
      {
        id: uuidv4(),
        userId: 'user3',
        name: 'Amit Sharma',
        email: 'amit@example.com',
        treesToPlant: 30,
        location: 'Near School',
        species: ['Gulmohar', 'Mango'],
        message: 'Want to contribute to environmental conservation',
        status: 'pending',
        createdAt: new Date()
      }
    ]
  }
  
  /**
   * Validate pledge data
   */
  private validatePledgeData(data: {
    name: string
    email: string
    treesToPlant: number
    phone?: string
    species?: string[]
  }): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Name is required')
    }
    
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new Error('Valid email is required')
    }
    
    if (!data.treesToPlant || data.treesToPlant < 1) {
      throw new Error('Number of trees must be at least 1')
    }
    
    if (data.treesToPlant > 1000) {
      throw new Error('Number of trees cannot exceed 1000 per pledge')
    }
    
    if (data.phone && !this.isValidPhone(data.phone)) {
      throw new Error('Invalid phone number format')
    }
    
    if (data.species && data.species.length > 10) {
      throw new Error('Cannot specify more than 10 species')
    }
  }
  
  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  /**
   * Validate phone number format (Indian)
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
  }
  
  /**
   * Get common tree species for suggestions
   */
  getCommonSpecies(): string[] {
    return [
      'Mango (Mangifera indica)',
      'Neem (Azadirachta indica)', 
      'Banyan (Ficus benghalensis)',
      'Peepal (Ficus religiosa)',
      'Gulmohar (Delonix regia)',
      'Jamun (Syzygium cumini)',
      'Guava (Psidium guajava)',
      'Jackfruit (Artocarpus heterophyllus)',
      'Coconut (Cocos nucifera)',
      'Teak (Tectona grandis)',
      'Sal (Shorea robusta)',
      'Deodar (Cedrus deodara)',
      'Chir Pine (Pinus roxburghii)',
      'Oak (Quercus species)',
      'Rhododendron (Rhododendron arboreum)'
    ]
  }
  
  /**
   * Calculate environmental impact of pledges
   */
  calculateEnvironmentalImpact(totalTrees: number): {
    co2AbsorptionKgPerYear: number
    oxygenProductionKgPerYear: number
    soilProtectionM2: number
    biodiversitySupport: string
  } {
    // Average tree absorbs 22kg CO2 per year and produces 17kg oxygen
    const co2AbsorptionKgPerYear = totalTrees * 22
    const oxygenProductionKgPerYear = totalTrees * 17
    
    // Each tree protects approximately 4-6 m2 of soil
    const soilProtectionM2 = totalTrees * 5
    
    return {
      co2AbsorptionKgPerYear,
      oxygenProductionKgPerYear,
      soilProtectionM2,
      biodiversitySupport: `Habitat for ${Math.round(totalTrees * 0.3)} bird species and ${Math.round(totalTrees * 0.8)} insect species`
    }
  }
}

// Default instance
export const treePledgeService = new TreePledgeService()