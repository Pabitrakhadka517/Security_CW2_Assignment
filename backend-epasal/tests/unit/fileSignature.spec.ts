import { detectImageType, matchesDeclaredMimeType, hasAllowedImageExtension } from '../../src/utils/fileSignature'

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])
const GIF_HEADER = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0])
const WEBP_HEADER = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
const NOT_AN_IMAGE = Buffer.from('<script>alert(1)</script>')

describe('detectImageType', () => {
  test('detects each supported format from its magic bytes', () => {
    expect(detectImageType(PNG_HEADER)).toBe('png')
    expect(detectImageType(JPEG_HEADER)).toBe('jpeg')
    expect(detectImageType(GIF_HEADER)).toBe('gif')
    expect(detectImageType(WEBP_HEADER)).toBe('webp')
  })

  test('returns null for non-image content, e.g. an HTML/script payload uploaded as an "image"', () => {
    expect(detectImageType(NOT_AN_IMAGE)).toBeNull()
  })
})

describe('matchesDeclaredMimeType', () => {
  test('accepts a file whose real bytes match its declared mimetype', () => {
    expect(matchesDeclaredMimeType(PNG_HEADER, 'image/png')).toBe(true)
  })

  test('rejects a MIME-spoofed file (declared image/png, actually a script)', () => {
    expect(matchesDeclaredMimeType(NOT_AN_IMAGE, 'image/png')).toBe(false)
  })

  test('rejects a mismatched declared type even when the content IS a real image (e.g. jpeg claimed as png)', () => {
    expect(matchesDeclaredMimeType(JPEG_HEADER, 'image/png')).toBe(false)
  })
})

describe('hasAllowedImageExtension', () => {
  test('accepts the allowlisted extensions', () => {
    expect(hasAllowedImageExtension('photo.jpg')).toBe(true)
    expect(hasAllowedImageExtension('photo.JPEG')).toBe(true)
    expect(hasAllowedImageExtension('photo.png')).toBe(true)
    expect(hasAllowedImageExtension('photo.gif')).toBe(true)
    expect(hasAllowedImageExtension('photo.webp')).toBe(true)
  })

  test('rejects a disguised executable extension', () => {
    expect(hasAllowedImageExtension('shell.php')).toBe(false)
    expect(hasAllowedImageExtension('photo.jpg.exe')).toBe(false)
    expect(hasAllowedImageExtension('noextension')).toBe(false)
  })
})
