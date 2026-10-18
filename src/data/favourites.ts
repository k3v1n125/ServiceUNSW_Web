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

export function parseFavourites(value: unknown): string[] {
  if (value === null) return [...DEFAULT_FAVOURITES]
  const migrated = Array.isArray(value) ? value.map((id) => id === 'fees' ? 'myplan' : id) : value
  return validateFavourites(migrated)
}
