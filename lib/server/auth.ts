import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'
import { SESSION_COOKIE } from '@/lib/auth-constants'

export { SESSION_COOKIE }

const HASH_ITERATIONS = 120_000
const HASH_LENGTH = 32
const HASH_DIGEST = 'sha256'
const SESSION_TTL_SECONDS = 60 * 60 * 8

function secret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'koperasi-ledger-dev-secret'
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url')
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url')
  const hash = pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_LENGTH, HASH_DIGEST).toString('base64url')
  return `pbkdf2$${HASH_ITERATIONS}$${salt}$${hash}`
}

export function verifyPassword(password: string, storedHash?: string | null) {
  if (!storedHash) return false

  const [kind, iterationsRaw, salt, hash] = storedHash.split('$')
  if (kind !== 'pbkdf2' || !iterationsRaw || !salt || !hash) return false

  const iterations = Number(iterationsRaw)
  if (!Number.isInteger(iterations) || iterations <= 0) return false

  const candidate = pbkdf2Sync(password, salt, iterations, HASH_LENGTH, HASH_DIGEST)
  const expected = Buffer.from(hash, 'base64url')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

export function createSessionToken(userId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = `${userId}.${expiresAt}`
  return `${payload}.${sign(payload)}`
}

export function verifySessionToken(token?: string | null) {
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [userId, expiresAtRaw, signature] = parts
  const payload = `${userId}.${expiresAtRaw}`
  const expected = sign(payload)
  const expiresAt = Number(expiresAtRaw)

  if (!userId || !signature || !Number.isInteger(expiresAt)) return null
  if (expiresAt <= Math.floor(Date.now() / 1000)) return null
  if (signature !== expected) return null

  return { userId, expiresAt }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  }
}
