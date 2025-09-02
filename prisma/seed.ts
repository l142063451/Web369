import { PrismaClient } from '@prisma/client'
import { initializeDefaultRoles } from '../lib/rbac/permissions'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')
  
  // Initialize default roles
  console.log('📝 Creating default roles...')
  await initializeDefaultRoles()
  
  // Create admin user
  console.log('👤 Creating admin user...')
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ummidsehari.in' },
    update: {},
    create: {
      email: 'admin@ummidsehari.in',
      name: 'System Administrator',
      locale: 'en',
      emailVerified: new Date(),
    },
  })
  
  // Assign admin role to admin user
  const adminRole = await prisma.role.findUnique({
    where: { name: 'admin' }
  })
  
  if (adminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    })
    console.log('✅ Admin role assigned to admin user')
  }
  
  // Create some basic settings
  console.log('⚙️ Creating default settings...')
  const defaultSettings = [
    {
      key: 'app_name',
      value: 'Ummid Se Hari',
      scope: 'GLOBAL' as const,
    },
    {
      key: 'default_locale',
      value: 'en',
      scope: 'GLOBAL' as const,
    },
    {
      key: 'enforce_2fa_for_admins',
      value: true,
      scope: 'GLOBAL' as const,
    },
    {
      key: 'maintenance_mode',
      value: false,
      scope: 'GLOBAL' as const,
    },
  ]
  
  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    })
  }
  
  // Create some sample translation keys
  console.log('🌐 Creating translation keys...')
  const translationKeys = [
    {
      key: 'common.welcome',
      defaultText: 'Welcome',
      module: 'common',
    },
    {
      key: 'common.signin',
      defaultText: 'Sign In',
      module: 'common',
    },
    {
      key: 'common.signout',
      defaultText: 'Sign Out',
      module: 'common',
    },
    {
      key: 'nav.home',
      defaultText: 'Home',
      module: 'navigation',
    },
    {
      key: 'nav.admin',
      defaultText: 'Admin Panel',
      module: 'navigation',
    },
    {
      key: 'error.unauthorized',
      defaultText: 'You are not authorized to access this resource',
      module: 'errors',
    },
    {
      key: 'error.forbidden',
      defaultText: 'Access forbidden',
      module: 'errors',
    },
  ]
  
  for (const keyData of translationKeys) {
    const translationKey = await prisma.translationKey.upsert({
      where: { key: keyData.key },
      update: {},
      create: keyData,
    })
    
    // Add Hindi translations
    await prisma.translationValue.upsert({
      where: {
        keyId_locale: {
          keyId: translationKey.id,
          locale: 'hi',
        },
      },
      update: {},
      create: {
        keyId: translationKey.id,
        locale: 'hi',
        text: getHindiTranslation(keyData.key, keyData.defaultText),
      },
    })
  }
  
  // Create sample schemes
  console.log('📋 Creating sample schemes...')
  const sampleSchemes = [
    {
      title: 'Solar Panel Installation Subsidy',
      category: 'renewable_energy',
      criteria: {
        and: [
          { '<=': [{ 'var': 'income' }, 200000] },
          { '==': [{ 'var': 'has_roof' }, true] },
        ],
      },
      docsRequired: ['income_certificate', 'roof_ownership_proof'],
      processSteps: ['Apply online', 'Document verification', 'Site inspection', 'Approval'],
      links: ['https://mnre.gov.in'],
    },
    {
      title: 'Rainwater Harvesting Grant',
      category: 'water_conservation',
      criteria: {
        and: [
          { '<': [{ 'var': 'roof_area' }, 1000] },
          { '==': [{ 'var': 'water_scarcity' }, true] },
        ],
      },
      docsRequired: ['property_documents', 'water_bill'],
      processSteps: ['Submit application', 'Technical assessment', 'Grant approval'],
      links: ['https://jalshakti.gov.in'],
    },
  ]
  
  for (const scheme of sampleSchemes) {
    await prisma.scheme.upsert({
      where: { title: scheme.title },
      update: {},
      create: scheme,
    })
  }
  
  console.log('✅ Database seeded successfully!')
}

function getHindiTranslation(key: string, defaultText: string): string {
  const translations: Record<string, string> = {
    'common.welcome': 'स्वागत',
    'common.signin': 'साइन इन करें',
    'common.signout': 'साइन आउट',
    'nav.home': 'होम',
    'nav.admin': 'एडमिन पैनल',
    'error.unauthorized': 'आपको इस संसाधन तक पहुंचने की अनुमति नहीं है',
    'error.forbidden': 'पहुंच निषिद्ध',
  }
  
  return translations[key] || defaultText
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })