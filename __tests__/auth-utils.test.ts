import { generateSecret, generateRecoveryCodes } from '../lib/auth/utils'

describe('Auth Utils', () => {
  test('generateSecret should return a 32-character string', () => {
    const secret = generateSecret()
    expect(secret).toHaveLength(32)
    expect(typeof secret).toBe('string')
  })

  test('generateRecoveryCodes should return array of codes', () => {
    const codes = generateRecoveryCodes(5)
    expect(codes).toHaveLength(5)
    expect(codes.every(code => typeof code === 'string')).toBe(true)
    expect(codes.every(code => code.length === 8)).toBe(true)
  })

  test('generateRecoveryCodes should return unique codes', () => {
    const codes = generateRecoveryCodes(10)
    const uniqueCodes = new Set(codes)
    expect(uniqueCodes.size).toBe(codes.length)
  })
})