# PR08 Implementation Guide: Services & Requests (Citizen)

## 🎯 Overview
This document provides guidance for implementing PR08 - Services & Requests (Citizen), the next phase in the 18-PR roadmap for the "Ummid Se Hari" PWA.

## ✅ Prerequisites Completed (PR01-PR07)
- **PR01**: Repository Bootstrap & Tooling
- **PR02**: Database & Authentication Foundations  
- **PR03**: PWA & Service Worker
- **PR04**: Admin Panel Shell
- **PR05**: Content Manager & Media Library
- **PR06**: i18n Implementation
- **PR07**: Form Builder & SLA Engine ✨

## 🎯 PR08 Goals
Implement citizen-facing services using the Form Builder foundation from PR07:

### Core Services to Implement
1. **Complaints** - General grievances and issues
2. **RTI (Right to Information)** - Information requests
3. **Certificates** - Birth, death, income, domicile certificates
4. **Waste Management** - Waste collection requests
5. **Water Tanker** - Water delivery requests

### Key Features Required
- Service catalog with categories
- Form integration using PR07 Form Builder
- My Requests dashboard for citizens
- Request status tracking
- Notifications on status changes
- Service-specific workflows
- Mobile-optimized interface

## 🏗️ Architecture Foundation (Ready to Use)

### Already Implemented & Working
- **Form Builder System** (`lib/forms/`) - Complete dynamic form creation
- **SLA Engine** (`lib/forms/sla.ts`) - Service level agreement management
- **Admin Interface** - Form management and submissions dashboard
- **Authentication & RBAC** - User roles and permissions
- **Audit Logging** - Complete change tracking
- **PWA Features** - Offline support and background sync
- **i18n Support** - English/Hindi bilingual

### Database Schema (Already Available)
- `Form` - Dynamic form definitions
- `Submission` - Service requests and responses
- `User` - Citizen and admin accounts
- `AuditLog` - Complete audit trail
- All relationships and indexes ready

## 📁 Prepared Structure
Directory structure has been created for PR08:
- `app/api/services/` - Service-specific API routes
- `app/[locale]/services/` - Citizen service pages  
- `app/[locale]/my-requests/` - Request tracking dashboard
- `components/services/` - Service UI components
- `lib/services/` - Service business logic
- `__tests__/services/` - Service tests

## 🛠️ Implementation Steps

### Phase 1: Service Foundation (1-2 days)
1. **Service Configuration**
   ```typescript
   // lib/services/config.ts
   export const SERVICE_CATEGORIES = {
     COMPLAINT: { icon: '📝', sla: 7, color: 'red' },
     RTI: { icon: '📄', sla: 30, color: 'blue' },
     CERTIFICATE: { icon: '🎫', sla: 14, color: 'green' },
     // ... etc
   }
   ```

2. **Service Forms Creation**
   - Use existing Form Builder to create service-specific forms
   - Configure SLA per service type
   - Set up approval workflows

### Phase 2: Citizen Interface (2-3 days)
1. **Service Catalog** (`app/[locale]/services/page.tsx`)
   - Display available services with icons
   - Search and filter capabilities
   - Mobile-responsive cards

2. **Service Request Forms** (`app/[locale]/services/[type]/page.tsx`)
   - Dynamic forms using PR07 Form Builder
   - File upload support
   - Turnstile anti-bot protection
   - Offline submission queue

3. **My Requests Dashboard** (`app/[locale]/my-requests/page.tsx`)
   - List all user requests
   - Status tracking with timeline
   - Document downloads
   - Search and filter

### Phase 3: Integration & Testing (1-2 days)
1. **API Integration**
   - Connect forms to existing submission system
   - Implement service-specific validation
   - Test SLA calculations

2. **Notifications**
   - Status change notifications
   - Email/SMS integration ready from previous PRs
   - Web Push for real-time updates

## 📋 Implementation Checklist

### Service Management
- [ ] Create service category configuration
- [ ] Set up service-specific forms using Form Builder
- [ ] Configure SLA rules per service type
- [ ] Implement service assignment workflows

### Citizen Interface
- [ ] Service catalog with search/filter
- [ ] Dynamic service request forms
- [ ] My Requests dashboard
- [ ] Request status tracking
- [ ] Document upload/download

### Integration Points
- [ ] Form Builder integration (using existing PR07 system)
- [ ] SLA Engine integration
- [ ] Notification system integration
- [ ] PWA offline support
- [ ] Mobile responsiveness

### Testing & Quality
- [ ] Unit tests for service logic
- [ ] Integration tests with Form Builder
- [ ] E2E tests for citizen workflows
- [ ] Mobile testing
- [ ] Accessibility validation

## 🔧 Key APIs to Implement

```typescript
// app/api/services/route.ts
GET /api/services - List available services
POST /api/services/[type]/submit - Submit service request

// app/api/citizen/requests/route.ts  
GET /api/citizen/requests - My requests
GET /api/citizen/requests/[id] - Request details
```

## 🚀 Getting Started

1. **Run preparation script**:
   ```bash
   ./scripts/prepare-pr08.sh
   ```

2. **Start development**:
   ```bash
   pnpm dev
   ```

3. **Access admin panel** to create service forms:
   - http://localhost:3000/admin/forms

4. **Test existing Form Builder** functionality:
   - Create complaint form
   - Test submission workflow
   - Verify SLA calculations

## 📊 Success Criteria
- [ ] All 5 service types working end-to-end
- [ ] My Requests dashboard functional
- [ ] Mobile-responsive design
- [ ] PWA offline support for submissions
- [ ] Status notifications working
- [ ] Integration tests passing
- [ ] Form Builder integration seamless

## 🎉 Expected Outcome
After PR08 completion:
- Citizens can submit service requests easily
- Requests are tracked automatically via SLA engine
- Admins can manage all requests in unified dashboard
- System supports offline submission queue
- All interactions are audited and secure

Ready to build amazing citizen services! 🚀