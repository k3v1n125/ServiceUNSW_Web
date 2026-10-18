import { copyFile, mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { constants } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

type Validator = (value: unknown) => unknown
type Table = Record<string, unknown>

const MAX_BODY_BYTES = 100_000
const MAX_FAVOURITES = 4
const USER_ID_PATTERN = /^[a-z0-9-]{1,64}$/
const SERVICE_ID_PATTERN = /^[a-z0-9-]{1,64}$/
const LECTURE_KEY_PATTERN = /^[A-Z]{4}\d{4}-\d{4}-\d{2}-\d{2}$/

class ValidationError extends Error {}

class ApiError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

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
  if (!Array.isArray(value) || value.length > MAX_FAVOURITES ||
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

interface StoredUser {
  id: string
  universityId: string
  zPass: string
  roles: string[]
  degree?: { name: string }
  teachingAppointments: { courseCode: string; courseName: string; role: string }[]
  [field: string]: unknown
}

interface ServiceTable {
  groups: unknown[]
  services: { id: string; description: string; [field: string]: unknown }[]
  defaultFavourites: string[]
}

interface DemoEventRow {
  uid: string
  summary: string
  location?: string
  dayOffset: number
  startHour: number
  endHour?: number
  category: string
  url?: string
}

interface LectureScheduleTable {
  periodStart: string
  periodEnd: string
  defaultDays: string[]
  professorDays: Record<string, string[]>
  slots: { startTime: string; endTime: string; location: string }[]
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function toPublicUser(user: StoredUser) {
  const { zPass: _zPass, ...publicUser } = user
  return publicUser
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function buildLectureSessions(schedule: LectureScheduleTable, userId: string) {
  const days = schedule.professorDays[userId] ?? schedule.defaultDays
  const sessions = []
  const end = new Date(`${schedule.periodEnd}T00:00:00Z`)
  for (const date = new Date(`${schedule.periodStart}T00:00:00Z`); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    const weekday = WEEKDAYS[date.getUTCDay()]
    const slotIndex = days.indexOf(weekday)
    const slot = schedule.slots[slotIndex]
    if (slotIndex === -1 || !slot) continue
    sessions.push({ date: formatDate(date), weekday, ...slot })
  }
  return sessions
}

function buildDemoEvents(rows: DemoEventRow[], now: Date) {
  function at(dayOffset: number, hour: number): string {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour).toISOString()
  }
  return rows.map(({ dayOffset, startHour, endHour, ...event }) => ({
    ...event,
    demo: true,
    start: at(dayOffset, startHour),
    ...(endHour === undefined ? {} : { end: at(dayOffset, endHour) }),
  }))
}

// Copies seed tables that are missing from the git-ignored runtime database, without touching existing data.
async function seedDatabase(seedDirectory: string, dataDirectory: string): Promise<void> {
  await mkdir(dataDirectory, { recursive: true })
  const seedFiles = (await readdir(seedDirectory)).filter((file) => file.endsWith('.json'))
  await Promise.all(seedFiles.map(async (file) => {
    try {
      await copyFile(path.join(seedDirectory, file), path.join(dataDirectory, file), constants.COPYFILE_EXCL)
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error
    }
  }))
}

export function mockApiPlugin({ seedDirectory, dataDirectory }: { seedDirectory: string; dataDirectory: string }): Plugin {
  let writeQueue = Promise.resolve()
  let seeded: Promise<void> | undefined

  function ensureSeeded(): Promise<void> {
    seeded ??= seedDatabase(seedDirectory, dataDirectory).catch((error: unknown) => {
      seeded = undefined
      throw error
    })
    return seeded
  }

  async function readJson<T>(file: string): Promise<T> {
    await ensureSeeded()
    return JSON.parse(await readFile(path.join(dataDirectory, file), 'utf8')) as T
  }

  async function readTable(file: string): Promise<Table> {
    const parsed: unknown = await readJson(file)
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

  async function findUser(userId: string): Promise<StoredUser> {
    const users = await readJson<Record<string, StoredUser>>('users.json')
    if (!USER_ID_PATTERN.test(userId) || !Object.hasOwn(users, userId)) {
      throw new ApiError(404, 'User not found.')
    }
    return users[userId]
  }

  async function signIn(body: unknown) {
    if (!isRecord(body) || typeof body.zid !== 'string' || typeof body.zPass !== 'string') {
      throw new ValidationError('Enter your zID and zPass.')
    }
    const zid = body.zid.trim().toLowerCase()
    const users = await readJson<Record<string, StoredUser>>('users.json')
    const user = Object.values(users).find((candidate) =>
      candidate.universityId === zid && candidate.zPass === body.zPass)
    if (!user) throw new ApiError(401, 'Incorrect zID or zPass. Please try again.')
    return toPublicUser(user)
  }

  async function getServices(user: StoredUser) {
    const { groups, services } = await readJson<ServiceTable>('services.json')
    return {
      groups,
      services: services.map((service) =>
        service.id === 'myplan' && user.roles.includes('student') && user.degree
          ? { ...service, description: `Plan your ${user.degree.name} pathway.` }
          : service),
    }
  }

  async function readFavourites(userId: string) {
    const [table, { services, defaultFavourites }] = await Promise.all([
      readTable('userFavourites.json'),
      readJson<ServiceTable>('services.json'),
    ])
    const stored = Object.hasOwn(table, userId) && Array.isArray(table[userId]) ? table[userId] : defaultFavourites
    const serviceIds = new Set(services.map((service) => service.id))
    return [...new Set(stored.map((id) => id === 'fees' ? 'myplan' : id))]
      .filter((id): id is string => typeof id === 'string' && serviceIds.has(id))
      .slice(0, MAX_FAVOURITES)
  }

  async function validateKnownFavourites(value: unknown) {
    const ids = validateFavourites(value)
    const { services } = await readJson<ServiceTable>('services.json')
    if (ids.some((id) => !services.some((service) => service.id === id))) {
      throw new ValidationError('Favourites can only include available services.')
    }
    return ids
  }

  async function getCalendarEvents(user: StoredUser) {
    const demoEvents = buildDemoEvents(await readJson<DemoEventRow[]>('demoCalendarEvents.json'), new Date())
    if (!user.roles.includes('professor')) return demoEvents
    const { courses, sessions } = await getLecturePlan(user)
    // Times have no UTC offset so the browser places each lecture in the viewer's local timezone.
    const lectureEvents = courses.flatMap((course) => sessions.map((session) => ({
      uid: `lecture-${course.courseCode}-${session.date}`,
      summary: `${course.courseCode} · ${course.courseName} lecture`,
      location: session.location,
      start: `${session.date}T${session.startTime}:00`,
      end: `${session.date}T${session.endTime}:00`,
      category: 'lecture',
    })))
    return [...lectureEvents, ...demoEvents]
  }

  async function getLecturePlan(user: StoredUser) {
    if (!user.roles.includes('professor')) {
      throw new ApiError(403, 'Lecture plans are only available to professors.')
    }
    const schedule = await readJson<LectureScheduleTable>('lectureSchedule.json')
    return {
      courses: user.teachingAppointments.filter((appointment) => appointment.role === 'professor'),
      sessions: buildLectureSessions(schedule, user.id),
    }
  }

  async function route(req: IncomingMessage, segments: string[]): Promise<unknown> {
    const method = req.method ?? 'GET'
    function allow(...methods: string[]) {
      if (!methods.includes(method)) throw new ApiError(405, 'Method not allowed.')
    }

    if (segments[0] === 'auth' && segments[1] === 'sign-in' && segments.length === 2) {
      allow('POST')
      return signIn(await readBody(req))
    }

    if (segments[0] !== 'users' || !segments[1] || segments.length > 3) {
      throw new ApiError(404, 'Mock API resource not found.')
    }
    const [, userId, resourceName] = segments
    const user = await findUser(userId)

    switch (resourceName) {
      case undefined:
        allow('GET')
        return toPublicUser(user)
      case 'services':
        allow('GET')
        return getServices(user)
      case 'calendar-events':
        allow('GET')
        return getCalendarEvents(user)
      case 'lectures':
        allow('GET')
        return getLecturePlan(user)
      case 'favourites':
        allow('GET', 'PUT')
        if (method === 'GET') return readFavourites(userId)
        {
          const ids = await validateKnownFavourites(await readBody(req))
          await writeRecord('userFavourites.json', userId, ids)
          return ids
        }
    }

    const resource = Object.hasOwn(resources, resourceName) ? resources[resourceName] : undefined
    if (!resource) throw new ApiError(404, 'Mock API resource not found.')
    allow('GET', 'PUT')
    if (method === 'GET') {
      const table = await readTable(resource.file)
      return Object.hasOwn(table, userId) ? table[userId] : null
    }
    const value = resource.validate(await readBody(req))
    await writeRecord(resource.file, userId, value)
    return value
  }

  async function handle(req: IncomingMessage, res: ServerResponse, next: () => void) {
    const requestUrl = new URL(req.url ?? '', 'http://localhost')
    let segments: string[]
    try {
      segments = requestUrl.pathname.split('/').filter(Boolean).map(decodeURIComponent)
    } catch {
      sendJson(res, 400, { error: 'Invalid mock API path.' })
      return
    }
    if (segments[0] !== 'auth' && segments[0] !== 'users') {
      next()
      return
    }

    try {
      sendJson(res, 200, await route(req, segments))
    } catch (error) {
      if (error instanceof ValidationError) {
        sendJson(res, 400, { error: error.message })
        return
      }
      if (error instanceof ApiError) {
        if (error.statusCode === 405) res.setHeader('Allow', 'GET, PUT, POST')
        sendJson(res, error.statusCode, { error: error.message })
        return
      }
      console.error('Mock API request failed:', error)
      sendJson(res, 500, { error: 'The mock database could not complete this request.' })
    }
  }

  return {
    name: 'mock-api',
    async configureServer(server) {
      await ensureSeeded()
      server.middlewares.use('/api', (req, res, next) => {
        void handle(req, res, next)
      })
    },
    async configurePreviewServer(server) {
      await ensureSeeded()
      server.middlewares.use('/api', (req, res, next) => {
        void handle(req, res, next)
      })
    },
  }
}
