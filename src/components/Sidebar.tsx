import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import myunswLogo from '../assets/myunsw.png'
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

function Sidebar() {
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
          to="/settings"
          className={({ isActive }) =>
            `sidebar-user${isActive ? ' active' : ''}`
          }
        >
          <div className="sidebar-user-details">
            <span className="sidebar-avatar" aria-hidden="true">K</span>
            <div>
              <span className="sidebar-user-name">Kevin</span>
              <span className="sidebar-profile-link">
                View profile <span aria-hidden="true">&rarr;</span>
              </span>
            </div>
          </div>
          <span className="sidebar-role">Student</span>
        </NavLink>
      </div>
    </aside>
  )
}

export default Sidebar
