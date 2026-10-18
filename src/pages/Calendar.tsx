import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode, SubmitEvent } from 'react'
import { Link } from 'react-router-dom'
import { calendarCategoryLabels } from '../models/calendar'
import type { CalendarCategory, CalendarEvent } from '../models/calendar'
import { dateKey, getDayOccurrences } from '../calendar/events'
import type { CalendarData } from '../calendar/useCalendarData'
import { getEventDetailsPosition } from '../calendar/eventDetailsPosition'
import './Calendar.css'

function CalendarDialog({ title, onClose, children }: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  return (
    <dialog ref={ref} className="calendar-modal" onCancel={onClose} onClose={onClose} aria-labelledby="calendar-dialog-title">
      <button type="button" className="calendar-modal-close" aria-label="Close dialog" onClick={onClose}>×</button>
      <h2 id="calendar-dialog-title">{title}</h2>
      {children}
    </dialog>
  )
}

interface SelectedOccurrence {
  event: CalendarEvent
  occurrenceStart: Date
  day: Date
  anchor: HTMLButtonElement
}

function EventDetails({ selection, onClose }: { selection: SelectedOccurrence; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const { event, occurrenceStart, day, anchor } = selection

  useLayoutEffect(() => {
    const card = ref.current
    if (!card) return
    const position = getEventDetailsPosition(
      day.getDay(), anchor.getBoundingClientRect(),
      { width: window.innerWidth, height: window.innerHeight }, card.offsetHeight,
    )
    card.style.width = `${position.width}px`
    card.style.left = `${position.left}px`
    card.style.top = `${position.top}px`
    card.dataset.side = position.side
    card.querySelector<HTMLButtonElement>('button')?.focus()
    return () => {
      if (card.contains(document.activeElement) && anchor.isConnected) anchor.focus()
    }
  }, [selection, anchor, day])

  useEffect(() => {
    function outsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !ref.current?.contains(event.target) && !anchor.contains(event.target)) onClose()
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    function scroll(event: Event) {
      if (event.target instanceof Node && ref.current?.contains(event.target)) return
      onClose()
    }
    document.addEventListener('pointerdown', outsideClick)
    document.addEventListener('keydown', escape)
    window.addEventListener('resize', onClose)
    window.addEventListener('scroll', scroll, true)
    return () => {
      document.removeEventListener('pointerdown', outsideClick)
      document.removeEventListener('keydown', escape)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [anchor, onClose])

  return createPortal(
    <div ref={ref} id="calendar-event-details" className="calendar-event-details" role="dialog"
      aria-modal="false" aria-labelledby="calendar-event-title">
      <button type="button" className="calendar-modal-close" aria-label="Close event details" onClick={onClose}>×</button>
      <div className="calendar-event-details-heading">
        <span className="calendar-event-color" style={{ background: getCourseColor(event).color }} aria-hidden="true" />
        <h2 id="calendar-event-title">{event.summary}</h2>
      </div>
      <p>{formatEventTimeRange(occurrenceStart, event)}</p>
      {event.rrule && <p className="calendar-status">Recurring event</p>}
      {event.location && <p className="calendar-event-location">Location · {event.location}</p>}
      <p className="calendar-status">{calendarCategoryLabels[event.category]}</p>
      {event.demo && <p className="calendar-status">Demo event · Illustrative only</p>}
    </div>,
    document.body,
  )
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
  start.setDate(start.getDate() - (firstOfMonth.getDay() + 6) % 7)
  return start
}

const COURSE_COLOR_PALETTE = [
  { background: '#dbeafe', color: '#1e3a8a' },
  { background: '#dcfce7', color: '#166534' },
  { background: '#fce7f3', color: '#9d174d' },
  { background: '#ede9fe', color: '#5b21b6' },
  { background: '#ffe4e6', color: '#9f1239' },
  { background: '#cffafe', color: '#155e75' },
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

function getCourseColor(event: CalendarEvent) {
  if (event.category === 'deadline') return { background: '#eee8f8', color: '#70449a' }
  if (event.category === 'campus') return { background: '#e4f2eb', color: '#28775e' }
  if (event.category === 'lecture') return { background: '#fdeee2', color: '#a4521b' }
  const index = hashString(extractCourseCode(event.summary)) % COURSE_COLOR_PALETTE.length
  return COURSE_COLOR_PALETTE[index]
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FILTER_CATEGORIES: CalendarCategory[] = ['timetable', 'lecture', 'deadline', 'campus']

function Calendar({ calendar }: { calendar: CalendarData }) {
  const {
    today, events, icsUrl, loading, error, personalEventsError, personalEventsReady, serverEventsError, saveIcsUrl, addPersonalEvent,
  } = calendar
  const [inputValue, setInputValue] = useState(icsUrl)
  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState<Record<CalendarCategory, boolean>>({
    timetable: true, lecture: true, deadline: true, campus: true, personal: true,
  })
  const [selectedDay, setSelectedDay] = useState(today)
  const [dialog, setDialog] = useState<'settings' | 'add' | null>(null)
  const [formError, setFormError] = useState('')
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedOccurrence, setSelectedOccurrence] = useState<SelectedOccurrence | null>(
    null,
  )

  const hasLectures = events.some((event) => event.category === 'lecture')
  const visibleEvents = useMemo(
    () => events.filter((event) => filters[event.category]),
    [events, filters],
  )

  const monthGridDays = useMemo(() => {
    const gridStart = getMonthGridStart(viewDate.getFullYear(), viewDate.getMonth())
    const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    const leadingDays = (firstOfMonth.getDay() + 6) % 7
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()
    const gridLength = Math.ceil((leadingDays + daysInMonth) / 7) * 7
    return Array.from({ length: gridLength }, (_, i) => {
      const day = new Date(gridStart)
      day.setDate(day.getDate() + i)
      return day
    })
  }, [viewDate])

  const eventsByDay = useMemo(() => {
    return new Map(monthGridDays.map((day) => [dateKey(day), getDayOccurrences(visibleEvents, day)]))
  }, [visibleEvents, monthGridDays])

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (trimmed) {
      try {
        const url = new URL(trimmed)
        if (!['https:', 'http:', 'webcal:'].includes(url.protocol)) {
          setFormError('Use an HTTPS, HTTP or webcal calendar link.')
          return
        }
      } catch {
        setFormError('Enter a valid iCal URL.')
        return
      }
    }
    setSaving(true)
    try {
      await saveIcsUrl(trimmed)
      setDialog(null)
    } catch (saveError) {
      console.error('Unable to save calendar settings:', saveError)
      setFormError(saveError instanceof Error ? saveError.message : 'Unable to save settings. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function addEvent(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const summary = String(data.get('summary') ?? '').trim()
    const start = new Date(String(data.get('start') ?? ''))
    const endValue = String(data.get('end') ?? '')
    const end = endValue ? new Date(endValue) : undefined
    if (!summary || Number.isNaN(start.getTime()) || (end && (Number.isNaN(end.getTime()) || end <= start))) {
      setFormError('Enter an event title and valid start time. The end must be after the start.')
      return
    }
    setSaving(true)
    try {
      await addPersonalEvent({
        uid: crypto.randomUUID(), summary, start, end,
        location: String(data.get('location') ?? '').trim(),
        category: 'personal', allDay: false, exdates: [],
      })
      setViewDate(new Date(start.getFullYear(), start.getMonth(), 1))
      setSelectedDay(start)
      setDialog(null)
    } catch (saveError) {
      console.error('Unable to save personal event:', saveError)
      setFormError(saveError instanceof Error ? saveError.message : 'Unable to save event. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function openDialog(value: 'settings' | 'add') {
    setSelectedOccurrence(null)
    setInputValue(icsUrl)
    setFormError('')
    setDialog(value)
  }

  function goToMonth(offset: number) {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  const selectedDayEvents = useMemo(
    () => eventsByDay.get(dateKey(selectedDay)) ?? getDayOccurrences(visibleEvents, selectedDay),
    [eventsByDay, selectedDay, visibleEvents],
  )
  const nextDeadline = visibleEvents
    .filter((event) => event.category === 'deadline' && event.start >= today)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0]

  return (
    <div className="calendar">
      <nav className="calendar-breadcrumb" aria-label="Breadcrumb">
        <Link to="/home">My portal</Link><span aria-hidden="true">›</span><span aria-current="page">Calendar</span>
      </nav>
      <header className="calendar-heading">
        <div><h1>Your calendar</h1><p>Classes, deadlines and campus moments. Make room for what matters.</p></div>
        <div className="calendar-actions">
          <button type="button" className="calendar-submit" disabled={!personalEventsReady} onClick={() => openDialog('add')}>+ Add event</button>
          <button type="button" className="calendar-secondary" onClick={() => openDialog('settings')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" fill="white" /><circle cx="15" cy="17" r="3" fill="white" />
            </svg>
            Settings
          </button>
        </div>
      </header>
      <div className="calendar-toolbar">
        <div className="calendar-filters">
          {FILTER_CATEGORIES.filter((category) => category !== 'lecture' || hasLectures).map((category) => (
            <button key={category} type="button" className="calendar-secondary" aria-pressed={filters[category]}
              onClick={() => setFilters((previous) => ({ ...previous, [category]: !previous[category] }))}>
              <span aria-hidden="true">{filters[category] ? '✓' : '+'}</span> {calendarCategoryLabels[category]}
            </button>
          ))}
        </div>
        <span className="calendar-status">{icsUrl ? 'iCal timetable connected' : 'Connect your timetable in Settings'}</span>
      </div>

      {loading && <p className="calendar-status">Loading events…</p>}
      {error && <p role="alert" className="calendar-status calendar-error">{error}</p>}
      {serverEventsError && <p role="alert" className="calendar-status calendar-error">{serverEventsError}</p>}
      {personalEventsError && <p role="alert" className="calendar-status calendar-error">{personalEventsError}</p>}

      <div className="calendar-layout">
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
          <button type="button" className="calendar-secondary calendar-today" onClick={() => {
            setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
            setSelectedDay(today)
          }}>Today</button>
          <span className="calendar-view-label">Month</span>
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
                className={`calendar-day${isCurrentMonth ? '' : ' calendar-day-muted'}${isToday ? ' calendar-day-today' : ''}${dateKey(day) === dateKey(selectedDay) ? ' calendar-day-selected' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                <button type="button" className="calendar-day-number" aria-label={`View events for ${day.toDateString()}`}
                  aria-pressed={dateKey(day) === dateKey(selectedDay)} onClick={() => setSelectedDay(day)}>{day.getDate()}</button>
                <div className="calendar-day-events">
                  {dayEvents.map(({ event, occurrenceStart }) => {
                    const color = getCourseColor(event)
                    return (
                      <button
                        key={`${event.uid}-${occurrenceStart.getTime()}`}
                        type="button"
                        className="calendar-day-event"
                        style={{ backgroundColor: color.background, color: color.color }}
                        title={event.summary}
                        aria-haspopup="dialog"
                        onClick={(click) => {
                          click.stopPropagation()
                          setSelectedOccurrence({ event, occurrenceStart, day, anchor: click.currentTarget })
                        }}
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
      <aside className="calendar-agenda">
        <section className="calendar-agenda-card">
          <h2>{selectedDay.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          <span className="calendar-agenda-count">{dateKey(selectedDay) === dateKey(today) ? 'Today · ' : ''}{selectedDayEvents.length} events</span>
          {selectedDayEvents.length === 0 && <p className="calendar-status">No events for this day.</p>}
          {selectedDayEvents.map(({ event, occurrenceStart }) => (
            <div className="calendar-agenda-event" key={`${event.uid}-${occurrenceStart.getTime()}`}>
              <span style={{ color: getCourseColor(event).color }}>{formatEventTime(occurrenceStart, event.allDay)} · {calendarCategoryLabels[event.category]}</span>
              <strong>{event.summary}</strong>
              {event.location && <span>{event.location}</span>}
              {event.demo && <span>Demo event</span>}
            </div>
          ))}
        </section>
        {filters.deadline && (
          <section className="calendar-agenda-card calendar-next-deadline">
            <h2>Next deadline</h2>
            {nextDeadline ? <>
              <strong>{nextDeadline.summary}</strong>
              <p>{formatEventTimeRange(nextDeadline.start, nextDeadline)}</p>
              <p className="calendar-status">Demo task · Not an actual course deadline</p>
              <a href={nextDeadline.url} target="_blank" rel="noopener noreferrer">Open Moodle ↗</a>
            </> : <p>No upcoming deadlines.</p>}
          </section>
        )}
      </aside>
      </div>

      {dialog === 'settings' && (
        <CalendarDialog title="Calendar settings" onClose={() => setDialog(null)}>
          <p>Connect your timetable using an iCal (.ics) subscription link.</p>
          <form className="calendar-form" onSubmit={handleSubmit}>
            <label htmlFor="ical-url">iCal link</label>
            <input id="ical-url" type="text" inputMode="url" className="calendar-input"
              placeholder="https://… or webcal://…" value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
            <p className="calendar-status">Leave blank to disconnect. The link is saved to your account in the mock database.</p>
            {formError && <p className="calendar-error" role="alert">{formError}</p>}
            <button type="submit" className="calendar-submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
          </form>
        </CalendarDialog>
      )}
      {dialog === 'add' && (
        <CalendarDialog title="Add event" onClose={() => setDialog(null)}>
          <form className="calendar-form" onSubmit={addEvent}>
            <label htmlFor="event-summary">Event title</label>
            <input className="calendar-input" id="event-summary" name="summary" required />
            <label htmlFor="event-start">Start</label>
            <input className="calendar-input" id="event-start" name="start" type="datetime-local" required />
            <label htmlFor="event-end">End (optional)</label>
            <input className="calendar-input" id="event-end" name="end" type="datetime-local" />
            <label htmlFor="event-location">Location (optional)</label>
            <input className="calendar-input" id="event-location" name="location" />
            <p className="calendar-status">Personal events are saved to your account in the mock database.</p>
            {formError && <p className="calendar-error" role="alert">{formError}</p>}
            <button type="submit" className="calendar-submit" disabled={saving}>{saving ? 'Saving…' : 'Add event'}</button>
          </form>
        </CalendarDialog>
      )}

      {selectedOccurrence && (
        <EventDetails selection={selectedOccurrence} onClose={() => setSelectedOccurrence(null)} />
      )}
    </div>
  )
}

export default Calendar
