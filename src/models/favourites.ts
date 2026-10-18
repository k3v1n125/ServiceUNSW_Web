export const MAX_FAVOURITES = 4

export function parseFavourites(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_FAVOURITES ||
    value.some((id) => typeof id !== 'string') ||
    new Set(value).size !== value.length) {
    throw new Error('Favourites must contain up to four unique service IDs.')
  }
  return value
}
