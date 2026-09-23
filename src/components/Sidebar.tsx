import { NavLink } from 'react-router-dom'
import './Sidebar.css'

function Sidebar() {
  return (
    <nav className="sidebar">
      <h1 className="sidebar-title">Service</h1>
      <ul className="sidebar-nav">
        <li>
          <NavLink
            to="/student"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Student
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/staff"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Staff
          </NavLink>
        </li>
      </ul>
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `sidebar-user${isActive ? ' active' : ''}`
        }
      >
        <svg
          className="sidebar-user-icon"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.76-3.58-5-8-5Z" />
        </svg>
        <span className="sidebar-user-name">Kevin</span>
      </NavLink>
    </nav>
  )
}

export default Sidebar
