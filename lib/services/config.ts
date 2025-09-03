/**
 * Service Configuration for PR08
 * Defines available citizen services with SLA and metadata
 */

export type ServiceType = 'complaint' | 'rti' | 'certificate' | 'waste' | 'water-tanker'

export interface ServiceCategory {
  id: ServiceType
  name: string
  nameHi: string
  description: string
  descriptionHi: string
  icon: string
  color: 'red' | 'blue' | 'green' | 'yellow' | 'purple'
  slaDays: number
  requiresDocuments: boolean
  allowedFileTypes: string[]
  maxFileSize: number // in bytes
  workflow: ServiceWorkflow
}

export interface ServiceWorkflow {
  steps: WorkflowStep[]
  approvalRequired: boolean
  autoAssignment: boolean
  escalationDays: number
}

export interface WorkflowStep {
  id: string
  name: string
  nameHi: string
  description: string
  descriptionHi: string
  role: string // Required role to process this step
  canReject: boolean
}

// Service Category Definitions as per PR08 requirements
export const SERVICE_CATEGORIES: Record<ServiceType, ServiceCategory> = {
  complaint: {
    id: 'complaint',
    name: 'General Complaint',
    nameHi: 'सामान्य शिकायत',
    description: 'Report issues and grievances',
    descriptionHi: 'समस्याओं और शिकायतों की रिपोर्ट करें',
    icon: '📝',
    color: 'red',
    slaDays: 7,
    requiresDocuments: false,
    allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    workflow: {
      steps: [
        {
          id: 'received',
          name: 'Received',
          nameHi: 'प्राप्त',
          description: 'Complaint has been received and logged',
          descriptionHi: 'शिकायत प्राप्त और दर्ज की गई है',
          role: 'system',
          canReject: false
        },
        {
          id: 'under_review',
          name: 'Under Review',
          nameHi: 'समीक्षाधीन',
          description: 'Complaint is being reviewed by staff',
          descriptionHi: 'शिकायत का स्टाफ द्वारा समीक्षा की जा रही है',
          role: 'staff',
          canReject: true
        },
        {
          id: 'resolved',
          name: 'Resolved',
          nameHi: 'हल',
          description: 'Complaint has been resolved',
          descriptionHi: 'शिकायत का समाधान हो गया है',
          role: 'staff',
          canReject: false
        }
      ],
      approvalRequired: false,
      autoAssignment: true,
      escalationDays: 5
    }
  },
  
  rti: {
    id: 'rti',
    name: 'RTI Request',
    nameHi: 'RTI अनुरोध',
    description: 'Right to Information requests',
    descriptionHi: 'सूचना के अधिकार अनुरोध',
    icon: '📄',
    color: 'blue',
    slaDays: 30,
    requiresDocuments: false,
    allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    workflow: {
      steps: [
        {
          id: 'received',
          name: 'Received',
          nameHi: 'प्राप्त',
          description: 'RTI request has been received',
          descriptionHi: 'RTI अनुरोध प्राप्त हुआ है',
          role: 'system',
          canReject: false
        },
        {
          id: 'processing',
          name: 'Processing',
          nameHi: 'प्रसंस्करण',
          description: 'Information is being compiled',
          descriptionHi: 'जानकारी एकत्र की जा रही है',
          role: 'rti_officer',
          canReject: true
        },
        {
          id: 'completed',
          name: 'Completed',
          nameHi: 'पूर्ण',
          description: 'Information has been provided',
          descriptionHi: 'जानकारी प्रदान की गई है',
          role: 'rti_officer',
          canReject: false
        }
      ],
      approvalRequired: false,
      autoAssignment: true,
      escalationDays: 25
    }
  },
  
  certificate: {
    id: 'certificate',
    name: 'Certificate Request',
    nameHi: 'प्रमाण पत्र अनुरोध',
    description: 'Birth, death, income, domicile certificates',
    descriptionHi: 'जन्म, मृत्यु, आय, निवास प्रमाण पत्र',
    icon: '🎫',
    color: 'green',
    slaDays: 14,
    requiresDocuments: true,
    allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    workflow: {
      steps: [
        {
          id: 'received',
          name: 'Received',
          nameHi: 'प्राप्त',
          description: 'Certificate request has been received',
          descriptionHi: 'प्रमाण पत्र अनुरोध प्राप्त हुआ है',
          role: 'system',
          canReject: false
        },
        {
          id: 'document_verification',
          name: 'Document Verification',
          nameHi: 'दस्तावेज़ सत्यापन',
          description: 'Supporting documents are being verified',
          descriptionHi: 'सहायक दस्तावेजों का सत्यापन किया जा रहा है',
          role: 'verifier',
          canReject: true
        },
        {
          id: 'approval',
          name: 'Approval',
          nameHi: 'अनुमोदन',
          description: 'Certificate is being approved',
          descriptionHi: 'प्रमाण पत्र को मंजूरी दी जा रही है',
          role: 'approver',
          canReject: true
        },
        {
          id: 'issued',
          name: 'Issued',
          nameHi: 'जारी',
          description: 'Certificate has been issued',
          descriptionHi: 'प्रमाण पत्र जारी किया गया है',
          role: 'approver',
          canReject: false
        }
      ],
      approvalRequired: true,
      autoAssignment: true,
      escalationDays: 10
    }
  },
  
  waste: {
    id: 'waste',
    name: 'Waste Management',
    nameHi: 'अपशिष्ट प्रबंधन',
    description: 'Waste collection and management requests',
    descriptionHi: 'अपशिष्ट संग्रह और प्रबंधन अनुरोध',
    icon: '🗑️',
    color: 'yellow',
    slaDays: 3,
    requiresDocuments: false,
    allowedFileTypes: ['image/jpeg', 'image/png'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    workflow: {
      steps: [
        {
          id: 'received',
          name: 'Received',
          nameHi: 'प्राप्त',
          description: 'Waste collection request received',
          descriptionHi: 'अपशिष्ट संग्रह अनुरोध प्राप्त',
          role: 'system',
          canReject: false
        },
        {
          id: 'scheduled',
          name: 'Scheduled',
          nameHi: 'अनुसूचित',
          description: 'Collection has been scheduled',
          descriptionHi: 'संग्रह की अनुसूची बनाई गई है',
          role: 'waste_coordinator',
          canReject: true
        },
        {
          id: 'completed',
          name: 'Completed',
          nameHi: 'पूर्ण',
          description: 'Waste has been collected',
          descriptionHi: 'अपशिष्ट का संग्रह हो गया है',
          role: 'waste_coordinator',
          canReject: false
        }
      ],
      approvalRequired: false,
      autoAssignment: true,
      escalationDays: 2
    }
  },
  
  'water-tanker': {
    id: 'water-tanker',
    name: 'Water Tanker Request',
    nameHi: 'पानी टैंकर अनुरोध',
    description: 'Request water tanker delivery',
    descriptionHi: 'पानी टैंकर डिलीवरी का अनुरोध',
    icon: '🚚',
    color: 'purple',
    slaDays: 2,
    requiresDocuments: false,
    allowedFileTypes: ['image/jpeg', 'image/png'],
    maxFileSize: 3 * 1024 * 1024, // 3MB
    workflow: {
      steps: [
        {
          id: 'received',
          name: 'Received',
          nameHi: 'प्राप्त',
          description: 'Water tanker request received',
          descriptionHi: 'पानी टैंकर अनुरोध प्राप्त',
          role: 'system',
          canReject: false
        },
        {
          id: 'dispatched',
          name: 'Dispatched',
          nameHi: 'भेजा गया',
          description: 'Water tanker has been dispatched',
          descriptionHi: 'पानी टैंकर भेजा गया है',
          role: 'water_coordinator',
          canReject: true
        },
        {
          id: 'delivered',
          name: 'Delivered',
          nameHi: 'वितरित',
          description: 'Water has been delivered',
          descriptionHi: 'पानी वितरित किया गया है',
          role: 'water_coordinator',
          canReject: false
        }
      ],
      approvalRequired: false,
      autoAssignment: true,
      escalationDays: 1
    }
  }
}

// Helper functions
export function getServiceCategory(type: ServiceType): ServiceCategory {
  return SERVICE_CATEGORIES[type]
}

export function getAllServiceCategories(): ServiceCategory[] {
  return Object.values(SERVICE_CATEGORIES)
}

export function getServicesByColor(color: ServiceCategory['color']): ServiceCategory[] {
  return Object.values(SERVICE_CATEGORIES).filter(service => service.color === color)
}

export function getServiceWorkflowSteps(type: ServiceType): WorkflowStep[] {
  return SERVICE_CATEGORIES[type].workflow.steps
}

export function getServiceSLA(type: ServiceType): number {
  return SERVICE_CATEGORIES[type].slaDays
}

// Status colors for UI
export const STATUS_COLORS = {
  red: 'bg-red-100 text-red-800 border-red-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200', 
  green: 'bg-green-100 text-green-800 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200'
} as const