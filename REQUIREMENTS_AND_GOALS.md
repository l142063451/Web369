
# REQUIREMENTS_AND_GOALS.md
> Project: **“उम्मीद से हरी | Ummid Se Hari”** — Smart, Green & Transparent Village PWA  
> Locale: Damday–Chuanala, Gangolihat, Pithoragarh, Uttarakhand, India  
> Primary UI Language: **English (default)** with **Hindi** fully supported; default language is **Admin-configurable**.

---

## 0) Vision, Objectives & Success Metrics

### Vision
Transform Damday–Chuanala into a **smart, green, carbon-conscious** model village by inspiring community action (“Ummid”) and enabling **transparent, participatory governance**.

### Measurable Goals (tracked on analytics dashboards)
1. **3×** civic participation (feedback, ideas, volunteering) within **6 months**.
2. **15%** reduction in household carbon footprint (via pledges & actions proxies) within **12 months**.
3. **90%** complaints resolved within category SLAs (**7/14/30** days).
4. **100%** village projects tracked with budgets, progress, and **geotagged milestones**.
5. **80%** Panchayat content maintainers onboarded to Admin Panel within **30 days**.

### Guiding Principles
- **Hope-driven design**, positive & dignified portrayal.
- **Transparency-first**: projects, budgets, tenders, SLAs all public.
- **Inclusivity & A11y**: WCAG **2.2 AA**, bilingual, low-data, offline-first.
- **Privacy & Safety**: minimal data, consent, strong RBAC & auditability.
- **Performance**: PWA, fast on low-end Android, green Core Web Vitals.

---

## 1) Scope

### In Scope
- Production-grade **PWA** with offline caching & background sync.
- Full **Admin Panel** controlling **every public component** (content, layout, theme, data, workflows, rules, notifications, i18n).
- Public modules: About, Governance, Smart & Carbon-Free Mission (calculator, pledges, solar wizard, water planner, waste game), Schemes & Eligibility, Services & Requests (complaints, RTI, certificates, pickups), Projects & Budgets (map & charts), News/Notices/Events, Directory & Economy, Health/Education/Social, Tourism & Culture, Volunteer & Donate, Open Data & Reports, Account.
- Secure authentication (Email OTP + Google), **TOTP 2FA** for admins.
- **Notifications**: Email (SMTP), **SMS (India-ready)**, **WhatsApp Cloud API**, **Web Push**.
- Analytics, SEO & structured data; CI/CD; tests; seeding; deploy to **DigitalOcean** (primary) and **Vercel** (optional path).

### Out of Scope (initial release)
- Native mobile apps (installable PWA instead).
- Payment settlement for donations (we implement **UPI intent & QR**, no funds custody).
- Heavy GIS editing beyond GeoJSON layers (basic CRUD only).

---

## 2) Non-Functional Requirements

- **Availability:** 99.5%+ (single region acceptable), graceful degradation offline.
- **Performance:** LCP < 2.5s, TTI < 3s on Moto G4 over 3G; Lighthouse ≥ **95** (PWA, Perf, SEO, A11y).
- **Security:** OWASP ASVS-L2, strict **CSP**, rate limiting, CSRF, SSRF mitigations, file AV scanning, audit logs, encrypted secrets.
- **Privacy:** Consent for public display (pledges, directory), data minimization, user data export & deletion.
- **A11y:** Screen-reader friendly, keyboard nav, visible focus, proper landmarks, Hindi/English `lang` tags.
- **Observability:** Structured logs, error tracking, metrics & health endpoints, uptime alerts.

---

## 3) Technical Architecture

### Stack
- **Frontend:** Next.js 14 (App Router), React Server Components, TypeScript, Tailwind CSS, **shadcn/ui**, Framer Motion (subtle), TanStack Query.
- **PWA:** Workbox (precaching + runtime caching), Background Sync for queued forms, offline fallback pages.
- **State/Forms:** Zod, React Hook Form, Zustand (light global UI state).
- **Data Viz:** Recharts; **d3-sankey** for budget flows.
- **Maps:** MapLibre GL with OSM tiles (MapTiler/Carto/OpenMapTiles URL configurable).
- **API:** **tRPC** (type-safe) in Next.js Route Handlers; Zod input/output contracts.
- **DB & ORM:** PostgreSQL + Prisma.
- **Auth:** next-auth (Email OTP, Google OAuth), **TOTP 2FA** (otplib), secure session cookies.
- **Queues/Cache:** Redis (Upstash or DO Managed Redis) for jobs, ratelimiting, background tasks.
- **Storage:** S3-compatible (DigitalOcean Spaces) with presigned uploads; images via Next.js Image.
- **Notifications:** SMTP, **SMS (MSG91/Gupshup/Textlocal)**, **WhatsApp Cloud API**, Web Push (VAPID).
- **i18n:** next-intl (ICU messages), bilingual content catalogs + Admin translation editor.
- **Analytics:** Privacy-friendly (**Umami** or **Plausible**), server events via API.
- **Testing:** Jest + Testing Library; Playwright E2E; **Lighthouse CI**.
- **CI/CD:** GitHub Actions; Docker builds; deploy to **DigitalOcean App Platform** (primary) or Droplet (Docker Compose).
- **Editor:** **Tiptap** WYSIWYG for rich content blocks in Admin.

### High-Level Diagram
- **Next.js** (SSR/ISR + RSC) ←→ **Postgres** (Prisma)
- **tRPC** for API contracts; **Redis** for queue & cache
- **S3/Spaces** for media; **ClamAV** container for AV scanning
- **MapLibre** with OSM tiles; **GeoJSON** layers in DB
- **NextAuth** with Email/Google; **TOTP** for Admins
- **Notification Workers** (queue) for Email/SMS/WhatsApp/WebPush
- **Analytics & Logs** shipped to provider; **Lighthouse CI** in GitHub Actions
- **PWA** offline & sync logic in Service Worker

---

## 4) Security, Privacy & Compliance

- **AuthN/Z:** RBAC roles: Admin, Editor, Approver, DataEntry, Viewer, Citizen. Resource-level permissions enforced at server.
- **2FA:** Mandatory for Admin roles; enforcement switch in Admin Settings.
- **Session & Cookies:** HTTP-only, `SameSite=Lax`, secure in prod; JWT only for stateless Web Push opt-ins.
- **Rate Limiting:** IP + user + route based using Redis token bucket. Dynamic thresholds in Admin.
- **CSRF & CORS:** CSRF tokens for mutations, strict CORS (public origins only).
- **Input Sanitization:** Zod + DOMPurify HTML sanitation for rich text; MIME detection for uploads.
- **File Safety:** Size/type limits; **ClamAV** scan before making files public; presigned S3 uploads.
- **CSP & Headers:** Strict CSP with hashes/nonces; Referrer-Policy, Permissions-Policy, X-Content-Type-Options, X-Frame-Options (DENY).
- **Secrets:** `.env` with Doppler/GitHub Encrypted Secrets; never commit secrets.
- **Privacy:** Explicit consent flags for public display (pledge wall, directory); data retention windows; user exports/deletions via Admin.
- **Auditability:** Every change in Admin creates immutable AuditLog (who/when/what diff).
- **Legal Considerations:** Adhere to OSM tile usage policy; SMS/WhatsApp compliant templates; Indian data localization optional via DO region selection.

---

## 5) UX / UI & Design System

### Theme: “Ummid Se Hari” (Hope-Green)
- **Primary:** `#16A34A` (green), **Accent:** `#F59E0B`, **Trust:** `#2563EB`, **Text:** `#1F2937`, **BG:** `#F8FAFC`.
- **Tokens:** Tailwind theme tokens for colors, spacing (8px grid), radii (12–16px), motion (≤150ms), shadows (soft, low elevation).
- **Typography:** Inter + Noto Sans Devanagari; optical sizing; fluid type; proper Hindi rendering.
- **Components:** Accessible headless primitives + shadcn/ui composites: Navbar, MegaMenu, BreadCrumbs, Tabs, Accordions, Cards, KPI Rings, Timeline, Map Panels, Form Wizard, DataTable, Toast/Alerts, Dialogs, Sheet, Steps, Skeletons, Empty States.
- **Micro-interactions:** Gentle entrance, focus rings, reduced motion respected; “celebration” confetti on pledges.
- **Imagery:** Real village photos, solar/trees/water illustrations; alt text mandatory via Admin.

---

## 6) Functional Requirements (Modules)

### Global
- Mega-menu, persistent search, language switcher, contrast toggle, top announcement bar, emergency CTA.
- Bilingual labels & content; SEO-ready titles/descriptions/JSON-LD.
- Share buttons (WA/SMS deep links), print styles.

### Home (Dashboard Summary)
- Hero with Gram Pradhan message (editable), notices ticker, quick actions.
- KPI Row: complaint resolution %, projects on-time %, pledges #, trees planted #, water saved (kL).
- Mini-map (projects/issues/resources) with filters.
- Weekly cards (events, tenders, schemes, success stories).
- CTA: “Join the Mission” (volunteer/donate/suggest).

### Smart & Carbon-Free Mission
- Explainer & roadmap timeline editor.
- **Carbon Calculator**: configurable emission factors in Admin; categories (electricity, LPG, biomass, transport, waste); outputs actions & tips; saves runs.
- **Solar Wizard**: roof area → usable % → `kW = area(m²) * Wp_per_m² / 1000` (configurable Wp/m², irradiance, PR); cost/benefit with schemes & payback.
- **Tree Pledge Wall**: moderated pledges; counters; geotag optional.
- **Waste Segregation Game**: drag & drop categories (dry/wet/recyclable/other), scoring and tips.
- **Water Use Tracker**: Rainwater harvesting potential `RWH = rainfall(mm) * area(m²) * runoff_coeff * 0.001`; monthly charts.

### Schemes & Benefits
- Filterable schemes; **Eligibility Checker** (JSON-Logic rules engine); outputs required docs & steps; one-click start application.

### Services & Requests
- Forms: complaint (category, ward, geotag, photo/video), suggestion, RTI, certificate, waste pickup, water tanker, grievance appeal.
- SLA per category; status tracker with timeline; citizen dashboard “My Requests”.
- Rate limited; spam protection (**Turnstile**); background upload & sync.

### Projects & Budgets
- Project list with filters & tags; **Project Detail**: budget vs spent, milestones, ward map, contractor info, docs, moderated comments, change log.
- **Geotagged milestones** rendered on MapLibre.
- **Budget Explorer**: bars & **Sankey**; CSV export; monthly reports.

### News, Notices & Events
- Cards list; **Events Calendar** with RSVP, reminders (Email/SMS/WA), ICS export.
- Notices with categories (tenders/orders), deadlines; inline **PDF.js** viewer.

### Directory & Economy
- SHGs, artisans, businesses; profile pages with products & enquiry.
- Job board & training/workshops signup; moderation.

### Health, Education & Social
- Clinic days, immunization camps; school/anganwadi info; scholarships; emergency numbers (always visible CTA).

### Tourism & Culture
- Attractions, treks, homestays; maps; “Responsible Tourism” tips; photo gallery.

### Volunteer & Donate
- Skills/time signup; opportunities; **UPI intent + QR** for donations-in-kind/funds; transparency ledger (non-fiduciary).

### Open Data & Reports
- Datasets (CSV/JSON) downloads; dashboards; village profile PDF generator; monthly progress auto-compile.

### Account
- Profile, language, subscriptions (email/SMS/WA), saved items, request history; delete account.

---

## 7) Admin Panel (Edit **Everything**)

Accessible at `/admin` (role-gated). Every module is editable.

1. **Content Manager (Headless-style)**
   - Hierarchy: Pages → Sections → Blocks; schema-driven; **Tiptap** WYSIWYG.
   - Drag & drop order; show/hide by locale/device/role.
   - Media library with required alt/captions; EXIF & geo extraction; AV scan.
   - Versioning, preview, staging → approval → publish; rollback.

2. **Form Builder**
   - Field types, validations (Zod), conditional logic, file uploads.
   - Auto-generated public endpoints & admin review queues.
   - Category SLAs; assignment rules; canned responses.

3. **Map & Geo Manager**
   - Layers CRUD: wards, projects, issues, trees, resources (GeoJSON).
   - Bulk import CSV/GeoJSON; geotag photos; snapping & validation.

4. **Projects & Budgets**
   - Projects, milestones, contractors, budgets, payments; progress %.
   - Documents/photos; public/private notes; change log; publish workflow.

5. **Schemes & Eligibility**
   - Scheme CRUD; criteria via **JSON-Logic** editor; required docs, steps.
   - Cross-link to forms/pages; rule testing sandbox.

6. **Users & Roles**
   - Invite users; set roles/permissions; **2FA enforcement**.
   - Passwordless login management; session invalidations.

7. **Moderation**
   - Queues for complaints, suggestions, comments, directory, pledge wall.
   - Approve/reject with reasons; auto-notify; escalation.

8. **Translations**
   - String catalogs; side-by-side translation editor; missing-strings detector.

9. **Notifications Center**
   - Compose announcements (Email/SMS/WhatsApp/Web Push).
   - Audience targeting (ward, role, interest); scheduling; delivery analytics.
   - Template variables; test send.

10. **Theme & Settings**
    - Logos, colors, fonts, header/footer, menus, social links, SEO defaults, OG images.
    - PWA icons, offline pages, cookie/consent text; **default language switch**.

11. **Reports & Analytics**
    - SLA, participation, projects progress, pledges, site traffic dashboards.
    - CSV/PDF export; scheduled reports.

12. **Directory & Economy**
    - Approvals; job posts; training events.

13. **Backups & Integrations**
    - One-click DB backup/restore; storage snapshot.
    - Configure Email/SMS/WhatsApp, map tiles, S3, payment UPI, analytics.

14. **Audit & Logs**
    - View audit logs; filter by actor/resource/date; export.

---

## 8) Data Model (Prisma Outline)

> Final schema will be in `prisma/schema.prisma`. Key entities:

- `User(id, name, email, phone, locale, roles[], twoFAEnabled, createdAt, updatedAt)`
- `Role(id, name, permissions[])`
- `Session(id, userId, ...next-auth)`
- `Page(id, slug, title, locale, status[DRAFT|STAGED|PUBLISHED], blocks JSONB, seo JSONB, version, createdBy, updatedBy, publishedAt)`
- `Media(id, url, alt, caption, meta JSONB, createdBy, scannedAt, isPublic)`
- `Form(id, name, schema JSONB, slaDays, workflow JSONB, active, createdBy)`
- `Submission(id, formId, userId?, data JSONB, files[], status, assignedTo?, geo, history JSONB, slaDue, createdAt, updatedAt)`
- `Project(id, title, type, ward?, budget, spent, status, startDate, endDate, milestones JSONB, geo, contractors JSONB, docs[], tags[])`
- `Milestone(id, projectId, title, date, progress, notes, photos[])`
- `Scheme(id, title, category, criteria JSONB, docsRequired[], processSteps[], links[])`
- `EligibilityRun(id, schemeId, userId?, answers JSONB, result JSONB, createdAt)`
- `Event(id, title, start, end, location, rsvpEnabled, description, attachments[])`
- `Notice(id, title, category, deadline?, body, attachments[])`
- `DirectoryEntry(id, type, name, contact JSONB, description, products JSONB, geo, approved)`
- `Complaint(id, category, details, geo, media[], status, slaDue, history JSONB, assignedTo?)`
- `Pledge(id, userId?, pledgeType[tree|solar|waste], amount, geo?, approved, createdAt)`
- `CarbonCalcRun(id, userId?, inputs JSONB, output JSONB, createdAt)`
- `Donation(id, donorName?, type[materials|funds|trees], value, publicConsent, upiRef?, createdAt)`
- `TranslationKey(id, key, defaultText, module)`
- `TranslationValue(id, keyId, locale, text)`
- `AuditLog(id, actorId, action, resource, resourceId, diff JSONB, createdAt)`
- `Notification(id, channel, templateId, audience JSONB, payload JSONB, status, stats JSONB, scheduledAt, sentAt)`
- `Setting(id, key, value JSONB, scope[GLOBAL|MODULE], updatedAt)`

> **Indexes** on frequently queried fields (status, createdAt, ward, tags).  
> **Row-level security** enforced at service layer with RBAC.

---

## 9) Algorithms & Domain Logic (Concrete)

- **Eligibility Rules:** Evaluate **JSON-Logic** payloads against answers; rule editor + test runner. Results include eligibility boolean + explanation + next steps.
- **Carbon Calculator:** Sum category emissions using Admin-configured factors; formulas logged and shown to user; recommended actions generated from thresholds; factors editable in Admin (unit-tested).
- **Solar Wizard:** 
  - `usableArea = roofArea * usablePercent`  
  - `kWp = usableArea(m²) * panelWpPerM2 / 1000`  
  - `annualYield(kWh) = kWp * specificYield(kWh/kWp/yr) * performanceRatio`  
  - `paybackYears = netCost / (annualSavings)`
  - All constants configurable in Admin; show local scheme linkages.
- **RWH Potential:** `rainfall(mm)*area(m²)*runoffCoeff*0.001`; month-wise breakdown supported.
- **SLA Engine:** On submission, set `slaDue = createdAt + daysByCategory`; background workers escalate & notify on breach.
- **Moderation:** Content enters queues; decisions write `AuditLog`; rejections record reason & auto-notify.
- **Rate Limit:** Per-form (IP/user) with sliding window; per-channel notification quotas.
- **Search:** Postgres full-text (tsvector) across key entities; language-aware stemming (en/hi).

---

## 10) APIs & Integrations

- **Email:** SMTP (configurable host/port/user/pass); DKIM/SPF guidance.
- **SMS (India):** MSG91/Gupshup/Textlocal via REST; templated messages; DLT template IDs in settings.
- **WhatsApp:** Meta Cloud API; approved templates; opt-in tracking.
- **Web Push:** VAPID keys; topic subscriptions; service worker handlers.
- **UPI:** Intent links & dynamic QR (upi://pay with params); Razorpay/Cashfree optional for hosted checkout (no custody).
- **Maps:** Tile URL configurable; throttle requests; respect OSM policy.
- **Analytics:** Umami/Plausible script with server-side events; anonymize IP.

---

## 11) Testing & Quality Gates

- **Unit Tests:** Zod schemas, rule engine, calculators, utils.
- **Integration Tests:** tRPC procedures (authz, validation), DB queries.
- **E2E (Playwright):** Critical flows — complaint filing & tracking; eligibility wizard; project publish workflow; admin 2FA; notifications; i18n toggle persistence.
- **A11y Tests:** Axe checks; keyboard traps; color contrast.
- **Performance:** Lighthouse CI budget; bundle analyzer thresholds.
- **Security:** Dependency audit; secret scan; CSP report-only pre-prod; file upload AV test suite.
- **Coverage:** ≥ **85%** lines; failing coverage blocks PR merge.

---

## 12) CI/CD & Environments

- **GitHub Actions:** `lint`, `typecheck`, `test`, `build`, `lighthouse`, `docker-push`, `deploy`.
- **Branching:** `main` (prod), `develop` (staging), feature branches `feat/*`.
- **PR Rules:** 2 reviewers (at least one Admin), green CI, changelog fragment, migration plan if schema changes.
- **Environments:**
  - **Staging:** DO App Platform + DO Managed Postgres + Spaces + Redis; seeded demo content.
  - **Production:** Same topology; RPO ≤ 24h (daily backups), RTO ≤ 4h.
- **Secrets Management:** GitHub Encrypted Secrets; DO App Platform envs.

---

## 13) Deployment (DigitalOcean-first)

- **App Platform**: Next.js SSR app with Node 20; build command `pnpm build`; run `pnpm start`.
- **PostgreSQL:** DO Managed PG 15+; connection via `DATABASE_URL`.
- **Redis:** DO Managed Redis or Upstash.
- **S3:** DO Spaces; presigned URLs; CDN enabled.
- **Workers:** Background job worker (Node) as separate service reading Redis queues.
- **ClamAV:** Sidecar container; files scanned via clamav-rest or direct socket.
- **Domains & TLS:** DO-managed certs; HSTS.
- **Backup:** Automated DB backups + Spaces lifecycle; weekly offsite snapshot.

---

## 14) SEO & Discoverability

- Bilingual metadata; JSON-LD types: Organization, GovernmentService, Event, NewsArticle, Place.
- Clean URLs, breadcrumbs, sitemap, robots, canonical tags.
- OpenGraph/Twitter cards (per-page editable in Admin).
- Schema for schemes/projects to surface in search.

---

## 15) Analytics & KPIs

Dashboards & tracked events:
- Complaint funnel (filed → assigned → resolved), SLA compliance.
- Participation: form submissions, suggestions, volunteer signups.
- Carbon pledges & actions; trees pledged/planted; water saved estimates.
- Project progress vs budget; milestone on-time rate.
- Web metrics: MAU, retention (opt-in), language usage, offline usage.

---

## 16) Content, Seeding & Sample Data

- Seed **4–6 projects** (solar lights, RWH, road repair, school upgrade) with milestones & photos.
- Seed **8–10 schemes** with criteria & FAQ entries.
- Seed **3 events**, **5 notices**, **6 directory entries** (SHGs & businesses).
- Seed **10 pledges**, **6 complaints** (varied statuses).
- Gram Pradhan message (English & Hindi), office timings, contacts, panchayat map pin, wards GeoJSON, emergency numbers.
- Mission calendar (next 90 days).

---

## 17) Repository Structure (Monorepo Single App)

```

app/
(public routes)/
admin/
api/
components/
lib/
auth/ db/ i18n/ validation/ maps/ charts/ queue/ notifications/
styles/
public/ (icons, manifest, sw)
content/ (seed markdown/json)
prisma/ (schema, migrations, seeds)
workers/ (jobs, queues)
tests/ (unit, e2e, lighthouse)
docs/ (Admin Guide, Content Guide, Data Import Guide)
scripts/ (migrations, seed, backup)

```

---

## 18) Environment Variables (.env.example)

- **Core:** `NODE_ENV`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- **DB:** `DATABASE_URL`
- **Redis:** `REDIS_URL`
- **Storage:** `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`
- **Email:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- **SMS:** `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID`, `SMS_DLT_TEMPLATE_ID_*`
- **WhatsApp:** `WA_PHONE_ID`, `WA_BUSINESS_ID`, `WA_ACCESS_TOKEN`
- **Web Push:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- **OAuth:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Security:** `ENCRYPTION_KEY`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
- **Maps:** `TILE_URL`, `TILE_API_KEY?`
- **Analytics:** `UMAMI_WEBSITE_ID`, `UMAMI_HOST` (or Plausible vars)
- **ClamAV:** `CLAMAV_HOST`, `CLAMAV_PORT`

---

## 19) Status Tracking (status.md contract)

Create `status.md` at repo root; this file is the **single source** of truth for progress.  
**Structure:**
- **Overview:** current phase, environment links (staging/prod), last updated (UTC).
- **Milestones:** checklist (✅/🟨/❌) with dates & owners.
- **PRs:** table of PR #, title, scope, status (Open/Merged/Blocked), linked issues.
- **CI Health:** latest runs; failing jobs; next actions.
- **Coverage & Lighthouse:** current numbers vs targets.
- **Risks & Mitigations:** top 5 risks; owners; due dates.
- **Upcoming:** next 7/14 days plan.
- **Changelog:** brief human-readable log per merge.
- **Verification Log:** manual QA checkpoints per module.

Agents & humans must **update `status.md` at the end of every PR**.

---

## 20) 18-PR Roadmap (from bootstrap to DigitalOcean production)

1. **PR01 – Repo Bootstrap & Tooling**
   - Next.js 14 TS app, Tailwind, shadcn/ui, ESLint/Prettier, Husky, commitlint, pnpm.
   - Basic pages, CI skeleton, Dockerfile & Compose (PG, Redis, ClamAV, Mailhog).

2. **PR02 – DB & Auth Foundations**
   - Prisma schema baseline; NextAuth (Email OTP, Google); RBAC roles; session hardening; 2FA scaffolding.

3. **PR03 – PWA & Service Worker**
   - Workbox precache/runtime strategies; offline fallback pages; Background Sync for queued forms; Web Push foundation.

4. **PR04 – Admin Panel Shell**
   - `/admin` layout, RBAC-gated routes; navigation; audit log model; basic audit writer.

5. **PR05 – Content Manager & Media Library**
   - Page/Section/Block schema; **Tiptap** editor; media uploads to Spaces with presigned URLs; **ClamAV** scan; versioning & preview.

6. **PR06 – i18n & Translations**
   - next-intl setup; translation catalogs; Admin translation editor; language toggle persistence; SEO meta per locale.

7. **PR07 – Form Builder & Submissions**
   - Field types, Zod validation, conditional logic; Turnstile anti-bot; submission queues; SLA engine (calc & timers).

8. **PR08 – Services & Requests (Citizen)**
   - Complaints/RTI/certificates/waste/water tanker forms; status tracker; My Requests; notifications on status change.

9. **PR09 – Projects & Budgets**
   - Project CRUD; milestones; docs; change log; **MapLibre** integration; budget vs spent; **Sankey** explorer; CSV export.

10. **PR10 – Smart & Carbon-Free**
    - Carbon calculator (admin factors); Solar wizard; Tree pledge wall (moderation); Waste game; Water tracker.

11. **PR11 – Schemes & Eligibility**
    - Schemes listing; **JSON-Logic** editor & evaluator; eligibility flows; one-click application linking to Form Builder.

12. **PR12 – News/Notices/Events**
    - Blog/news; notices with PDF.js viewer; events calendar, RSVP, reminders, ICS export.

13. **PR13 – Directory & Economy**
    - SHGs/businesses/jobs/training; maps & filters; moderation; enquiry flows.

14. **PR14 – Notifications Center**
    - SMTP/SMS/WhatsApp/Web Push senders; audience targeting; scheduling; stats; template variables; test send.

15. **PR15 – Analytics, SEO & Open Data**
    - Umami/Plausible; JSON-LD; sitemap/robots; Open Data downloads; monthly report generator.

16. **PR16 – A11y, Security & Hardening**
    - Axe passes; CSP strict mode; headers; rate limiting; file constraints; penetration test checklist; secrets review.

17. **PR17 – Testing & CI Gates**
    - Unit/integration/E2E coverage ≥85%; Lighthouse CI; flaky test guard; required checks blocking merges.

18. **PR18 – Deployment to DigitalOcean**
    - DO App Platform configs; Managed PG/Redis/Spaces setup; domain & TLS; backup schedules; staged rollout; smoke tests; runbook docs.

> Each PR must: update docs, bump `status.md`, add tests, pass CI, include rollback plan.

---

## 21) Acceptance Criteria (Definition of Done)

- **Build** passes: `pnpm install && pnpm build` without errors.
- **Admin** can edit any public component (text, media, blocks, menus, theme) with preview & versioning; publish workflow enforced.
- **Forms**: client/server validation; file upload with AV scanning; rate limiting; Turnstile; confirmation emails; SLA timers; assignment; audit logs.
- **Maps** load fast; projects show geotagged milestones; budget charts render; CSV exports validate.
- **PWA**: installable; offline home + key pages; background sync verified; Web Push delivered.
- **i18n**: all strings externalized; language toggle persists; admin translation editor works.
- **Notifications**: Email/SMS/WhatsApp/Web Push templates send & log; audience targeting works.
- **Security**: 2FA enforced for Admins; CSP in report-only then enforced; file AV verified.
- **Testing**: key E2E flows green in CI; coverage ≥ 85%; Lighthouse budgets met on CI.
- **RBAC** strictly enforced; non-admin blocked from `/admin`.
- **Docs**: README, Admin Guide, Content Guide, Data Import Guide, Deploy Guide; `.env.example` complete.
- **Status**: `status.md` fully reflects feature completion & rollout.

---

## 22) Risks & Mitigations

- **Low bandwidth users** → aggressive caching, image optimization, lite-mode styles.
- **Tile server rate limits** → configurable provider; cache headers; low zoom defaults.
- **SMS/WA template approvals** → plan alternate channels (email/push); templates prepared early.
- **File AV throughput** → queue uploads; user feedback; size caps; parallel scan workers.
- **Content abuse** → moderation queues; rate limiting; shadow bans for repeat abusers.
- **Secrets leakage** → pre-commit secret scanning; CI guard; rotate on incident.

---

## 23) Runbooks (High Level)

- **Incident:** triage → rollback via previous image → rotate secrets → postmortem.
- **DB Migration:** create migration → backup → deploy → run migrations → verify → update status.
- **Backup/Restore:** nightly backups; restore script; test quarterly.
- **Key Rotation:** schedule; update env; invalidate sessions.

---

## 24) Glossary

- **RSC:** React Server Components  
- **PR:** Pull Request  
- **SLA:** Service Level Agreement  
- **RBAC:** Role-Based Access Control  
- **AV:** Anti-Virus  
- **RWH:** Rainwater Harvesting  
- **JSON-Logic:** A JSON-based rules format

---

## 25) Confirmation

If these **Requirements & Goals** are accepted, the next file will be **`INSTRUCTIONS_FOR_COPILOT.md`** (engineering SOP + step-by-step agent plan), followed by the **Master Copilot Agent Prompt**.

