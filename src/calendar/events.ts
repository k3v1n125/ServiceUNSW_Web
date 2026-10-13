import type { CalendarEvent } from '../data/calendar'

function unfoldLines(icsText: string): string[] {
  const lines: string[] = []
  for (const line of icsText.split(/\r\n|\n|\r/)) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1)
    } else {
      lines.push(line)
    }
  }
  return lines
}

function parseIcsDate(value: string): { date: Date; allDay: boolean } {
  if (/^\d{8}$/.test(value)) {
    return {
      date: new Date(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8))),
      allDay: true,
    }
  }
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(value)
  if (match) {
    const [, year, month, day, hour, minute, second, utc] = match
    return {
      date: utc
        ? new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)))
        : new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)),
      allDay: false,
    }
  }
  return { date: new Date(value), allDay: false }
}

export function parseIcs(icsText: string): CalendarEvent[] {
  if (!icsText.includes('BEGIN:VCALENDAR')) throw new Error('The link did not return a valid iCal calendar.')
  const events: CalendarEvent[] = []
  let current: Record<string, string> | null = null
  let exdateValues: string[] = []
  for (const line of unfoldLines(icsText)) {
    if (line === 'BEGIN:VEVENT') {
      current = {}
      exdateValues = []
      continue
    }
    if (line === 'END:VEVENT') {
      if (current && current.DTSTART) {
        const { date: start, allDay } = parseIcsDate(current.DTSTART)
        if (Number.isNaN(start.getTime())) throw new Error('The calendar contains an invalid event date.')
        events.push({
          uid: current.UID ?? `${current.SUMMARY ?? 'event'}-${current.DTSTART}`,
          summary: current.SUMMARY ?? 'Untitled event',
          location: current.LOCATION,
          start,
          end: current.DTEND ? parseIcsDate(current.DTEND).date : undefined,
          allDay,
          rrule: current.RRULE,
          exdates: exdateValues.flatMap((value) => value.split(',')).map((value) => parseIcsDate(value).date),
          category: 'timetable',
        })
      }
      current = null
      continue
    }
    if (!current) continue
    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) continue
    const key = line.slice(0, separatorIndex).split(';')[0]
    const value = line.slice(separatorIndex + 1)
    if (key === 'EXDATE') exdateValues.push(value)
    else current[key] = value
  }
  return events
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

const RECURRENCE_DAY_INDEX: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }

// Supports DAILY/WEEKLY/MONTHLY/YEARLY with INTERVAL, COUNT, UNTIL and BYDAY.
function expandRecurrence(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): Date[] {
  const exdateKeys = new Set(event.exdates.map(dateKey))
  if (!event.rrule) {
    return event.start >= rangeStart && event.start <= rangeEnd && !exdateKeys.has(dateKey(event.start)) ? [event.start] : []
  }
  const parts: Record<string, string> = {}
  for (const part of event.rrule.split(';')) {
    const [key, value] = part.split('=')
    if (key && value) parts[key] = value
  }
  const freq = parts.FREQ
  const interval = Number(parts.INTERVAL ?? '1') || 1
  const count = parts.COUNT ? Number(parts.COUNT) : undefined
  const until = parts.UNTIL ? parseIcsDate(parts.UNTIL).date : undefined
  const occurrences: Date[] = []
  let occurrenceCount = 0
  let iterations = 0
  function accept(candidate: Date): boolean {
    if (candidate < event.start) return false
    if (until && candidate > until) return false
    occurrenceCount++
    if (count && occurrenceCount > count) return false
    if (candidate >= rangeStart && candidate <= rangeEnd && !exdateKeys.has(dateKey(candidate))) {
      occurrences.push(candidate)
    }
    return true
  }
  if (freq === 'WEEKLY') {
    const byDay = parts.BYDAY?.split(',').map((day) => RECURRENCE_DAY_INDEX[day.slice(-2)]).filter((day) => day !== undefined)
    const targetDays = byDay && byDay.length > 0 ? [...byDay].sort((a, b) => a - b) : [event.start.getDay()]
    const weekStart = new Date(event.start)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    while (iterations < 1000) {
      iterations++
      let keepGoing = true
      for (const dayNum of targetDays) {
        const candidate = new Date(weekStart)
        candidate.setDate(candidate.getDate() + dayNum)
        candidate.setHours(event.start.getHours(), event.start.getMinutes(), event.start.getSeconds(), 0)
        if (candidate < event.start) continue
        keepGoing = accept(candidate)
        if (!keepGoing) break
      }
      if (!keepGoing || (weekStart > rangeEnd && !count)) break
      weekStart.setDate(weekStart.getDate() + 7 * interval)
    }
  } else if (freq === 'DAILY' || freq === 'MONTHLY' || freq === 'YEARLY') {
    const cursor = new Date(event.start)
    while (iterations < 1000) {
      iterations++
      if (cursor > rangeEnd && !count) break
      if (!accept(new Date(cursor))) break
      if (freq === 'DAILY') cursor.setDate(cursor.getDate() + interval)
      else if (freq === 'MONTHLY') cursor.setMonth(cursor.getMonth() + interval)
      else cursor.setFullYear(cursor.getFullYear() + interval)
    }
  } else {
    return event.start >= rangeStart && event.start <= rangeEnd && !exdateKeys.has(dateKey(event.start)) ? [event.start] : []
  }
  return occurrences
}

interface CalendarOccurrence {
  event: CalendarEvent
  occurrenceStart: Date
  occurrenceEnd?: Date
}

export function getDayOccurrences(events: CalendarEvent[], day: Date): CalendarOccurrence[] {
  const rangeStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const rangeEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
  return events.flatMap((event) => {
    const duration = event.end ? Math.max(0, event.end.getTime() - event.start.getTime()) : 0
    const searchStart = new Date(rangeStart.getTime() - duration)
    return expandRecurrence(event, searchStart, new Date(rangeEnd.getTime() - 1))
      .map((occurrenceStart) => ({
        event, occurrenceStart,
        occurrenceEnd: event.end ? new Date(occurrenceStart.getTime() + duration) : undefined,
      }))
      .filter(({ occurrenceStart, occurrenceEnd }) =>
        occurrenceStart >= rangeStart || (occurrenceEnd !== undefined && occurrenceEnd > rangeStart),
      )
  }).sort((a, b) =>
    Number(b.event.allDay) - Number(a.event.allDay) || a.occurrenceStart.getTime() - b.occurrenceStart.getTime(),
  )
}
