export type TimesheetStatus = 'draft' | 'submitted' | 'approved'

export interface TimesheetEntry {
  id: string
  courseCode: string
  date: string
  activity: string
  startTime: string
  endTime: string
  notes: string
  status: TimesheetStatus
}

export type TimesheetEntryInput = Omit<TimesheetEntry, 'id' | 'status'>

export interface TimesheetPeriod {
  start: string
  end: string
  status: 'open' | 'closed'
}

export interface TimesheetCourse {
  courseCode: string
  courseName: string
  coordinator: string
}

export interface Timesheets {
  today: string
  activities: string[]
  periods: TimesheetPeriod[]
  courses: TimesheetCourse[]
  entries: TimesheetEntry[]
}

export const timesheetStatusLabels: Record<TimesheetStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
}

export function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function getEntryHours(entry: Pick<TimesheetEntry, 'startTime' | 'endTime'>): number {
  return Math.max(0, minutesOf(entry.endTime) - minutesOf(entry.startTime)) / 60
}

export function formatHours(hours: number): string {
  return hours.toFixed(1)
}

export function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function isInPeriod(date: string, period: TimesheetPeriod): boolean {
  return period.start <= date && date <= period.end
}

export function formatPeriod(period: TimesheetPeriod): string {
  const start = parseLocalDate(period.start)
  const end = parseLocalDate(period.end)
  const sameMonth = start.getMonth() === end.getMonth()
  const startLabel = start.toLocaleDateString('en-AU', sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' })
  const endLabel = end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${startLabel} – ${endLabel}`
}
