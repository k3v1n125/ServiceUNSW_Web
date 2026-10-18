import { Link } from 'react-router-dom'
import { calendarCategoryLabels } from '../models/calendar'
import type { CalendarCategory } from '../models/calendar'
import { getDayOccurrences } from '../calendar/events'
import type { CalendarData } from '../calendar/useCalendarData'
import type { User } from '../models/users'
import type { FavouritesState } from '../hooks/useFavourites'
import type { ServicesState } from '../hooks/useServices'
import ServiceCard from '../components/ServiceCard'
import './Home.css'

const categoryTones: Record<CalendarCategory, string> = {
  timetable: 'blue', lecture: 'orange', deadline: 'purple', campus: 'green', personal: 'yellow',
}

function Home({ user, calendar, favourites, catalogue }: {
  user: User
  calendar: CalendarData
  favourites: FavouritesState
  catalogue: ServicesState
}) {
  const { today, events, loading, error } = calendar
  const todayEvents = getDayOccurrences(events, today)
  const nextDeadline = events.find((event) => event.category === 'deadline')
  const campusEvent = events.find((event) => event.category === 'campus' && event.start >= today)
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const favouriteServices = favourites.ids.flatMap((id) => catalogue.services.filter((service) => service.id === id))
  const favouritesLoading = favourites.loading || catalogue.loading
  const favouritesError = favourites.error || catalogue.error

  return (
    <div className="home-page">
      <nav className="home-breadcrumb" aria-label="Breadcrumb">
        <span>My portal</span><span aria-hidden="true">›</span><span aria-current="page">Home</span>
      </nav>
      <header className="home-heading">
        <div>
          <h1>{greeting}, {user.name} <span aria-hidden="true">👋</span></h1>
          <p>Here&apos;s what&apos;s happening in your university day.</p>
        </div>
      </header>

      <section className="home-day-banner" aria-label="Today at a glance">
        <div className="home-date-tile" aria-hidden="true">
          <strong>{String(today.getDate()).padStart(2, '0')}</strong>
          <span>{today.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span>
        </div>
        <div>
          <strong>{today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
          <p>{todayEvents.length} {todayEvents.length === 1 ? 'event' : 'events'} today{loading ? ' · Loading timetable…' : ''}</p>
        </div>
        <div className="home-study-summary">
          <strong>{user.roles.includes('student') && user.degree ? user.degree.name : user.school}</strong>
          <p>{user.roles.includes('student') && user.degree ? `${user.degree.studyStage} · ${user.degree.currentTerm}` : 'Your university workspace'}</p>
        </div>
      </section>

      <div className="home-columns">
        <section className="home-card home-schedule" aria-labelledby="today-schedule">
          <div className="home-section-heading">
            <h2 id="today-schedule">Today&apos;s schedule</h2>
            <Link to="/calendar">Full calendar <span aria-hidden="true">→</span></Link>
          </div>
          {loading && <p className="home-muted" role="status">Loading timetable events…</p>}
          {error && <p className="home-schedule-error" role="alert">{error} Check your iCal link in Calendar settings.</p>}
          {!loading && todayEvents.length === 0 && <p className="home-muted">No events scheduled for today.</p>}
          {todayEvents.map(({ event, occurrenceStart, occurrenceEnd }) => (
            <div className="home-schedule-event" key={`${event.uid}-${occurrenceStart.getTime()}`}>
              <div className="home-event-time">
                <span>{event.allDay ? 'All day' : occurrenceStart.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                {!event.allDay && occurrenceEnd && <small>{occurrenceEnd.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}</small>}
              </div>
              <div>
                <span className="home-event-category">{calendarCategoryLabels[event.category]}{event.demo ? ' · Demo' : ''}</span>
                <strong>{event.summary}</strong>
                <small>{event.location}</small>
              </div>
              <span className={`home-tag home-tag--${categoryTones[event.category]}`}>{calendarCategoryLabels[event.category]}</span>
            </div>
          ))}
          <p className="home-muted">All times in your local timezone. Connect your iCal timetable in Calendar settings.</p>
        </section>

        <section aria-labelledby="home-favourites">
          <div className="home-section-heading">
            <h2 id="home-favourites">Your favourites</h2>
            <Link to="/quick-links">All links <span aria-hidden="true">→</span></Link>
          </div>
          <div className="home-favourites">
            {favouriteServices.map((service) => (
              <ServiceCard service={service} favourite key={service.id} />
            ))}
          </div>
          {favouritesLoading && <p className="home-muted" role="status">Loading favourites…</p>}
          {favouritesError && <p className="home-schedule-error" role="alert">{favouritesError}</p>}
          {!favouritesLoading && !favouritesError && favouriteServices.length === 0 && <p className="home-muted">No favourites yet. Choose up to four in <Link to="/quick-links">Quick links</Link>.</p>}
        </section>
      </div>

      <section className="home-radar" aria-labelledby="home-radar-title">
        <h2 id="home-radar-title">Keep on your radar</h2>
        <div className="home-radar-grid">
          {nextDeadline && (
            <a className="home-card home-radar-card" href={nextDeadline.url} target="_blank" rel="noopener noreferrer">
              <span className="home-tag home-tag--yellow">Due tomorrow · Demo</span>
              <strong>{nextDeadline.summary}</strong>
              <p>{nextDeadline.start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · {nextDeadline.start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · Open Moodle</p>
            </a>
          )}
          <Link className="home-card home-radar-card" to="/calendar">
            <span className="home-tag home-tag--green">Campus event · Demo</span>
            <strong>{campusEvent ? campusEvent.summary : 'Explore campus events'}</strong>
            <p>{campusEvent ? `${campusEvent.start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${campusEvent.location}` : 'See upcoming DevSoc events in Calendar'}</p>
          </Link>
          <a className="home-card home-radar-card" href="https://www.unsw.edu.au/student/support" target="_blank" rel="noopener noreferrer">
            <span className="home-tag home-tag--purple">Study support</span>
            <strong>A little help goes a long way</strong>
            <p>Book a learning adviser or explore wellbeing support</p>
          </a>
        </div>
      </section>

    </div>
  )
}

export default Home