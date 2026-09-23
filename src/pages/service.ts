import myUnswIcon from '../assets/myunsw.png'
import moodleIcon from '../assets/moodle.webp'
import arcIcon from '../assets/arc.png'
import freeroomsIcon from '../assets/freerooms.png'

export interface ServiceEntry {
  name: string
  description: string
  url: string
  icon: string
}

export const academicServices: ServiceEntry[] = [
  {
    name: 'myUNSW',
    description: 'Enrolment, timetables, results and student portal',
    url: 'https://my.unsw.edu.au/portal/portal/student.xml',
    icon: myUnswIcon,
  },
  {
    name: 'Moodle',
    description: 'Platform for course materials, lecture recordings, and assignments.',
    url: 'https://moodle.telt.unsw.edu.au/',
    icon: moodleIcon,
  },
  {
    name: 'Freerooms',
    description: 'Find available free rooms on campus.',
    url: 'https://freerooms.devsoc.app/',
    icon: freeroomsIcon,
  }
]

export const personalServices: ServiceEntry[] = [
    {
        name: 'Arc',
        description: 'UNSW student life and clubs platform.',
        url: 'https://www.arc.unsw.edu.au/',
        icon: arcIcon,
    }
]