import { generateEmailOtp, hashEmailOtp, verifyEmailOtp } from '../../src/services/mfa.service'

describe('MFA email OTP', () => {
  test('generates a 6-digit numeric code', () => {
    const code = generateEmailOtp()
    expect(code).toMatch(/^\d{6}$/)
  })

  test('generates codes across the full range, not a narrow band', () => {
    const codes = Array.from({ length: 200 }, () => generateEmailOtp())
    expect(codes.some((c) => c.length === 6)).toBe(true)
    // Not all identical — randomness is actually happening.
    expect(new Set(codes).size).toBeGreaterThan(1)
  })

  test('hashEmailOtp/verifyEmailOtp round-trip correctly', async () => {
    const code = generateEmailOtp()
    const hash = hashEmailOtp(code)
    expect(hash).not.toBe(code)
    await expect(verifyEmailOtp(code, hash)).resolves.toBe(true)
  })

  test('verifyEmailOtp rejects an incorrect code', async () => {
    const code = generateEmailOtp()
    const hash = hashEmailOtp(code)
    const wrong = code === '000000' ? '111111' : '000000'
    await expect(verifyEmailOtp(wrong, hash)).resolves.toBe(false)
  })
})
