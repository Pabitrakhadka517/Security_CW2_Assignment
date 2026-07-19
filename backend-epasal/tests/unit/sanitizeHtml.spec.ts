import { stripHtml } from '../../src/utils/sanitizeHtml'

describe('stripHtml', () => {
  test('removes a script tag and its contents entirely', () => {
    expect(stripHtml('<script>alert(1)</script>hello')).toBe('hello')
  })

  test('unwraps other tags, keeping their inner text', () => {
    expect(stripHtml('<b>bold</b> text')).toBe('bold text')
  })

  test('strips an attribute-based XSS attempt down to its visible text', () => {
    expect(stripHtml('<img src=x onerror=alert(1)>Nice shoes')).toBe('Nice shoes')
  })

  test('leaves plain text untouched', () => {
    expect(stripHtml('plain text')).toBe('plain text')
  })

  test('passes through non-string values unchanged', () => {
    expect(stripHtml(null)).toBe(null)
    expect(stripHtml(undefined)).toBe(undefined)
    expect(stripHtml(42)).toBe(42)
  })
})
