import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit/logger'

export interface TranslationKey {
  id: string
  key: string
  defaultText: string
  module: string
  translations: TranslationValue[]
}

export interface TranslationValue {
  id: string
  keyId: string
  locale: string
  text: string
}

export interface CreateTranslationKeyInput {
  key: string
  defaultText: string
  module: string
}

export interface UpdateTranslationValueInput {
  keyId: string
  locale: string
  text: string
}

/**
 * Translation service for managing translation keys and values
 */
export class TranslationService {
  /**
   * Get all translation keys with their values
   */
  async getTranslationKeys(module?: string): Promise<TranslationKey[]> {
    const keys = await prisma.translationKey.findMany({
      where: module ? { module } : undefined,
      include: {
        translations: true
      },
      orderBy: { key: 'asc' }
    })

    return keys
  }

  /**
   * Get translation key by ID
   */
  async getTranslationKey(id: string): Promise<TranslationKey | null> {
    const key = await prisma.translationKey.findUnique({
      where: { id },
      include: {
        translations: true
      }
    })

    return key
  }

  /**
   * Create new translation key
   */
  async createTranslationKey(
    data: CreateTranslationKeyInput,
    userId: string
  ): Promise<TranslationKey> {
    const key = await prisma.translationKey.create({
      data,
      include: {
        translations: true
      }
    })

    await createAuditLog({
      actorId: userId,
      action: 'CREATE',
      resource: 'translation_key',
      resourceId: key.id,
      diff: { key: key.key, module: key.module }
    })

    return key
  }

  /**
   * Update translation value for a specific locale
   */
  async updateTranslationValue(
    data: UpdateTranslationValueInput,
    userId: string
  ): Promise<TranslationValue> {
    const existingValue = await prisma.translationValue.findUnique({
      where: {
        keyId_locale: {
          keyId: data.keyId,
          locale: data.locale
        }
      }
    })

    let value: TranslationValue

    if (existingValue) {
      // Update existing translation
      value = await prisma.translationValue.update({
        where: { id: existingValue.id },
        data: { text: data.text }
      })

      await createAuditLog({
        actorId: userId,
        action: 'UPDATE',
        resource: 'translation_value',
        resourceId: value.id,
        diff: { 
          locale: data.locale,
          oldText: existingValue.text,
          newText: data.text
        }
      })
    } else {
      // Create new translation
      value = await prisma.translationValue.create({
        data
      })

      await createAuditLog({
        actorId: userId,
        action: 'CREATE',
        resource: 'translation_value',
        resourceId: value.id,
        diff: { 
          locale: data.locale,
          text: data.text
        }
      })
    }

    return value
  }

  /**
   * Delete translation key and all its values
   */
  async deleteTranslationKey(id: string, userId: string): Promise<void> {
    const key = await prisma.translationKey.findUnique({
      where: { id },
      include: { translations: true }
    })

    if (!key) {
      throw new Error('Translation key not found')
    }

    await prisma.translationKey.delete({
      where: { id }
    })

    await createAuditLog({
      actorId: userId,
      action: 'DELETE',
      resource: 'translation_key',
      resourceId: id,
      diff: { key: key.key, translationsCount: key.translations.length }
    })
  }

  /**
   * Get translations for a specific locale
   */
  async getTranslationsForLocale(locale: string): Promise<Record<string, string>> {
    const translations = await prisma.translationValue.findMany({
      where: { locale },
      include: {
        translationKey: true
      }
    })

    const result: Record<string, string> = {}
    
    for (const translation of translations) {
      result[translation.translationKey.key] = translation.text
    }

    return result
  }

  /**
   * Get missing translations for a specific locale
   */
  async getMissingTranslations(locale: string): Promise<TranslationKey[]> {
    const keys = await prisma.translationKey.findMany({
      include: {
        translations: {
          where: { locale }
        }
      }
    })

    return keys.filter((key: any) => key.translations.length === 0)
  }

  /**
   * Get all modules with translation keys
   */
  async getModules(): Promise<string[]> {
    const result = await prisma.translationKey.groupBy({
      by: ['module'],
      orderBy: { module: 'asc' }
    })

    return result.map((item: any) => item.module)
  }

  /**
   * Import translations from JSON
   */
  async importTranslations(
    translations: Record<string, any>,
    locale: string,
    module: string,
    userId: string,
    prefix = ''
  ): Promise<{ created: number; updated: number }> {
    let created = 0
    let updated = 0

    for (const [key, value] of Object.entries(translations)) {
      const fullKey = prefix ? `${prefix}.${key}` : key

      if (typeof value === 'object' && value !== null) {
        // Recursive handling for nested objects
        const result = await this.importTranslations(
          value,
          locale,
          module,
          userId,
          fullKey
        )
        created += result.created
        updated += result.updated
      } else if (typeof value === 'string') {
        // Check if key exists
        let translationKey = await prisma.translationKey.findUnique({
          where: { key: fullKey }
        })

        if (!translationKey) {
          // Create new key
          translationKey = await prisma.translationKey.create({
            data: {
              key: fullKey,
              defaultText: value,
              module
            }
          })
        }

        // Check if translation exists
        const existingValue = await prisma.translationValue.findUnique({
          where: {
            keyId_locale: {
              keyId: translationKey.id,
              locale
            }
          }
        })

        if (existingValue) {
          // Update existing
          await prisma.translationValue.update({
            where: { id: existingValue.id },
            data: { text: value }
          })
          updated++
        } else {
          // Create new
          await prisma.translationValue.create({
            data: {
              keyId: translationKey.id,
              locale,
              text: value
            }
          })
          created++
        }
      }
    }

    await createAuditLog({
      actorId: userId,
      action: 'CREATE',
      resource: 'translations',
      resourceId: module,
      diff: { locale, created, updated }
    })

    return { created, updated }
  }
}