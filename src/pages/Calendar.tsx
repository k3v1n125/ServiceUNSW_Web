import { useEffect, useMemo, useState } from 'react'
import './Calendar.css'

interface CalendarEvent {
  uid: string
  summary: string
  location?: string
  start: Date
  end?: Date
  allDay: boolean
  rrule?: string
  exdates: Date[]
}

const STORAGE_KEY = 'calendar-ical-url'

function unfoldLines(icsText: string): string[] {
  const rawLines = icsText.split(/\r\n|\n|\r/)
  const lines: string[] = []
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1)
    } else {
      lines.push(line)
    }
  }
  return lines
}

function parseIcsDate(value: string): { date: Date; allDay: boolean } {
  // Date-only, e.g. 20250101
  if (/^\d{8}$/.test(value)) {
    const year = Number(value.slice(0, 4))
    const month = Number(value.slice(4, 6)) - 1
    const day = Number(value.slice(6, 8))
    return { date: new Date(year, month, day), allDay: true }
  }

  // Date-time, e.g. 20250101T090000Z or 20250101T090000
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(value)
  if (match) {
    const [, year, month, day, hour, minute, second, utc] = match
    if (utc) {
      return {
        date: new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))),
        allDay: false,
      }
    }
    return {
      date: new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)),
      allDay: false,
    }
  }

  return { date: new Date(value), allDay: false }
}

function parseIcs(icsText: string): CalendarEvent[] {
  const lines = unfoldLines(icsText)
  const events: CalendarEvent[] = []
  let current: Record<string, string> | null = null
  let exdateValues: string[] = []

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {}
      exdateValues = []
      continue
    }
    if (line === 'END:VEVENT') {
      if (current && current.DTSTART) {
        const { date: start, allDay } = parseIcsDate(current.DTSTART)
        const exdates = exdateValues
          .flatMap((value) => value.split(','))
          .map((value) => parseIcsDate(value).date)
        events.push({
          uid: current.UID ?? `${current.SUMMARY ?? 'event'}-${current.DTSTART}`,
          summary: current.SUMMARY ?? 'Untitled event',
          location: current.LOCATION,
          start,
          end: current.DTEND ? parseIcsDate(current.DTEND).date : undefined,
          allDay,
          rrule: current.RRULE,
          exdates,
        })
      }
      current = null
      continue
    }
    if (!current) continue

    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) continue
    const rawKey = line.slice(0, separatorIndex)
    const value = line.slice(separatorIndex + 1)
    const key = rawKey.split(';')[0]

    if (key === 'EXDATE') {
      exdateValues.push(value)
    } else {
      current[key] = value
    }
  }

  return events
}

const RECURRENCE_DAY_INDEX: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }

// Expands an event's RRULE into concrete occurrence start dates within [rangeStart, rangeEnd].
// Supports the common DAILY/WEEKLY/MONTHLY/YEARLY cases with INTERVAL, COUNT, UNTIL and BYDAY.
function expandRecurrence(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): Date[] {
  if (!event.rrule) {
    return event.start >= rangeStart && event.start <= rangeEnd ? [event.start] : []
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
  const exdateKeys = new Set(event.exdates.map((d) => dateKey(d)))

  const occurrences: Date[] = []
  let occurrenceCount = 0
  const hardLimit = 1000
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
    const byDay = parts.BYDAY?.split(',').map((d) => RECURRENCE_DAY_INDEX[d.slice(-2)]).filter((n) => n !== undefined)
    const targetDays = byDay && byDay.length > 0 ? [...byDay].sort((a, b) => a - b) : [event.start.getDay()]
    const weekStart = new Date(event.start)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())

    while (iterations < hardLimit) {
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
      if (!keepGoing) break
      if (weekStart > rangeEnd && !count) break
      weekStart.setDate(weekStart.getDate() + 7 * interval)
    }
  } else if (freq === 'DAILY' || freq === 'MONTHLY' || freq === 'YEARLY') {
    const cursor = new Date(event.start)
    while (iterations < hardLimit) {
      iterations++
      if (cursor > rangeEnd && !count) break
      if (!accept(new Date(cursor))) break
      if (freq === 'DAILY') cursor.setDate(cursor.getDate() + interval)
      else if (freq === 'MONTHLY') cursor.setMonth(cursor.getMonth() + interval)
      else cursor.setFullYear(cursor.getFullYear() + interval)
    }
  } else {
    return event.start >= rangeStart && event.start <= rangeEnd ? [event.start] : []
  }

  return occurrences
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function formatEventTime(start: Date, allDay: boolean): string {
  if (allDay) return 'All day'
  return start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatEventTimeRange(occurrenceStart: Date, event: CalendarEvent): string {
  const dateLabel = occurrenceStart.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  if (event.allDay) return `${dateLabel} · All day`

  const startLabel = occurrenceStart.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (!event.end) return `${dateLabel} · ${startLabel}`

  const durationMs = event.end.getTime() - event.start.getTime()
  const endLabel = new Date(occurrenceStart.getTime() + durationMs).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${dateLabel} · ${startLabel} – ${endLabel}`
}

function getMonthGridStart(year: number, month: number): Date {
  const firstOfMonth = new Date(year, month, 1)
  const start = new Date(firstOfMonth)
  start.setDate(start.getDate() - firstOfMonth.getDay())
  return start
}

const COURSE_COLOR_PALETTE = [
  { background: '#dbeafe', color: '#1e3a8a' },
  { background: '#dcfce7', color: '#166534' },
  { background: '#fef3c7', color: '#92400e' },
  { background: '#fce7f3', color: '#9d174d' },
  { background: '#ede9fe', color: '#5b21b6' },
  { background: '#ffe4e6', color: '#9f1239' },
  { background: '#cffafe', color: '#155e75' },
  { background: '#fef9c3', color: '#854d0e' },
  { background: '#e0e7ff', color: '#3730a3' },
  { background: '#d1fae5', color: '#065f46' },
]

// Groups events by their leading course code (e.g. "COMP3411") so each course gets a stable colour
function extractCourseCode(summary: string): string {
  const match = /^[A-Z]{4}\d{4}/.exec(summary)
  return match ? match[0] : summary
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function getCourseColor(summary: string) {
  const index = hashString(extractCourseCode(summary)) % COURSE_COLOR_PALETTE.length
  return COURSE_COLOR_PALETTE[index]
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function Calendar() {
  const [icsUrl, setIcsUrl] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')
  const [inputValue, setInputValue] = useState(icsUrl)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedOccurrence, setSelectedOccurrence] = useState<{ event: CalendarEvent; occurrenceStart: Date } | null>(
    null,
  )

  useEffect(() => {
    if (!icsUrl) {
      setEvents([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const fetchUrl = `/api/ics-proxy?url=${encodeURIComponent(icsUrl)}`

    fetch(fetchUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load calendar (${response.status})`)
        return response.text()
      })
      .then((text) => {
        if (cancelled) return
        setEvents(parseIcs(text))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to load calendar'
        setError(message)
        setEvents([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [icsUrl])

  const monthGridDays = useMemo(() => {
    const gridStart = getMonthGridStart(viewDate.getFullYear(), viewDate.getMonth())
    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(gridStart)
      day.setDate(day.getDate() + i)
      return day
    })
  }, [viewDate])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, { event: CalendarEvent; occurrenceStart: Date }[]>()
    if (monthGridDays.length === 0) return map

    const rangeStart = monthGridDays[0]
    const rangeEnd = monthGridDays[monthGridDays.length - 1]

    for (const event of events) {
      for (const occurrenceStart of expandRecurrence(event, rangeStart, rangeEnd)) {
        const key = dateKey(occurrenceStart)
        const entry = { event, occurrenceStart }
        const bucket = map.get(key)
        if (bucket) bucket.push(entry)
        else map.set(key, [entry])
      }
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => a.occurrenceStart.getTime() - b.occurrenceStart.getTime())
    }
    return map
  }, [events, monthGridDays])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = inputValue.trim()
    localStorage.setItem(STORAGE_KEY, trimmed)
    setIcsUrl(trimmed)
  }

  function goToMonth(offset: number) {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  const today = new Date()

  return (
    <div className="calendar">
      <h3>Calendar</h3>

      {loading && <p className="calendar-status">Loading events…</p>}
      {error && <p className="calendar-status calendar-error">{error}</p>}

      <div className="calendar-month">
        <div className="calendar-month-header">
          <button type="button" className="calendar-nav" onClick={() => goToMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <span className="calendar-month-label">
            {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </span>
          <button type="button" className="calendar-nav" onClick={() => goToMonth(1)} aria-label="Next month">
            ›
          </button>
        </div>

        <div className="calendar-grid calendar-weekdays">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="calendar-weekday">
              {label}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {monthGridDays.map((day) => {
            const isCurrentMonth = day.getMonth() === viewDate.getMonth()
            const isToday = dateKey(day) === dateKey(today)
            const dayEvents = eventsByDay.get(dateKey(day)) ?? []

            return (
              <div
                key={day.toISOString()}
                className={`calendar-day${isCurrentMonth ? '' : ' calendar-day-muted'}${isToday ? ' calendar-day-today' : ''}`}
              >
                <span className="calendar-day-number">{day.getDate()}</span>
                <div className="calendar-day-events">
                  {dayEvents.map(({ event, occurrenceStart }) => {
                    const color = getCourseColor(event.summary)
                    return (
                      <button
                        key={`${event.uid}-${occurrenceStart.getTime()}`}
                        type="button"
                        className="calendar-day-event"
                        style={{ backgroundColor: color.background, color: color.color }}
                        title={event.summary}
                        onClick={() => setSelectedOccurrence({ event, occurrenceStart })}
                      >
                        {!event.allDay && (
                          <span className="calendar-day-event-time">{formatEventTime(occurrenceStart, event.allDay)}</span>
                        )}
                        {event.summary}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <form className="calendar-form" onSubmit={handleSubmit}>
        <input
          type="url"
          className="calendar-input"
          placeholder="Paste an iCal (.ics) link"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" className="calendar-submit">
          Load
        </button>
      </form>

      {selectedOccurrence && (
        <div className="calendar-modal-backdrop" onClick={() => setSelectedOccurrence(null)}>
          <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="calendar-modal-close"
              aria-label="Close"
              onClick={() => setSelectedOccurrence(null)}
            >
              ×
            </button>
            <h4 className="calendar-modal-title">{selectedOccurrence.event.summary}</h4>
            <p className="calendar-modal-time">
              {formatEventTimeRange(selectedOccurrence.occurrenceStart, selectedOccurrence.event)}
            </p>
            {selectedOccurrence.event.location && (
              <p className="calendar-modal-location">{selectedOccurrence.event.location}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar
