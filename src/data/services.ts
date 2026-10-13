import type { User } from './users'

export type ServiceIcon = 'book' | 'library' | 'play' | 'search' | 'plan' | 'clipboard' | 'file' | 'mail' | 'map' | 'monitor' | 'heart'
export type ServiceTone = 'blue' | 'green' | 'purple' | 'yellow'

export interface QuickLinkService {
  id: string
  name: string
  description: string
  group: 'study' | 'admin' | 'campus'
  icon: ServiceIcon
  tone: ServiceTone
  url?: string
}

export const serviceGroups = [
  { id: 'study', name: 'Study & learn', description: 'Everything you need for your next class.' },
  { id: 'admin', name: 'Manage your studies', description: 'Stay on top of your degree and student admin.' },
  { id: 'campus', name: 'Campus & support', description: 'Connect with your university community.' },
] as const

export const quickLinkServices: QuickLinkService[] = [
  { id: 'moodle', name: 'Moodle', description: 'Course materials, assessments and feedback.', group: 'study', icon: 'book', tone: 'blue', url: 'https://moodle.telt.unsw.edu.au/' },
  { id: 'library', name: 'Library', description: 'Find books, journals and available study spaces.', group: 'study', icon: 'library', tone: 'purple', url: 'https://www.library.unsw.edu.au/' },
  { id: 'recordings', name: 'Lecture recordings', description: 'Catch up or revisit your recorded classes.', group: 'study', icon: 'play', tone: 'blue' },
  { id: 'catalogue', name: 'Course catalogue', description: 'Explore course outlines and prerequisites.', group: 'study', icon: 'search', tone: 'green', url: 'https://www.unsw.edu.au/course-outlines' },
  { id: 'myunsw', name: 'myUNSW', description: 'Your degree, your pathway and student portal.', group: 'admin', icon: 'plan', tone: 'green', url: 'https://my.unsw.edu.au/portal/portal/student.xml' },
  { id: 'enrolment', name: 'Enrolment', description: 'Manage courses and review your enrolment.', group: 'admin', icon: 'clipboard', tone: 'blue' },
  { id: 'myplan', name: 'myPlan', description: 'Plan your degree pathway.', group: 'admin', icon: 'plan', tone: 'green' },
  { id: 'results', name: 'Results & records', description: 'See your grades and request academic records.', group: 'admin', icon: 'file', tone: 'purple' },
  { id: 'email', name: 'Student email', description: 'Open your inbox and university messages.', group: 'campus', icon: 'mail', tone: 'yellow' },
  { id: 'map', name: 'Campus map', description: 'Find your classroom, building or next coffee.', group: 'campus', icon: 'map', tone: 'green' },
  { id: 'it', name: 'IT help', description: 'Get help with accounts, Wi-Fi and software.', group: 'campus', icon: 'monitor', tone: 'blue', url: 'https://www.unsw.edu.au/myit' },
  { id: 'wellbeing', name: 'Student wellbeing', description: 'Find confidential advice and support services.', group: 'campus', icon: 'heart', tone: 'purple', url: 'https://www.unsw.edu.au/student/support' },
]

export function getServicesForUser(user: User): QuickLinkService[] {
  return quickLinkServices.map((service) =>
    service.id === 'myplan' && user.roles.includes('student') && user.degree
      ? { ...service, description: `Plan your ${user.degree.name} pathway.` }
      : service,
  )
}