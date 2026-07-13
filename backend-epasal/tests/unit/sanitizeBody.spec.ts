import { Request, Response, NextFunction } from 'express'
import { preventMassAssignment, USER_PROTECTED_FIELDS } from '../../src/middlewares/sanitizeBody'

jest.mock('../../src/services/audit.service', () => ({ log: jest.fn() }))

const mockReq = (body: Record<string, unknown>) =>
  ({ body, headers: {}, ip: '127.0.0.1', path: '/api/v1/user/profile', method: 'PUT' } as unknown as Request)
const mockNext = () => jest.fn() as unknown as NextFunction

describe('preventMassAssignment', () => {
  it('strips every protected field from req.body', () => {
    const req = mockReq({ name: 'Ram', role: 'admin', isAdmin: true, loginAttempts: 0, lockUntil: null })
    const next = mockNext()

    preventMassAssignment()(req, {} as Response, next)

    for (const field of ['role', 'isAdmin', 'loginAttempts', 'lockUntil']) {
      expect(req.body).not.toHaveProperty(field)
    }
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('leaves legitimate fields untouched so the rest of the update still succeeds', () => {
    const req = mockReq({ name: 'Ram', email: 'ram@test.com', role: 'admin' })
    const next = mockNext()

    preventMassAssignment()(req, {} as Response, next)

    expect(req.body).toEqual({ name: 'Ram', email: 'ram@test.com' })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('is a no-op (still calls next) when no protected field is present', () => {
    const req = mockReq({ name: 'Ram' })
    const next = mockNext()

    preventMassAssignment()(req, {} as Response, next)

    expect(req.body).toEqual({ name: 'Ram' })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('covers every field the User model must never accept directly from a client', () => {
    expect(USER_PROTECTED_FIELDS).toEqual(
      expect.arrayContaining(['role', 'isAdmin', 'loginAttempts', 'lockUntil', 'mfaSecret', '_id'])
    )
  })
})
