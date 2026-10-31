import { db } from './firebase.js'
import { collection, query, where, onSnapshot, doc, setDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

const $ = (id) => document.getElementById(id)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const pad = (n) => String(n).padStart(2, '0')
const key = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e }

let view = new Date(); view.setDate(1)
let shows = []
let unsub = null
let unsubUp = null
let signedIn = false
let editingId = null
let selected = ''

window.addEventListener('admin-state', (e) => {
  signedIn = e.detail.ok
  if (unsub) { unsub(); unsub = null }
  if (unsubUp) { unsubUp(); unsubUp = null }
  $('calLive').classList.remove('on')
  if (signedIn) subscribe(); else draw()
})

// grid starts on the Monday on or before the 1st and covers 6 weeks
function gridStart() { const d = new Date(view.getFullYear(), view.getMonth(), 1); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off); return d }

function subscribe() {
  if (unsub) unsub()
  const start = gridStart(); const end = new Date(start); end.setDate(end.getDate() + 41)
  unsub = onSnapshot(query(collection(db, 'shows'), where('date', '>=', key(start)), where('date', '<=', key(end))),
    (snap) => { shows = snap.docs.map((d) => ({ id: d.id, ...d.data() })); $('calLive').classList.add('on'); draw() },
    () => { $('calLive').classList.remove('on') })
  // upcoming list (next 60 days from today); one listener only
  if (unsubUp) return
  const t = new Date(); const t2 = new Date(); t2.setDate(t2.getDate() + 60)
  unsubUp = onSnapshot(query(collection(db, 'shows'), where('date', '>=', key(t)), where('date', '<=', key(t2))), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')))
    const box = $('calUpcoming'); box.innerHTML = ''
    if (!list.length) box.append(el('p', 'text-stone-400 text-sm', 'No shows in the next 60 days.'))
    list.forEach((s) => {
      const d = parse(s.date)
      const b = el('button', 'cal-up'); b.type = 'button'
      b.append(el('b', '', DOW[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) + (s.start ? ' · ' + s.start : '')), el('span', '', s.title + (s.venue ? ' – ' + s.venue : '')))
      b.addEventListener('click', () => { view = new Date(d.getFullYear(), d.getMonth(), 1); subscribe(); openForm(s) })
      box.append(b)
    })
  })
}

function draw() {
  $('calTitle').textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear()
  const g = $('calGrid'); g.innerHTML = ''
  DOW.forEach((d) => g.append(el('div', 'cal-dow', d)))
  const start = gridStart(); const today = key(new Date())
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i)
    const k = key(d)
    const cell = el('div', 'cal-cell' + (d.getMonth() !== view.getMonth() ? ' out' : '') + (k === today ? ' today' : '') + (k === selected ? ' sel' : ''))
    cell.tabIndex = 0; cell.setAttribute('role', 'button'); cell.setAttribute('aria-label', 'Add show on ' + k)
    const num = el('div', 'cal-num'); num.append(el('span', '', String(d.getDate())), el('span', '', '+'))
    cell.append(num)
    const list = shows.filter((s) => s.date === k).sort((a, b) => (a.start || '').localeCompare(b.start || ''))
    list.slice(0, 3).forEach((s) => {
      const c = el('button', 'cal-chip', (s.start ? s.start + ' ' : '') + s.title); c.type = 'button'; c.title = s.title
      c.addEventListener('click', (ev) => { ev.stopPropagation(); openForm(s) })
      cell.append(c)
    })
    if (list.length > 3) cell.append(el('span', 'cal-more', '+' + (list.length - 3) + ' more'))
    const add = () => openForm({ date: k })
    cell.addEventListener('click', add)
    cell.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); add() } })
    g.append(cell)
  }
}

function openForm(s) {
  editingId = s.id || null
  selected = s.date || ''
  $('shTitle').value = s.title || ''; $('shDate').value = s.date || ''; $('shCity').value = s.city || ''
  $('shStart').value = s.start || ''; $('shEnd').value = s.end || ''; $('shVenue').value = s.venue || ''
  $('shNote').value = s.note || ''; $('shLink').value = s.link || ''
  $('shDelete').hidden = !editingId
  $('shSave').textContent = editingId ? 'Save changes' : 'Add show'
  $('calForm').hidden = false
  $('shMsg').textContent = ''
  draw()
  $('calForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  $('shTitle').focus()
}
function closeForm() { $('calForm').hidden = true; editingId = null; selected = ''; draw() }

$('calForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const data = {
    title: $('shTitle').value.trim(), date: $('shDate').value, city: $('shCity').value.trim(), start: $('shStart').value,
    end: $('shEnd').value, venue: $('shVenue').value.trim(), note: $('shNote').value.trim(), link: $('shLink').value.trim(),
  }
  try {
    if (editingId) await setDoc(doc(db, 'shows', editingId), data, { merge: true })
    else await addDoc(collection(db, 'shows'), { ...data, createdAt: serverTimestamp() })
    const d = parse(data.date)
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) { view = new Date(d.getFullYear(), d.getMonth(), 1); subscribe() }
    $('shMsg').textContent = 'Saved. The website is updated.'
    editingId = null; $('calForm').hidden = true; selected = ''; draw()
  } catch { $('shMsg').textContent = 'Could not save. Check that the Firestore rules are published.' }
})
$('shDelete').addEventListener('click', async () => { if (editingId && confirm('Delete this show?')) { await deleteDoc(doc(db, 'shows', editingId)); closeForm() } })
$('shCancel').addEventListener('click', closeForm)
const move = (n) => { view = new Date(view.getFullYear(), view.getMonth() + n, 1); if (signedIn) subscribe(); else draw() }
$('calPrev').addEventListener('click', () => move(-1))
$('calNext').addEventListener('click', () => move(1))
$('calToday').addEventListener('click', () => { view = new Date(); view.setDate(1); if (signedIn) subscribe(); else draw() })
draw()
