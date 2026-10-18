export type CalendarCategory = 'timetable' | 'lecture' | 'deadline' | 'campus' | 'personal'

export interface CalendarEvent {
  uid: string
  summary: string
  location?: string
  start: Date
  end?: Date
  allDay: boolean
  rrule?: string
  exdates: Date[]
  category: CalendarCategory
  url?: string
  demo?: boolean
}

export const calendarCategoryLabels: Record<CalendarCategory, string> = {
  timetable: 'My timetable',
  lecture: 'Lectures',
  deadline: 'Deadlines',
  campus: 'Campus events',
  personal: 'Personal events',
}
