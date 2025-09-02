/**
 * Form Builder Component
 * Drag-and-drop form builder interface
 * Part of PR07: Form Builder & SLA Engine
 */

'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Trash2, GripVertical, Settings, Eye, Save } from 'lucide-react'
import { FormSchema, FormFieldDefinition, FieldType, getDefaultFormSchema } from '@/lib/forms/schema'

interface FormBuilderProps {
  initialSchema?: FormSchema
  onSave?: (schema: FormSchema) => void
  onPreview?: (schema: FormSchema) => void
}

interface FieldPaletteItem {
  id: string
  type: FieldType
  label: string
  icon: string
  description: string
}

const FIELD_PALETTE: FieldPaletteItem[] = [
  { id: 'text', type: 'text', label: 'Text Input', icon: '📝', description: 'Single line text input' },
  { id: 'textarea', type: 'textarea', label: 'Textarea', icon: '📄', description: 'Multi-line text input' },
  { id: 'email', type: 'email', label: 'Email', icon: '📧', description: 'Email address input' },
  { id: 'phone', type: 'phone', label: 'Phone', icon: '📞', description: 'Phone number input' },
  { id: 'number', type: 'number', label: 'Number', icon: '🔢', description: 'Numeric input' },
  { id: 'select', type: 'select', label: 'Dropdown', icon: '📋', description: 'Dropdown selection' },
  { id: 'radio', type: 'radio', label: 'Radio Buttons', icon: '🔘', description: 'Single choice options' },
  { id: 'checkbox', type: 'checkbox', label: 'Checkboxes', icon: '☑️', description: 'Multiple choice options' },
  { id: 'file', type: 'file', label: 'File Upload', icon: '📎', description: 'File upload field' },
  { id: 'date', type: 'date', label: 'Date', icon: '📅', description: 'Date picker' },
  { id: 'geo', type: 'geo', label: 'Location', icon: '📍', description: 'Geographic coordinates' },
  { id: 'boolean', type: 'boolean', label: 'Yes/No', icon: '✅', description: 'Boolean toggle' },
]

interface DraggableFieldProps {
  field: FormFieldDefinition
  index: number
  onEdit: (index: number) => void
  onDelete: (index: number) => void
}

function DraggableField({ field, index, onEdit, onDelete }: DraggableFieldProps) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="cursor-grab active:cursor-grabbing text-gray-400">
          <GripVertical size={20} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{field.label}</span>
            {field.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
            <Badge variant="outline" className="text-xs">{field.type}</Badge>
          </div>
          {field.description && (
            <p className="text-sm text-gray-600 mt-1">{field.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(index)}
          >
            <Settings size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(index)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function FormBuilder({ initialSchema, onSave, onPreview }: FormBuilderProps) {
  const [schema, setSchema] = useState<FormSchema>(() => {
    return initialSchema || {
      id: `form_${Date.now()}`,
      title: 'Untitled Form',
      description: '',
      fields: [],
      settings: {
        category: 'general',
        slaDays: 7,
        requiresAuth: false,
        allowAnonymous: true,
      },
    }
  })
  
  const [selectedField, setSelectedField] = useState<number | null>(null)

  const handleAddField = useCallback((fieldType: FieldType) => {
    const newField: FormFieldDefinition = {
      id: `field_${Date.now()}`,
      type: fieldType,
      label: `${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Field`,
      required: false,
      placeholder: '',
    }
    
    setSchema(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }))
  }, [])

  const handleFieldEdit = useCallback((index: number) => {
    setSelectedField(index)
  }, [])

  const handleFieldDelete = useCallback((index: number) => {
    setSchema(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }))
  }, [])

  const handleFieldUpdate = useCallback((index: number, updatedField: FormFieldDefinition) => {
    setSchema(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => i === index ? updatedField : field),
    }))
    setSelectedField(null)
  }, [])

  const handleSave = useCallback(() => {
    onSave?.(schema)
  }, [schema, onSave])

  const handlePreview = useCallback(() => {
    onPreview?.(schema)
  }, [schema, onPreview])

  const handleLoadTemplate = useCallback((type: 'complaint' | 'suggestion' | 'rti') => {
    const template = getDefaultFormSchema(type)
    if (template.fields && template.settings) {
      setSchema({
        id: schema.id,
        title: template.title || schema.title,
        description: template.description || schema.description,
        fields: template.fields,
        settings: template.settings,
      })
    }
  }, [schema.id])

  return (
    <div className="flex h-screen">
      {/* Left Sidebar - Field Palette */}
      <div className="w-80 bg-white border-r p-6 overflow-y-auto">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Field Types</h3>
          <p className="text-sm text-gray-600">Click fields to add them to your form</p>
        </div>

        {/* Quick Templates */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3">Quick Templates</h4>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => handleLoadTemplate('complaint')}
            >
              📋 Complaint Form
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => handleLoadTemplate('suggestion')}
            >
              💡 Suggestion Form
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => handleLoadTemplate('rti')}
            >
              📜 RTI Request
            </Button>
          </div>
        </div>

        {/* Field Palette */}
        <div className="space-y-2">
          {FIELD_PALETTE.map((item) => (
            <div
              key={item.id}
              className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handleAddField(item.type)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-gray-600">{item.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center - Form Builder */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <Input
                value={schema.title}
                onChange={(e) => setSchema(prev => ({ ...prev, title: e.target.value }))}
                className="text-lg font-semibold"
                placeholder="Form Title"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handlePreview}>
                <Eye size={16} className="mr-2" />
                Preview
              </Button>
              <Button onClick={handleSave}>
                <Save size={16} className="mr-2" />
                Save Form
              </Button>
            </div>
          </div>
          
          <div className="mt-2">
            <Textarea
              value={schema.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSchema(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Form description (optional)"
              className="text-sm"
              rows={2}
            />
          </div>
        </div>

        {/* Form Builder Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="min-h-[400px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
            {schema.fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-lg font-medium mb-2">Start Building Your Form</h3>
                <p className="text-center">
                  Click field types from the sidebar to add them to your form,<br />
                  or choose a quick template to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {schema.fields.map((field, index) => (
                  <DraggableField
                    key={field.id}
                    field={field}
                    index={index}
                    onEdit={handleFieldEdit}
                    onDelete={handleFieldDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Field Properties */}
      {selectedField !== null && (
        <div className="w-80 bg-white border-l p-6 overflow-y-auto">
          <FieldPropertiesPanel
            field={schema.fields[selectedField]}
            onUpdate={(updatedField) => handleFieldUpdate(selectedField, updatedField)}
            onClose={() => setSelectedField(null)}
          />
        </div>
      )}
    </div>
  )
}

// Field Properties Panel Component
function FieldPropertiesPanel({
  field,
  onUpdate,
  onClose,
}: {
  field: FormFieldDefinition
  onUpdate: (field: FormFieldDefinition) => void
  onClose: () => void
}) {
  const [localField, setLocalField] = useState(field)

  const handleSave = () => {
    onUpdate(localField)
    onClose()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Field Properties</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="field-label">Label</Label>
          <Input
            id="field-label"
            value={localField.label}
            onChange={(e) => setLocalField(prev => ({ ...prev, label: e.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="field-description">Description</Label>
          <Textarea
            id="field-description"
            value={localField.description || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalField(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="field-placeholder">Placeholder</Label>
          <Input
            id="field-placeholder"
            value={localField.placeholder || ''}
            onChange={(e) => setLocalField(prev => ({ ...prev, placeholder: e.target.value }))}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="field-required"
            checked={localField.required}
            onCheckedChange={(checked: boolean) => setLocalField(prev => ({ ...prev, required: !!checked }))}
          />
          <Label htmlFor="field-required">Required field</Label>
        </div>

        {/* Field-specific options */}
        {(localField.type === 'select' || localField.type === 'radio' || localField.type === 'checkbox') && (
          <div>
            <Label>Options</Label>
            <div className="space-y-2">
              {(localField.options || []).map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option.label}
                    onChange={(e) => {
                      const newOptions = [...(localField.options || [])]
                      newOptions[index] = { ...option, label: e.target.value }
                      setLocalField(prev => ({ ...prev, options: newOptions }))
                    }}
                    placeholder="Option label"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newOptions = (localField.options || []).filter((_, i) => i !== index)
                      setLocalField(prev => ({ ...prev, options: newOptions }))
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newOptions = [...(localField.options || []), { label: 'New Option', value: `option_${Date.now()}` }]
                  setLocalField(prev => ({ ...prev, options: newOptions }))
                }}
              >
                Add Option
              </Button>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <Button onClick={handleSave} className="w-full">
            Update Field
          </Button>
        </div>
      </div>
    </div>
  )
}