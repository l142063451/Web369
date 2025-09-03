/**
 * Services Integration Layer for PR08
 * Connects service categories to Form Builder system from PR07
 */

import type { FormFieldDefinition } from '@/lib/forms/schema'
import { createSubmission, type Submission } from '@/lib/forms/service'
import { SERVICE_CATEGORIES, type ServiceType, type ServiceCategory, getServiceCategory } from './config'
import { auditLogger } from '@/lib/auth/audit-logger'

export interface ServiceFormData {
  serviceType: ServiceType
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  contactInfo: {
    name: string
    phone?: string
    email?: string
    address?: string
  }
  location?: {
    lat: number
    lng: number
    address: string
  }
  // Dynamic fields based on service type
  [key: string]: any
}

// Pre-defined form schemas for each service type
export const SERVICE_FORM_SCHEMAS: Record<ServiceType, FormFieldDefinition[]> = {
  complaint: [
    {
      id: 'title',
      type: 'text',
      label: 'Complaint Title',
      description: 'Brief title describing your complaint',
      required: true,
      validation: { minLength: 10, maxLength: 100 }
    },
    {
      id: 'description',
      type: 'textarea',
      label: 'Complaint Description',
      description: 'Detailed description of your complaint',
      required: true,
      validation: { minLength: 50, maxLength: 1000 }
    },
    {
      id: 'priority',
      type: 'select',
      label: 'Priority Level',
      description: 'How urgent is this complaint?',
      required: true,
      options: [
        { label: 'Low - Non-urgent', value: 'low' },
        { label: 'Medium - Moderate urgency', value: 'medium' },
        { label: 'High - Urgent', value: 'high' },
        { label: 'Critical - Emergency', value: 'urgent' }
      ]
    },
    {
      id: 'category',
      type: 'select',
      label: 'Complaint Category',
      required: true,
      options: [
        { label: 'Infrastructure', value: 'infrastructure' },
        { label: 'Sanitation', value: 'sanitation' },
        { label: 'Water Supply', value: 'water' },
        { label: 'Electricity', value: 'electricity' },
        { label: 'Road/Transport', value: 'transport' },
        { label: 'Other', value: 'other' }
      ]
    },
    {
      id: 'location',
      type: 'geo',
      label: 'Location',
      description: 'Where is this complaint about?',
      required: false
    },
    {
      id: 'attachments',
      type: 'file',
      label: 'Supporting Photos/Documents',
      description: 'Upload photos or documents related to your complaint',
      required: false,
      fileConstraints: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        maxFiles: 3
      }
    }
  ],
  
  rti: [
    {
      id: 'title',
      type: 'text',
      label: 'RTI Request Title',
      description: 'Brief title for your information request',
      required: true,
      validation: { minLength: 10, maxLength: 100 }
    },
    {
      id: 'information_sought',
      type: 'textarea',
      label: 'Information Sought',
      description: 'Clearly describe what information you are seeking',
      required: true,
      validation: { minLength: 50, maxLength: 2000 }
    },
    {
      id: 'department',
      type: 'select',
      label: 'Relevant Department',
      required: true,
      options: [
        { label: 'Administration', value: 'admin' },
        { label: 'Public Works', value: 'pwd' },
        { label: 'Health', value: 'health' },
        { label: 'Education', value: 'education' },
        { label: 'Finance', value: 'finance' },
        { label: 'Other', value: 'other' }
      ]
    },
    {
      id: 'reason',
      type: 'textarea',
      label: 'Reason for Information',
      description: 'Why do you need this information? (Optional but helpful)',
      required: false,
      validation: { maxLength: 500 }
    },
    {
      id: 'preferred_format',
      type: 'radio',
      label: 'Preferred Information Format',
      required: true,
      options: [
        { label: 'Digital Copy (Email)', value: 'digital' },
        { label: 'Physical Copy', value: 'physical' },
        { label: 'Inspection of Records', value: 'inspection' }
      ]
    }
  ],
  
  certificate: [
    {
      id: 'certificate_type',
      type: 'select',
      label: 'Certificate Type',
      required: true,
      options: [
        { label: 'Birth Certificate', value: 'birth' },
        { label: 'Death Certificate', value: 'death' },
        { label: 'Income Certificate', value: 'income' },
        { label: 'Domicile Certificate', value: 'domicile' },
        { label: 'Caste Certificate', value: 'caste' },
        { label: 'Character Certificate', value: 'character' }
      ]
    },
    {
      id: 'applicant_name',
      type: 'text',
      label: 'Applicant Full Name',
      description: 'Name as per official documents',
      required: true,
      validation: { minLength: 2, maxLength: 100 }
    },
    {
      id: 'father_name',
      type: 'text',
      label: 'Father\'s Name',
      required: true,
      validation: { minLength: 2, maxLength: 100 }
    },
    {
      id: 'mother_name',
      type: 'text',
      label: 'Mother\'s Name',
      required: true,
      validation: { minLength: 2, maxLength: 100 }
    },
    {
      id: 'date_of_birth',
      type: 'date',
      label: 'Date of Birth',
      required: true
    },
    {
      id: 'gender',
      type: 'radio',
      label: 'Gender',
      required: true,
      options: [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Other', value: 'other' }
      ]
    },
    {
      id: 'address',
      type: 'textarea',
      label: 'Current Address',
      required: true,
      validation: { minLength: 10, maxLength: 200 }
    },
    {
      id: 'purpose',
      type: 'text',
      label: 'Purpose of Certificate',
      description: 'Why do you need this certificate?',
      required: true,
      validation: { minLength: 5, maxLength: 100 }
    },
    {
      id: 'supporting_documents',
      type: 'file',
      label: 'Supporting Documents',
      description: 'Upload relevant supporting documents',
      required: true,
      fileConstraints: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxFiles: 5
      }
    }
  ],
  
  waste: [
    {
      id: 'waste_type',
      type: 'select',
      label: 'Waste Type',
      required: true,
      options: [
        { label: 'Household Waste', value: 'household' },
        { label: 'Garden/Organic Waste', value: 'organic' },
        { label: 'Construction Debris', value: 'construction' },
        { label: 'Electronic Waste', value: 'electronic' },
        { label: 'Bulk Items', value: 'bulk' },
        { label: 'Other', value: 'other' }
      ]
    },
    {
      id: 'quantity',
      type: 'select',
      label: 'Approximate Quantity',
      required: true,
      options: [
        { label: 'Small (1-2 bags)', value: 'small' },
        { label: 'Medium (3-5 bags)', value: 'medium' },
        { label: 'Large (6-10 bags)', value: 'large' },
        { label: 'Bulk (10+ bags/items)', value: 'bulk' }
      ]
    },
    {
      id: 'collection_address',
      type: 'textarea',
      label: 'Collection Address',
      description: 'Complete address where waste should be collected',
      required: true,
      validation: { minLength: 10, maxLength: 200 }
    },
    {
      id: 'preferred_time',
      type: 'select',
      label: 'Preferred Collection Time',
      required: true,
      options: [
        { label: 'Morning (6 AM - 11 AM)', value: 'morning' },
        { label: 'Afternoon (11 AM - 4 PM)', value: 'afternoon' },
        { label: 'Evening (4 PM - 7 PM)', value: 'evening' }
      ]
    },
    {
      id: 'special_instructions',
      type: 'textarea',
      label: 'Special Instructions',
      description: 'Any special handling requirements or access instructions',
      required: false,
      validation: { maxLength: 300 }
    },
    {
      id: 'location',
      type: 'geo',
      label: 'Collection Location',
      description: 'Mark the exact location for collection',
      required: true
    }
  ],
  
  'water-tanker': [
    {
      id: 'delivery_address',
      type: 'textarea',
      label: 'Delivery Address',
      description: 'Complete address where water should be delivered',
      required: true,
      validation: { minLength: 10, maxLength: 200 }
    },
    {
      id: 'water_quantity',
      type: 'select',
      label: 'Water Quantity Required',
      required: true,
      options: [
        { label: '1000 Litres', value: '1000' },
        { label: '2000 Litres', value: '2000' },
        { label: '3000 Litres', value: '3000' },
        { label: '5000 Litres', value: '5000' },
        { label: 'Other (specify in notes)', value: 'other' }
      ]
    },
    {
      id: 'urgency',
      type: 'radio',
      label: 'Urgency Level',
      required: true,
      options: [
        { label: 'Regular (within 2 days)', value: 'regular' },
        { label: 'Urgent (within 24 hours)', value: 'urgent' },
        { label: 'Emergency (immediate)', value: 'emergency' }
      ]
    },
    {
      id: 'reason',
      type: 'select',
      label: 'Reason for Request',
      required: true,
      options: [
        { label: 'No water supply', value: 'no_supply' },
        { label: 'Contaminated water', value: 'contaminated' },
        { label: 'Low pressure/insufficient', value: 'insufficient' },
        { label: 'Special event', value: 'event' },
        { label: 'Emergency', value: 'emergency' },
        { label: 'Other', value: 'other' }
      ]
    },
    {
      id: 'contact_person',
      type: 'text',
      label: 'Contact Person Name',
      description: 'Person who will receive the delivery',
      required: true,
      validation: { minLength: 2, maxLength: 50 }
    },
    {
      id: 'contact_phone',
      type: 'phone',
      label: 'Contact Phone Number',
      description: 'Phone number for delivery coordination',
      required: true
    },
    {
      id: 'preferred_time',
      type: 'select',
      label: 'Preferred Delivery Time',
      required: true,
      options: [
        { label: 'Morning (6 AM - 11 AM)', value: 'morning' },
        { label: 'Afternoon (11 AM - 4 PM)', value: 'afternoon' },
        { label: 'Evening (4 PM - 7 PM)', value: 'evening' },
        { label: 'Anytime', value: 'anytime' }
      ]
    },
    {
      id: 'location',
      type: 'geo',
      label: 'Delivery Location',
      description: 'Mark the exact delivery location',
      required: true
    },
    {
      id: 'additional_notes',
      type: 'textarea',
      label: 'Additional Notes',
      description: 'Any special instructions or access details',
      required: false,
      validation: { maxLength: 300 }
    }
  ]
}

// Service submission handler
export async function submitServiceRequest(
  serviceType: ServiceType,
  formData: ServiceFormData,
  userId?: string
): Promise<Submission> {
  const serviceConfig = getServiceCategory(serviceType)
  
  // Calculate SLA due date
  const slaDue = new Date()
  slaDue.setDate(slaDue.getDate() + serviceConfig.slaDays)
  
  // Create the submission using existing Form Builder system
  const submission = await createSubmission({
    formId: `service-${serviceType}`, // Virtual form ID for services
    userId: userId || undefined,
    data: formData,
    files: formData.attachments || [],
    geo: formData.location ? {
      lat: formData.location.lat,
      lng: formData.location.lng,
      address: formData.location.address
    } : undefined,
    metadata: {
      serviceType,
      priority: formData.priority || 'medium',
      workflowStep: serviceConfig.workflow.steps[0].id,
      slaDue: slaDue.toISOString()
    }
  })
  
  // Log the service request - use existing audit action
  await auditLogger.log({
    action: 'CREATE',
    resource: 'Service',
    resourceId: submission.id,
    actorId: userId || 'anonymous',
    metadata: {
      serviceType,
      title: formData.title,
      priority: formData.priority || 'medium'
    }
  })
  
  return submission
}

// Get form schema for a service type
export function getServiceFormSchema(serviceType: ServiceType): FormFieldDefinition[] {
  return SERVICE_FORM_SCHEMAS[serviceType] || []
}

// Validate service form data
export function validateServiceFormData(serviceType: ServiceType, data: any): { valid: boolean; errors: string[] } {
  const schema = getServiceFormSchema(serviceType)
  const errors: string[] = []
  
  // Check required fields
  for (const field of schema) {
    if (field.required && (!data[field.id] || data[field.id] === '')) {
      errors.push(`${field.label} is required`)
    }
    
    // Validate field-specific rules
    if (data[field.id] && field.validation) {
      const value = data[field.id]
      
      if (field.validation.minLength && value.length < field.validation.minLength) {
        errors.push(`${field.label} must be at least ${field.validation.minLength} characters`)
      }
      
      if (field.validation.maxLength && value.length > field.validation.maxLength) {
        errors.push(`${field.label} must not exceed ${field.validation.maxLength} characters`)
      }
      
      if (field.validation.min && typeof value === 'number' && value < field.validation.min) {
        errors.push(`${field.label} must be at least ${field.validation.min}`)
      }
      
      if (field.validation.max && typeof value === 'number' && value > field.validation.max) {
        errors.push(`${field.label} must not exceed ${field.validation.max}`)
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Update service request status (workflow progression)
export async function updateServiceStatus(
  submissionId: string,
  newStatus: string,
  userId: string,
  notes?: string
): Promise<void> {
  // This would integrate with the existing submission update logic from PR07
  // For now, just log the action
  await auditLogger.log({
    action: 'UPDATE',
    resource: 'Submission',
    resourceId: submissionId,
    actorId: userId,
    metadata: {
      newStatus,
      notes
    }
  })
}

// Get service statistics for dashboard
export interface ServiceStats {
  totalRequests: number
  pendingRequests: number
  completedRequests: number
  avgResolutionTime: number
  slaBreaches: number
  requestsByType: Record<ServiceType, number>
}

export async function getServiceStats(): Promise<ServiceStats> {
  // This would query the actual database
  // For now, return mock data
  return {
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    avgResolutionTime: 0,
    slaBreaches: 0,
    requestsByType: {
      complaint: 0,
      rti: 0,
      certificate: 0,
      waste: 0,
      'water-tanker': 0
    }
  }
}