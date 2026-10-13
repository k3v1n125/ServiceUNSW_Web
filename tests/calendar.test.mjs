import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

let server
let parseIcs
let getDayOccurrences
let Home
let Calendar
let users
let getEventDetailsPosition

before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ parseIcs, getDayOccurrences } = await server.ssrLoadModule('/src/calendar/events.ts'))
  ;({ default: Home } = await server.ssrLoadModule('/src/pages/Home.tsx'))
  ;({ default: Calendar } = await server.ssrLoadModule('/src/pages/Calendar.tsx'))
  ;({ users } = await server.ssrLoadModule('/src/data/users.ts'))
  ;({ getEventDetailsPosition } = await server.ssrLoadModule('/src/calendar/eventDetailsPosition.ts'))
})

after(async () => { await server?.close() })

const today = new Date(2026, 9, 13, 12)
const feed = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:lecture
SUMMARY:COMP1511 Lecture
LOCATION:Lecture theatre
DTSTART:20261006T090000
DTEND:20261006T100000
RRULE:FREQ=WEEKLY;COUNT=4
EXDATE:20261020T090000
END:VEVENT
BEGIN:VEVENT
UID:all-day
SUMMARY:All-day study
DTSTART;VALUE=DATE:20261013
DTEND;VALUE=DATE:20261014
END:VEVENT
BEGIN:VEVENT
UID:overnight
SUMMARY:Overnight hackathon
DTSTART:20261012T220000
DTEND:20261013T020000
END:VEVENT
END:VCALENDAR`

function event(uid, category, hour) {
  return {
    uid, summary: uid, category, allDay: false, exdates: [],
    start: new Date(2026, 9, 13, hour),
  }
}

function data(events, overrides = {}) {
  return {
    today, events, icsUrl: 'https://example.com/timetable.ics',
    loading: false, error: null, saveIcsUrl() {}, addPersonalEvent() {},
    ...overrides,
  }
}

function render(component) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, component))
}

const favourites = { ids: ['moodle', 'myunsw', 'library', 'email'], error: '', save() { return true } }

test('today includes all categories, recurring classes, all-day and overlapping events', () => {
  const events = [
    ...parseIcs(feed), event('Personal study', 'personal', 15),
    event('Assignment due', 'deadline', 17), event('DevSoc workshop', 'campus', 18),
  ]
  const occurrences = getDayOccurrences(events, today)
  assert.deepEqual(occurrences.map(({ event }) => event.uid), [
    'all-day', 'overnight', 'lecture', 'Personal study', 'Assignment due', 'DevSoc workshop',
  ])
  const lecture = occurrences.find(({ event }) => event.uid === 'lecture')
  assert.equal(lecture.occurrenceStart.getDate(), 13)
  assert.equal(lecture.occurrenceEnd.getDate(), 13)
  assert.equal(lecture.occurrenceEnd.getHours(), 10)
  assert.equal(getDayOccurrences(events, new Date(2026, 9, 20)).length, 0)
  assert.equal(getDayOccurrences(events, new Date(2026, 9, 14)).length, 0)
})

test('home and calendar render the same shared events without marking real events as demo', () => {
  const events = [
    ...parseIcs(feed), event('Personal study', 'personal', 15),
    event('Assignment due', 'deadline', 17), event('DevSoc workshop', 'campus', 18),
  ]
  const calendar = data(events)
  for (const user of users) {
    const markup = render(createElement(Home, { user, calendar, favourites }))
    assert.ok(markup.includes('6 events today'))
    assert.ok(!markup.includes('View calendar'))
    for (const entry of events) assert.ok(markup.includes(entry.summary))
    assert.ok(markup.includes('All day'))
    assert.ok(markup.includes('>10:00<'))
    assert.ok(!markup.includes('Demo events only'))
    const schedule = markup.split('id="today-schedule"')[1].split('</section>')[0]
    assert.ok(!schedule.includes('· Demo'))
    assert.equal((schedule.match(/<div class="home-schedule-event"/g) ?? []).length, 6)
    assert.ok(!schedule.includes('<a class="home-schedule-event"'))
    assert.ok(!schedule.includes('<a href="/calendar" class="home-schedule-event"'))
    assert.ok(schedule.includes('Full calendar'))
  }
  const markup = render(createElement(Calendar, { calendar }))
  for (const entry of events) assert.ok(markup.includes(entry.summary))
  assert.equal((markup.match(/<div class="calendar-agenda-event"/g) ?? []).length, 6)
  assert.ok(!markup.includes('<button type="button" class="calendar-agenda-event"'))
})

test('home shows loading, errors and empty schedules explicitly', () => {
  const props = { user: users[0], favourites }
  assert.ok(render(createElement(Home, { ...props, calendar: data([]) })).includes('No events scheduled for today'))
  assert.ok(render(createElement(Home, { ...props, calendar: data([], { loading: true }) })).includes('Loading timetable events'))
  const markup = render(createElement(Home, { ...props, calendar: data([], { error: 'Failed to load calendar (502)' }) }))
  assert.ok(markup.includes('role="alert"'))
  assert.ok(markup.includes('Failed to load calendar (502)'))
})

test('day boundaries include late events but exclude the next midnight', () => {
  const late = event('Late deadline', 'deadline', 23)
  late.start.setMinutes(59, 59, 999)
  const nextDay = { ...late, uid: 'Tomorrow', start: new Date(2026, 9, 14) }
  assert.deepEqual(getDayOccurrences([late, nextDay], today).map(({ event }) => event.uid), ['Late deadline'])
  assert.throws(() => parseIcs('<html>Not a calendar</html>'), /valid iCal/)
})

test('event details appear right for Monday–Wednesday and left for Thursday–Sunday', () => {
  const anchor = { left: 500, right: 600, top: 200 }
  const viewport = { width: 1400, height: 900 }
  for (let weekday = 0; weekday < 7; weekday++) {
    const position = getEventDetailsPosition(weekday, anchor, viewport, 250)
    const right = weekday >= 1 && weekday <= 3
    assert.equal(position.side, right ? 'right' : 'left')
    assert.equal(position.left, right ? 612 : 108)
    assert.equal(position.top, 200)
  }
  const small = getEventDetailsPosition(1, { left: 250, right: 300, top: 650 }, { width: 320, height: 700 }, 250)
  assert.equal(small.width, 296)
  assert.equal(small.left, 12)
  assert.equal(small.top, 438)
})
