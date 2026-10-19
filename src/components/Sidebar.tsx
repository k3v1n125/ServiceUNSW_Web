import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import myunswLogo from '../assets/myunsw.png'
import { getUserInitials, roleLabels } from '../models/users'
import type { User } from '../models/users'
import RoleBadges from './RoleBadges'
import './Sidebar.css'

function SidebarIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="sidebar-icon"
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

const navigation = [
  {
    to: '/home',
    label: 'Home',
    icon: <path d="m3 10 9-8 9 8v11h-6v-8H9v8H3Z" />,
  },
  {
    to: '/calendar',
    label: 'Calendar',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 2v6m10-6v6M3 11h18M7 15h.01M12 15h.01M17 15h.01M7 18h.01M12 18h.01" />
      </>
    ),
  },
  {
    to: '/quick-links',
    label: 'Quick links',
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
  },
]

const teachingNavigationByRole: { role: 'tutor' | 'professor', items: typeof navigation }[] = [
  {
    role: 'tutor',
    items: [
      {
        to: '/timesheets',
        label: 'Timesheets',
        icon: (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </>
        ),
      },
      {
        to: '/castle',
        label: 'Castle',
        icon: (
          <>
            <path d="M3 20h18M5 20V9h14v11M8 9V5h8v4M9 13v2m6-2v2" />
            <path d="M3 9h18M12 3v2" />
          </>
        ),
      },
    ],
  },
  {
    role: 'professor',
    items: [{
      to: '/lectures',
      label: 'Lectures',
      icon: (
        <>
          <path d="M3 5h18v12H3z" />
          <path d="m8 21 4-4 4 4M8 9h8m-8 4h5" />
        </>
      ),
    }],
  },
]

function Sidebar({ user }: { user: User }) {
  const isProfessorAndTutor = user.roles.includes('professor') && user.roles.includes('tutor')
  const teachingSections = teachingNavigationByRole
    .filter(({ role, items }) => user.roles.includes(role) && items.length > 0)
    .map(({ role, items }) => ({
      role,
      heading: isProfessorAndTutor ? `Teaching - ${roleLabels[role]}` : 'Teaching',
      items,
    }))

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img className="sidebar-brand-logo" src={myunswLogo} alt="UNSW crest" />
        <h1 className="sidebar-title">ServiceUNSW</h1>
      </div>

      <nav className="sidebar-workspace" aria-label="Your workspace">
        <p className="sidebar-section-label">Your workspace</p>
        <ul className="sidebar-nav">
          {navigation.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                <SidebarIcon>{icon}</SidebarIcon>
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        {teachingSections.map(({ role, heading, items }) => (
          <div key={role}>
            <p className="sidebar-section-label sidebar-teaching-label">{heading}</p>
            <ul className="sidebar-nav">
              {items.map(({ to, label, icon }) => (
                <li key={to}>
                  <NavLink to={to} end className={({ isActive }) => (isActive ? 'active' : '')}>
                    <SidebarIcon>{icon}</SidebarIcon>
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <a
          className="sidebar-support"
          href="https://www.student.unsw.edu.au/support"
          target="_blank"
          rel="noopener noreferrer"
        >
          <SidebarIcon>
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01" />
          </SidebarIcon>
          <span>Help &amp; support</span>
        </a>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `sidebar-user${isActive ? ' active' : ''}`
          }
        >
          <div className="sidebar-user-details">
            <span className="sidebar-avatar" aria-hidden="true">
              {getUserInitials(user)}
            </span>
            <div>
              <span className="sidebar-user-name">{user.fullName}</span>
              <span className="sidebar-profile-link">
                View profile <span aria-hidden="true">&rarr;</span>
              </span>
            </div>
          </div>
          <RoleBadges roles={user.roles} />
        </NavLink>
      </div>
    </aside>
  )
}

export default Sidebar
