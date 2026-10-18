import type { CalendarCategory, CalendarEvent } from '../models/calendar'
import type { LecturePlan, LectureWeekday } from '../models/lectures'
import type { ServiceCatalogue } from '../models/services'
import type { TimesheetEntryInput, Timesheets } from '../models/timesheets'
import type { User } from '../models/users'

export type MockResource =
  | 'favourites'
  | 'calendar-settings'
  | 'personal-events'
  | 'lecture-checklists'
  | 'teaching-note'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function userUrl(userId: string, resource?: string): string {
  return `/api/users/${encodeURIComponent(userId)}${resource ? `/${resource}` : ''}`
}

async function request(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, { cache: 'no-store', ...init })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = isRecord(body) && typeof body.error === 'string'
      ? body.error
      : `Mock API request failed (${response.status}).`
    throw new ApiError(response.status, message)
  }
  return body
}

function sendJson(url: string, method: 'POST' | 'PUT', value: unknown): Promise<unknown> {
  return request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseUser(value: unknown): User {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.fullName !== 'string' ||
    !Array.isArray(value.roles) || !Array.isArray(value.teachingAppointments)) {
    throw new Error('User returned by the mock API is invalid.')
  }
  return value as unknown as User
}

export async function signIn(zid: string, zPass: string): Promise<User> {
  return parseUser(await sendJson('/api/auth/sign-in', 'POST', { zid, zPass }))
}

export async function fetchUser(userId: string): Promise<User> {
  return parseUser(await request(userUrl(userId)))
}

export async function fetchServiceCatalogue(userId: string): Promise<ServiceCatalogue> {
  const value = await request(userUrl(userId, 'services'))
  if (!isRecord(value) || !Array.isArray(value.groups) || !Array.isArray(value.services)) {
    throw new Error('Services returned by the mock API are invalid.')
  }
  return value as unknown as ServiceCatalogue
}

export async function fetchCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  const value = await request(userUrl(userId, 'calendar-events'))
  if (!Array.isArray(value)) throw new Error('Calendar events returned by the mock API are invalid.')
  return value.map((event) => {
    if (!isRecord(event) || typeof event.uid !== 'string' || typeof event.summary !== 'string' ||
      typeof event.start !== 'string' || typeof event.category !== 'string') {
      throw new Error('A calendar event returned by the mock API is invalid.')
    }
    return {
      uid: event.uid,
      summary: event.summary,
      location: typeof event.location === 'string' ? event.location : undefined,
      start: new Date(event.start),
      end: typeof event.end === 'string' ? new Date(event.end) : undefined,
      allDay: false,
      exdates: [],
      category: event.category as CalendarCategory,
      url: typeof event.url === 'string' ? event.url : undefined,
      demo: event.demo === true,
    }
  })
}

export async function fetchLecturePlan(userId: string): Promise<LecturePlan> {
  const value = await request(userUrl(userId, 'lectures'))
  if (!isRecord(value) || !Array.isArray(value.courses) || !Array.isArray(value.sessions)) {
    throw new Error('Lecture plan returned by the mock API is invalid.')
  }
  return {
    courses: value.courses as LecturePlan['courses'],
    sessions: value.sessions.map((session) => {
      if (!isRecord(session) || typeof session.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(session.date) ||
        typeof session.weekday !== 'string' || typeof session.startTime !== 'string' ||
        typeof session.endTime !== 'string' || typeof session.location !== 'string') {
        throw new Error('A lecture session returned by the mock API is invalid.')
      }
      const [year, month, day] = session.date.split('-').map(Number)
      return {
        date: new Date(year, month - 1, day, 12),
        weekday: session.weekday as LectureWeekday,
        startTime: session.startTime,
        endTime: session.endTime,
        location: session.location,
      }
    }),
  }
}

export async function readUserRecord(userId: string, resource: MockResource): Promise<unknown> {
  return request(userUrl(userId, resource))
}

export async function writeUserRecord(userId: string, resource: MockResource, value: unknown): Promise<unknown> {
  return sendJson(userUrl(userId, resource), 'PUT', value)
}

function parseTimesheets(value: unknown): Timesheets {
  if (!isRecord(value) || typeof value.today !== 'string' || !Array.isArray(value.activities) ||
    !Array.isArray(value.periods) || !Array.isArray(value.courses) || !Array.isArray(value.entries)) {
    throw new Error('Timesheets returned by the mock API are invalid.')
  }
  return value as unknown as Timesheets
}

export async function fetchTimesheets(userId: string): Promise<Timesheets> {
  return parseTimesheets(await request(userUrl(userId, 'timesheets')))
}

export async function createTimesheetEntry(userId: string, entry: TimesheetEntryInput, submit: boolean): Promise<Timesheets> {
  return parseTimesheets(await sendJson(userUrl(userId, 'timesheets/entries'), 'POST', { ...entry, submit }))
}

export async function updateTimesheetEntry(userId: string, entryId: string, entry: TimesheetEntryInput, submit: boolean): Promise<Timesheets> {
  return parseTimesheets(await sendJson(userUrl(userId, `timesheets/entries/${encodeURIComponent(entryId)}`), 'PUT', { ...entry, submit }))
}

export async function deleteTimesheetEntry(userId: string, entryId: string): Promise<Timesheets> {
  return parseTimesheets(await request(userUrl(userId, `timesheets/entries/${encodeURIComponent(entryId)}`), { method: 'DELETE' }))
}
