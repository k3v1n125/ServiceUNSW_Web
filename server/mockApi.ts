import { readFile, rename, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { Plugin } from 'vite'

type Validator = (value: unknown) => unknown
type Table = Record<string, unknown>

const MAX_BODY_BYTES = 100_000
const USER_ID_PATTERN = /^[a-z0-9-]{1,64}$/
const SERVICE_ID_PATTERN = /^[a-z0-9-]{1,64}$/
const LECTURE_KEY_PATTERN = /^[A-Z]{4}\d{4}-\d{4}-\d{2}-\d{2}$/

class ValidationError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireText(value: unknown, field: string, maxLength: number, allowEmpty = false): string {
  if (typeof value !== 'string') throw new ValidationError(`${field} must be text.`)
  const trimmed = value.trim()
  if ((!allowEmpty && trimmed.length === 0) || trimmed.length > maxLength) {
    throw new ValidationError(`${field} must be ${allowEmpty ? 'at most ' : '1-'}${maxLength} characters.`)
  }
  return trimmed
}

function requireDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new ValidationError(`${field} must be a valid date.`)
  }
  return new Date(value).toISOString()
}

function validateFavourites(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 4 ||
    value.some((id) => typeof id !== 'string' || !SERVICE_ID_PATTERN.test(id)) ||
    new Set(value).size !== value.length) {
    throw new ValidationError('Favourites must contain up to four unique service IDs.')
  }
  return value
}

function validateCalendarSettings(value: unknown): { icsUrl: string } {
  if (!isRecord(value)) throw new ValidationError('Calendar settings must be an object.')
  const icsUrl = requireText(value.icsUrl, 'iCal link', 2048, true)
  if (icsUrl) {
    let url: URL
    try {
      url = new URL(icsUrl)
    } catch {
      throw new ValidationError('Enter a valid iCal URL.')
    }
    if (!['https:', 'http:', 'webcal:'].includes(url.protocol)) {
      throw new ValidationError('Use an HTTPS, HTTP or webcal calendar link.')
    }
  }
  return { icsUrl }
}

function validatePersonalEvents(value: unknown) {
  if (!Array.isArray(value) || value.length > 500) {
    throw new ValidationError('Personal events must be a list of up to 500 events.')
  }
  const ids = new Set<string>()
  return value.map((event, index) => {
    if (!isRecord(event)) throw new ValidationError(`Personal event ${index + 1} must be an object.`)
    const uid = requireText(event.uid, 'Event ID', 100)
    if (ids.has(uid)) throw new ValidationError('Personal event IDs must be unique.')
    ids.add(uid)
    const start = requireDate(event.start, 'Event start')
    const end = event.end === undefined ? undefined : requireDate(event.end, 'Event end')
    if (end && Date.parse(end) <= Date.parse(start)) {
      throw new ValidationError('Event end must be after its start.')
    }
    const location = event.location === undefined ? '' : requireText(event.location, 'Event location', 200, true)
    return {
      uid,
      summary: requireText(event.summary, 'Event title', 200),
      start,
      ...(end ? { end } : {}),
      ...(location ? { location } : {}),
    }
  })
}

function validateLectureChecklists(value: unknown) {
  if (!isRecord(value)) throw new ValidationError('Lecture checklists must be an object.')
  return Object.fromEntries(Object.entries(value).map(([lectureKey, items]) => {
    if (!LECTURE_KEY_PATTERN.test(lectureKey)) throw new ValidationError('Invalid lecture key.')
    if (!Array.isArray(items) || items.length > 50) {
      throw new ValidationError('Each lecture checklist can contain up to 50 items.')
    }
    const ids = new Set<string>()
    return [lectureKey, items.map((item) => {
      if (!isRecord(item) || typeof item.checked !== 'boolean') {
        throw new ValidationError('Each checklist item must include a checked state.')
      }
      const id = requireText(item.id, 'Checklist item ID', 100)
      if (ids.has(id)) throw new ValidationError('Checklist item IDs must be unique.')
      ids.add(id)
      return { id, text: requireText(item.text, 'Checklist item', 200), checked: item.checked }
    })]
  }))
}

function validateTeachingNote(value: unknown): { note: string } {
  if (!isRecord(value)) throw new ValidationError('Teaching note must be an object.')
  return { note: requireText(value.note, 'Teaching note', 5000, true) }
}

const resources: Record<string, { file: string; validate: Validator }> = {
  favourites: { file: 'userFavourites.json', validate: validateFavourites },
  'calendar-settings': { file: 'calendarSettings.json', validate: validateCalendarSettings },
  'personal-events': { file: 'personalEvents.json', validate: validatePersonalEvents },
  'lecture-checklists': { file: 'lectureChecklists.json', validate: validateLectureChecklists },
  'teaching-note': { file: 'teachingNotes.json', validate: validateTeachingNote },
}

function sendJson(res: ServerResponse, statusCode: number, value: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(value))
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new ValidationError('Request body is too large.')
    chunks.push(buffer)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new ValidationError('Request body must be valid JSON.')
  }
}

export function mockApiPlugin(dataDirectory: string): Plugin {
  let writeQueue = Promise.resolve()

  async function readTable(file: string): Promise<Table> {
    const parsed: unknown = JSON.parse(await readFile(path.join(dataDirectory, file), 'utf8'))
    if (!isRecord(parsed)) throw new Error(`${file} must contain a JSON object.`)
    return parsed
  }

  function writeRecord(file: string, userId: string, value: unknown): Promise<void> {
    const operation = writeQueue.then(async () => {
      const filePath = path.join(dataDirectory, file)
      const table = await readTable(file)
      table[userId] = value
      const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
      await writeFile(temporaryPath, `${JSON.stringify(table, null, 2)}\n`)
      await rename(temporaryPath, filePath)
    })
    writeQueue = operation.catch(() => undefined)
    return operation
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const requestUrl = new URL(req.url ?? '', 'http://localhost')
    let segments: string[]
    try {
      segments = requestUrl.pathname.split('/').filter(Boolean).map(decodeURIComponent)
    } catch {
      sendJson(res, 400, { error: 'Invalid mock API path.' })
      return
    }
    const [userId, resourceName, extra] = segments
    const resource = resourceName && Object.hasOwn(resources, resourceName) ? resources[resourceName] : undefined
    if (!userId || !USER_ID_PATTERN.test(userId) || !resource || extra) {
      sendJson(res, 404, { error: 'Mock API resource not found.' })
      return
    }

    try {
      if (req.method === 'GET') {
        const table = await readTable(resource.file)
        sendJson(res, 200, Object.hasOwn(table, userId) ? table[userId] : null)
        return
      }
      if (req.method === 'PUT') {
        const value = resource.validate(await readBody(req))
        await writeRecord(resource.file, userId, value)
        sendJson(res, 200, value)
        return
      }
      res.setHeader('Allow', 'GET, PUT')
      sendJson(res, 405, { error: 'Method not allowed.' })
    } catch (error) {
      if (error instanceof ValidationError) {
        sendJson(res, 400, { error: error.message })
        return
      }
      console.error('Mock API request failed:', error)
      sendJson(res, 500, { error: 'The mock database could not complete this request.' })
    }
  }

  return {
    name: 'mock-api',
    configureServer(server) {
      server.middlewares.use('/api/users', (req, res) => {
        void handle(req, res)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/users', (req, res) => {
        void handle(req, res)
      })
    },
  }
}
