import { useEffect, useMemo, useState } from 'react'
import { createDemoEvents } from '../data/calendar'
import type { CalendarEvent } from '../data/calendar'
import { parseIcs } from './events'

export function useCalendarData(userId: string) {
  const storageKey = `serviceunsw-ical-url-${userId}`
  const [initialSettings] = useState(() => {
    try {
      return { url: localStorage.getItem(storageKey) ?? '', error: null }
    } catch (error) {
      console.error('Unable to read calendar settings:', error)
      return { url: '', error: 'Unable to read saved calendar settings. Please allow browser storage.' }
    }
  })
  const [icsUrl, setIcsUrl] = useState(initialSettings.url)
  const [feedRevision, setFeedRevision] = useState(0)
  const [importedEvents, setImportedEvents] = useState<CalendarEvent[]>([])
  const [personalEvents, setPersonalEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(!!initialSettings.url)
  const [error, setError] = useState<string | null>(initialSettings.error)
  const [today] = useState(() => new Date())
  const [demoEvents] = useState(() => createDemoEvents(today))

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
    () => [...(icsUrl ? importedEvents : []), ...demoEvents, ...personalEvents],
    [icsUrl, importedEvents, demoEvents, personalEvents],
  )

  function saveIcsUrl(url: string) {
    localStorage.setItem(storageKey, url)
    setImportedEvents([])
    setError(null)
    setLoading(!!url)
    setIcsUrl(url)
    setFeedRevision((previous) => previous + 1)
  }

  function addPersonalEvent(event: CalendarEvent) {
    setPersonalEvents((previous) => [...previous, event])
  }

  return { today, events, icsUrl, loading, error, saveIcsUrl, addPersonalEvent }
}

export type CalendarData = ReturnType<typeof useCalendarData>
