/**
 * Dynamic Form Schema Tests
 * Tests for form schema generation and validation
 */

import { 
  generateZodSchema, 
  validateFormDataFromFields,
  fieldToZodSchema, 
  FormFieldDefinition 
} from '@/lib/forms/schema'

describe('Form Schema Generation', () => {
  describe('fieldToZodSchema', () => {
    it('should generate string schema for text field', () => {
      const field: FormFieldDefinition = {
        id: 'name',
        type: 'text',
        label: 'Name',
        required: true,
        placeholder: 'Enter your name',
      }

      const schema = fieldToZodSchema(field)
      expect(schema.safeParse('John Doe').success).toBe(true)
      expect(schema.safeParse('').success).toBe(false) // Required field
    })

    it('should generate email schema for email field', () => {
      const field: FormFieldDefinition = {
        id: 'email',
        type: 'email',
        label: 'Email',
        required: true,
        placeholder: 'Enter your email',
      }

      const schema = fieldToZodSchema(field)
      expect(schema.safeParse('test@example.com').success).toBe(true)
      expect(schema.safeParse('invalid-email').success).toBe(false)
    })

    it('should generate number schema for number field', () => {
      const field: FormFieldDefinition = {
        id: 'age',
        type: 'number',
        label: 'Age',
        required: true,
        validation: {
          min: 18,
          max: 100,
        },
      }

      const schema = fieldToZodSchema(field)
      expect(schema.safeParse(25).success).toBe(true)
      expect(schema.safeParse(17).success).toBe(false) // Below min
      expect(schema.safeParse(101).success).toBe(false) // Above max
      expect(schema.safeParse('25').success).toBe(false) // String instead of number
    })

    it('should generate array schema for checkbox field', () => {
      const field: FormFieldDefinition = {
        id: 'interests',
        type: 'checkbox',
        label: 'Interests',
        required: false,
        options: [
          { label: 'Sports', value: 'sports' },
          { label: 'Music', value: 'music' },
          { label: 'Reading', value: 'reading' },
        ],
      }

      const schema = fieldToZodSchema(field)
      expect(schema.safeParse(['sports', 'music']).success).toBe(true)
      expect(schema.safeParse([]).success).toBe(true) // Optional field
      expect(schema.safeParse(['invalid']).success).toBe(false) // Invalid option
    })

    it('should generate boolean schema for boolean field', () => {
      const field: FormFieldDefinition = {
        id: 'terms',
        type: 'boolean',
        label: 'Accept Terms',
        required: true,
      }

      const schema = fieldToZodSchema(field)
      expect(schema.safeParse(true).success).toBe(true)
      expect(schema.safeParse(false).success).toBe(true)
      expect(schema.safeParse('true').success).toBe(false) // String instead of boolean
    })

    it('should handle optional fields', () => {
      const field: FormFieldDefinition = {
        id: 'phone',
        type: 'phone',
        label: 'Phone',
        required: false,
        placeholder: 'Optional phone number',
      }

      const schema = fieldToZodSchema(field)
      expect(schema.safeParse('+1-555-123-4567').success).toBe(true)
      expect(schema.safeParse('').success).toBe(true) // Optional field allows empty
      expect(schema.safeParse(undefined).success).toBe(true) // Optional field allows undefined
    })

    it('should validate string length constraints', () => {
      const field: FormFieldDefinition = {
        id: 'description',
        type: 'textarea',
        label: 'Description',
        required: true,
        validation: {
          minLength: 10,
          maxLength: 100,
        },
      }

      const schema = fieldToZodSchema(field)
      expect(schema.safeParse('This is a valid description that meets requirements').success).toBe(true)
      expect(schema.safeParse('Too short').success).toBe(false) // Below minLength
      expect(schema.safeParse('x'.repeat(101)).success).toBe(false) // Above maxLength
    })
  })

  describe('generateZodSchema', () => {
    it('should generate complete form schema', () => {
      const fields: FormFieldDefinition[] = [
        {
          id: 'name',
          type: 'text',
          label: 'Name',
          required: true,
        },
        {
          id: 'email',
          type: 'email',
          label: 'Email',
          required: true,
        },
        {
          id: 'age',
          type: 'number',
          label: 'Age',
          required: false,
        },
      ]

      const schema = generateZodSchema(fields)
      
      // Valid data
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      }
      expect(schema.safeParse(validData).success).toBe(true)

      // Missing required field
      const invalidData = {
        email: 'john@example.com',
        age: 30,
      }
      expect(schema.safeParse(invalidData).success).toBe(false)
    })

    it('should handle empty fields array', () => {
      const schema = generateZodSchema([])
      expect(schema.safeParse({}).success).toBe(true)
    })
  })

  describe('validateFormDataFromFields', () => {
    const fields: FormFieldDefinition[] = [
      {
        id: 'name',
        type: 'text',
        label: 'Name',
        required: true,
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email',
        required: true,
      },
    ]

    it('should validate correct data', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
      }

      const result = validateFormDataFromFields(data, fields)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('John Doe')
        expect(result.data.email).toBe('john@example.com')
      }
    })

    it('should reject invalid data', () => {
      const data = {
        name: '',
        email: 'invalid-email',
      }

      const result = validateFormDataFromFields(data, fields)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0)
      }
    })

    it('should reject missing required fields', () => {
      const data = {
        name: 'John Doe',
        // Missing email
      }

      const result = validateFormDataFromFields(data, fields)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('email'))).toBe(true)
      }
    })

    it('should handle extra fields in data', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        extraField: 'should be ignored',
      }

      const result = validateFormDataFromFields(data, fields)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.extraField).toBeUndefined()
      }
    })
  })
})