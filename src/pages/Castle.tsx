import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '../models/users'
import './Castle.css'

const tutorialGroups = [
  { code: 'T12', day: 'Wednesday, 7 Oct', time: '11:00–13:00', students: 26, week: 'Week 4 · Pointers & memory', next: true },
  { code: 'T09', day: 'Thursday, 8 Oct', time: '08:00–10:00', students: 24, week: 'Week 4 · Pointers & memory' },
  { code: 'T10', day: 'Thursday, 8 Oct', time: '11:00–13:00', students: 22, week: 'Week 4 · Pointers & memory' },
  { code: 'T11', day: 'Monday, 12 Oct', time: '11:00–13:00', students: 24, week: 'Week 5 · Arrays & strings' },
]

const initialTasks = [
  { label: 'Review Week 4 tutorial outline', checked: true },
  { label: 'Test the pointer exercises', checked: true },
  { label: 'Prepare worked examples', checked: false },
  { label: 'Review questions from last week', checked: false },
]

const resourceLinks = [
  { title: 'Week 4 tutorial pack', subtitle: 'Outline, exercises & sample solutions', icon: 'folder' },
  { title: 'Marking guidance', subtitle: 'Rubric & feedback examples', icon: 'clipboard' },
  { title: 'Tutor handbook', subtitle: 'Teaching guidance & contacts', icon: 'book' },
]

function CastleIcon({ name }: { name: string }) {
  if (name === 'folder') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5h7l2 2h9v10H3z" /><path d="M3 9h18" /></svg>
  }
  if (name === 'clipboard') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5H5v16h14V5h-3M9 3h6v4H9zM8 12h8m-8 4h6" /></svg>
  }
  if (name === 'book') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H3zM21 5h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z" /></svg>
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
}

function getCoordinatorEmail(name: string): string {
  const nameParts = name
    .replace(/^(dr|professor)\s+/i, '')
    .trim()
    .split(/\s+/)
  const firstName = nameParts[0]
  const lastName = nameParts.at(-1)
  return firstName && lastName && nameParts.length > 1
    ? `${firstName}.${lastName}@unsw.edu.au`.toLowerCase()
    : ''
}

function Castle({ user }: { user: User }) {
  const [tasks, setTasks] = useState(initialTasks)
  const appointment = user.teachingAppointments.find(({ role }) => role === 'tutor')
  const totalStudents = tutorialGroups.reduce((total, group) => total + group.students, 0)
  const coordinatorEmail = appointment ? getCoordinatorEmail(appointment.coordinator) : ''

  return (
    <div className="castle-page">
      <nav className="castle-breadcrumb" aria-label="Breadcrumb">
        <Link to="/home">My portal</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Castle</span>
      </nav>

      <header className="castle-heading">
        <div>
          <h1>A home for your teaching</h1>
          <p>Your tutor workspace for class preparation, student groups and teaching resources.</p>
        </div>
        <span className="castle-workspace-tag">Tutor workspace</span>
      </header>

      <section className="castle-course-banner" aria-label="Teaching course">
        <span className="castle-course-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M3 20h18M5 20V9h14v11M8 9V5h8v4M3 9h18M9 13v2m6-2v2" /></svg>
        </span>
        <div className="castle-course-copy">
          <h2>{appointment ? `${appointment.courseCode} · ${appointment.courseName}` : 'Your teaching course'}</h2>
          <p>Open Castle to continue to the teaching service. This portal overview shows illustrative class and preparation details for your tutor role.</p>
        </div>
        <a className="castle-open-button" href="https://castle.unsw.edu.au/" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6m-1-5-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></svg>
          Open Castle
        </a>
      </section>

      <div className="castle-content-grid">
        <section className="castle-groups-section" aria-labelledby="castle-groups-title">
          <div className="castle-section-heading">
            <div>
              <h2 id="castle-groups-title">Your tutorial groups</h2>
              <p>4 groups · {totalStudents} students · {appointment?.term ?? 'Term 3, 2026'}</p>
            </div>
          </div>
          <div className="castle-groups">
            {tutorialGroups.map((group) => (
              <article className="castle-group-card" key={group.code}>
                <div className="castle-group-heading">
                  <h3>Tutorial {group.code}</h3>
                  <span className={group.next ? 'castle-pill castle-pill--up-next' : 'castle-pill'}>
                    {group.next ? 'Up next' : `${group.students} students`}
                  </span>
                </div>
                <p className="castle-group-time">{group.day} · {group.time}</p>
                <p className="castle-group-location"><span aria-hidden="true">⌖</span> Computing Building · C104</p>
                <p className="castle-group-week">{group.week}</p>
                <div className="castle-group-links">
                  <a href="https://castle.unsw.edu.au/" target="_blank" rel="noopener noreferrer">Class roster <span aria-hidden="true">↗</span></a>
                  <a href="https://castle.unsw.edu.au/" target="_blank" rel="noopener noreferrer">Materials <span aria-hidden="true">↗</span></a>
                </div>
              </article>
            ))}
          </div>
          <Link className="castle-timesheets-note" to="/timesheets">
            <CastleIcon name="clock" />
            <span>Finished teaching? Remember to record your hours.</span>
            <strong>Timesheets <span aria-hidden="true">→</span></strong>
          </Link>
        </section>

        <aside className="castle-sidebar">
          <section className="castle-panel castle-preparation" aria-labelledby="castle-preparation-title">
            <h2 id="castle-preparation-title">Prepare for your next class</h2>
            <span className="castle-next-class">T12 · Tomorrow, 11:00</span>
            <ul className="castle-task-list">
              {tasks.map((task, index) => (
                <li key={task.label}>
                  <label>
                    <input
                      type="checkbox"
                      checked={task.checked}
                      onChange={(event) => setTasks((current) => current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, checked: event.target.checked } : item,
                      ))}
                    />
                    <span>{task.label}</span>
                  </label>
                </li>
              ))}
            </ul>
            <a className="castle-panel-link" href="https://castle.unsw.edu.au/" target="_blank" rel="noopener noreferrer">
              Open teaching materials <span aria-hidden="true">↗</span>
            </a>
          </section>

          <section className="castle-panel castle-resources" aria-labelledby="castle-resources-title">
            <h2 id="castle-resources-title">Teaching resources</h2>
            <ul>
              {resourceLinks.map((resource) => (
                <li key={resource.title}>
                  <CastleIcon name={resource.icon} />
                  <a href="https://castle.unsw.edu.au/" target="_blank" rel="noopener noreferrer">
                    <span>{resource.title}<small>{resource.subtitle}</small></span>
                    <span className="castle-resource-arrow" aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="castle-coordinator">
            <p>Your course coordinator</p>
            <h2>{appointment?.coordinator ?? 'Course coordinator'}</h2>
            {coordinatorEmail && <a href={`mailto:${coordinatorEmail}`}>{coordinatorEmail}</a>}
          </section>
        </aside>
      </div>
    </div>
  )
}

export default Castle
