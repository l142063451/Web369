// Jest globals are available through jest.setup.js

// Mock all dependencies before importing the service - fix variable scoping
jest.mock('@/lib/db', () => ({
  prisma: {
    translationKey: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
    },
    translationValue: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
  canUsePrisma: jest.fn(() => false), // Force mock usage in tests
}))

jest.mock('@/lib/auth/audit-logger', () => ({
  createAuditLog: jest.fn(),
}))

// Now import the service after mocking
import { TranslationService } from '@/lib/i18n/service'
import { prisma } from '@/lib/db'
import * as auditLogger from '@/lib/auth/audit-logger'

// Get the mocked instances for test assertions
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockCreateAuditLog = auditLogger.createAuditLog as jest.MockedFunction<typeof auditLogger.createAuditLog>

describe('TranslationService', () => {
  let service: TranslationService

  beforeEach(() => {
    service = new TranslationService()
    jest.clearAllMocks()
  })

  describe('getTranslationKeys', () => {
    it('should get all translation keys', async () => {
      const mockKeys = [
        {
          id: '1',
          key: 'common.save',
          defaultText: 'Save',
          module: 'common',
          translations: []
        }
      ]

      mockPrisma.translationKey.findMany.mockResolvedValue(mockKeys)

      const result = await service.getTranslationKeys()

      expect(mockPrisma.translationKey.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: { translations: true },
        orderBy: { key: 'asc' }
      })
      expect(result).toEqual(mockKeys)
    })

    it('should get translation keys filtered by module', async () => {
      const mockKeys = [
        {
          id: '1',
          key: 'admin.dashboard',
          defaultText: 'Dashboard',
          module: 'admin',
          translations: []
        }
      ]

      mockPrisma.translationKey.findMany.mockResolvedValue(mockKeys)

      const result = await service.getTranslationKeys('admin')

      expect(mockPrisma.translationKey.findMany).toHaveBeenCalledWith({
        where: { module: 'admin' },
        include: { translations: true },
        orderBy: { key: 'asc' }
      })
      expect(result).toEqual(mockKeys)
    })
  })

  describe('createTranslationKey', () => {
    it('should create a new translation key and audit log', async () => {
      const inputData = {
        key: 'test.key',
        defaultText: 'Test Key',
        module: 'test'
      }
      
      const mockCreatedKey = {
        id: '123',
        ...inputData,
        createdAt: new Date(),
        translations: []
      }

      mockPrisma.translationKey.create.mockResolvedValue(mockCreatedKey)

      const result = await service.createTranslationKey(inputData, 'user-123')

      expect(mockPrisma.translationKey.create).toHaveBeenCalledWith({
        data: inputData,
        include: { translations: true }
      })

      expect(mockCreateAuditLog).toHaveBeenCalledWith({
        actorId: 'user-123',
        action: 'CREATE',
        resource: 'translation_key',
        resourceId: '123',
        diff: { key: 'test.key', module: 'test' }
      })

      expect(result).toEqual(mockCreatedKey)
    })
  })

  describe('updateTranslationValue', () => {
    it('should update existing translation value', async () => {
      const inputData = {
        keyId: 'key-123',
        locale: 'en',
        text: 'Updated Text'
      }

      const existingValue = {
        id: 'value-123',
        keyId: 'key-123',
        locale: 'en',
        text: 'Old Text'
      }

      const updatedValue = {
        ...existingValue,
        text: 'Updated Text'
      }

      mockPrisma.translationValue.findUnique.mockResolvedValue(existingValue)
      mockPrisma.translationValue.update.mockResolvedValue(updatedValue)

      const result = await service.updateTranslationValue(inputData, 'user-123')

      expect(mockPrisma.translationValue.findUnique).toHaveBeenCalledWith({
        where: {
          keyId_locale: {
            keyId: 'key-123',
            locale: 'en'
          }
        }
      })

      expect(mockPrisma.translationValue.update).toHaveBeenCalledWith({
        where: { id: 'value-123' },
        data: { text: 'Updated Text' }
      })

      expect(mockCreateAuditLog).toHaveBeenCalledWith({
        actorId: 'user-123',
        action: 'UPDATE',
        resource: 'translation_value',
        resourceId: 'value-123',
        diff: {
          locale: 'en',
          oldText: 'Old Text',
          newText: 'Updated Text'
        }
      })

      expect(result).toEqual(updatedValue)
    })

    it('should create new translation value if none exists', async () => {
      const inputData = {
        keyId: 'key-123',
        locale: 'hi',
        text: 'नया पाठ'
      }

      const newValue = {
        id: 'value-456',
        ...inputData
      }

      mockPrisma.translationValue.findUnique.mockResolvedValue(null)
      mockPrisma.translationValue.create.mockResolvedValue(newValue)

      const result = await service.updateTranslationValue(inputData, 'user-123')

      expect(mockPrisma.translationValue.create).toHaveBeenCalledWith({
        data: inputData
      })

      expect(mockCreateAuditLog).toHaveBeenCalledWith({
        actorId: 'user-123',
        action: 'CREATE',
        resource: 'translation_value',
        resourceId: 'value-456',
        diff: {
          locale: 'hi',
          text: 'नया पाठ'
        }
      })

      expect(result).toEqual(newValue)
    })
  })

  describe('getTranslationsForLocale', () => {
    it('should return translations as key-value pairs for a locale', async () => {
      const mockTranslations = [
        {
          id: '1',
          keyId: 'key1',
          locale: 'en',
          text: 'Save',
          translationKey: {
            key: 'common.save'
          }
        },
        {
          id: '2',
          keyId: 'key2',
          locale: 'en',
          text: 'Cancel',
          translationKey: {
            key: 'common.cancel'
          }
        }
      ]

      mockPrisma.translationValue.findMany.mockResolvedValue(mockTranslations)

      const result = await service.getTranslationsForLocale('en')

      expect(mockPrisma.translationValue.findMany).toHaveBeenCalledWith({
        where: { locale: 'en' },
        include: { translationKey: true }
      })

      expect(result).toEqual({
        'common.save': 'Save',
        'common.cancel': 'Cancel'
      })
    })
  })

  describe('getMissingTranslations', () => {
    it('should return keys without translations for a locale', async () => {
      const mockKeys = [
        {
          id: '1',
          key: 'common.save',
          defaultText: 'Save',
          module: 'common',
          translations: [{ locale: 'hi', text: 'सहेजें' }] // Has Hindi translation
        },
        {
          id: '2',
          key: 'common.cancel',
          defaultText: 'Cancel',
          module: 'common',
          translations: [] // Missing Hindi translation
        }
      ]

      mockPrisma.translationKey.findMany.mockResolvedValue(mockKeys)

      const result = await service.getMissingTranslations('hi')

      expect(mockPrisma.translationKey.findMany).toHaveBeenCalledWith({
        include: {
          translations: {
            where: { locale: 'hi' }
          }
        }
      })

      expect(result).toHaveLength(1)
      expect(result[0].key).toBe('common.cancel')
    })
  })

  describe('deleteTranslationKey', () => {
    it('should delete translation key and create audit log', async () => {
      const keyToDelete = {
        id: 'key-123',
        key: 'test.key',
        defaultText: 'Test',
        module: 'test',
        translations: [
          { id: '1', locale: 'en', text: 'Test' },
          { id: '2', locale: 'hi', text: 'परीक्षा' }
        ]
      }

      mockPrisma.translationKey.findUnique.mockResolvedValue(keyToDelete)
      mockPrisma.translationKey.delete.mockResolvedValue(keyToDelete)

      await service.deleteTranslationKey('key-123', 'user-123')

      expect(mockPrisma.translationKey.delete).toHaveBeenCalledWith({
        where: { id: 'key-123' }
      })

      expect(mockCreateAuditLog).toHaveBeenCalledWith({
        actorId: 'user-123',
        action: 'DELETE',
        resource: 'translation_key',
        resourceId: 'key-123',
        diff: { key: 'test.key', translationsCount: 2 }
      })
    })

    it('should throw error if translation key not found', async () => {
      mockPrisma.translationKey.findUnique.mockResolvedValue(null)

      await expect(service.deleteTranslationKey('nonexistent', 'user-123'))
        .rejects.toThrow('Translation key not found')
    })
  })

  describe('getModules', () => {
    it('should return list of modules', async () => {
      const mockResult = [
        { module: 'admin' },
        { module: 'common' },
        { module: 'forms' }
      ]

      mockPrisma.translationKey.groupBy.mockResolvedValue(mockResult)

      const result = await service.getModules()

      expect(mockPrisma.translationKey.groupBy).toHaveBeenCalledWith({
        by: ['module'],
        orderBy: { module: 'asc' }
      })

      expect(result).toEqual(['admin', 'common', 'forms'])
    })
  })
})