import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

let server
let helpers
let services
let QuickLinks
let Home
let users

before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  helpers = await server.ssrLoadModule('/src/data/favourites.ts')
  services = await server.ssrLoadModule('/src/data/services.ts')
  ;({ default: QuickLinks } = await server.ssrLoadModule('/src/pages/QuickLinks.tsx'))
  ;({ default: Home } = await server.ssrLoadModule('/src/pages/Home.tsx'))
  ;({ users } = await server.ssrLoadModule('/src/data/users.ts'))
})

after(async () => { await server?.close() })

function render(component) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, component))
}

test('favourites persist per user and accept zero through four selections', () => {
  const saved = new Map()
  const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) }
  assert.deepEqual(helpers.readFavourites(users[0].id, storage), helpers.DEFAULT_FAVOURITES)
  for (let count = 0; count <= 4; count++) {
    const ids = services.quickLinkServices.slice(0, count).map(service => service.id)
    helpers.saveFavourites(users[0].id, ids, storage)
    assert.deepEqual(helpers.readFavourites(users[0].id, storage), ids)
  }
  helpers.saveFavourites(users[1].id, ['map'], storage)
  assert.deepEqual(helpers.readFavourites(users[1].id, storage), ['map'])
  assert.equal(helpers.readFavourites(users[0].id, storage).length, 4)
  const before = new Map(saved)
  for (const invalid of [['moodle', 'moodle'], ['unknown'], services.quickLinkServices.slice(0, 5).map(service => service.id)]) {
    assert.throws(() => helpers.saveFavourites(users[0].id, invalid, storage), /up to four unique/)
  }
  assert.deepEqual(saved, before)
  storage.setItem(`serviceunsw-favourites-${users[0].id}`, 'invalid JSON')
  assert.throws(() => helpers.readFavourites(users[0].id, storage))
})

test('configured Quick links open their URLs and other cards remain disabled', () => {
  const markup = render(createElement(QuickLinks, { user: users[0], favourites: { ids: helpers.DEFAULT_FAVOURITES, error: '', save() {} } }))
  assert.equal((markup.match(/class="service-card" aria-disabled="true"/g) ?? []).length, 6)
  assert.equal((markup.match(/<a class="service-card"/g) ?? []).length, 6)
  assert.ok(markup.includes('href="https://www.unsw.edu.au/myit" target="_blank" rel="noopener noreferrer"'))
  assert.ok(markup.includes('href="https://www.unsw.edu.au/student/support" target="_blank" rel="noopener noreferrer"'))
  assert.ok(markup.includes('href="https://www.unsw.edu.au/course-outlines" target="_blank" rel="noopener noreferrer"'))
  assert.ok(markup.includes('href="https://www.library.unsw.edu.au/" target="_blank" rel="noopener noreferrer"'))
  assert.ok(markup.includes('href="https://moodle.telt.unsw.edu.au/" target="_blank" rel="noopener noreferrer"'))
  assert.ok(markup.includes('href="https://my.unsw.edu.au/portal/portal/student.xml" target="_blank" rel="noopener noreferrer"'))
  for (const group of services.serviceGroups) assert.ok(markup.includes(group.name.replace('&', '&amp;')))
  assert.ok(markup.includes('Manage favourites'))
})

test('Home renders exactly the selected favourites and supports an empty selection', () => {
  const calendar = { today: new Date(2026, 9, 13), events: [], loading: false, error: null }
  for (const ids of [[], ['map'], ['myunsw'], ['catalogue'], ['wellbeing'], ['it'], ['library', 'recordings', 'email', 'moodle']]) {
    const markup = render(createElement(Home, { user: users[0], calendar, favourites: { ids, error: '' } }))
    const section = markup.split('aria-labelledby="home-favourites"')[1].split('</section>')[0]
    assert.equal((section.match(/class="service-card"/g) ?? []).length, ids.length)
    assert.equal((section.match(/class="service-card" aria-disabled="true"/g) ?? []).length, ids.filter(id => !services.quickLinkServices.find(service => service.id === id).url).length)
    if (ids.includes('moodle')) assert.ok(section.includes('href="https://moodle.telt.unsw.edu.au/" target="_blank" rel="noopener noreferrer"'))
    if (ids.includes('myunsw')) assert.ok(section.includes('href="https://my.unsw.edu.au/portal/portal/student.xml" target="_blank" rel="noopener noreferrer"'))
    if (!ids.some(id => services.quickLinkServices.find(service => service.id === id).url)) assert.ok(!section.includes('target="_blank"'))
    if (ids.includes('catalogue')) assert.ok(section.includes('href="https://www.unsw.edu.au/course-outlines" target="_blank" rel="noopener noreferrer"'))
    if (ids.includes('wellbeing')) assert.ok(section.includes('href="https://www.unsw.edu.au/student/support" target="_blank" rel="noopener noreferrer"'))
    if (ids.includes('it')) assert.ok(section.includes('href="https://www.unsw.edu.au/myit" target="_blank" rel="noopener noreferrer"'))
    assert.ok(!section.includes('Coming soon'))
    for (const id of ids) {
      const service = services.quickLinkServices.find(service => service.id === id)
      assert.ok(section.includes(service.name))
    }
    if (ids.length === 0) assert.ok(section.includes('No favourites yet'))
    if (ids.includes('library')) assert.ok(section.includes('href="https://www.library.unsw.edu.au/" target="_blank" rel="noopener noreferrer"'))
    if (ids.includes('email')) assert.ok(section.includes('aria-disabled="true"'))
  }
})

test('Manage favourites enforces four selections and only commits on Save', () => {
  const require = createRequire(import.meta.url)
  const values = []
  let index = 0
  let saved
  let closed = false
  const react = {
    useState(initial) {
      const slot = index++
      if (!(slot in values)) values[slot] = typeof initial === 'function' ? initial() : initial
      return [values[slot], value => { values[slot] = typeof value === 'function' ? value(values[slot]) : value }]
    },
    useEffect() {},
    useRef: () => ({ current: null }),
  }
  const exports = {}
  const source = ts.transpileModule(readFileSync('src/pages/QuickLinks.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 },
  }).outputText
  const imports = { react, '../data/favourites': helpers, '../data/services': services, './QuickLinks.css': {}, '../components/ServiceIcon': { default: () => null }, '../components/ServiceCard': { default: () => null } }
  vm.runInNewContext(source, { exports, require: name => name in imports ? imports[name] : require(name) })
  function elements(node) {
    if (!node || typeof node !== 'object') return []
    if (Array.isArray(node)) return node.flatMap(elements)
    return node.props ? [node, ...elements(node.props.children)] : []
  }
  function text(node) {
    if (Array.isArray(node)) return node.map(text).join('')
    return node && typeof node === 'object' ? text(node.props?.children) : node == null ? '' : String(node)
  }
  const state = { ids: [...helpers.DEFAULT_FAVOURITES], error: '', save(ids) { saved = ids; return true } }
  const renderPage = () => { index = 0; return exports.default({ favourites: state, user: users[0] }) }
  let tree = renderPage()
  elements(tree).find(node => node.type === 'button' && text(node).includes('Manage favourites')).props.onClick()
  tree = renderPage()
  const manager = elements(tree).find(node => typeof node.type === 'function' && node.props.onClose)
  const renderManager = () => { index = 3; return manager.type({ favourites: state, onClose: () => { closed = true } }) }
  let dialog = renderManager()
  let checkboxes = elements(dialog).filter(node => node.type === 'input')
  assert.equal(checkboxes.filter(node => node.props.checked).length, 4)
  assert.equal(checkboxes.filter(node => node.props.disabled).length, 8)
  checkboxes[0].props.onChange()
  dialog = renderManager()
  checkboxes = elements(dialog).filter(node => node.type === 'input')
  assert.equal(checkboxes.filter(node => node.props.disabled).length, 0)
  checkboxes[2].props.onChange()
  dialog = renderManager()
  checkboxes = elements(dialog).filter(node => node.type === 'input')
  assert.equal(checkboxes.filter(node => node.props.checked).length, 4)
  assert.equal(saved, undefined)
  elements(dialog).find(node => node.type === 'button' && text(node) === 'Cancel').props.onClick()
  assert.equal(saved, undefined)
  assert.ok(closed)
  closed = false
  elements(dialog).find(node => node.type === 'button' && text(node) === 'Save favourites').props.onClick()
  assert.equal(saved.length, 4)
  assert.ok(saved.includes('recordings'))
  assert.ok(!saved.includes('moodle'))
  assert.ok(closed)
})

test('MyPlan uses the student degree on both pages and migrates old fee favourites', () => {
  const calendar = { today: new Date(2026, 9, 13), events: [], loading: false, error: null }
  const favourites = { ids: ['myplan'], error: '', save() {} }
  const user = { ...users[0], degree: { ...users[0].degree, name: 'Bachelor of Engineering' } }
  for (const component of [
    createElement(QuickLinks, { user, favourites }),
    createElement(Home, { user, favourites, calendar }),
  ]) {
    const markup = render(component)
    assert.ok(markup.includes('Plan your Bachelor of Engineering pathway.'))
    assert.ok(!markup.includes('Fees &amp; payments'))
  }
  const staff = render(createElement(QuickLinks, { user: users[1], favourites }))
  assert.ok(staff.includes('Plan your degree pathway.'))
  assert.ok(!staff.includes('Bachelor of Computer Science pathway'))
  assert.deepEqual(helpers.readFavourites('kevin', { getItem: () => '["fees","moodle"]' }), ['myplan', 'moodle'])
})
