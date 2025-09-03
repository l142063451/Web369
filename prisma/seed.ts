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
          { '<=': [{ 'var': 'annualIncome' }, 200000] },
          { '>=': [{ 'var': 'age' }, 18] },
          { 'in': [{ 'var': 'residenceArea' }, ['damday-chuanala', 'gangolihat']] }
        ],
      },
      docsRequired: ['Income Certificate', 'Roof Ownership Proof', 'Aadhar Card', 'Bank Passbook'],
      processSteps: [
        'Submit online application with required documents',
        'Document verification by local office', 
        'Technical site inspection by authorized engineer',
        'Financial approval from district collector',
        'Installation by empanelled vendor',
        'Final inspection and subsidy disbursement'
      ],
      links: ['https://mnre.gov.in', 'https://solarrooftop.gov.in'],
    },
    {
      title: 'Rainwater Harvesting Grant',
      category: 'water_conservation',
      criteria: {
        and: [
          { '>=': [{ 'var': 'age' }, 21] },
          { 'in': [{ 'var': 'residenceArea' }, ['damday-chuanala', 'gangolihat', 'pithoragarh']] },
          { '>=': [{ 'var': 'roofArea' }, 100] }
        ],
      },
      docsRequired: ['Property documents', 'Technical design plan', 'Cost estimate from contractor'],
      processSteps: [
        'Submit application with technical design',
        'Technical assessment by water department',
        'Grant approval and fund release',
        'Implementation monitoring',
        'Final verification and completion certificate'
      ],
      links: ['https://jalshakti.gov.in', 'https://cgwb.gov.in'],
    },
    {
      title: 'Senior Citizen Welfare Scheme',
      category: 'social_welfare',
      criteria: {
        and: [
          { '>=': [{ 'var': 'age' }, 60] },
          { '<': [{ 'var': 'annualIncome' }, 120000] },
          { 'in': [{ 'var': 'category' }, ['general', 'obc', 'sc', 'st']] }
        ],
      },
      docsRequired: ['Age proof certificate', 'Income certificate', 'Bank account details', 'Medical fitness certificate'],
      processSteps: [
        'Fill application form at panchayat office',
        'Submit required documents',
        'Medical checkup at designated center', 
        'Application review by welfare committee',
        'Monthly pension activation'
      ],
      links: ['https://nsap.nic.in'],
    },
    {
      title: 'Women Entrepreneur Development Program',
      category: 'economic_development',
      criteria: {
        and: [
          { '>=': [{ 'var': 'age' }, 18] },
          { '<=': [{ 'var': 'age' }, 45] },
          { '==': [{ 'var': 'gender' }, 'female'] },
          { 'in': [{ 'var': 'residenceArea' }, ['damday-chuanala', 'gangolihat']] }
        ],
      },
      docsRequired: ['Business plan', 'Educational certificates', 'Experience certificate', 'Project cost estimate'],
      processSteps: [
        'Attend awareness session',
        'Prepare detailed business plan',
        'Submit application with documents',
        'Interview by selection committee',
        'Training program participation',
        'Loan approval and disbursal'
      ],
      links: ['https://msme.gov.in', 'https://mudra.org.in'],
    },
    {
      title: 'Skill Development Training Scheme',
      category: 'education_training',
      criteria: {
        and: [
          { '>=': [{ 'var': 'age' }, 16] },
          { '<=': [{ 'var': 'age' }, 35] },
          { 'in': [{ 'var': 'educationLevel' }, ['10th', '12th', 'graduate', 'below_10th']] }
        ],
      },
      docsRequired: ['Educational certificates', 'Age proof', 'Caste certificate (if applicable)', 'Employment exchange registration'],
      processSteps: [
        'Registration at skill development center',
        'Counseling and course selection',
        'Training program enrollment',
        '3-6 months skill training',
        'Assessment and certification',
        'Job placement assistance'
      ],
      links: ['https://pmkvyofficial.org', 'https://skillindia.gov.in'],
    },
    {
      title: 'Organic Farming Support Scheme',
      category: 'agriculture',
      criteria: {
        and: [
          { '>=': [{ 'var': 'age' }, 18] },
          { '>=': [{ 'var': 'landArea' }, 0.5] },
          { '==': [{ 'var': 'occupation' }, 'farmer'] }
        ],
      },
      docsRequired: ['Land ownership documents', 'Farmer registration certificate', 'Soil health card', 'Bank account details'],
      processSteps: [
        'Register as organic farmer',
        'Attend training on organic practices',
        'Submit land conversion plan',
        'Implementation with monitoring',
        'Organic certification process',
        'Marketing support and premium pricing'
      ],
      links: ['https://pgsindia-ncof.gov.in', 'https://agricoop.gov.in'],
    }
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