# PR07 Implementation Plan: Form Builder & SLA Engine

## Overview
This document outlines the implementation plan for PR07 - Form Builder & SLA Engine, the next step in the 18-PR roadmap for the "Ummid Se Hari" PWA project.

## Requirements Summary

Based on REQUIREMENTS_AND_GOALS.md and INSTRUCTIONS_FOR_COPILOT.md:

### Core Features Required
1. **Dynamic Form Schema** - Zod + JSON descriptors for flexible form creation
2. **Anti-bot Protection** - Cloudflare Turnstile integration
3. **Submission Queue System** - Assignment, status transitions, audit logs
4. **SLA Engine** - Calculations per category with background worker escalation
5. **Form Builder Admin Interface** - Field palette, conditional logic, validation setup
6. **Background Workers** - Redis queue for SLA monitoring and notifications

### Technical Specifications
- **SLA Categories**: Complaint forms have different SLAs (7/14/30 days)
- **SLA Formula**: `slaDue = createdAt + daysByCategory`
- **Background Worker**: `workers/jobs/sla.ts` - check/notify breaches; reschedule
- **File Uploads**: With ClamAV scanning integration
- **Rate Limiting**: Per-form (IP/user) with sliding window
- **Audit Logging**: All form actions logged with full diff tracking

## Implementation Plan

### Phase 1: Core Infrastructure (Days 1-2)
1. **Form Schema Models** (Prisma)
   - `Form` model with JSON schema field
   - `Submission` model with status tracking
   - `FormField` model for field definitions
   - SLA configuration per form type

2. **Zod Schema System**
   - Dynamic Zod schema generation from JSON descriptors
   - Field type definitions (text, email, number, select, file, etc.)
   - Validation rule builders

3. **Basic API Routes**
   - `/api/admin/forms` - CRUD operations for form definitions
   - `/api/admin/forms/[id]/submissions` - Submission management
   - `/api/forms/[id]/submit` - Public form submission

### Phase 2: Form Builder UI (Days 3-4)
1. **Admin Form Builder Interface**
   - Drag-and-drop field palette
   - Field configuration panels (validation, options, conditional logic)
   - Form preview functionality
   - Publishing workflow

2. **Field Types Implementation**
   - Text inputs (single, multi-line)
   - Selection inputs (dropdown, radio, checkbox)
   - File upload with ClamAV integration
   - Date/time pickers
   - Geolocation capture

3. **Conditional Logic Engine**
   - Field visibility rules based on other field values
   - Dynamic validation based on conditions

### Phase 3: Submission System (Days 5-6)
1. **Submission Queue Infrastructure**
   - Redis queue setup for submissions
   - Status tracking (NEW, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED)
   - Assignment system for admin users
   - Priority levels

2. **Public Form Renderer**
   - Dynamic form rendering from schema
   - Client-side validation with Zod
   - Turnstile anti-bot integration
   - File upload with progress tracking
   - Offline submission queuing (PWA integration)

### Phase 4: SLA Engine (Days 6-7)
1. **SLA Calculation System**
   - Category-based SLA definitions
   - Automatic SLA due date calculation
   - Escalation rules and workflows

2. **Background Worker Implementation**
   - `workers/jobs/sla.ts` with Redis queue integration
   - Breach detection and notification
   - Automatic escalation to supervisors
   - Reschedule logic for complex cases

3. **SLA Monitoring Dashboard**
   - Admin interface for SLA compliance tracking
   - Breach alerts and reports
   - Performance metrics per category

### Phase 5: Integration & Testing (Days 7-8)
1. **PWA Integration**
   - Background sync for offline form submissions
   - Service worker handling for queued forms
   - Push notifications for submission status updates

2. **Notification Integration**
   - Email/SMS/WhatsApp notifications for:
     - Form submission confirmations
     - Status updates
     - SLA breach alerts
     - Assignment notifications

3. **Comprehensive Testing**
   - Unit tests for all service layers
   - Integration tests for API endpoints
   - E2E tests for form building and submission flows
   - SLA engine testing with time simulation

## File Structure

```
lib/
├── forms/
│   ├── schema.ts          # Zod schema generation
│   ├── service.ts         # Form CRUD operations
│   ├── submission.ts      # Submission handling
│   ├── sla.ts            # SLA calculations
│   └── validation.ts     # Field validation logic
├── queue/
│   └── submissions.ts    # Redis queue management
└── workers/
    └── jobs/
        └── sla.ts        # SLA monitoring worker

app/
├── admin/
│   └── forms/
│       ├── page.tsx                    # Form list
│       ├── builder/
│       │   └── page.tsx                # Form builder interface
│       └── submissions/
│           └── page.tsx                # Submission management
├── api/
│   ├── admin/
│   │   └── forms/
│   │       ├── route.ts                # Form CRUD
│   │       └── [id]/
│   │           ├── route.ts            # Single form ops
│   │           └── submissions/
│   │               └── route.ts        # Submission management
│   └── forms/
│       └── [id]/
│           └── submit/
│               └── route.ts            # Public submission
└── forms/
    └── [id]/
        └── page.tsx                    # Public form renderer

components/
├── admin/
│   ├── FormBuilder.tsx               # Drag-drop form builder
│   ├── FieldPalette.tsx             # Available field types
│   ├── FieldConfig.tsx              # Field configuration panel
│   └── SubmissionDashboard.tsx      # Submission management
└── forms/
    ├── DynamicForm.tsx              # Public form renderer
    ├── FieldRenderer.tsx            # Individual field rendering
    └── SubmissionStatus.tsx         # Status tracking UI
```

## Database Schema Additions

```prisma
model Form {
  id          String   @id @default(cuid())
  name        String
  description String?
  schema      Json     // Field definitions and validation rules
  settings    Json     // Form-level settings (SLA, notifications, etc.)
  isActive    Boolean  @default(true)
  isPublic    Boolean  @default(false)
  category    String   // For SLA categorization
  slaDays     Int      @default(7)
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  submissions Submission[]
  createdByUser User @relation("FormsCreated", fields: [createdBy], references: [id])
  
  @@map("forms")
}

model Submission {
  id          String   @id @default(cuid())
  formId      String
  userId      String?  // Optional for anonymous submissions
  data        Json     // Form field values
  files       String[] // File URLs
  status      SubmissionStatus @default(NEW)
  priority    SubmissionPriority @default(NORMAL)
  assignedTo  String?
  geo         Json?    // Geolocation data
  metadata    Json     // Browser, IP, etc.
  slaDue      DateTime // Calculated SLA due date
  resolvedAt  DateTime?
  history     Json[]   // Status change log
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  form        Form @relation(fields: [formId], references: [id])
  user        User? @relation("Submissions", fields: [userId], references: [id])
  assignee    User? @relation("AssignedSubmissions", fields: [assignedTo], references: [id])
  
  @@map("submissions")
}

enum SubmissionStatus {
  NEW
  ASSIGNED
  IN_PROGRESS
  RESOLVED
  CLOSED
  ESCALATED
}

enum SubmissionPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

## Acceptance Criteria

- [ ] Admin can create forms using drag-and-drop interface
- [ ] All field types render correctly with validation
- [ ] Conditional logic works (show/hide fields based on values)
- [ ] Turnstile anti-bot protection is active
- [ ] Forms submit successfully with file uploads
- [ ] SLA due dates are calculated correctly
- [ ] Background worker monitors and escalates SLA breaches
- [ ] Submissions are properly queued and assigned
- [ ] Status tracking works throughout submission lifecycle
- [ ] PWA offline submission queue functions
- [ ] All operations are properly audited
- [ ] Comprehensive test coverage (≥85%)
- [ ] Performance meets requirements (LCP < 2.5s)

## Risks & Mitigations

1. **Complexity Risk**: Form builder UI complexity
   - Mitigation: Start with basic fields, iterate with more advanced features

2. **Performance Risk**: Large forms with many conditional rules
   - Mitigation: Optimize schema parsing and implement field virtualization

3. **SLA Accuracy Risk**: Background worker timing precision
   - Mitigation: Use robust job scheduling with Redis and proper error handling

4. **Security Risk**: File uploads and user input
   - Mitigation: Strict validation, ClamAV scanning, rate limiting

## Success Metrics

- Forms can be built, published, and submitted end-to-end
- SLA compliance tracking shows accurate metrics
- Background workers process queues without errors
- All security controls function (Turnstile, rate limiting, file scanning)
- PWA offline functionality maintains data integrity