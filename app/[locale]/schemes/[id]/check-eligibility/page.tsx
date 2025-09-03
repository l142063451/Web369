'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface Scheme {
  id: string
  title: string
  category: string
  criteria: unknown
  docsRequired: string[]
  processSteps: string[]
}

interface EligibilityResult {
  eligible: boolean
  details: {
    explanation: string
    nextSteps: string[]
  }
}

export default function CheckEligibilityPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('schemes')
  const [scheme, setScheme] = useState<Scheme | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<EligibilityResult | null>(null)
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm()

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

  const onSubmit = async (formData: any) => {
    if (!scheme) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/schemes/${scheme.id}/eligibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: formData
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setResult(data.result)
      } else {
        console.error('Failed to check eligibility:', data.error)
      }
    } catch (error) {
      console.error('Error checking eligibility:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <Card>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!scheme) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('scheme_not_found', { default: 'Scheme Not Found' })}
          </h1>
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

  if (result) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link href={`/schemes/${scheme.id}`} className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              {t('back_to_scheme', { default: 'Back to Scheme' })}
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('eligibility_result', { default: 'Eligibility Result' })}
            </h1>
            <p className="text-gray-600">
              {scheme.title}
            </p>
          </div>

          {/* Result */}
          <Card className={`mb-6 ${result.eligible ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardHeader>
              <CardTitle className={`flex items-center ${result.eligible ? 'text-green-800' : 'text-red-800'}`}>
                {result.eligible ? (
                  <CheckCircleIcon className="h-6 w-6 mr-2" />
                ) : (
                  <XCircleIcon className="h-6 w-6 mr-2" />
                )}
                {result.eligible 
                  ? t('eligible', { default: 'You are eligible!' })
                  : t('not_eligible', { default: 'You are not eligible' })
                }
              </CardTitle>
              <CardDescription className={result.eligible ? 'text-green-700' : 'text-red-700'}>
                {result.details.explanation}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t('next_steps', { default: 'Next Steps' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {result.details.nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-sm rounded-full flex items-center justify-center mr-3 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{step}</span>
                  </li>
                ))}
              </ul>

              {result.eligible && (
                <div className="mt-6 pt-4 border-t">
                  <Link href="/forms">
                    <Button className="bg-green-600 hover:bg-green-700 mr-4">
                      {t('apply_now', { default: 'Apply Now' })}
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={() => setResult(null)}>
                    {t('check_again', { default: 'Check Again' })}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/schemes/${scheme.id}`} className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            {t('back_to_scheme', { default: 'Back to Scheme' })}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('check_eligibility', { default: 'Check Eligibility' })}
          </h1>
          <p className="text-gray-600">
            {scheme.title} • <Badge variant="secondary">{scheme.category}</Badge>
          </p>
        </div>

        {/* Eligibility Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t('eligibility_questions', { default: 'Eligibility Questions' })}</CardTitle>
            <CardDescription>
              {t('answer_questions_description', { default: 'Please answer the following questions to check your eligibility' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Common eligibility fields - these would be dynamically generated based on scheme criteria */}
              <div className="space-y-2">
                <Label htmlFor="age">{t('age', { default: 'Age' })}</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder={t('enter_age', { default: 'Enter your age' })}
                  {...register('age', { required: 'Age is required', min: 0, max: 150 })}
                />
                {errors.age && (
                  <p className="text-red-600 text-sm">{errors.age.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="annualIncome">{t('annual_income', { default: 'Annual Income (₹)' })}</Label>
                <Input
                  id="annualIncome"
                  type="number"
                  placeholder={t('enter_income', { default: 'Enter your annual income' })}
                  {...register('annualIncome', { required: 'Income is required', min: 0 })}
                />
                {errors.annualIncome && (
                  <p className="text-red-600 text-sm">{errors.annualIncome.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">{t('category', { default: 'Category' })}</Label>
                <Select onValueChange={(value) => setValue('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('select_category', { default: 'Select your category' })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="obc">OBC</SelectItem>
                    <SelectItem value="sc">SC</SelectItem>
                    <SelectItem value="st">ST</SelectItem>
                    <SelectItem value="ews">EWS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="residenceArea">{t('residence_area', { default: 'Residence Area' })}</Label>
                <Select onValueChange={(value) => setValue('residenceArea', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('select_residence', { default: 'Select your residence area' })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damday-chuanala">Damday-Chuanala</SelectItem>
                    <SelectItem value="gangolihat">Gangolihat</SelectItem>
                    <SelectItem value="pithoragarh">Pithoragarh</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <AlertDescription>
                  {t('privacy_note', { default: 'Your information is only used to check eligibility and is not stored permanently.' })}
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-700">
                  {submitting ? t('checking', { default: 'Checking...' }) : t('check_eligibility', { default: 'Check Eligibility' })}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  {t('cancel', { default: 'Cancel' })}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}