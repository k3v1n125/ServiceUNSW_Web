import type { User } from './users'

export interface LectureSession {
  date: Date
  weekday: 'Wednesday' | 'Friday'
  startTime: string
  endTime: string
  location: string
}

export interface LectureChecklistItem {
  id: string
  text: string
  checked: boolean
}

export type LectureChecklists = Record<string, LectureChecklistItem[]>

export type LectureStatus = 'Not planned' | 'Planned' | 'In progress' | 'Ready'

export function getLectureKey(courseCode: string, date: Date): string {
  const localDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  return `${courseCode}-${localDate}`
}

export function getLectureStatus(items: LectureChecklistItem[]): LectureStatus {
  if (items.length === 0) return 'Not planned'
  const checkedCount = items.filter((item) => item.checked).length
  if (checkedCount === items.length) return 'Ready'
  if (checkedCount > 0) return 'In progress'
  return 'Planned'
}

function isChecklistItem(item: unknown): item is LectureChecklistItem {
  return typeof item === 'object' && item !== null && !Array.isArray(item) &&
    'id' in item && typeof item.id === 'string' &&
    'text' in item && typeof item.text === 'string' && item.text.trim().length > 0 &&
    'checked' in item && typeof item.checked === 'boolean'
}

export function parseLectureChecklists(value: unknown): LectureChecklists {
  if (value === null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Lecture checklists must be stored as an object.')
  }

  const checklists: LectureChecklists = {}
  for (const [lectureKey, items] of Object.entries(value)) {
    if (!Array.isArray(items) || !items.every(isChecklistItem)) {
      throw new Error(`Invalid checklist for lecture ${lectureKey}.`)
    }
    checklists[lectureKey] = items.map((item) => ({
      id: item.id,
      text: item.text.trim(),
      checked: item.checked,
    }))
  }
  return checklists
}

const lectureDates = [
  { year: 2026, month: 9, day: 28, weekday: 'Wednesday' },
  { year: 2026, month: 9, day: 30, weekday: 'Friday' },
  { year: 2026, month: 10, day: 4, weekday: 'Wednesday' },
  { year: 2026, month: 10, day: 6, weekday: 'Friday' },
  { year: 2026, month: 10, day: 11, weekday: 'Wednesday' },
  { year: 2026, month: 10, day: 13, weekday: 'Friday' },
  { year: 2026, month: 10, day: 18, weekday: 'Wednesday' },
  { year: 2026, month: 10, day: 20, weekday: 'Friday' },
] as const

export function getProfessorCourses(user: User) {
  return user.teachingAppointments.filter((appointment) => appointment.role === 'professor')
}

export function getLectureSessions(): LectureSession[] {
  return lectureDates.map(({ year, month, day, weekday }) => ({
    date: new Date(year, month, day, 12),
    weekday,
    startTime: weekday === 'Wednesday' ? '09:00' : '10:00',
    endTime: weekday === 'Wednesday' ? '11:00' : '12:00',
    location: weekday === 'Wednesday' ? 'Ainsworth G03' : 'Law Theatre G04',
  }))
}
