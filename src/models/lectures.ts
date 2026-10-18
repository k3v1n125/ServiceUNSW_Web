import type { User } from './users'

export type LectureWeekday = 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'

export interface LectureSession {
  date: Date
  weekday: LectureWeekday
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

export type LectureCourse = User['teachingAppointments'][number]

export interface LecturePlan {
  courses: LectureCourse[]
  sessions: LectureSession[]
}
