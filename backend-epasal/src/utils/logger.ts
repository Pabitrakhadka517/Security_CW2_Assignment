import * as fs from 'fs'
import * as path from 'path'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

type LogMeta = Record<string, unknown> | Error | string | number | boolean | null | undefined

const isProduction = process.env.NODE_ENV === 'production'

/**
 * Single unified log file.
 * Every level (info / warn / error / debug) is appended to ONE file so the
 * operator has a single place to read the full history. Override the location
 * with LOG_DIR / LOG_FILE env vars if needed; defaults to <cwd>/logs/app.log.
 */
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs')
const LOG_FILE = process.env.LOG_FILE || path.join(LOG_DIR, 'app.log')

let fileStream: fs.WriteStream | null = null
try {
  fs.mkdirSync(LOG_DIR, { recursive: true })
  fileStream = fs.createWriteStream(LOG_FILE, { flags: 'a' }) // append, never truncate
  // If the stream errors at any point (disk full, perms), stop using it so a
  // logging failure can never crash the app or spam the console.
  fileStream.on('error', () => { fileStream = null })
} catch {
  fileStream = null
}

const writeToFile = (line: string): void => {
  if (!fileStream) return
  try {
    fileStream.write(line + '\n')
  } catch {
    /* never let logging throw */
  }
}

const serializeMeta = (meta?: LogMeta): Record<string, unknown> | undefined => {
  if (meta === undefined || meta === null) return undefined

  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
    }
  }

  if (typeof meta === 'object') {
    return meta as Record<string, unknown>
  }

  return { value: meta }
}

const write = (level: LogLevel, message: string, meta?: LogMeta): void => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(serializeMeta(meta) ? { meta: serializeMeta(meta) } : {}),
  }

  // 1. Persist to the single log file (all levels, all environments).
  writeToFile(JSON.stringify(payload))

  // 2. Mirror to the console (structured JSON in prod, pretty in dev).
  if (isProduction) {
    const line = JSON.stringify(payload)

    if (level === 'error') {
      console.error(line)
      return
    }

    if (level === 'warn') {
      console.warn(line)
      return
    }

    console.log(line)
    return
  }

  const prettyMeta = serializeMeta(meta)
  const prefix = level.toUpperCase()

  if (level === 'error') {
    console.error(`[${prefix}] ${message}`, prettyMeta ?? '')
    return
  }

  if (level === 'warn') {
    console.warn(`[${prefix}] ${message}`, prettyMeta ?? '')
    return
  }

  if (level === 'debug') {
    console.debug(`[${prefix}] ${message}`, prettyMeta ?? '')
    return
  }

  console.log(`[${prefix}] ${message}`, prettyMeta ?? '')
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write('info', message, meta),
  warn: (message: string, meta?: LogMeta) => write('warn', message, meta),
  error: (message: string, meta?: LogMeta) => write('error', message, meta),
  debug: (message: string, meta?: LogMeta) => write('debug', message, meta),
}
