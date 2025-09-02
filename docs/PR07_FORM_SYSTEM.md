# Form Builder & SLA Engine - PR07 Documentation

## Overview
PR07 implements a comprehensive form builder and SLA (Service Level Agreement) engine for the "Ummid Se Hari" village PWA. This system enables administrators to create dynamic forms, track submissions, and manage SLAs with automated escalation workflows.

## Components Implemented

### 1. Dynamic Form Schema System (`lib/forms/schema.ts`)
- **12+ Field Types**: text, textarea, email, phone, number, select, radio, checkbox, file, date, geo, boolean
- **Zod Validation**: Runtime type-safe validation for all field types
- **Conditional Logic**: Fields can show/hide based on other field values
- **File Constraints**: Size limits, MIME type restrictions, multiple file support
- **Default Templates**: Pre-built forms for complaints, suggestions, and RTI requests

### 2. Form Service Layer (`lib/forms/service.ts`)
- **Complete CRUD Operations**: Create, read, update, delete forms and submissions
- **SLA Integration**: Automatic SLA calculation and tracking
- **Audit Logging**: All changes tracked with audit trails
- **Bulk Operations**: Batch updates and management
- **Statistics**: SLA compliance metrics, resolution rates, performance analytics

### 3. SLA Engine (`lib/forms/sla.ts`)
- **Business Hours Support**: Calculate SLAs considering working days/hours
- **Multi-level Escalation**: Configurable escalation workflows
- **Automated Monitoring**: Background processes detect and handle SLA breaches
- **Category-specific SLAs**: Different SLA periods for different form types
- **Performance Metrics**: Comprehensive SLA reporting and analytics

### 4. Admin Interface (`app/[locale]/admin/forms/page.tsx`)
- **Forms Management Dashboard**: Overview with statistics and form library
- **Search and Filtering**: Find forms by name, category, status
- **Form Statistics**: Submissions count, SLA performance, resolution rates
- **Responsive Design**: Works on desktop and mobile devices

### 5. Visual Form Builder (`components/admin/forms/FormBuilder.tsx`)
- **Drag-and-Drop Interface**: Intuitive form building experience
- **Field Palette**: 12+ field types with icons and descriptions
- **Quick Templates**: One-click form generation from templates
- **Real-time Preview**: See forms as users will see them
- **Field Properties**: Detailed configuration for each field type

### 6. Background Workers (`workers/jobs/sla.ts`)
- **Redis-based Queue**: Reliable job processing with retries
- **Automatic SLA Monitoring**: Regular checks for SLA breaches
- **Escalation Processing**: Automated escalation actions
- **Error Handling**: Graceful handling with audit logging
- **Scalable Architecture**: Can run multiple worker instances

### 7. Anti-Bot Protection (`lib/security/turnstile.ts`)
- **Cloudflare Turnstile**: CAPTCHA-free bot protection
- **Server-side Verification**: Secure token validation
- **Client Integration**: React component for easy form integration
- **Configurable**: Enable/disable based on environment

### 8. Public APIs
- **Form Submission API** (`app/api/forms/submit/route.ts`)
  - Rate limiting (5 submissions per 10 minutes per IP)
  - Turnstile verification
  - Data validation against form schema
  - SLA calculation and assignment
  
- **Form Tracking API** (`app/api/forms/track/route.ts`)
  - Track by reference number, email, or phone
  - Public status checking without authentication
  - Timeline view of submission progress
  
- **Admin Management APIs** (`app/api/admin/forms/route.ts`)
  - RBAC-protected form management
  - Template support
  - Comprehensive error handling

## Features

### Form Builder Features
- **Field Types**: Support for 12+ different field types
- **Validation Rules**: Min/max length, patterns, required fields
- **Conditional Logic**: Show/hide fields based on user input
- **File Uploads**: Configurable size and type restrictions
- **Templates**: Quick start with complaint, suggestion, RTI forms
- **Internationalization**: Multi-language form support

### SLA Management Features
- **Flexible SLA Configuration**: Different SLA periods by category
- **Business Hours**: Option to calculate SLAs based on working hours
- **Multi-level Escalation**: Configurable escalation chains
- **Automated Notifications**: Email/SMS alerts for SLA breaches
- **Performance Tracking**: Compliance rates and resolution metrics

### Security Features
- **Anti-bot Protection**: Cloudflare Turnstile integration
- **Rate Limiting**: Prevent spam submissions
- **Input Validation**: Server-side validation for all inputs
- **RBAC Integration**: Role-based access control
- **Audit Logging**: Complete audit trail for all actions

### Citizen Features
- **Easy Form Submission**: User-friendly form interface
- **Status Tracking**: Track submissions by reference number
- **Mobile-Responsive**: Works on all devices
- **Offline Support**: PWA integration for offline access
- **Multi-language**: English and Hindi support

## API Endpoints

### Public Endpoints
- `GET /api/forms/submit?formId={id}` - Get form schema for rendering
- `POST /api/forms/submit` - Submit a form with validation
- `POST /api/forms/track` - Track submission status

### Admin Endpoints
- `GET /api/admin/forms` - List all forms with pagination
- `POST /api/admin/forms` - Create new form
- `GET /api/admin/forms/{id}` - Get specific form
- `PUT /api/admin/forms/{id}` - Update form
- `DELETE /api/admin/forms/{id}` - Delete form

## Environment Variables

```bash
# Cloudflare Turnstile (optional)
TURNSTILE_SITE_KEY=0x4AAAAAAABkTiQiHnFX0pyx
TURNSTILE_SECRET_KEY=0x4AAAAAAABkTiQiHnFX0pyx

# Redis for background jobs
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://user:pass@localhost/db
```

## Testing

### Test Coverage
- **Unit Tests**: Form schema validation, SLA calculations
- **Integration Tests**: API endpoints, database operations  
- **Security Tests**: Turnstile integration, rate limiting
- **E2E Tests**: Form submission workflow, admin interface

### Running Tests
```bash
# Unit tests
npm test

# Specific test suites
npm test -- --testPathPattern="forms"
npm test -- --testPathPattern="turnstile"

# E2E tests
npm run test:e2e
```

## Usage Examples

### Creating a Form Programmatically
```typescript
import { formService } from '@/lib/forms/service'
import { getDefaultFormSchema } from '@/lib/forms/schema'

// Create a complaint form
const schema = getDefaultFormSchema('complaint')
const form = await formService.createForm({
  name: 'Water Supply Complaint',
  schema: {
    ...schema,
    id: 'water-complaint',
  },
  slaDays: 14,
  createdBy: 'admin-user-id',
})
```

### Processing Form Submissions
```typescript
import { formService } from '@/lib/forms/service'

// Submit a form
const submission = await formService.createSubmission({
  formId: 'form-id',
  userId: 'user-id', // optional
  data: {
    name: 'John Doe',
    email: 'john@example.com',
    complaint: 'Water shortage in my area',
  },
  geo: {
    lat: 29.3919,
    lng: 79.8728,
  },
})
```

### Using Turnstile in Forms
```tsx
import { Turnstile, useTurnstile } from '@/components/ui/turnstile'

function MyForm() {
  const { token, isVerified, handleSuccess } = useTurnstile()
  
  return (
    <form>
      {/* Form fields */}
      
      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        onSuccess={handleSuccess}
      />
      
      <button disabled={!isVerified}>
        Submit
      </button>
    </form>
  )
}
```

## Performance Considerations

- **Database Indexing**: Proper indexes on status, SLA dates, form IDs
- **Redis Caching**: Cache frequently accessed forms and configurations
- **Background Processing**: SLA monitoring runs asynchronously
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **Pagination**: Large datasets handled with proper pagination

## Next Steps (PR08+)

- **Email/SMS Notifications**: Integration with notification system
- **File Upload to S3**: Integration with media storage
- **Advanced Analytics**: Detailed reporting dashboard
- **Workflow Automation**: More complex approval workflows
- **Mobile App Integration**: API optimizations for mobile clients

## Architecture Decisions

1. **Zod for Validation**: Type-safe runtime validation with great TypeScript integration
2. **Redis for Jobs**: Reliable background processing with persistence
3. **Prisma for Database**: Type-safe database access with great migration support
4. **Turnstile over reCAPTCHA**: Better user experience with invisible verification
5. **Server-side Validation**: Security-first approach with client-side optimization

This completes PR07 - Form Builder & SLA Engine with a production-ready, secure, and scalable form management system.