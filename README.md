# ServiceUNSW

Hey team, this is a short guide for getting started with this project so you can start developing straight away. It's a React + TypeScript app built with Vite, so if you've used React before this should feel familiar.

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

## Project Structure

```
src/
  App.tsx              # Route definitions
  auth/                # Demo sign-in session helpers
  calendar/            # Shared event parsing, recurrence and state
  components/          # Shared UI components (Sidebar, ...)
  data/                # User, calendar, service and favourites data
  hooks/               # Per-user favourites state
  pages/               # Route pages (Home, Calendar, QuickLinks, Profile, SignIn)
```

The service catalogue contains only the fields used by the shared, currently
disabled service cards. Shared icons are SVG components; the UNSW crest and
site favicon are the remaining image assets.

Routing is handled by [react-router-dom](https://reactrouter.com/). Add new pages under `src/pages/` and register them in [App.tsx](src/App.tsx).

The workspace sidebar links to Home (`/home`), Calendar (`/calendar`), and
Quick links (`/quick-links`). The root URL redirects to Home. The profile card
opens `/profile`, and Help & support opens UNSW student support in a new tab.

### User data

All user records are stored in [src/data/users.ts](src/data/users.ts). Each user
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
`Password` (case-sensitive), stored with their record in `src/data/users.ts`:

| User | zID |
| --- | --- |
| Kevin | z2460811 |
| Alex | z2460812 |
| Jordan | z2460813 |
| Sam | z2460814 |
| Taylor | z2460815 |

Portal routes require sign-in. The selected user's zID is stored in browser
session storage so refreshing the tab keeps the session; the entered password
is never stored there. Sign out on the profile page clears the session and
returns to sign-in. The profile and sidebar update to the selected user's roles.

This is client-side demo authentication only, not a security boundary or a
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

Favourites are stored in this browser separately for each signed-in user and
survive refreshes and sign-out. New users default to Moodle, myUNSW, Library
and Student email. Service cards on both Home and Quick links
share the same appearance, link behaviour and favourite marker. Storage errors
are displayed explicitly. The shared catalogue is in `src/data/services.ts`.
MyPlan replaces Fees & payments and describes the signed-in student's degree
pathway on both pages. Users without a student degree see a generic description.
Existing Fees & payments favourites are migrated to MyPlan.

### Calendar

The calendar includes month navigation, a Today button, a selected-day agenda
and a next-deadline card. My timetable, Deadlines and Campus events can each be
toggled independently. Demo data in [src/data/calendar.ts](src/data/calendar.ts)
includes three assignment deadlines and three illustrative DevSoc events,
dated relative to the day the calendar is opened. These are not actual
university deadlines or scheduled society events.

Settings beside Add event opens the iCal subscription form. HTTP, HTTPS and
webcal links are supported; a blank link disconnects the timetable. Settings
are saved separately for each signed-in user in this browser, and feed errors
are displayed explicitly. Older browser-wide links are not reused because their
owner is unknown; reconnect your link once in your own account.
The existing `/api/ics-proxy` endpoint runs in the Vite development server;
a production deployment needs an equivalent server-side endpoint.
Add event creates personal events shared with Home across page navigation.
They last until you refresh the browser or sign out.
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
