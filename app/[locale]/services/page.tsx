/**
 * Services Catalog Page - PR08
 * Displays all available citizen services
 */

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { getAllServiceCategories, STATUS_COLORS, type ServiceCategory } from '@/lib/services/config'

export default function ServicesPage() {
  const t = useTranslations('services')
  const services = getAllServiceCategories()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('title', { defaultValue: 'Government Services' })}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('subtitle', { 
              defaultValue: 'Access various government services online. Submit requests, track status, and get updates.' 
            })}
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>

        {/* Help Section */}
        <div className="mt-16 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('help.title', { defaultValue: 'Need Help?' })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">
                {t('help.how_to_apply', { defaultValue: 'How to Apply' })}
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {t('help.step1', { defaultValue: 'Select the service you need' })}</li>
                <li>• {t('help.step2', { defaultValue: 'Fill out the application form' })}</li>
                <li>• {t('help.step3', { defaultValue: 'Upload required documents' })}</li>
                <li>• {t('help.step4', { defaultValue: 'Submit and track your request' })}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">
                {t('help.contact', { defaultValue: 'Contact Support' })}
              </h3>
              <div className="text-sm text-gray-600">
                <p>{t('help.phone', { defaultValue: 'Phone: +91-XXXX-XXXXXX' })}</p>
                <p>{t('help.email', { defaultValue: 'Email: support@example.com' })}</p>
                <p>{t('help.office_hours', { defaultValue: 'Office Hours: 9 AM - 5 PM' })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ServiceCardProps {
  service: ServiceCategory
}

function ServiceCard({ service }: ServiceCardProps) {
  const t = useTranslations('services')
  
  return (
    <Link href={`/services/${service.id}`} className="block group">
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-6 border border-gray-200 group-hover:border-gray-300">
        {/* Service Icon and Title */}
        <div className="flex items-start space-x-4 mb-4">
          <div className={`
            flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-2xl
            ${STATUS_COLORS[service.color]}
          `}>
            {service.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
              {service.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {service.description}
            </p>
          </div>
        </div>

        {/* Service Details */}
        <div className="space-y-3">
          {/* SLA Information */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {t('processing_time', { defaultValue: 'Processing Time' })}:
            </span>
            <span className="font-medium text-gray-900">
              {service.slaDays === 1 
                ? t('days_single', { defaultValue: '1 day' })
                : t('days_multiple', { days: service.slaDays, defaultValue: `${service.slaDays} days` })
              }
            </span>
          </div>

          {/* Documents Required */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {t('documents_required', { defaultValue: 'Documents Required' })}:
            </span>
            <span className={`
              px-2 py-1 rounded-full text-xs font-medium
              ${service.requiresDocuments 
                ? 'bg-amber-100 text-amber-800' 
                : 'bg-green-100 text-green-800'
              }
            `}>
              {service.requiresDocuments 
                ? t('yes', { defaultValue: 'Yes' })
                : t('no', { defaultValue: 'No' })
              }
            </span>
          </div>

          {/* Apply Button */}
          <div className="pt-2">
            <div className="w-full bg-blue-600 text-white text-center py-2 px-4 rounded-md text-sm font-medium group-hover:bg-blue-700 transition-colors">
              {t('apply_now', { defaultValue: 'Apply Now' })}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}