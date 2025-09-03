'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeftIcon, DocumentTextIcon, LinkIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Scheme {
  id: string
  title: string
  category: string
  criteria: unknown
  docsRequired: string[]
  processSteps: string[]
  links: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export default function SchemeDetailPage() {
  const params = useParams()
  const t = useTranslations('schemes')
  const [scheme, setScheme] = useState<Scheme | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchScheme(params.id as string)
    }
  }, [params.id])

  const fetchScheme = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/schemes/${id}`)
      const data = await response.json()
      
      if (response.ok) {
        setScheme(data.scheme)
      } else {
        console.error('Failed to fetch scheme:', data.error)
      }
    } catch (error) {
      console.error('Error fetching scheme:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!scheme) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('scheme_not_found', { default: 'Scheme Not Found' })}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('scheme_not_found_description', { default: 'The scheme you are looking for does not exist or has been removed.' })}
          </p>
          <Link href="/schemes">
            <Button variant="outline">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              {t('back_to_schemes', { default: 'Back to Schemes' })}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link href="/schemes" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          {t('back_to_schemes', { default: 'Back to Schemes' })}
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{scheme.title}</h1>
            <Badge variant="secondary" className="text-sm">
              {scheme.category}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Required Documents */}
          {scheme.docsRequired.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                  {t('required_documents', { default: 'Required Documents' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {scheme.docsRequired.map((doc, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{doc}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Process Steps */}
          {scheme.processSteps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t('application_process', { default: 'Application Process' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {scheme.processSteps.map((step, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white text-sm rounded-full flex items-center justify-center mr-3 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Useful Links */}
          {scheme.links.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LinkIcon className="h-5 w-5 mr-2 text-blue-600" />
                  {t('useful_links', { default: 'Useful Links' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {scheme.links.map((link, index) => (
                    <li key={index}>
                      <a 
                        href={link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Eligibility Check */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">
                {t('check_eligibility', { default: 'Check Eligibility' })}
              </CardTitle>
              <CardDescription>
                {t('eligibility_description', { default: 'Answer a few questions to see if you qualify for this scheme' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/schemes/${scheme.id}/check-eligibility`}>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  {t('start_eligibility_check', { default: 'Start Eligibility Check' })}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('quick_info', { default: 'Quick Information' })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {t('category', { default: 'Category' })}
                </p>
                <p className="text-gray-600">{scheme.category}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {t('documents_required', { default: 'Documents Required' })}
                </p>
                <p className="text-gray-600">{scheme.docsRequired.length} documents</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {t('process_steps', { default: 'Process Steps' })}
                </p>
                <p className="text-gray-600">{scheme.processSteps.length} steps</p>
              </div>
            </CardContent>
          </Card>

          {/* Help */}
          <Card className="bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800">
                {t('need_help', { default: 'Need Help?' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-700 text-sm mb-4">
                {t('help_description', { default: 'Contact our support team if you need assistance with your application.' })}
              </p>
              <Link href="/services">
                <Button variant="outline" size="sm" className="text-blue-700 border-blue-300 hover:bg-blue-100">
                  {t('contact_support', { default: 'Contact Support' })}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}