import { roleLabels } from '../data/users'
import type { UserRole } from '../data/users'
import './RoleBadges.css'

function RoleBadges({ roles }: { roles: UserRole[] }) {
  return (
    <div className="role-badges" aria-label="User roles">
      {roles.map((role) => (
        <span className={`role-badge role-badge--${role}`} key={role}>
          {roleLabels[role]}
        </span>
      ))}
    </div>
  )
}

export default RoleBadges
