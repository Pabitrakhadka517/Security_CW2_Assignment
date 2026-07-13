import { encryptionService } from '../../src/services/encryption.service'

const { encrypt, decrypt, isEncrypted, encryptIfNotEncrypted } = encryptionService

describe('EncryptionService', () => {
  test('encrypts and decrypts correctly', () => {
    const plain = 'Test Street, Kathmandu'
    const encrypted = encrypt(plain)
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(plain)
  })

  test('produces unique ciphertext for same input', () => {
    const plain = '9800000000'
    const enc1 = encrypt(plain)
    const enc2 = encrypt(plain)
    // IV is random so ciphertext must differ
    expect(enc1).not.toBe(enc2)
    // But both decrypt to same value
    expect(decrypt(enc1)).toBe(plain)
    expect(decrypt(enc2)).toBe(plain)
  })

  test('detects tampered ciphertext', () => {
    const plain = 'sensitive data'
    const encrypted = encrypt(plain)
    const parts = encrypted.split(':')
    // Tamper with the ciphertext portion
    parts[3] = parts[3].replace(/[0-9a-f]/, (c) => (c === '0' ? '1' : '0'))
    const tampered = parts.join(':')
    expect(() => decrypt(tampered)).toThrow()
  })

  test('isEncrypted identifies encrypted strings', () => {
    expect(isEncrypted('1:abc123:def456:0123abcd')).toBe(true)
    expect(isEncrypted('plain text')).toBe(false)
    expect(isEncrypted('')).toBe(false)
  })

  test('encryptIfNotEncrypted is idempotent', () => {
    const plain = 'test value'
    const once = encryptIfNotEncrypted(plain)
    const twice = encryptIfNotEncrypted(once)
    // Should not double-encrypt
    expect(decrypt(twice)).toBe(plain)
  })

  test('encryptObject/decryptObject only touch specified fields', () => {
    const obj = { phone: '9800000000', email: 'user@example.com' }
    const encrypted = encryptionService.encryptObject(obj, ['phone'])
    expect(isEncrypted(encrypted.phone)).toBe(true)
    expect(encrypted.email).toBe(obj.email)

    const decrypted = encryptionService.decryptObject(encrypted, ['phone'])
    expect(decrypted.phone).toBe(obj.phone)
  })

  test('decryptObject returns [DECRYPTION_FAILED] instead of throwing on bad data', () => {
    const obj = { phone: '1:deadbeef:deadbeef:deadbeef' }
    const decrypted = encryptionService.decryptObject(obj, ['phone'])
    expect(decrypted.phone).toBe('[DECRYPTION_FAILED]')
  })

  test('rotateEncryption re-encrypts under the current key', () => {
    const plain = 'rotate-me'
    const encrypted = encrypt(plain)
    const rotated = encryptionService.rotateEncryption(encrypted)
    expect(decrypt(rotated)).toBe(plain)
  })
})
