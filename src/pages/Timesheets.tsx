import { useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTimesheets } from '../hooks/useTimesheets'
import {
  formatHours,
  formatPeriod,
  getEntryHours,
  isInPeriod,
  minutesOf,
  parseLocalDate,
  timesheetStatusLabels,
} from '../models/timesheets'
import type {
  TimesheetCourse,
  TimesheetEntry,
  TimesheetEntryInput,
  TimesheetPeriod,
  Timesheets as TimesheetsData,
} from '../models/timesheets'
import type { User } from '../models/users'
import './Timesheets.css'

const TIME_OPTIONS = Array.from({ length: (22 - 7) * 2 + 1 }, (_, index) => {
  const minutes = 7 * 60 + index * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

function Icon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const icons = {
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  hourglass: <path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" />,
  pen: <><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></>,
  send: <><path d="M21 3 10 14" /><path d="m21 3-7 18-4-7-7-4 18-7Z" /></>,
  download: <><path d="M12 4v11m-5-5 5 5 5-5" /><path d="M4 20h16" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
}

function formatEntryDate(date: string) {
  const value = parseLocalDate(date)
  return {
    weekday: value.toLocaleDateString('en-AU', { weekday: 'short' }),
    day: value.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
  }
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const suffix = hours >= 12 ? 'pm' : 'am'
  const displayHours = hours % 12 || 12
  return minutes === 0 ? `${displayHours}${suffix}` : `${displayHours}:${String(minutes).padStart(2, '0')}${suffix}`
}

function sumHours(entries: TimesheetEntry[]) {
  return entries.reduce((total, entry) => total + getEntryHours(entry), 0)
}

function csvCell(value: string | number) {
  let text = String(value)
  // Prevent spreadsheet apps from evaluating user-entered text as formulas.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

function exportCsv(entries: TimesheetEntry[], courses: TimesheetCourse[], period: TimesheetPeriod) {
  const header = ['Date', 'Course code', 'Course name', 'Activity', 'Start', 'End', 'Hours', 'Status', 'Notes']
  const rows = [...entries].reverse().map((entry) => [
    entry.date,
    entry.courseCode,
    courses.find((course) => course.courseCode === entry.courseCode)?.courseName ?? '',
    entry.activity,
    entry.startTime,
    entry.endTime,
    formatHours(getEntryHours(entry)),
    timesheetStatusLabels[entry.status],
    entry.notes,
  ])
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([`${csv}\r\n`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `timesheet-${period.start}-to-${period.end}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

interface EntryFormProps {
  data: TimesheetsData
  period: TimesheetPeriod
  editing: TimesheetEntry | null
  saving: boolean
  error: string
  onCreate: (entry: TimesheetEntryInput, submit: boolean) => Promise<boolean>
  onUpdate: (entryId: string, entry: TimesheetEntryInput, submit: boolean) => Promise<boolean>
  onDelete: (entryId: string) => Promise<boolean>
  onCancelEdit: () => void
}

function EntryForm({ data, period, editing, saving, error, onCreate, onUpdate, onDelete, onCancelEdit }: EntryFormProps) {
  const maxDate = period.end < data.today ? period.end : data.today
  const isOpen = period.status === 'open' && period.start <= data.today
  const [courseCode, setCourseCode] = useState(editing?.courseCode ?? data.courses[0]?.courseCode ?? '')
  const [date, setDate] = useState(editing?.date ?? maxDate)
  const [activity, setActivity] = useState(editing?.activity ?? data.activities[0] ?? '')
  const [startTime, setStartTime] = useState(editing?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(editing?.endTime ?? '10:00')
  const [notes, setNotes] = useState(editing?.notes ?? '')

  const durationMinutes = minutesOf(endTime) - minutesOf(startTime)
  const validDuration = durationMinutes > 0
  const durationLabel = validDuration
    ? `${formatHours(durationMinutes / 60)} hrs`
    : 'End time must be after start time'
  const disabled = !isOpen || saving

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validDuration) return
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    const submit = submitter instanceof HTMLButtonElement && submitter.value === 'submit'
    if (submit && !window.confirm(
      `Submit ${formatHours(durationMinutes / 60)} hrs of ${activity.toLowerCase()} for approval? Submitted entries can no longer be edited.`,
    )) return
    const entry = { courseCode, date, activity, startTime, endTime, notes: notes.trim() }
    const saved = editing ? await onUpdate(editing.id, entry, submit) : await onCreate(entry, submit)
    if (saved && editing) onCancelEdit()
    if (saved && !editing) setNotes('')
  }

  async function handleDelete() {
    if (editing && window.confirm('Delete this draft entry?')) {
      if (await onDelete(editing.id)) onCancelEdit()
    }
  }

  return (
    <section className="timesheets-card timesheets-form-card" aria-labelledby="timesheets-form-title">
      <div className="timesheets-section-heading">
        <h2 id="timesheets-form-title">{editing ? 'Edit draft' : 'Record hours'}</h2>
        <p>{isOpen
          ? editing
            ? 'Review this draft, then submit it for approval or save your changes.'
            : 'Add the time you worked, then submit it for approval or save it as a draft.'
          : 'This reporting period is closed. Entries can no longer be added or changed.'}</p>
      </div>

      <form className="timesheets-form" onSubmit={handleSubmit}>
        <label>
          <span>Course</span>
          <select value={courseCode} onChange={(event) => setCourseCode(event.target.value)} disabled={disabled} required>
            {data.courses.map((course) => (
              <option key={course.courseCode} value={course.courseCode}>
                {course.courseCode} · {course.courseName}
              </option>
            ))}
          </select>
        </label>

        <div className="timesheets-form-row">
          <label>
            <span>Date</span>
            <input
              type="date"
              value={date}
              min={period.start}
              max={maxDate}
              onChange={(event) => setDate(event.target.value)}
              disabled={disabled}
              required
            />
          </label>
          <label>
            <span>Activity</span>
            <select value={activity} onChange={(event) => setActivity(event.target.value)} disabled={disabled} required>
              {data.activities.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>

        <div className="timesheets-form-row">
          <label>
            <span>Start time</span>
            <select value={startTime} onChange={(event) => setStartTime(event.target.value)} disabled={disabled}>
              {TIME_OPTIONS.slice(0, -1).map((time) => <option key={time} value={time}>{formatTime(time)}</option>)}
            </select>
          </label>
          <label>
            <span>End time</span>
            <select value={endTime} onChange={(event) => setEndTime(event.target.value)} disabled={disabled}>
              {TIME_OPTIONS.slice(1).map((time) => <option key={time} value={time}>{formatTime(time)}</option>)}
            </select>
          </label>
        </div>

        <div className={`timesheets-duration${validDuration ? '' : ' timesheets-duration--invalid'}`} aria-live="polite">
          <Icon>{icons.clock}</Icon>
          <span>Calculated duration</span>
          <strong>{durationLabel}</strong>
        </div>

        <label>
          <span>Notes <small>(optional)</small></span>
          <textarea
            value={notes}
            maxLength={200}
            rows={3}
            placeholder="e.g. Tutorial group, room or task details"
            onChange={(event) => setNotes(event.target.value)}
            disabled={disabled}
          />
        </label>

        {error && <p className="timesheets-error" role="alert">{error}</p>}

        <div className="timesheets-form-actions">
          <button
            type="submit"
            name="action"
            value="submit"
            className="timesheets-primary"
            disabled={disabled || !validDuration || !courseCode}
          >
            <Icon>{icons.send}</Icon>
            Submit for approval
          </button>
          <button
            type="submit"
            name="action"
            value="draft"
            className="timesheets-secondary"
            disabled={disabled || !validDuration || !courseCode}
          >
            {editing ? <><Icon>{icons.pen}</Icon>Save changes</> : <><Icon>{icons.plus}</Icon>Save as draft</>}
          </button>
          {editing && (
            <>
              <button type="button" className="timesheets-danger" onClick={handleDelete} disabled={disabled}>Delete draft</button>
              <button type="button" className="timesheets-secondary" onClick={onCancelEdit} disabled={saving}>Cancel</button>
            </>
          )}
        </div>
      </form>

      <p className="timesheets-footnote">
        To submit a saved draft, open it with the pen button in Your entries. Submitted hours are sent to your
        course coordinator for approval and can no longer be edited.
      </p>
    </section>
  )
}

function Timesheets({ user }: { user: User }) {
  const timesheets = useTimesheets(user.id)
  const { data } = timesheets
  const [selectedPeriodStart, setSelectedPeriodStart] = useState('')
  const [activityFilter, setActivityFilter] = useState('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const period = data?.periods.find((candidate) => candidate.start === selectedPeriodStart)
    ?? data?.periods.find((candidate) => isInPeriod(data.today, candidate))
    ?? data?.periods[0]

  const periodEntries = useMemo(
    () => (data && period ? data.entries.filter((entry) => isInPeriod(entry.date, period)) : []),
    [data, period],
  )
  const visibleEntries = activityFilter === 'all'
    ? periodEntries
    : periodEntries.filter((entry) => entry.activity === activityFilter)
  const drafts = periodEntries.filter((entry) => entry.status === 'draft')
  const editing = periodEntries.find((entry) => entry.id === editingId && entry.status === 'draft') ?? null

  if (timesheets.loading) {
    return <div className="timesheets-page"><p className="timesheets-message">Loading your timesheets…</p></div>
  }
  if (!data || !period) {
    return <div className="timesheets-page"><p className="timesheets-error" role="alert">{timesheets.loadError || 'No reporting periods are available.'}</p></div>
  }

  const isOpen = period.status === 'open'
  const totals = {
    total: sumHours(periodEntries),
    approved: sumHours(periodEntries.filter((entry) => entry.status === 'approved')),
    submitted: sumHours(periodEntries.filter((entry) => entry.status === 'submitted')),
    draft: sumHours(drafts),
  }
  const coordinators = [...new Set(data.courses.map((course) => course.coordinator))]

  function changePeriod(start: string) {
    setSelectedPeriodStart(start)
    setEditingId(null)
    setExpandedId(null)
    timesheets.clearError()
  }

  const stats = [
    { key: 'total', label: 'Total recorded', value: totals.total, note: `${periodEntries.length} ${periodEntries.length === 1 ? 'entry' : 'entries'}`, icon: icons.clock },
    { key: 'approved', label: 'Approved', value: totals.approved, note: 'Ready for payroll', icon: icons.check },
    { key: 'submitted', label: 'Awaiting approval', value: totals.submitted, note: 'With your coordinator', icon: icons.hourglass },
    { key: 'draft', label: 'Draft', value: totals.draft, note: drafts.length > 0 ? `${drafts.length} not yet submitted` : 'Nothing to submit', icon: icons.pen },
  ]

  return (
    <div className="timesheets-page">
      <nav className="timesheets-breadcrumb" aria-label="Breadcrumb">
        <Link to="/home">My portal</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Timesheets</span>
      </nav>

      <header className="timesheets-header">
        <div className="timesheets-heading">
          <h1>Teaching hours, kept in order</h1>
          <p>Record your work as a tutor, review entries and submit hours for approval.</p>
        </div>
      </header>

      <div className="timesheets-toolbar">
        <label className="timesheets-period">
          <Icon>{icons.calendar}</Icon>
          <span className="timesheets-sr-only">Reporting period</span>
          <select value={period.start} onChange={(event) => changePeriod(event.target.value)}>
            {data.periods.map((option) => (
              <option key={option.start} value={option.start}>{formatPeriod(option)}</option>
            ))}
          </select>
        </label>
        <span className={`timesheets-period-status timesheets-period-status--${period.status}`}>
          {isOpen ? 'Open' : 'Closed'}
        </span>
        <button
          type="button"
          className="timesheets-secondary timesheets-export"
          onClick={() => exportCsv(periodEntries, data.courses, period)}
          disabled={periodEntries.length === 0}
        >
          <Icon>{icons.download}</Icon>
          Export CSV
        </button>
      </div>

      <section className="timesheets-stats" aria-label="Hours this period">
        {stats.map((stat) => (
          <article key={stat.key} className={`timesheets-stat timesheets-stat--${stat.key}`}>
            <div className="timesheets-stat-heading">
              <span>{stat.label}</span>
              <Icon>{stat.icon}</Icon>
            </div>
            <strong>{formatHours(stat.value)} <small>hrs</small></strong>
            <p>{stat.note}</p>
          </article>
        ))}
      </section>

      <div className="timesheets-columns">
        <section className="timesheets-card" aria-labelledby="timesheets-entries-title">
          <div className="timesheets-entries-heading">
            <div className="timesheets-section-heading">
              <h2 id="timesheets-entries-title">Your entries</h2>
              <p>{formatPeriod(period)}</p>
            </div>
            <label>
              <span className="timesheets-sr-only">Filter by activity</span>
              <select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}>
                <option value="all">All activities</option>
                {data.activities.map((activity) => <option key={activity} value={activity}>{activity}</option>)}
              </select>
            </label>
          </div>

          {visibleEntries.length === 0 ? (
            <p className="timesheets-empty">
              {periodEntries.length === 0 ? 'No hours recorded for this period yet.' : 'No entries match this activity.'}
            </p>
          ) : (
            <table className="timesheets-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Course</th>
                  <th scope="col">Activity</th>
                  <th scope="col" className="timesheets-hours">Hrs</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="timesheets-sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((entry) => {
                  const course = data.courses.find((candidate) => candidate.courseCode === entry.courseCode)
                  const { weekday, day } = formatEntryDate(entry.date)
                  const canEdit = entry.status === 'draft' && isOpen
                  const expanded = expandedId === entry.id
                  return [
                    <tr key={entry.id} className={editingId === entry.id ? 'timesheets-row--editing' : undefined}>
                      <td>
                        <strong>{weekday}</strong>
                        <small>{day}</small>
                      </td>
                      <td>
                        <strong className="timesheets-course-code">{entry.courseCode}</strong>
                        <small>{course?.courseName ?? 'Unknown course'}</small>
                      </td>
                      <td>
                        <strong>{entry.activity}</strong>
                        <small>{entry.notes || `${formatTime(entry.startTime)} – ${formatTime(entry.endTime)}`}</small>
                      </td>
                      <td className="timesheets-hours">{formatHours(getEntryHours(entry))}</td>
                      <td>
                        <span className={`timesheets-status timesheets-status--${entry.status}`}>
                          {timesheetStatusLabels[entry.status]}
                        </span>
                      </td>
                      <td className="timesheets-row-action">
                        {canEdit ? (
                          <button
                            type="button"
                            className="timesheets-icon-button"
                            aria-label={`Edit ${entry.activity} on ${day}`}
                            onClick={() => {
                              setEditingId(entry.id)
                              timesheets.clearError()
                            }}
                            disabled={timesheets.saving}
                          >
                            <Icon>{icons.pen}</Icon>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="timesheets-icon-button"
                            aria-label={`${expanded ? 'Hide' : 'Show'} details for ${entry.activity} on ${day}`}
                            aria-expanded={expanded}
                            onClick={() => setExpandedId(expanded ? null : entry.id)}
                          >
                            <Icon>{icons.more}</Icon>
                          </button>
                        )}
                      </td>
                    </tr>,
                    expanded && (
                      <tr key={`${entry.id}-details`} className="timesheets-details">
                        <td colSpan={6}>
                          <dl>
                            <div><dt>Time</dt><dd>{formatTime(entry.startTime)} – {formatTime(entry.endTime)}</dd></div>
                            <div><dt>Coordinator</dt><dd>{course?.coordinator ?? '—'}</dd></div>
                            <div><dt>Notes</dt><dd>{entry.notes || '—'}</dd></div>
                            <div>
                              <dt>Status</dt>
                              <dd>
                                {entry.status === 'draft'
                                  ? 'Draft · the reporting period is closed'
                                  : entry.status === 'submitted' ? 'Awaiting coordinator approval' : 'Approved for payroll'}
                              </dd>
                            </div>
                          </dl>
                        </td>
                      </tr>
                    ),
                  ]
                })}
              </tbody>
            </table>
          )}

          <div className="timesheets-table-footer">
            <span>Showing {visibleEntries.length} {visibleEntries.length === 1 ? 'entry' : 'entries'}</span>
            <strong>Total · {formatHours(sumHours(visibleEntries))} hrs</strong>
          </div>
          {coordinators.length > 0 && (
            <p className="timesheets-footnote">
              Submitted hours are reviewed by {coordinators.join(' and ')}.
            </p>
          )}
        </section>

        <EntryForm
          key={`${period.start}-${editing?.id ?? 'new'}`}
          data={data}
          period={period}
          editing={editing}
          saving={timesheets.saving}
          error={timesheets.error}
          onCreate={timesheets.createEntry}
          onUpdate={timesheets.updateEntry}
          onDelete={timesheets.deleteEntry}
          onCancelEdit={() => setEditingId(null)}
        />
      </div>
    </div>
  )
}

export default Timesheets
