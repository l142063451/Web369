/**
 * Admin Forms API Route
 * CRUD operations for form management
 * Part of PR07: Form Builder & SLA Engine
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/rbac/permissions'
import { formService } from '@/lib/forms/service'
import { getDefaultFormSchema } from '@/lib/forms/schema'
import { z } from 'zod'

// Validation schemas
const CreateFormSchema = z.object({
  name: z.string().min(1).max(200),
  template: z.enum(['complaint', 'suggestion', 'rti', 'custom']).optional(),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    fields: z.array(z.any()), // Detailed validation happens in FormFieldDefinition
    settings: z.object({
      category: z.string(),
      slaDays: z.number().min(1).max(365),
      requiresAuth: z.boolean(),
      allowAnonymous: z.boolean(),
      notificationTemplate: z.string().optional(),
      redirectUrl: z.string().url().optional(),
    }),
  }).optional(),
  slaDays: z.number().min(1).max(365).optional(),
  workflow: z.record(z.any()).optional(),
  active: z.boolean().optional(),
})

const UpdateFormSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    fields: z.array(z.any()),
    settings: z.object({
      category: z.string(),
      slaDays: z.number().min(1).max(365),
      requiresAuth: z.boolean(),
      allowAnonymous: z.boolean(),
      notificationTemplate: z.string().optional(),
      redirectUrl: z.string().url().optional(),
    }),
  }).optional(),
  slaDays: z.number().min(1).max(365).optional(),
  workflow: z.record(z.any()).optional(),
  active: z.boolean().optional(),
})

/**
 * GET /api/admin/forms
 * List all forms with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const hasPermission = await checkPermission(session.user.id, 'forms', 'read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const active = searchParams.get('active')
    const createdBy = searchParams.get('createdBy')

    // Get forms
    const result = await formService.getForms({
      page,
      limit: Math.min(limit, 50), // Cap at 50 per page
      active: active ? active === 'true' : undefined,
      createdBy: createdBy || undefined,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('Error fetching forms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/forms
 * Create a new form
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const hasPermission = await checkPermission(session.user.id, 'forms', 'create')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = CreateFormSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const { name, template, schema, slaDays, workflow, active } = validation.data

    // Generate schema from template if provided
    let formSchema = schema
    if (template && template !== 'custom' && !schema) {
      const defaultSchema = getDefaultFormSchema(template)
      formSchema = {
        id: `form_${Date.now()}`,
        title: defaultSchema.title || name,
        description: defaultSchema.description,
        fields: defaultSchema.fields || [],
        settings: defaultSchema.settings || {
          category: 'general',
          slaDays: 7,
          requiresAuth: false,
          allowAnonymous: true,
        },
      }
    }

    if (!formSchema) {
      return NextResponse.json(
        { error: 'Schema is required when template is not specified' },
        { status: 400 }
      )
    }

    // Create form
    const form = await formService.createForm({
      name,
      schema: formSchema,
      slaDays: slaDays || formSchema.settings.slaDays,
      workflow: workflow || {},
      active: active ?? true,
      createdBy: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: form,
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating form:', error)
    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    )
  }
}