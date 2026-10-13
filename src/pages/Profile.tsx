import { Link } from 'react-router-dom'
import RoleBadges from '../components/RoleBadges'
import { getUserInitials, getUserTitle, roleLabels } from '../data/users'
import type { User, UserRole } from '../data/users'
import './Profile.css'

const roleAccess: Record<UserRole, { title: string; description: string }> = {
  student: {
    title: 'Home, Calendar & Quick links',
    description: 'Your classes, university services and degree information.',
  },
  tutor: {
    title: 'Timesheets & Castle',
    description: 'Record teaching hours and access your tutor workspace.',
  },
  professor: {
    title: 'Lectures',
    description: 'Organise your lectures and manage your teaching.',
  },
}

function Profile({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const title = getUserTitle(user)
  const degree = user.roles.includes('student') ? user.degree : undefined

  return (
    <div className="profile-page">
      <nav className="profile-breadcrumb" aria-label="Breadcrumb">
        <Link to="/home">My portal</Link>
        <span aria-hidden="true">&rsaquo;</span>
        <span aria-current="page">Profile</span>
      </nav>

      <header className="profile-heading">
        <div>
          <h1>Your profile</h1>
          <p>Your university identity, study details and the roles that give you access.</p>
        </div>
        <div className="profile-actions">
          <button className="profile-edit profile-sign-out" type="button" onClick={onSignOut}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M9 4H4v16h5m5-13 5 5-5 5m-6-5h11" />
            </svg>
            Sign out
          </button>
        </div>
      </header>

      <section className="profile-identity profile-card" aria-label="University identity">
        <div className="profile-person">
          <span className="profile-avatar" aria-hidden="true">{getUserInitials(user)}</span>
          <div>
            <h2>{user.fullName}</h2>
            <p>{user.email}</p>
            <RoleBadges roles={user.roles} />
          </div>
        </div>
        <div className="profile-university">
          <strong>{user.school}</strong>
          <p>{title}</p>
          <p>University ID · {user.universityId}</p>
        </div>
      </section>

      <div className="profile-columns">
        <div className="profile-column">
          <section className="profile-card" aria-labelledby="personal-details">
            <h2 id="personal-details">Personal details</h2>
            <dl className="profile-details">
              <div><dt>Full name</dt><dd>{user.fullName}</dd></div>
              <div><dt>Preferred name</dt><dd>{user.name}</dd></div>
              <div><dt>University email</dt><dd>{user.email}</dd></div>
              <div><dt>Title / roles</dt><dd>{title}</dd></div>
            </dl>
          </section>

          {degree && (
            <section className="profile-card" aria-labelledby="your-degree">
              <div className="profile-card-heading">
                <h2 id="your-degree">Your degree</h2>
                <a href="https://my.unsw.edu.au/" target="_blank" rel="noopener noreferrer">
                  Open myUNSW <span aria-hidden="true">&rarr;</span>
                  <span className="profile-sr-only"> (opens in a new tab)</span>
                </a>
              </div>
              <p className="profile-degree-name">{degree.name}</p>
              <dl className="profile-details profile-study-details">
                <div><dt>Study stage</dt><dd>{degree.studyStage}</dd></div>
                <div><dt>Current term</dt><dd>{degree.currentTerm}</dd></div>
              </dl>
              <div className="profile-progress">
                <label htmlFor="degree-progress">Degree requirements</label>
                <strong>{degree.completedUoc} / {degree.requiredUoc} UOC completed</strong>
                <progress id="degree-progress" value={degree.completedUoc} max={degree.requiredUoc}>
                  {Math.round(degree.completedUoc / degree.requiredUoc * 100)}%
                </progress>
              </div>
            </section>
          )}

          {user.teachingAppointments.length > 0 && (
            <section className="profile-card" aria-labelledby="teaching-appointment">
              <h2 id="teaching-appointment">Teaching appointment</h2>
              <ul className="profile-appointments">
                {user.teachingAppointments.map((appointment) => (
                  <li key={`${appointment.courseCode}-${appointment.role}-${appointment.term}`}>
                    <span className={`profile-appointment-icon role-badge--${appointment.role}`} aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <circle cx="9" cy="7" r="3" />
                        <path d="M3 20v-3a6 6 0 0 1 12 0v3M15 4a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-2-4" />
                      </svg>
                    </span>
                    <div>
                      <strong>{appointment.courseCode} · {appointment.courseName}</strong>
                      <p>{roleLabels[appointment.role]} · {appointment.term} · Coordinator: {appointment.coordinator}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="profile-column">
          <section className="profile-card" aria-labelledby="roles-access">
            <h2 id="roles-access">Your roles &amp; access</h2>
            <p className="profile-muted">
              {user.roles.length > 1
                ? 'You have multiple roles. Your workspaces are available alongside each other.'
                : 'Your role gives you access to the following workspace.'}
            </p>
            <div className="profile-access-list">
              {user.roles.map((role) => (
                <div className={`profile-access role-badge--${role}`} key={role}>
                  <RoleBadges roles={[role]} />
                  <h3>{roleAccess[role].title}</h3>
                  <p>{roleAccess[role].description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="profile-card profile-access-help" aria-labelledby="access-help">
            <h2 id="access-help">How access works</h2>
            <p>Roles are additive, not either/or. Access reflects your current appointments.</p>
            <div className="profile-help-details">
              <p>Staff who are tutors also get Timesheets and Castle.</p>
              <p>Professors get Lectures to organise their teaching. A professor who also tutors gets both sets of tools.</p>
              <a href="https://www.student.unsw.edu.au/support" target="_blank" rel="noopener noreferrer">
                Missing a role? Contact university support <span aria-hidden="true">&rarr;</span>
                <span className="profile-sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </section>
        </div>
      </div>

    </div>
  )
}

export default Profile
