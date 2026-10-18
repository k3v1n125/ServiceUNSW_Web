import type { User } from '../models/users'

const sessionKey = 'serviceunsw-demo-user-id'

export function readSessionUserId(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(sessionKey)
}

export function saveSession(user: User): void {
  window.sessionStorage.setItem(sessionKey, user.id)
}

export function clearSession(): void {
  window.sessionStorage.removeItem(sessionKey)
}
