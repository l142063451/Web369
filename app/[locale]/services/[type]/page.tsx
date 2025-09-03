/**
 * Individual Service Request Page - PR08
 * Handles service-specific form submissions using Form Builder from PR07
 */

import { notFound } from 'next/navigation'
import { getServiceCategory, SERVICE_CATEGORIES, type ServiceType } from '@/lib/services/config'
import { getServiceFormSchema } from '@/lib/services/service'
import ServiceRequestForm from './ServiceRequestForm'

interface ServiceTypePageProps {
  params: {
    locale: string
    type: string
  }
}

export default function ServiceTypePage({ params }: ServiceTypePageProps) {
  const { type } = params
  
  // Validate service type
  if (!SERVICE_CATEGORIES[type as ServiceType]) {
    notFound()
  }
  
  const serviceType = type as ServiceType
  const serviceConfig = getServiceCategory(serviceType)
  const formSchema = getServiceFormSchema(serviceType)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Service Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className={`
              flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center text-3xl
              bg-${serviceConfig.color}-100 text-${serviceConfig.color}-800 border border-${serviceConfig.color}-200
            `}>
              {serviceConfig.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {serviceConfig.name}
              </h1>
              <p className="text-gray-600 text-lg mb-4">
                {serviceConfig.description}
              </p>
              
              {/* Service Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-900">Processing Time</div>
                  <div className="text-gray-600">
                    {serviceConfig.slaDays === 1 ? '1 day' : `${serviceConfig.slaDays} days`}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-900">Documents Required</div>
                  <div className="text-gray-600">
                    {serviceConfig.requiresDocuments ? 'Yes' : 'No'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-900">Approval Process</div>
                  <div className="text-gray-600">
                    {serviceConfig.workflow.approvalRequired ? 'Manual Review' : 'Automated'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Process Steps */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Process</h2>
          <div className="space-y-4">
            {serviceConfig.workflow.steps.map((step, index) => (
              <div key={step.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{step.name}</div>
                  <div className="text-gray-600 text-sm">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Submit Application</h2>
            <p className="text-gray-600 text-sm mt-1">
              Fill out the form below to submit your {serviceConfig.name.toLowerCase()} request.
            </p>
          </div>
          
          <ServiceRequestForm 
            serviceType={serviceType}
            serviceConfig={serviceConfig}
            formSchema={formSchema}
          />
        </div>
      </div>
    </div>
  )
}

// Generate static params for known service types
export async function generateStaticParams() {
  return Object.keys(SERVICE_CATEGORIES).map((type) => ({
    type,
  }))
}