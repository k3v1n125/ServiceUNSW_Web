export type UserRole = 'student' | 'tutor' | 'professor'

export interface User {
  id: string
  name: string
  fullName: string
  email: string
  universityId: string
  zPass: string
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

export const users: User[] = [
  {
    id: 'kevin',
    name: 'Kevin',
    fullName: 'Kevin Wang',
    email: 'z2460811@ad.unsw.edu.au',
    universityId: 'z2460811',
    zPass: 'Password',
    school: 'School of Computer Science and Engineering',
    roles: ['student'],
    degree: {
      name: 'Bachelor of Computer Science',
      studyStage: 'Year 2 · Full-time',
      currentTerm: 'Term 3, 2026',
      completedUoc: 72,
      requiredUoc: 144,
    },
    teachingAppointments: [],
  },
  {
    id: 'alex',
    name: 'Alex',
    fullName: 'Alex Morgan',
    email: 'z2460812@ad.unsw.edu.au',
    universityId: 'z2460812',
    zPass: 'Password',
    school: 'School of Computer Science and Engineering',
    roles: ['tutor'],
    teachingAppointments: [
      {
        courseCode: 'COMP1511',
        courseName: 'Programming Fundamentals',
        role: 'tutor',
        term: 'Term 3, 2026',
        coordinator: 'Dr Jamie Chen',
      },
    ],
  },
  {
    id: 'jordan',
    name: 'Jordan',
    fullName: 'Jordan Lee',
    email: 'z2460813@ad.unsw.edu.au',
    universityId: 'z2460813',
    zPass: 'Password',
    school: 'School of Computer Science and Engineering',
    roles: ['professor'],
    teachingAppointments: [
      {
        courseCode: 'COMP2521',
        courseName: 'Data Structures and Algorithms',
        role: 'professor',
        term: 'Term 3, 2026',
        coordinator: 'Professor Jordan Lee',
      },
    ],
  },
  {
    id: 'sam',
    name: 'Sam',
    fullName: 'Sam Patel',
    email: 'z2460814@ad.unsw.edu.au',
    universityId: 'z2460814',
    zPass: 'Password',
    school: 'School of Computer Science and Engineering',
    roles: ['tutor', 'professor'],
    teachingAppointments: [
      {
        courseCode: 'COMP1511',
        courseName: 'Programming Fundamentals',
        role: 'tutor',
        term: 'Term 3, 2026',
        coordinator: 'Dr Jamie Chen',
      },
      {
        courseCode: 'COMP1531',
        courseName: 'Software Engineering Fundamentals',
        role: 'professor',
        term: 'Term 3, 2026',
        coordinator: 'Professor Sam Patel',
      },
    ],
  },
  {
    id: 'taylor',
    name: 'Taylor',
    fullName: 'Taylor Nguyen',
    email: 'z2460815@ad.unsw.edu.au',
    universityId: 'z2460815',
    zPass: 'Password',
    school: 'School of Psychology',
    roles: ['tutor', 'student'],
    degree: {
      name: 'Bachelor of Psychological Science',
      studyStage: 'Year 2 · Full-time',
      currentTerm: 'Term 3, 2026',
      completedUoc: 72,
      requiredUoc: 144,
    },
    teachingAppointments: [
      {
        courseCode: 'COMP1511',
        courseName: 'Programming Fundamentals',
        role: 'tutor',
        term: 'Term 3, 2026',
        coordinator: 'Dr Jamie Chen',
      },
    ],
  },
]
