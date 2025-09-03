'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { JsonLogicEditor } from './JsonLogicEditor'

interface SchemeFormData {
  title: string
  category: string
  criteria?: unknown
  docsRequired: string[]
  processSteps: string[]
  links: string[]
  active: boolean
}

interface SchemeEditorProps {
  initialData?: Partial<SchemeFormData>
  onSubmit: (data: SchemeFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  mode: 'create' | 'edit'
}

export function SchemeEditor({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  mode 
}: SchemeEditorProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'criteria' | 'process'>('basic')
  const [docsRequired, setDocsRequired] = useState<string[]>(initialData?.docsRequired || [])
  const [processSteps, setProcessSteps] = useState<string[]>(initialData?.processSteps || [])
  const [links, setLinks] = useState<string[]>(initialData?.links || [])
  const [criteria, setCriteria] = useState<unknown>(initialData?.criteria || {})

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<SchemeFormData>({
    defaultValues: {
      title: initialData?.title || '',
      category: initialData?.category || '',
      active: initialData?.active ?? true
    }
  })

  const handleFormSubmit = async (data: SchemeFormData) => {
    try {
      const formData: SchemeFormData = {
        ...data,
        criteria,
        docsRequired,
        processSteps,
        links
      }
      await onSubmit(formData)
    } catch (error) {
      console.error('Failed to submit scheme:', error)
    }
  }

  const addDoc = () => setDocsRequired([...docsRequired, ''])
  const removeDoc = (index: number) => setDocsRequired(docsRequired.filter((_, i) => i !== index))
  const updateDoc = (index: number, value: string) => {
    const newDocs = [...docsRequired]
    newDocs[index] = value
    setDocsRequired(newDocs)
  }

  const addStep = () => setProcessSteps([...processSteps, ''])
  const removeStep = (index: number) => setProcessSteps(processSteps.filter((_, i) => i !== index))
  const updateStep = (index: number, value: string) => {
    const newSteps = [...processSteps]
    newSteps[index] = value
    setProcessSteps(newSteps)
  }

  const addLink = () => setLinks([...links, ''])
  const removeLink = (index: number) => setLinks(links.filter((_, i) => i !== index))
  const updateLink = (index: number, value: string) => {
    const newLinks = [...links]
    newLinks[index] = value
    setLinks(newLinks)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === 'create' ? 'Create New Scheme' : 'Edit Scheme'}
        </h1>
        <p className="text-gray-600">
          {mode === 'create' 
            ? 'Add a new government scheme with eligibility criteria'
            : 'Update scheme details and eligibility rules'
          }
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'basic'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Basic Information
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('criteria')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'criteria'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Eligibility Criteria
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('process')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'process'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Process & Documents
          </button>
        </nav>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Basic Information Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scheme Details</CardTitle>
                <CardDescription>
                  Basic information about the government scheme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Scheme Title *</Label>
                  <Input
                    id="title"
                    {...register('title', { required: 'Title is required' })}
                    placeholder="Enter scheme title..."
                  />
                  {errors.title && (
                    <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    {...register('category', { required: 'Category is required' })}
                    placeholder="e.g., Education, Health, Agriculture..."
                  />
                  {errors.category && (
                    <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="active"
                    checked={watch('active')}
                    onCheckedChange={(checked) => setValue('active', !!checked)}
                  />
                  <Label htmlFor="active">Active (visible to citizens)</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Eligibility Criteria Tab */}
        {activeTab === 'criteria' && (
          <div className="space-y-6">
            <JsonLogicEditor
              value={criteria}
              onChange={setCriteria}
            />
          </div>
        )}

        {/* Process & Documents Tab */}
        {activeTab === 'process' && (
          <div className="space-y-6">
            {/* Required Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  Required Documents
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDoc}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Document
                  </Button>
                </CardTitle>
                <CardDescription>
                  List all documents applicants need to submit
                </CardDescription>
              </CardHeader>
              <CardContent>
                {docsRequired.length > 0 ? (
                  <div className="space-y-3">
                    {docsRequired.map((doc, index) => (
                      <div key={index} className="flex gap-3">
                        <Input
                          value={doc}
                          onChange={(e) => updateDoc(index, e.target.value)}
                          placeholder="Document name..."
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeDoc(index)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No documents added yet. Click &ldquo;Add Document&rdquo; to get started.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Process Steps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  Application Process Steps
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addStep}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </CardTitle>
                <CardDescription>
                  Step-by-step application process for applicants
                </CardDescription>
              </CardHeader>
              <CardContent>
                {processSteps.length > 0 ? (
                  <div className="space-y-3">
                    {processSteps.map((step, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium mt-1">
                          {index + 1}
                        </div>
                        <Textarea
                          value={step}
                          onChange={(e) => updateStep(index, e.target.value)}
                          placeholder="Describe this step..."
                          className="flex-1"
                          rows={2}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeStep(index)}
                          className="mt-1"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No process steps added yet. Click &ldquo;Add Step&rdquo; to get started.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Useful Links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  Useful Links
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLink}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Link
                  </Button>
                </CardTitle>
                <CardDescription>
                  External links for more information or official forms
                </CardDescription>
              </CardHeader>
              <CardContent>
                {links.length > 0 ? (
                  <div className="space-y-3">
                    {links.map((link, index) => (
                      <div key={index} className="flex gap-3">
                        <Input
                          value={link}
                          onChange={(e) => updateLink(index, e.target.value)}
                          placeholder="https://..."
                          type="url"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeLink(index)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No links added yet. Click &ldquo;Add Link&rdquo; to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-between pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          
          <div className="flex gap-3">
            {activeTab !== 'basic' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (activeTab === 'criteria') setActiveTab('basic')
                  if (activeTab === 'process') setActiveTab('criteria')
                }}
              >
                Previous
              </Button>
            )}
            
            {activeTab !== 'process' && (
              <Button
                type="button"
                onClick={() => {
                  if (activeTab === 'basic') setActiveTab('criteria')
                  if (activeTab === 'criteria') setActiveTab('process')
                }}
              >
                Next
              </Button>
            )}
            
            {activeTab === 'process' && (
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Saving...' : (mode === 'create' ? 'Create Scheme' : 'Update Scheme')}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}