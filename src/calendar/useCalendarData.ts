import { useEffect, useMemo, useState } from 'react'
import { fetchCalendarEvents, readUserRecord, writeUserRecord } from '../api/mockDatabase'
import type { CalendarEvent } from '../models/calendar'
import { parseIcs } from './events'

interface StoredPersonalEvent {
  uid: string
  summary: string
  start: string
  end?: string
  location?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseCalendarSettings(value: unknown): string {
  if (value === null) return ''
  if (!isRecord(value) || typeof value.icsUrl !== 'string') {
    throw new Error('Calendar settings returned by the mock API are invalid.')
  }
  return value.icsUrl
}

function parsePersonalEvents(value: unknown): CalendarEvent[] {
  if (value === null) return []
  if (!Array.isArray(value)) throw new Error('Personal events returned by the mock API are invalid.')
  return value.map((event) => {
    if (!isRecord(event) || typeof event.uid !== 'string' || typeof event.summary !== 'string' ||
      typeof event.start !== 'string' || (event.end !== undefined && typeof event.end !== 'string') ||
      (event.location !== undefined && typeof event.location !== 'string')) {
      throw new Error('A personal event returned by the mock API is invalid.')
    }
    const start = new Date(event.start)
    const end = typeof event.end === 'string' ? new Date(event.end) : undefined
    if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) {
      throw new Error('A personal event returned by the mock API has an invalid date.')
    }
    return {
      uid: event.uid,
      summary: event.summary,
      start,
      end,
      location: typeof event.location === 'string' ? event.location : '',
      category: 'personal',
      allDay: false,
      exdates: [],
    }
  })
}

function toStoredPersonalEvent(event: CalendarEvent): StoredPersonalEvent {
  return {
    uid: event.uid,
    summary: event.summary,
    start: event.start.toISOString(),
    ...(event.end ? { end: event.end.toISOString() } : {}),
    ...(event.location ? { location: event.location } : {}),
  }
}

export function useCalendarData(userId: string) {
  const [icsUrl, setIcsUrl] = useState('')
  const [feedRevision, setFeedRevision] = useState(0)
  const [importedEvents, setImportedEvents] = useState<CalendarEvent[]>([])
  const [personalEvents, setPersonalEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [personalEventsError, setPersonalEventsError] = useState<string | null>(null)
  const [personalEventsReady, setPersonalEventsReady] = useState(false)
  const [today] = useState(() => new Date())
  const [serverEvents, setServerEvents] = useState<CalendarEvent[]>([])
  const [serverEventsError, setServerEventsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    readUserRecord(userId, 'calendar-settings')
      .then((value) => {
        if (cancelled) return
        const url = parseCalendarSettings(value)
        setIcsUrl(url)
        setLoading(!!url)
      })
      .catch((settingsError: unknown) => {
        console.error('Unable to read calendar settings:', settingsError)
        if (cancelled) return
        setError('Unable to read saved calendar settings from the mock database.')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    fetchCalendarEvents(userId)
      .then((events) => {
        if (!cancelled) setServerEvents(events)
      })
      .catch((eventsError: unknown) => {
        console.error('Unable to read calendar events:', eventsError)
        if (!cancelled) setServerEventsError('Unable to load university and lecture events from the mock API.')
      })
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    readUserRecord(userId, 'personal-events')
      .then((value) => {
        if (cancelled) return
        setPersonalEvents(parsePersonalEvents(value))
        setPersonalEventsReady(true)
      })
      .catch((eventsError: unknown) => {
        console.error('Unable to read personal events:', eventsError)
        if (!cancelled) setPersonalEventsError('Unable to load personal events from the mock database.')
      })
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    if (!icsUrl) return
    let cancelled = false
    fetch(`/api/ics-proxy?url=${encodeURIComponent(icsUrl)}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load calendar (${response.status})`)
        return response.text()
      })
      .then((text) => {
        if (!cancelled) setImportedEvents(parseIcs(text))
      })
      .catch((fetchError: unknown) => {
        if (cancelled) return
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load calendar')
        setImportedEvents([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [icsUrl, feedRevision])

  const events = useMemo(
    () => [...(icsUrl ? importedEvents : []), ...serverEvents, ...personalEvents],
    [icsUrl, importedEvents, serverEvents, personalEvents],
  )

  async function saveIcsUrl(url: string) {
    const savedUrl = parseCalendarSettings(await writeUserRecord(userId, 'calendar-settings', { icsUrl: url }))
    setImportedEvents([])
    setError(null)
    setLoading(!!savedUrl)
    setIcsUrl(savedUrl)
    setFeedRevision((previous) => previous + 1)
  }

  async function addPersonalEvent(event: CalendarEvent) {
    if (!personalEventsReady) {
      throw new Error('Personal events must finish loading before adding a new event.')
    }
    const saved = await writeUserRecord(
      userId,
      'personal-events',
      [...personalEvents, event].map(toStoredPersonalEvent),
    )
    setPersonalEvents(parsePersonalEvents(saved))
    setPersonalEventsError(null)
  }

  return {
    today,
    events,
    icsUrl,
    loading,
    error,
    personalEventsError,
    personalEventsReady,
    serverEventsError,
    saveIcsUrl,
    addPersonalEvent,
  }
}

export type CalendarData = ReturnType<typeof useCalendarData>
