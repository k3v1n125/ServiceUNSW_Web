import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'

test('iCal links are isolated per account, restored on sign-in and disconnected independently', () => {
  const saved = new Map([['calendar-ical-url', 'https://example.com/legacy.ics']])
  const storage = {
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  }
  const source = ts.transpileModule(readFileSync('src/calendar/useCalendarData.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText
  function signIn(userId) {
    const states = []
    let cursor = 0
    const exports = {}
    const react = {
      useState(initial) {
        const slot = cursor++
        if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial
        return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value }]
      },
      useMemo: callback => callback(),
      useEffect() {},
    }
    const imports = { react, '../data/calendar': { createDemoEvents: () => [] }, './events': {} }
    vm.runInNewContext(source, {
      exports, Date, console, localStorage: storage,
      require: name => imports[name],
    })
    return () => { cursor = 0; return exports.useCalendarData(userId) }
  }
  const kevin = signIn('kevin')
  assert.equal(kevin().icsUrl, '')
  kevin().saveIcsUrl('https://example.com/kevin.ics')
  assert.equal(kevin().icsUrl, 'https://example.com/kevin.ics')
  const alex = signIn('alex')
  assert.equal(alex().icsUrl, '')
  alex().saveIcsUrl('https://example.com/alex.ics')
  assert.equal(alex().icsUrl, 'https://example.com/alex.ics')
  assert.equal(signIn('kevin')().icsUrl, 'https://example.com/kevin.ics')
  assert.equal(signIn('alex')().icsUrl, 'https://example.com/alex.ics')
  alex().saveIcsUrl('')
  assert.equal(signIn('alex')().icsUrl, '')
  assert.equal(signIn('kevin')().icsUrl, 'https://example.com/kevin.ics')
  assert.equal(signIn('jordan')().icsUrl, '')
  assert.equal(saved.get('calendar-ical-url'), 'https://example.com/legacy.ics')
})
