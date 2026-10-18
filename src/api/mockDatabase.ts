export type MockResource =
  | 'favourites'
  | 'calendar-settings'
  | 'personal-events'
  | 'lecture-checklists'
  | 'teaching-note'

function resourceUrl(userId: string, resource: MockResource): string {
  return `/api/users/${encodeURIComponent(userId)}/${resource}`
}

async function parseResponse(response: Response): Promise<unknown> {
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `Mock API request failed (${response.status}).`
    throw new Error(message)
  }
  return body
}

export async function readUserRecord(userId: string, resource: MockResource): Promise<unknown> {
  return parseResponse(await fetch(resourceUrl(userId, resource), { cache: 'no-store' }))
}

export async function writeUserRecord(userId: string, resource: MockResource, value: unknown): Promise<unknown> {
  return parseResponse(await fetch(resourceUrl(userId, resource), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  }))
}
