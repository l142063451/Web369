'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronRightIcon, FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Scheme {
  id: string
  title: string
  category: string
  docsRequired: string[]
  processSteps: string[]
  links: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

interface Category {
  category: string
  count: number
}

export default function SchemesPage() {
  const t = useTranslations('schemes')
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  useEffect(() => {
    fetchSchemes()
    fetchCategories()
  }, [selectedCategory, searchTerm])

  const fetchSchemes = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory) params.set('category', selectedCategory)
      if (searchTerm) params.set('search', searchTerm)

      const response = await fetch(`/api/schemes?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setSchemes(data.schemes)
      } else {
        console.error('Failed to fetch schemes:', data.error)
      }
    } catch (error) {
      console.error('Error fetching schemes:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/schemes/categories')
      const data = await response.json()
      
      if (response.ok) {
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handleCategoryFilter = (value: string) => {
    setSelectedCategory(value === 'all' ? '' : value)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('title', { default: 'Government Schemes & Benefits' })}
        </h1>
        <p className="text-gray-600 text-lg">
          {t('subtitle', { default: 'Explore government schemes and check your eligibility' })}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder={t('search_placeholder', { default: 'Search schemes...' })}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <div className="sm:w-64">
          <Select onValueChange={handleCategoryFilter} defaultValue="all">
            <SelectTrigger>
              <FunnelIcon className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('filter_by_category', { default: 'Filter by category' })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_categories', { default: 'All Categories' })}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.category} value={cat.category}>
                  {cat.category} ({cat.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Schemes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : schemes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schemes.map((scheme) => (
            <Card key={scheme.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-green-600 transition-colors">
                      {scheme.title}
                    </CardTitle>
                    <CardDescription>
                      <Badge variant="secondary" className="mt-1">
                        {scheme.category}
                      </Badge>
                    </CardDescription>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {scheme.docsRequired.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {t('required_documents', { default: 'Required Documents' })}:
                      </p>
                      <p className="text-sm text-gray-600">
                        {scheme.docsRequired.slice(0, 2).join(', ')}
                        {scheme.docsRequired.length > 2 && ` +${scheme.docsRequired.length - 2} more`}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Link href={`/schemes/${scheme.id}`} className="flex-1">
                    <Button className="w-full" variant="outline">
                      {t('view_details', { default: 'View Details' })}
                    </Button>
                  </Link>
                  <Link href={`/schemes/${scheme.id}/check-eligibility`}>
                    <Button className="bg-green-600 hover:bg-green-700">
                      {t('check_eligibility', { default: 'Check Eligibility' })}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('no_schemes_found', { default: 'No schemes found' })}
          </h3>
          <p className="text-gray-600">
            {t('try_different_search', { default: 'Try adjusting your search or filter criteria' })}
          </p>
        </div>
      )}
    </div>
  )
}