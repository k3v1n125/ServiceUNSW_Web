import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '../data/users'
import {
  getLectureKey,
  getLectureSessions,
  getLectureStatus,
  getProfessorCourses,
} from '../data/lectures'
import type { LectureChecklistItem } from '../data/lectures'
import { useLectureChecklists } from '../hooks/useLectureChecklists'
import TeachingNote from '../components/TeachingNote'
import './Lectures.css'

function Lectures({ user }: { user: User }) {
  const courses = getProfessorCourses(user)
  const sessions = getLectureSessions()
  const checklistsState = useLectureChecklists(user.id)
  const [newItems, setNewItems] = useState<Record<string, string>>({})
  const [selectedLectureKey, setSelectedLectureKey] = useState(() =>
    courses.length > 0 && sessions.length > 0
      ? getLectureKey(courses[0].courseCode, sessions[0].date)
      : '',
  )
  const selectedLecture = courses.flatMap((course) =>
    sessions.map((session) => ({
      course,
      session,
      key: getLectureKey(course.courseCode, session.date),
    })),
  ).find((lecture) => lecture.key === selectedLectureKey)
  const selectedChecklist = selectedLecture
    ? checklistsState.checklists[selectedLecture.key] ?? []
    : []
  const lectureStatuses = courses.flatMap((course) =>
    sessions.map((session) => {
      const lectureKey = getLectureKey(course.courseCode, session.date)
      return getLectureStatus(checklistsState.checklists[lectureKey] ?? [])
    }),
  )
  const readyCount = lectureStatuses.filter((status) => status === 'Ready').length
  const statusSummary = (['In progress', 'Planned', 'Not planned'] as const)
    .flatMap((status) => {
      const count = lectureStatuses.filter((lectureStatus) => lectureStatus === status).length
      return count > 0 ? [`${count} ${status.toLowerCase()}`] : []
    })
    .join(' · ')

  function updateChecklist(lectureKey: string, items: LectureChecklistItem[]): Promise<boolean> {
    return checklistsState.save({ ...checklistsState.checklists, [lectureKey]: items })
  }

  async function addChecklistItem(event: SubmitEvent<HTMLFormElement>, lectureKey: string) {
    event.preventDefault()
    const text = newItems[lectureKey]?.trim()
    if (!text) return

    const items = checklistsState.checklists[lectureKey] ?? []
    if (await updateChecklist(lectureKey, [...items, { id: crypto.randomUUID(), text, checked: false }])) {
      setNewItems((previous) => ({ ...previous, [lectureKey]: '' }))
    }
  }

  const checklistDisabled = checklistsState.loading || checklistsState.saving || checklistsState.loadFailed

  return (
    <div className="lectures-page">
      <nav className="lectures-breadcrumb" aria-label="Breadcrumb">
        <Link to="/home">My portal</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Lectures</span>
      </nav>

      <header className="lectures-heading">
        <div>
          <h1>Make your next lecture a great one</h1>
          <p>{user.fullName} · Organise your lecture plan and keep preparation moving.</p>
        </div>
      </header>

      <section className="lectures-overview" aria-label="Lecture plan overview">
        <article className="lectures-stat">
          <span>Upcoming in this view</span>
          <strong>{sessions.length * courses.length} lectures</strong>
          <small>26 October – 20 November 2026</small>
        </article>
        <article className="lectures-stat">
          <span>Teaching courses</span>
          <strong>{courses.length} {courses.length === 1 ? 'course' : 'courses'}</strong>
          <small>{courses.map((course) => course.courseCode).join(' · ') || 'No courses assigned'}</small>
        </article>
        <article className="lectures-stat lectures-ready-stat">
          <div className="lectures-ready-heading">
            <span>Ready to deliver</span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="m8.5 12 2.3 2.3 4.8-5" />
            </svg>
          </div>
          <strong>{readyCount} of {lectureStatuses.length}</strong>
          <small>{statusSummary || 'All lectures are ready to deliver'}</small>
        </article>
      </section>

      <div className="lectures-columns">
        <section className="lectures-plan" aria-labelledby="lecture-plan-title">
          <div className="lectures-section-heading">
            <div>
              <h2 id="lecture-plan-title">Your lecture plan</h2>
              <p>Two sessions each week, from 26 October to 20 November.</p>
            </div>
          </div>
          {courses.length === 0 ? (
            <p className="lectures-empty">No professor courses are assigned to your account yet.</p>
          ) : (
            courses.flatMap((course) =>
              sessions.map((session) => (
                (() => {
                  const lectureKey = getLectureKey(course.courseCode, session.date)
                  const checklist = checklistsState.checklists[lectureKey] ?? []
                  const status = getLectureStatus(checklist)
                  const selected = lectureKey === selectedLectureKey
                  return (
                    <article className={`lecture-row${selected ? ' lecture-row--selected' : ''}`} key={lectureKey}>
                      <button
                        type="button"
                        className="lecture-select"
                        aria-pressed={selected}
                        onClick={() => setSelectedLectureKey(lectureKey)}
                      >
                        <span className="lecture-date" aria-hidden="true">
                          <strong>{String(session.date.getDate()).padStart(2, '0')}</strong>
                          <span>{session.date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span>
                        </span>
                        <span className="lecture-information">
                          <span className="lecture-course-code">{course.courseCode}</span>
                          <strong>{course.courseName}</strong>
                          <small>{session.weekday} · {session.startTime}–{session.endTime} · {session.location}</small>
                        </span>
                        <span className={`lecture-status lecture-status--${status.toLowerCase().replace(' ', '-')}`}>{status}</span>
                      </button>
                    </article>
                  )
                })()
              )),
            )
          )}
          <p className="lectures-footnote">All times are shown in your local timezone.</p>
        </section>

        <aside className="lectures-aside">
          <section className="lecture-next" aria-labelledby="next-lecture-title">
            <h2 id="next-lecture-title">Up next: lecture details</h2>
            {selectedLecture ? (
              <>
                <span className="lecture-course-code">{selectedLecture.course.courseCode}</span>
                <h3>{selectedLecture.course.courseName}</h3>
                <p className="lecture-next-date">
                  {selectedLecture.session.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                  {' · '}{selectedLecture.session.startTime}–{selectedLecture.session.endTime}
                </p>
                <p className="lecture-next-location">
                  <span aria-hidden="true">⌖</span> {selectedLecture.session.location}
                </p>
                <hr className="lecture-details-divider" />
                <div className="lecture-checklist-heading">
                  <h4>Preparation checklist</h4>
                  <span className={`lecture-status lecture-status--${getLectureStatus(selectedChecklist).toLowerCase().replace(' ', '-')}`}>
                    {getLectureStatus(selectedChecklist)}
                  </span>
                </div>
                {checklistsState.loading && (
                  <p className="lecture-checklist-empty" role="status">Loading checklist…</p>
                )}
                {!checklistsState.loading && selectedChecklist.length === 0 && (
                  <p className="lecture-checklist-empty">Add items to plan this lecture.</p>
                )}
                {selectedChecklist.length > 0 && (
                  <ul className="lecture-checklist">
                    {selectedChecklist.map((item) => (
                      <li key={item.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={item.checked}
                            disabled={checklistDisabled}
                            onChange={(event) => updateChecklist(
                              selectedLecture.key,
                              selectedChecklist.map((current) => current.id === item.id
                                ? { ...current, checked: event.target.checked }
                                : current),
                            )}
                          />
                          <span>{item.text}</span>
                        </label>
                        <button
                          type="button"
                          className="lecture-checklist-remove"
                          disabled={checklistDisabled}
                          aria-label={`Remove ${item.text}`}
                          onClick={() => updateChecklist(
                            selectedLecture.key,
                            selectedChecklist.filter((current) => current.id !== item.id),
                          )}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <form className="lecture-checklist-add" onSubmit={(event) => addChecklistItem(event, selectedLecture.key)}>
                  <label className="lecture-checklist-label" htmlFor={`checklist-item-${selectedLecture.key}`}>Add checklist item</label>
                  <div>
                    <input
                      id={`checklist-item-${selectedLecture.key}`}
                      value={newItems[selectedLecture.key] ?? ''}
                      onChange={(event) => setNewItems((previous) => ({ ...previous, [selectedLecture.key]: event.target.value }))}
                      placeholder="e.g. Prepare lecture slides"
                      disabled={checklistDisabled}
                      required
                    />
                    <button type="submit" disabled={checklistDisabled}>{checklistsState.saving ? 'Saving…' : 'Add item'}</button>
                  </div>
                </form>
                {checklistsState.error && <p className="lecture-checklist-error" role="alert">{checklistsState.error}</p>}
              </>
            ) : (
              <p className="lectures-empty">Assign a professor course to see upcoming lecture details.</p>
            )}
          </section>
          <TeachingNote key={user.id} userId={user.id} />
        </aside>
      </div>
    </div>
  )
}

export default Lectures
