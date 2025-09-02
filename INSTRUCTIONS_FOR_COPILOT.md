
# INSTRUCTIONS_FOR_COPILOT.md
> Operating Mode: **GitHub Copilot Agent (web)** with repo read/write, CI permissions, and DigitalOcean deployment rights.  
> Target: Build and ship **“Ummid Se Hari”** PWA per `REQUIREMENTS_AND_GOALS.md`.  
> Language focus: **English UI defaults**, full Hindi support (admin-configurable default).  
> Deliver **production-grade** implementations only — no mock/simulated logic.

---

## 0) Agent Operating Contract

1. **Autonomy**: Execute end-to-end — plan, create branches, commits, PRs, run CI, deploy to staging & production on DigitalOcean.
2. **Traceability**: Update `status.md` with every PR (scope, delta, test results, deployment notes).
3. **Security-first**: Enforce OWASP ASVS-L2 controls, strict CSP, 2FA for admins, rate limits, input sanitization, AV scanning for files.
4. **Quality gates**: CI must be green (lint, typecheck, test, coverage ≥85%, Lighthouse budgets). PRs require 2 approvals via CODEOWNERS rule.
5. **Screenshots & Layout Validation**: Generate **Storybook stories** + **Playwright screenshot tests** for all components & key pages. Attach artifacts to PRs.

---

## 1) Repository Bootstrap (PR01)

**Create repo**: `ummid-se-hari` (public or private as provisioned).

### 1.1 Tooling & Conventions
- **Package manager**: `pnpm`
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- **Branching**: `main` (prod), `develop` (staging), feature branches `feat/*`.
- **Protected branches**: block direct pushes to `main` & `develop`; require PR & green CI.

### 1.2 Mandatory Root Files
Create the following files with exact content:

`.editorconfig`
```ini
root = true
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
````

`.gitignore`

```
node_modules
.next
out
dist
coverage
.env*
*.local
*.log
playwright-report
test-results
```

`package.json` (partial – Copilot to fill scripts/add deps as required across PRs)

```json
{
  "name": "ummid-se-hari",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build && next-sitemap",
    "start": "next start -p ${PORT:-3000}",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "jest --runInBand",
    "test:e2e": "playwright test",
    "lighthouse": "lhci autorun",
    "prepare": "husky install",
    "analyze": "ANALYZE=true next build"
  }
}
```

`tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@lib/*": ["./lib/*"],
      "@components/*": ["./components/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", "**/*.cjs", "**/*.mjs"],
  "exclude": ["node_modules"]
}
```

`.eslintrc.cjs`

```cjs
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'jsx-a11y', 'import', 'security', 'tailwindcss'],
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:security/recommended',
    'plugin:import/recommended',
    'plugin:tailwindcss/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'import/order': ['error', { 'newlines-between': 'always', groups: [['builtin', 'external', 'internal']] }],
    'security/detect-object-injection': 'off'
  },
  settings: { tailwindcss: { callees: ['cn'] } }
}
```

`.prettierrc`

```json
{ "semi": false, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```

`commitlint.config.cjs`

```cjs
export default { extends: ['@commitlint/config-conventional'] }
```

`.husky/` (init via script in PR01)

* `pre-commit`: `pnpm lint && pnpm typecheck && pnpm test -w`
* `commit-msg`: `commitlint --edit $1`

`.env.example` (populate from Requirements §18).

`CODEOWNERS`

```
* @core-maintainers
/docs/ @docs-maintainers
```

`SECURITY.md`

```markdown
# Security Policy
- Report vulnerabilities via security@<domain>.
- No PII in issues/PRs. Rotate secrets on incident. Follow OWASP ASVS-L2.
```

`status.md` (initial template)

```markdown
# Status
- Phase: Bootstrap
- Environments: (TBD)
- Last Updated (UTC): <auto-update in CI>

## Milestones
- [ ] PR01 Bootstrap
...

## CI Health
- Lint: —
- Typecheck: —
- Unit: —
- E2E: —
- Lighthouse: —

## Risks & Mitigations
- TBD

## Changelog
- Init
```

`docs/PR_TEMPLATE.md`

```markdown
## Summary
## Scope
## Implementation Notes
## Tests
## Screenshots/Artifacts
## Security Considerations
## Checklist
- [ ] Updated docs
- [ ] Updated status.md
- [ ] Added/updated tests
```

---

## 2) Next.js 14 + PWA + Security Headers (PR01→PR03)

`next.config.mjs`

```js
import { createSecureHeaders } from './scripts/csp.js'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  experimental: { turbo: { rules: {} } },
  async headers() {
    const common = createSecureHeaders()
    return [
      { source: '/(.*)', headers: common },
      { source: '/admin(.*)', headers: [...common, { key: 'X-Frame-Options', value: 'DENY' }] }
    ]
  }
}
export default nextConfig
```

`scripts/csp.js`

```js
export function createSecureHeaders() {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://plausible.io",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
  return [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-XSS-Protection', value: '0' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
  ]
}
```

`public/manifest.webmanifest`

```json
{
  "name": "Ummid Se Hari",
  "short_name": "Ummid",
  "description": "Smart, green & transparent village PWA",
  "lang": "en",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#F8FAFC",
  "theme_color": "#16A34A",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

`app/layout.tsx` – set `<html lang="en">`, add skip links, color-scheme, and analytics hook.

**PWA (Workbox)**

* Add `public/sw.js` generated via `workbox-build` in `scripts/build-sw.mjs`.
* Register SW in `app/(public)/_components/PWARegister.tsx` and include in layout.
* Strategies:

  * Precache app shell + icons.
  * Runtime cache: images (CacheFirst), API GET (StaleWhileRevalidate), maps tiles (CacheFirst with maxEntries/TTL).
  * Background Sync queue for form POSTs (`/api/forms/submit` etc.).

`scripts/build-sw.mjs`

```js
import { generateSW } from 'workbox-build'
await generateSW({
  globDirectory: 'public',
  globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2}', 'manifest.webmanifest'],
  swDest: 'public/sw.js',
  runtimeCaching: [
    { urlPattern: ({url}) => url.pathname.startsWith('/api/'), handler: 'NetworkFirst', options: { cacheName: 'api', backgroundSync: { name: 'apiQueue', options: { maxRetentionTime: 24 * 60 } } } },
    { urlPattern: ({request}) => request.destination === 'image', handler: 'CacheFirst', options: { cacheName: 'images', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } } },
    { urlPattern: ({url}) => /\/tiles\//.test(url.href), handler: 'CacheFirst', options: { cacheName: 'tiles', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 } } }
  ],
  skipWaiting: true,
  clientsClaim: true
})
```

`package.json` add postbuild hook: `"postbuild": "node scripts/build-sw.mjs && next-sitemap"`

---

## 3) Database, Auth, RBAC & 2FA (PR02)

* Add **Prisma** with PostgreSQL; generate models exactly per Requirements §8 (include `AuditLog`, `Notification`, `Setting`).
* Implement **NextAuth** with Email OTP and Google; sessions hardened (secure cookies, short idle, sliding).
* **2FA (TOTP)** via `otplib` for Admin roles; enforce in `/admin` routes (middleware).

`prisma/schema.prisma` (Copilot: implement with proper relations, JSON fields, indexes)

`lib/auth/*`

* `authOptions.ts` (NextAuth config with email provider via SMTP, Google provider, adapter via Prisma)
* `totp.ts` (setup/verify TOTP, recovery codes)
* `rbac.ts` (permissions matrix, type-safe guards)
* **Middleware** `middleware.ts` gates `/admin` and API routes based on RBAC & 2FA.

**Rate limiting**: `lib/queue/rate-limit.ts` using Redis token bucket.

---

## 4) UI System, Theming & A11y (PR01→PR04)

* Tailwind with shadcn/ui; custom theme tokens based on color palette in Requirements §5.
* Components must be **WCAG 2.2 AA** compliant; include keyboard navigation and `aria-*`.
* Implement **mega-menu**, language switcher, contrast toggle, announcement bar, emergency CTA.

`styles/globals.css` – Tailwind base, semantic color variables for light/dark.

**Storybook**:

* Initialize Storybook; write stories for each component.
* Configure **@storybook/addon-a11y** & **@storybook/addon-interactions**.

**Visual Regression**:

* Playwright + percy-like local snapshots: `playwright test --update-snapshots` on first run; diffs in CI artifacts.

---

## 5) i18n (PR06)

* Integrate **next-intl** with ICU messages; locale detection; persistent language preference.
* Admin Translation Editor: CRUD for `TranslationKey` & `TranslationValue`.
* Ensure all strings externalized; add ESLint rule to prevent hardcoded user-facing strings.

---

## 6) Content Manager & Media Library (PR05)

* Schema-driven Pages→Sections→Blocks (JSON schema).
* **Tiptap** editor with limited sanitised nodes; use DOMPurify server-side sanitation for HTML.
* Media uploads to DO Spaces via presigned URLs; run **ClamAV** scan before publish; extract EXIF/geo.

`lib/uploads/clamav.ts` (TCP to clamav-daemon; quarantine on detection)
`lib/uploads/presign.ts` (S3 presign; content-type sniffing; size caps)

---

## 7) Form Builder & SLA Engine (PR07→PR08)

* Dynamic form schema (Zod + JSON descriptors).
* Anti-bot: **Cloudflare Turnstile**.
* Submissions queue with assignment, status transitions, audit logs.
* SLA calculations per category; escalation job in background worker (Redis queue).

`workers/jobs/sla.ts` – check/notify breaches; reschedule.

---

## 8) Mapping, Projects & Budgets (PR09)

* **MapLibre** with configurable tile server; layers manager (GeoJSON).
* Projects with geotagged milestones; **Sankey** budget explorer (d3-sankey).
* CSV export endpoints (`text/csv`); cacheable GETs.

---

## 9) Smart & Carbon-Free (PR10)

* **Carbon Calculator** with admin-configurable emission factors; persist runs; recommend actions by thresholds.
* **Solar Wizard** with roof area → kWp → yield → payback; parameters configurable.
* **Tree Pledge Wall** (moderated).
* **Waste Segregation Game** (drag & drop with scoring).
* **Water Tracker** (RWH computation; charts).

Add unit tests for each formula module.

---

## 10) Schemes, Eligibility & Applications (PR11)

* Schemes CRUD; **JSON-Logic** criteria editor; test harness to validate rules.
* Eligibility flow results → actionable next steps; 1-click start application linking to Form Builder.

---

## 11) News/Notices/Events (PR12)

* Events with RSVP & reminders; ICS export.
* Notices with deadline & **PDF.js** inline viewer.
* Blog/news with SEO & OpenGraph.

---

## 12) Directory & Economy (PR13)

* SHGs/businesses/jobs/training; moderation & enquiry flows; map pins.

---

## 13) Notifications Center (PR14)

* Email (SMTP), SMS (MSG91/Gupshup/Textlocal), WhatsApp Cloud, Web Push (VAPID).
* Template variables; test send; delivery analytics.

`lib/notifications/*` – channel adapters; retry with backoff; dedupe.

---

## 14) Analytics, SEO & Open Data (PR15)

* Integrate **Umami** or **Plausible**; server-side events for key actions (pledges, submissions).
* JSON-LD (Organization, GovernmentService, Event, NewsArticle, Place).
* Sitemap/robots/canonicals; breadcrumb structured data.
* Open Data downloads; monthly PDF report generator.

---

## 15) A11y, Security & Hardening (PR16)

* Axe automated checks; manual keyboard paths.
* Rate limiting applied to auth endpoints & forms.
* Strict CSP move from report-only to enforced; CSP report endpoint.
* File constraints (size/type), AV scanning e2e test.
* Secret scanning in CI; dependency audit.

---

## 16) Tests & CI Gates (PR17)

### 16.1 Jest Config

`jest.config.ts`

```ts
import type { Config } from 'jest'
const config: Config = {
  testEnvironment: 'node',
  transform: { '^.+\\.(t|j)sx?$': ['@swc/jest'] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  collectCoverageFrom: ['**/*.{ts,tsx}', '!**/*.d.ts', '!**/node_modules/**', '!**/tests/**'],
  coverageThreshold: { global: { branches: 80, functions: 85, lines: 85, statements: 85 } }
}
export default config
```

### 16.2 Playwright

`playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
})
```

### 16.3 Lighthouse CI

`lighthouserc.json`

```json
{
  "ci": {
    "collect": { "numberOfRuns": 2, "url": ["http://localhost:3000/"] },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 0.95 }],
        "categories:pwa": ["error", { "minScore": 0.95 }]
      }
    }
  }
}
```

### 16.4 GitHub Actions

`.github/workflows/ci.yml`

```yaml
name: CI
on:
  push: { branches: [develop, main] }
  pull_request:
jobs:
  build-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: app
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
        options: >-
          --health-cmd="pg_isready -U postgres" --health-interval=10s --health-timeout=5s --health-retries=5
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: cp .env.example .env
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/app
      - run: pnpm test
      - run: pnpm test:e2e
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000
      - run: pnpm build
      - run: pnpm lighthouse
  codeql:
    uses: github/codeql-action/actions/workflow/codeql.yml@v3
```

`.github/workflows/deploy-do.yml`

```yaml
name: Deploy DO
on:
  workflow_dispatch:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: digitalocean/app-action@v2
        with:
          app-name: ummid-se-hari
          token: ${{ secrets.DO_API_TOKEN }}
```

---

## 17) Docker & Local Dev

`Dockerfile`

```Dockerfile
# Build
FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Runtime
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app ./
EXPOSE 3000
USER node
CMD ["dumb-init", "pnpm", "start"]
```

`compose.yml`

```yaml
version: "3.9"
services:
  web:
    build: .
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://postgres:postgres@db:5432/app
      REDIS_URL: redis://cache:6379
    ports: ["3000:3000"]
    depends_on: [db, cache, clamav]
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
  cache:
    image: redis:7
    ports: ["6379:6379"]
  clamav:
    image: clamav/clamav:1.2
    ports: ["3310:3310"]
volumes:
  pgdata: {}
```

---

## 18) DigitalOcean Deployment (PR18)

**App Platform (preferred)**

* Create DO Managed Postgres, DO Spaces (S3), DO Managed Redis.
* App Spec `do-app.yaml`:

```yaml
name: ummid-se-hari
region: bangalore
services:
  - name: web
    github:
      repo: <owner>/ummid-se-hari
      branch: main
      deploy_on_push: true
    run_command: pnpm start -p ${PORT}
    build_command: pnpm install --frozen-lockfile && pnpm build
    http_port: 3000
    instance_count: 2
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        scope: RUN_AND_BUILD_TIME
        value: ${db.DATABASE_URL}
      - key: REDIS_URL
        scope: RUN_AND_BUILD_TIME
        value: ${redis.REDIS_URL}
      # Add all required vars mapped from DO secrets
databases:
  - name: db
    engine: PG
    production: true
workers:
  - name: worker
    github:
      repo: <owner>/ummid-se-hari
      branch: main
    run_command: node workers/index.js
    instance_size_slug: basic-xxs
```

* Configure **DO Secrets** for all `.env.example` keys.
* Enable CDN on Spaces; set CORS for uploads.
* TLS via DO-managed certs; enable HSTS.

**Smoke Tests**

* After deploy: run Playwright smoke against live URL; update `status.md` with links & results.

---

## 19) Admin Panel: Control **Everything** (PR04→PR15)

* Route `/admin` gated by RBAC + enforced 2FA.
* Modules:

  1. **Content Manager** (Tiptap, versioning, preview, publish)
  2. **Form Builder** (field palette, conditional logic, validation, file uploads, SLA)
  3. **Map & Geo** (layers CRUD, imports)
  4. **Projects & Budgets** (milestones, documents, change log)
  5. **Schemes & Eligibility** (JSON-Logic editor + tester)
  6. **Users & Roles** (invite, revoke, 2FA policy)
  7. **Moderation** (queues: complaints, suggestions, comments, directory, pledge wall)
  8. **Translations** (side-by-side, missing keys detector)
  9. **Notifications Center** (Email/SMS/WA/Web Push; audience targeting)
  10. **Theme & Settings** (logo, colors, fonts, header/footer, menus, SEO defaults, OG images, language default)
  11. **Reports & Analytics** (SLA, participation, progress, pledges, traffic)
  12. **Directory & Economy** (approvals, jobs, training)
  13. **Backups & Integrations** (DB snapshot, Spaces snapshot, connectors)
  14. **Audit & Logs** (diff viewer, export)

**Screenshots**: For each admin module page and each public page, create **Playwright screenshot tests** (`tests/e2e/screenshots.spec.ts`) storing baseline images and attaching results to CI artifacts.

---

## 20) Security Controls (enforce throughout)

* **CSRF** tokens on all mutations (use Next.js Route Handlers + anti-CSRF cookie).
* **Input validation** (Zod) and **output encoding**.
* **Sanitize** rich text using DOMPurify (server-side).
* **Rate limit** auth & forms via Redis token bucket.
* **File scanning** via ClamAV; block on detection; only make public after scan success.
* **Strict headers** & **CSP**; report endpoint to capture violations.
* **Secrets**: never log; use structured logs without PII.
* **Audit**: every state change in Admin writes `AuditLog` with `diff`.
* **2FA**: enforced for roles ≥ Editor (configurable, default: Admin only).

---

## 21) Analytics & KPIs

* Integrate **Umami/Plausible** with self-host or SaaS endpoint; anonymise IP.
* Fire server-side events for critical actions; render dashboards in Admin Reports module.

---

## 22) SEO

* Generate `sitemap.xml`, `robots.txt`, per-page **JSON-LD**.
* Canonicals, OpenGraph/Twitter cards editable via Admin Settings.

---

## 23) Documentation

* `docs/`:

  * `Admin_Guide.md`
  * `Content_Editing_Guide.md`
  * `Data_Import_Guide.md`
  * `Deploy_Guide_DO.md`
  * `Runbooks.md` (incident, backup/restore, migration, key rotation)

Each doc must be **task-executable**, with verified commands.

---

## 24) Status Discipline

* `status.md` is **source of truth**. Update on:

  * PR open/merge,
  * CI run completion,
  * Deployments,
  * Risk changes.
* Include:

  * Current phase, environments (URLs),
  * Milestones checklist,
  * PRs table,
  * CI health,
  * Coverage & Lighthouse scores,
  * Risks & mitigations,
  * Upcoming plan,
  * Changelog,
  * Verification log per module.

Automate “Last Updated (UTC)” via a CI step that commits timestamp on merges to `develop`/`main`.

---

## 25) 18-PR Execution Plan (Binding)

Follow **exactly** the PR roadmap from `REQUIREMENTS_AND_GOALS.md §20`.
Each PR **must**:

* Add/modify code + tests,
* Update docs & `.env.example`,
* Update `status.md`,
* Upload **component/page screenshots** as CI artifacts,
* Meet CI gates (lint, typecheck, unit, e2e, Lighthouse, coverage),
* Contain rollback instructions.

---

## 26) Example Critical Snippets (to implement verbatim)

### 26.1 Web Push (VAPID) Server Handler

`lib/notifications/webpush.ts`

```ts
import webpush from 'web-push'
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env
webpush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!)
export async function sendPush(subscription: webpush.PushSubscription, payload: Record<string, unknown>) {
  return webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 60 })
}
```

### 26.2 Turnstile Verify

`lib/security/turnstile.ts`

```ts
export async function verifyTurnstile(token: string, ip?: string) {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token, remoteip: ip ?? '' })
  })
  const data = await res.json()
  if (!data.success) throw new Error('Turnstile verification failed')
}
```

### 26.3 JSON-Logic Evaluation

`lib/eligibility/jsonLogic.ts`

```ts
import jsonLogic from 'json-logic-js'
export function evaluateEligibility(rule: unknown, answers: Record<string, unknown>) {
  try {
    const result = jsonLogic.apply(rule, answers)
    return { eligible: !!result, details: { rule, answers } }
  } catch (e) {
    throw new Error('Invalid eligibility rule')
  }
}
```

### 26.4 RWH & Solar Formulas (Unit-tested)

`lib/green/formulas.ts`

```ts
export const rwh = (rainfallMm: number, areaM2: number, runoffCoeff: number) =>
  rainfallMm * areaM2 * runoffCoeff * 0.001

export const solarFromArea = (areaM2: number, usablePct: number, wpPerM2: number, specificYield: number, pr: number) => {
  const usableArea = areaM2 * (usablePct / 100)
  const kWp = (usableArea * wpPerM2) / 1000
  const annualYield = kWp * specificYield * pr
  return { usableArea, kWp, annualYield }
}
```

---

## 27) Pull Request Quality Checklist (attach to each PR)

* [ ] Lint, typecheck, unit, e2e ✅
* [ ] Coverage ≥ 85% ✅
* [ ] Lighthouse budgets met ✅
* [ ] A11y checks (axe) ✅
* [ ] Security review (CSP, rate limits, input sanitization) ✅
* [ ] Docs updated ✅
* [ ] `status.md` updated ✅
* [ ] Screenshots attached (components & key pages) ✅
* [ ] Rollback plan included ✅

---

## 28) Acceptance Tests to Run Before Merge to `main`

1. **Admin 2FA** enforcement & login.
2. **Content publish** flow (draft → stage → approve → publish → rollback).
3. **Form Builder** creates Complaint form; submission via PWA offline queue; sync + SLA timer; status notifications.
4. **Projects** list & detail with geotagged milestones; map render.
5. **Budget Explorer** Sankey & CSV export.
6. **Carbon Calculator** run with admin factors; recommendations visible.
7. **Eligibility Checker** rule passes & link to application.
8. **Events** RSVP & reminders (email + SMS).
9. **Notifications Center** test sends for all channels.
10. **i18n** toggle persists; translation editor changes propagate.
11. **Web Push** opt-in & receive.
12. **PWA** installable; offline pages; Background Sync verified.
13. **File upload** scanned by ClamAV; quarantine on EICAR-style test; allow on clean.
14. **SEO**: JSON-LD renders; sitemap/robots served.
15. **A11y** keyboard-only navigation pass.

---

## 29) Final Deployment & Runbook

* Merge PR18 → DO App Platform auto-deploy.
* Run **post-deploy smoke** (Playwright against prod).
* Tag release `v1.0.0`.
* Snapshot DB & Spaces.
* Update `status.md` with URLs, metrics, and D1 post-release QA results.
* Open `v1.x` milestone for enhancements (nice-to-haves).

---

## 30) Do Not

* Do **not** ship mock endpoints or placeholder business logic.
* Do **not** disable security checks to pass CI.
* Do **not** commit secrets or sample real PII.
* Do **not** bypass `status.md` updates.

---

## 31) Start Signal

Begin with **PR01 – Repo Bootstrap & Tooling** as defined.
Use the files and snippets above exactly, expand into full implementation aligning with `REQUIREMENTS_AND_GOALS.md`.
On PR creation, **update `status.md`** and attach **Storybook & Playwright screenshots** artifacts.
