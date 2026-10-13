import { users } from '../data/users'
import type { User } from '../data/users'

const sessionKey = 'serviceunsw-demo-zid'

export function authenticate(zid: string, zPass: string): User | undefined {
  return users.find((user) =>
    user.universityId === zid.trim().toLowerCase() && user.zPass === zPass,
  )
}

export function readSession(): User | null {
  if (typeof window === 'undefined') return null
  const zid = window.sessionStorage.getItem(sessionKey)
  return users.find((user) => user.universityId === zid) ?? null
}

export function saveSession(user: User): void {
  window.sessionStorage.setItem(sessionKey, user.universityId)
}

export function clearSession(): void {
  window.sessionStorage.removeItem(sessionKey)
}
