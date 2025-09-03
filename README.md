# उम्मीद से हरी | Ummid Se Hari

**Smart, Green & Transparent Village PWA**

A progressive web application for Damday–Chuanala, Gangolihat, Pithoragarh, Uttarakhand, India.

## 🌟 Vision

Transform Damday–Chuanala into a smart, green, carbon-conscious model village by inspiring community action ("Ummid") and enabling transparent, participatory governance.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker & Docker Compose (for local services)

### Installation

```bash
# Clone the repository
git clone https://github.com/l142063451/Web369.git
cd Web369

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start services with Docker Compose
docker-compose up -d

# Run database migrations (when implemented)
# pnpm prisma migrate dev

# Start development server
pnpm dev
```

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript compiler
pnpm test         # Run Jest tests
pnpm test:e2e     # Run Playwright E2E tests
pnpm update-status # Update status.md timestamp
pnpm ci-success   # Mark CI as successful in status
pnpm ci-failure   # Mark CI as failed in status
```

### Access Points

- **Application**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **Storybook**: http://localhost:6006 (run `pnpm storybook`)
- **Mailhog**: http://localhost:8025
pnpm storybook    # Start Storybook
pnpm lighthouse   # Run Lighthouse CI
```

## 🏗️ Development Status

This project is under active development following an 18-PR roadmap. See `status.md` for current progress.

**Current Phase:** PR01 - Repository Bootstrap & Tooling

## 📚 Documentation

- [Requirements & Goals](REQUIREMENTS_AND_GOALS.md)
- [Development Instructions](INSTRUCTIONS_FOR_COPILOT.md)  
- [Project Status](status.md)

## 🛠️ Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui components  
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js with 2FA
- **PWA:** Workbox service worker
- **Testing:** Jest, Playwright, Storybook
- **Infrastructure:** Docker, GitHub Actions

## 🌐 Services (Local Development)

- **Application:** http://localhost:3000
- **Mailhog (Email):** http://localhost:8025  
- **Storybook:** http://localhost:6006
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379
- **ClamAV:** localhost:3310

## 🤝 Contributing

This project follows strict development practices:

1. All changes require PR with 2 approvals minimum
2. CI must be green (lint, typecheck, tests, coverage ≥85%)
3. Update `status.md` with every PR
4. Follow conventional commits
5. Include tests and documentation

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🎯 Goals

- **3×** civic participation within 6 months
- **15%** carbon footprint reduction within 12 months  
- **90%** complaint resolution within SLAs
- **100%** project budget transparency
- **80%** admin panel adoption within 30 days

---

*Built with hope (उम्मीद) for a greener tomorrow* 🌱