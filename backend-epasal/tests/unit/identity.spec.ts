import { generateId } from '../../src/utils/generateId'
import { buildUserKey } from '../../src/models/CouponUsage'

describe('generateId', () => {
  it('produces a prefixed, unique id', () => {
    const a = generateId('prod')
    const b = generateId('prod')
    expect(a).toMatch(/^prod_\d+_[0-9a-f]+$/i)
    expect(a).not.toBe(b)
  })
})

describe('buildUserKey (coupon identity for per-user limits)', () => {
  it('prefers the authenticated user id', () => {
    expect(buildUserKey({ userId: 'u1', email: 'x@y.com', phone: '98' })).toBe('uid:u1')
  })
  it('falls back to normalized email when no user id', () => {
    expect(buildUserKey({ userId: null, email: 'X@Y.com' })).toBe('email:x@y.com')
  })
  it('falls back to digits-only phone when no id/email', () => {
    expect(buildUserKey({ phone: '+977-98-1234' })).toBe('phone:977981234')
  })
  it('returns null when no identifier is available', () => {
    expect(buildUserKey({})).toBeNull()
  })
})
