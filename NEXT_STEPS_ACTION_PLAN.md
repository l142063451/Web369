# Next Steps Action Plan

## Current Status
- **PR01-04**: ✅ Completed
- **PR05**: 🟨 90% Complete (blocked by Prisma client generation)
- **Next**: PR06 i18n & Translations

## Immediate Action Required

### CRITICAL: Resolve Prisma Client Generation
**Problem**: `pnpm prisma generate` fails with network error to `binaries.prisma.sh`

**Solutions** (in order of preference):
1. **Enable External Network Access**: Allow the deployment environment to access `binaries.prisma.sh`
2. **Pre-generated Client**: Generate Prisma client in environment with network access, commit generated files
3. **Alternative Database Layer**: Consider Drizzle ORM or other alternatives that don't require binary downloads
4. **Local Development**: Use SQLite for development and PostgreSQL for production

### Immediate Steps to Complete PR05

Once Prisma client generation is resolved:

1. **Database Integration Testing** (30 minutes)
   ```bash
   pnpm prisma generate
   pnpm prisma migrate dev
   pnpm test
   ```

2. **Content Management Workflows** (1 hour)
   - Test page creation in admin panel
   - Test content editing with Tiptap
   - Test DRAFT → STAGED → PUBLISHED workflow
   - Test media upload functionality

3. **Media Library with ClamAV** (2 hours)
   - Test ClamAV integration for file scanning
   - Test media upload to DigitalOcean Spaces
   - Test presigned URL generation
   - Test media library browsing

4. **End-to-End Testing** (1 hour)
   - Complete content creation workflow
   - Test admin permissions and RBAC
   - Validate audit logging for content changes

## Next: PR06 i18n & Translations Implementation

Based on INSTRUCTIONS_FOR_COPILOT.md §5, PR06 should include:

### 1. next-intl Setup (2 hours)
- Install and configure next-intl
- Set up locale detection and routing
- Create message catalogs for English and Hindi
- Implement language switcher component

### 2. Translation System (3 hours)
- Create TranslationKey and TranslationValue models (already in Prisma schema)
- Build Admin translation editor interface
- Implement side-by-side translation editing
- Create missing strings detector

### 3. Content Localization (2 hours)
- Externalize all hardcoded strings
- Implement bilingual content support in CMS
- Add language persistence to user preferences
- SEO meta tags per locale

### 4. Admin Translation Interface (2 hours)
- Translation management in admin panel
- Bulk translation import/export
- Translation status tracking
- Missing translation detection

## Implementation Priority

1. **🔥 CRITICAL**: Fix Prisma client generation
2. **📝 PR05**: Complete content management testing (4.5 hours)
3. **🌐 PR06**: Implement i18n system (9 hours)
4. **🧪 Testing**: E2E testing for both PR05 and PR06 (2 hours)

## Files to Create/Modify for PR06

### New Files:
- `messages/en.json` - English translations
- `messages/hi.json` - Hindi translations  
- `components/LanguageSwitcher.tsx` - Language toggle component
- `lib/i18n/service.ts` - Translation service layer
- `app/admin/translations/page.tsx` - Admin translation interface

### Modified Files:
- `middleware.ts` - Add locale detection
- `app/layout.tsx` - Add next-intl provider
- `i18n.ts` - Configure next-intl settings
- All component files - Externalize strings

## Expected Timeline

- **Prisma Resolution**: Depends on network access (immediate if resolved)
- **PR05 Completion**: 4.5 hours after Prisma resolution
- **PR06 Implementation**: 9 hours
- **Total to PR06 Complete**: ~14 hours of development time

## Success Criteria

### PR05 Complete:
- [ ] All tests passing with real database
- [ ] Content creation/editing workflows functional
- [ ] Media uploads working with ClamAV scanning
- [ ] Publishing workflow (DRAFT/STAGED/PUBLISHED) operational

### PR06 Complete:
- [ ] English/Hindi language switching working
- [ ] Admin translation editor functional  
- [ ] All user-facing strings externalized
- [ ] Locale persistence working
- [ ] SEO meta tags per locale

The project architecture is solid and implementation quality is high. Once the Prisma connectivity issue is resolved, development can proceed rapidly to complete the remaining PRs.