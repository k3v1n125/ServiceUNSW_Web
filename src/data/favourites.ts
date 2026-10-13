import { quickLinkServices } from './services'

export const MAX_FAVOURITES = 4
export const DEFAULT_FAVOURITES = ['moodle', 'myunsw', 'library', 'email']

export function validateFavourites(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_FAVOURITES ||
    value.some((id) => typeof id !== 'string' || !quickLinkServices.some((service) => service.id === id)) ||
    new Set(value).size !== value.length) {
    throw new Error('Favourites must contain up to four unique service IDs.')
  }
  return value
}

export function readFavourites(userId: string, storage: Pick<Storage, 'getItem'>): string[] {
  const saved = storage.getItem(`serviceunsw-favourites-${userId}`)
  if (saved === null) return [...DEFAULT_FAVOURITES]
  const parsed: unknown = JSON.parse(saved)
  const migrated = Array.isArray(parsed) ? parsed.map((id) => id === 'fees' ? 'myplan' : id) : parsed
  return validateFavourites(migrated)
}

export function saveFavourites(userId: string, ids: string[], storage: Pick<Storage, 'setItem'>): void {
  storage.setItem(`serviceunsw-favourites-${userId}`, JSON.stringify(validateFavourites(ids)))
}
