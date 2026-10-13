export type CalendarCategory = 'timetable' | 'deadline' | 'campus' | 'personal'

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
  deadline: 'Deadlines',
  campus: 'Campus events',
  personal: 'Personal events',
}

export function createDemoEvents(today: Date): CalendarEvent[] {
  function at(offset: number, hour: number): Date {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, hour)
  }

  const events: Omit<CalendarEvent, 'allDay' | 'exdates' | 'demo'>[] = [
    {
      uid: 'demo-comp3311-assignment',
      summary: 'COMP3311 · Database design assignment',
      start: at(1, 17),
      category: 'deadline',
      url: 'https://moodle.telt.unsw.edu.au/',
    },
    {
      uid: 'demo-comp3511-report',
      summary: 'COMP3511 · HCI report',
      start: at(5, 17),
      category: 'deadline',
      url: 'https://moodle.telt.unsw.edu.au/',
    },
    {
      uid: 'demo-comp1531-project',
      summary: 'COMP1531 · Group project milestone',
      start: at(8, 23),
      category: 'deadline',
      url: 'https://moodle.telt.unsw.edu.au/',
    },
    {
      uid: 'demo-devsoc-workshop',
      summary: 'DevSoc · Web development workshop',
      location: 'UNSW Kensington · CSE building',
      start: at(0, 18),
      end: at(0, 20),
      category: 'campus',
    },
    {
      uid: 'demo-devsoc-social',
      summary: 'DevSoc · Games and pizza social',
      location: 'UNSW Kensington · Village Green',
      start: at(3, 17),
      end: at(3, 19),
      category: 'campus',
    },
    {
      uid: 'demo-careers-panel',
      summary: 'DevSoc · Tech careers panel',
      location: 'UNSW Kensington · Roundhouse',
      start: at(7, 16),
      end: at(7, 18),
      category: 'campus',
    },
  ]

  return events.map((event) => ({
    ...event,
    allDay: false,
    exdates: [],
    demo: true,
  }))
}
