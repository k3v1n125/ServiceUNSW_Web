import type { ServiceIcon as IconName, ServiceTone } from '../models/services'
import './ServiceIcon.css'

const paths: Record<IconName, string> = {
  book: 'M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z',
  library: 'M4 4v16M8 4v16M12 4v16m4-16 4 15M3 20h18',
  play: 'm7 3 14 9-14 9Z',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
  plan: 'M15 5H7a3.5 3.5 0 0 0 0 7h10a3.5 3.5 0 0 1 0 7H9M21 5a3 3 0 1 1-6 0 3 3 0 1 1 6 0M9 19a3 3 0 1 1-6 0 3 3 0 1 1 6 0',
  clipboard: 'M8 4H5v17h14V4h-3M8 2h8v4H8ZM8 10h8M8 14h8M8 18h4',
  file: 'M5 2h9l5 5v15H5ZM14 2v6h5M8 12h8M8 16h8',
  mail: 'M3 5h18v14H3Zm0 1 9 7 9-7',
  map: 'm3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3Zm6-3v17m6-14v17',
  monitor: 'M3 3h18v14H3Zm9 14v4m-4 0h8',
  heart: 'M12 21 3 12C-3 4 7-1 12 6c5-7 15-2 9 6Z',
}

function ServiceIcon({ icon, tone }: { icon: IconName; tone: ServiceTone }) {
  return (
    <span className={`service-icon service-icon--${tone}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={paths[icon]} />
      </svg>
    </span>
  )
}

export default ServiceIcon
