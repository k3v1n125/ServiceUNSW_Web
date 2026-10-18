export type UserRole = 'student' | 'tutor' | 'professor'

export interface User {
  id: string
  name: string
  fullName: string
  email: string
  universityId: string
  school: string
  roles: UserRole[]
  degree?: {
    name: string
    studyStage: string
    currentTerm: string
    completedUoc: number
    requiredUoc: number
  }
  teachingAppointments: {
    courseCode: string
    courseName: string
    role: 'tutor' | 'professor'
    term: string
    coordinator: string
  }[]
}

export const roleLabels: Record<UserRole, string> = {
  student: 'Student',
  tutor: 'Tutor',
  professor: 'Professor',
}

export function getUserInitials(user: User): string {
  return user.fullName.split(' ').map((part) => part.charAt(0)).join('')
}

export function getUserTitle(user: User): string {
  return user.roles.map((role) => roleLabels[role]).join(' & ')
}
