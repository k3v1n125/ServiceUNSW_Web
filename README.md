# ServiceUNSW

This a React + TypeScript app built with Vite, so if you've used React before this should feel familiar.

## Prerequisites

Before getting started, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (LTS version recommended)
- npm (comes with Node.js)

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

## Running the App

Start the local development server:

```bash
npm run dev
```

This prints a local URL (usually `http://localhost:5173`) — open it in your browser. The dev server supports Hot Module Reloading, so most changes show up instantly without a full page refresh.

## Available Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check with `tsc` and produce a production build in `dist/`
- `npm run preview` — locally preview the production build
- `npm run lint` — run Oxlint over the codebase

## Mock database

The app never reads data files directly. Pages call a simulated API
(`/api/auth/sign-in` and `/api/users/:userId/...`) served by
[server/mockApi.ts](server/mockApi.ts) inside the Vite dev and preview servers.

- `server/seed/` — committed starting data (users, services, lecture schedule,
  demo calendar events, timesheet settings, starting teaching notes and
  timesheet entries, and empty user tables).
- `.mockdb/` — the local mock database the API reads and writes. It is
  git-ignored because it changes as each person tests the app. On server
  start, any missing table is copied from `server/seed/`; existing data is
  never overwritten.

To reset your local data, stop the server and delete `.mockdb/`. To change the
starting data for everyone, edit `server/seed/`; existing `.mockdb/` folders
keep their current files until deleted. A static build without the Vite server
has no API.

## Project Structure

```
server/
  mockApi.ts           # Simulated API backed by the local mock database
  seed/                # Committed starting data for the mock database
src/
  App.tsx              # Route definitions
  api/                 # Client functions for the simulated API
  auth/                # Demo sign-in session helpers
  calendar/            # Shared event parsing, recurrence and state
  components/          # Shared UI components (Sidebar, ...)
  hooks/               # API-backed state (favourites, services, lectures, timesheets)
  models/              # Shared types and helpers
  pages/               # Route pages (Home, Calendar, QuickLinks, Lectures, Timesheets, Profile, SignIn)
```

The service catalogue contains only the fields used by the shared, currently
disabled service cards. Shared icons are SVG components; the UNSW crest and
site favicon are the remaining image assets.

Routing is handled by [react-router-dom](https://reactrouter.com/). Add new pages under `src/pages/` and register them in [App.tsx](src/App.tsx).

The workspace sidebar links to Home (`/home`), Calendar (`/calendar`), and
Quick links (`/quick-links`). The root URL redirects to Home. The profile card
opens `/profile`, and Help & support opens UNSW student support in a new tab.
Teaching staff also see a Teaching section. Users who are both a tutor and a
professor see "Teaching - Tutor" first, followed by "Teaching - Professor".

### User data

User records are seeded from [server/seed/users.json](server/seed/users.json). Each user
has an ID, a name, and a roles array supporting `student`, `tutor`, and
`professor`. The five sample users are Kevin (student), Alex (tutor), Jordan
(professor), Sam (tutor and professor), and Taylor (tutor and student).
The sidebar and profile read the currently signed-in user.
These are fictional sample profiles, including contact details, degree progress
and teaching appointments; they are not connected to university records.

### Profile page

The profile page at `/profile` shows university identity, personal details,
role-specific access, degree progress for students and teaching appointments
for teaching staff. Multiple roles are shown together in the profile and sidebar.
The layout adapts to smaller screens. The degree portal link opens myUNSW in a
new tab. The profile page is read-only and has a Sign out button.
Teaching tool names describe role access; those tools are not yet implemented
in this workspace.

### Demo sign-in

The `/sign-in` page requires a test zID and zPass. Every sample user's zPass is
`Password` (case-sensitive), stored with their record in the mock database:

| User | zID | Type |
| --- | --- | --- |
| Kevin | z2460811 | Student |
| Alex | z2460812 | Tutor |
| Jordan | z2460813 | Professor |
| Sam | z2460814 | Tutor, Professor |
| Taylor | z2460815 | Tutor, Student |

Portal routes require sign-in. The mock API checks the zID and zPass and never
returns the password. The signed-in user's ID is stored in browser session
storage so refreshing the tab keeps the session; the entered password is never
stored there. Sign out on the profile page clears the session and
returns to sign-in. The profile and sidebar update to the selected user's roles.

This is demo authentication only, not a security boundary or a
connection to UNSW authentication. Test passwords are public fixtures; never
enter real credentials. Production authentication requires a trusted backend
or university identity provider.

### Home

The home page greets the signed-in user and shows today's date, schedule
and radar cards. Home and Calendar share imported iCal, personal and demo events.
Today's schedule includes every event occurring today, including recurring
classes, all-day events, deadlines and campus events, sorted by time with
all-day events first. Calendar display filters do not hide events from Home.
Timetable loading and import errors are shown on both pages.
Run `node --test tests/calendar.test.mjs` for the shared schedule regression tests.
Home favourites use the same service cards and link behaviour as Quick links.
Study support opens `https://www.unsw.edu.au/student/support` in a new tab.

### Quick links and favourites

Quick links lists 12 services grouped into Study & learn, Manage your studies
and Campus & support, with search and All services / Favourites filters.
Moodle opens `https://moodle.telt.unsw.edu.au/` in a new tab on
both Quick links and Home. myUNSW opens
`https://my.unsw.edu.au/portal/portal/student.xml` in a new tab on both pages.
Other service cards remain non-interactive.
Library also opens `https://www.library.unsw.edu.au/` in a new tab on both pages.
Course catalogue opens `https://www.unsw.edu.au/course-outlines` in a new tab on
both pages.
Student wellbeing opens `https://www.unsw.edu.au/student/support` in a new tab
on both pages.
IT help opens `https://www.unsw.edu.au/myit` in a new tab on both pages.
Manage favourites opens a
selection dialog. Choose zero to four services and save to update Home.
Cancel leaves the saved selection unchanged. At four selections, deselect a
service before choosing another.

Favourites are saved in the mock database separately for each signed-in user
and survive refreshes and sign-out. New users default to Moodle, myUNSW, Library
and Student email. Service cards on both Home and Quick links
share the same appearance, link behaviour and favourite marker. Storage errors
are displayed explicitly. The shared catalogue is seeded from `server/seed/services.json`.
MyPlan replaces Fees & payments and describes the signed-in student's degree
pathway on both pages. Users without a student degree see a generic description.
Existing Fees & payments favourites are migrated to MyPlan.

### Lectures

Professors see a Lectures page under Teaching in the sidebar. It lists two
lectures per week for each professor course between 26 October and 20 November
2026, based on [server/seed/lectureSchedule.json](server/seed/lectureSchedule.json).
Each lecture has a preparation checklist: no items is Not planned, unchecked
items is Planned, some checked is In progress and all checked is Ready.
Checklists and each professor's teaching note are saved in the mock database.

### Timesheets

Tutors see a Timesheets page under Teaching in the sidebar for recording and
submitting teaching hours. Hours are grouped into fortnightly reporting periods
configured in [server/seed/timesheetSettings.json](server/seed/timesheetSettings.json);
the current and previous periods are open and older periods are read-only.
In the **Record hours** form, a tutor can submit an entry for approval
directly or save it as a draft. Drafts can be opened with the pen button in
Your entries to edit, delete or submit them; submitted entries are read-only.
The API rejects future dates, closed periods, courses the tutor does
not teach and overlapping times. **Export CSV** downloads the selected period.

### Calendar

The calendar includes month navigation, a Today button, a selected-day agenda
and a next-deadline card. My timetable, Deadlines and Campus events can each be
toggled independently. Professors also see their lecture sessions under a
Lectures filter. Demo data in
[server/seed/demoCalendarEvents.json](server/seed/demoCalendarEvents.json)
includes three assignment deadlines and three illustrative DevSoc events,
dated relative to the day the calendar is opened. These are not actual
university deadlines or scheduled society events.

Settings beside Add event opens the iCal subscription form. HTTP, HTTPS and
webcal links are supported; a blank link disconnects the timetable. Settings
are saved in the mock database separately for each signed-in user, and feed
errors are displayed explicitly.
The existing `/api/ics-proxy` endpoint runs in the Vite development server;
a production deployment needs an equivalent server-side endpoint.
Add event creates personal events shared with Home. They are saved in the mock
database for the signed-in user.
Click a day number to view its agenda or an event to view its details.
Event details open in an adjacent non-modal card: to the right on Monday
through Wednesday and to the left on Thursday through Sunday. On small screens
the card stays within the viewport. Close it with its close button, Escape or
an outside click; scrolling or resizing dismisses it. Settings and Add event
still use dialogs.

## Resources

- [React documentation](https://react.dev/)
- [Vite documentation](https://vite.dev/)
- [React Router documentation](https://reactrouter.com/)
