import { useEffect, useState } from 'react'
import {
  createTimesheetEntry,
  deleteTimesheetEntry,
  fetchTimesheets,
  updateTimesheetEntry,
} from '../api/mockDatabase'
import type { TimesheetEntryInput, Timesheets } from '../models/timesheets'

export function useTimesheets(userId: string) {
  const [data, setData] = useState<Timesheets | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchTimesheets(userId)
      .then((timesheets) => {
        if (!cancelled) setData(timesheets)
      })
      .catch((fetchError: unknown) => {
        console.error('Unable to load timesheets:', fetchError)
        if (!cancelled) setLoadError('Unable to load your timesheets from the mock database. Refresh the page and try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId])

  async function run(action: () => Promise<Timesheets>): Promise<boolean> {
    if (saving) return false
    setSaving(true)
    setError('')
    try {
      setData(await action())
      return true
    } catch (actionError) {
      console.error('Timesheet request failed:', actionError)
      setError(actionError instanceof Error ? actionError.message : 'Unable to save your timesheet. Try again.')
      return false
    } finally {
      setSaving(false)
    }
  }

  return {
    data,
    loading,
    loadError,
    saving,
    error,
    clearError: () => setError(''),
    createEntry: (entry: TimesheetEntryInput, submit = false) => run(() => createTimesheetEntry(userId, entry, submit)),
    updateEntry: (entryId: string, entry: TimesheetEntryInput, submit = false) =>
      run(() => updateTimesheetEntry(userId, entryId, entry, submit)),
    deleteEntry: (entryId: string) => run(() => deleteTimesheetEntry(userId, entryId)),
  }
}

export type TimesheetsState = ReturnType<typeof useTimesheets>
