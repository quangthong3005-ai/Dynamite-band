import { db } from './firebase.js'
import { collection, query, orderBy, onSnapshot, doc, setDoc, getDocs } from 'firebase/firestore'

const $ = (id) => document.getElementById(id)
const off = []
let requests = [], chats = [], notes = {}
const STATUS = { new: 'New', contacted: 'Contacted', quoted: 'Quoted', booked: 'Booked', done: 'Done', lost: 'Not going ahead' }
const TYPE_LABEL = { email: 'Email app', gmail: 'Gmail', whatsapp: 'WhatsApp' }

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e }
function ms(t) { return t && t.toMillis ? t.toMillis() : 0 }
function fmt(t) {
  const d = t && t.toDate ? t.toDate() : null
  if (!d) return 'just now'
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}
function norm(s) { return String(s || '').trim().toLowerCase() }
function contactKey(c) {
  const v = norm(c)
  if (v.includes('@')) return v
  const digits = v.replace(/\D/g, '')
  if (digits.length >= 8) return digits.replace(/^84/, '0')
  return v
}
const idOf = (k) => 'c_' + k.replace(/[^a-z0-9@._+-]/g, '_').slice(0, 120)

window.addEventListener('admin-state', (e) => {
  off.forEach((u) => u()); off.length = 0
  if (!e.detail.ok) return
  off.push(onSnapshot(query(collection(db, 'requests'), orderBy('createdAt', 'desc')), (s) => { requests = s.docs.map((d) => ({ id: d.id, ...d.data() })); draw() }))
  off.push(onSnapshot(collection(db, 'chats'), (s) => { chats = s.docs.map((d) => ({ id: d.id, ...d.data() })); draw() }))
  off.push(onSnapshot(collection(db, 'customers'), (s) => { notes = {}; s.forEach((d) => { notes[d.id] = d.data() }); draw() }))
})

// Group requests (by phone / email) and chats (by name when it matches a request, else by chat id).
function group() {
  const map = new Map()
  const byName = new Map()
  for (const r of requests) {
    const key = contactKey(r.contact) || 'name:' + norm(r.name)
    if (!map.has(key)) map.set(key, { key, name: r.name, contacts: new Set(), requests: [], chats: [] })
    const g = map.get(key)
    g.requests.push(r); g.contacts.add(r.contact)
    if (!g.name) g.name = r.name
    byName.set(norm(r.name), key)
  }
  for (const c of chats) {
    const key = byName.get(norm(c.name)) || 'chat:' + c.id
    if (!map.has(key)) map.set(key, { key, name: c.name || 'Guest', contacts: new Set(), requests: [], chats: [] })
    map.get(key).chats.push(c)
  }
  const list = [...map.values()]
  for (const g of list) {
    g.last = Math.max(0, ...g.requests.map((r) => ms(r.createdAt)), ...g.chats.map((c) => ms(c.updatedAt)))
    g.meta = notes[idOf(g.key)] || {}
  }
  return list.sort((a, b) => b.last - a.last)
}

function visible(list) {
  const q = norm($('crmSearch').value), st = $('crmFilter').value
  return list.filter((g) => {
    const status = g.meta.status || 'new'
    if (st && status !== st) return false
    if (!q) return true
    const hay = [g.name, ...g.contacts, g.meta.note, ...g.requests.flatMap((r) => [r.place, r.message, r.type, r.date])].map(norm).join(' ')
    return hay.includes(q)
  })
}

function textNote(g) {
  const L = []
  L.push('CUSTOMER: ' + g.name)
  if (g.contacts.size) L.push('Contact: ' + [...g.contacts].join(' / '))
  L.push('Status: ' + STATUS[g.meta.status || 'new'])
  L.push('Last activity: ' + (g.last ? fmt({ toDate: () => new Date(g.last) }) : '-'))
  if (g.meta.note) L.push('Our note: ' + g.meta.note)
  g.requests.slice().sort((a, b) => ms(a.createdAt) - ms(b.createdAt)).forEach((r) => {
    L.push('', '[' + fmt(r.createdAt) + '] Booking request via ' + (TYPE_LABEL[r.via] || r.via))
    L.push('  Event: ' + r.type + (r.date ? ' on ' + r.date : '') + (r.place ? ' at ' + r.place : ''))
    if (r.message) L.push('  Details: ' + r.message)
  })
  g.chats.forEach((c) => L.push('', '[' + fmt(c.updatedAt) + '] Chat (last message): ' + (c.lastMessage || '')))
  return L.join('\n')
}

function draw() {
  const box = $('crmList'); if (!box) return
  const open = new Set([...box.querySelectorAll('details[open]')].map((d) => d.dataset.key))
  box.innerHTML = ''
  const list = visible(group())
  if (!list.length) { box.append(el('p', 'text-stone-400', 'No customers yet. Requests from the Booking page and chats will show up here.')); return }
  for (const g of list) {
    const status = g.meta.status || 'new'
    const det = el('details', 'crm-card'); det.dataset.key = g.key; if (open.has(g.key)) det.open = true
    const sum = el('summary', 'crm-sum')
    const left = el('div'); left.append(el('strong', 'crm-name', g.name || 'Guest'), el('span', 'crm-sub', [...g.contacts].join(' · ') || 'Chat only'))
    const right = el('div', 'crm-right')
    right.append(el('span', 'crm-badge s-' + status, STATUS[status]), el('span', 'crm-sub', g.requests.length + ' request' + (g.requests.length === 1 ? '' : 's') + ' · ' + g.chats.length + ' chat' + (g.chats.length === 1 ? '' : 's')), el('span', 'crm-sub', g.last ? 'Last: ' + fmt({ toDate: () => new Date(g.last) }) : ''))
    sum.append(left, right); det.append(sum)

    const body = el('div', 'crm-body')
    // timeline: requests + chats, oldest to newest so the story reads in order
    const tl = el('div', 'crm-timeline')
    const items = [
      ...g.requests.map((r) => ({ t: ms(r.createdAt), kind: 'req', r })),
      ...g.chats.map((c) => ({ t: ms(c.updatedAt), kind: 'chat', c })),
    ].sort((a, b) => a.t - b.t)
    for (const it of items) {
      const row = el('div', 'crm-item ' + it.kind)
      if (it.kind === 'req') {
        const r = it.r
        row.append(el('div', 'crm-time', fmt(r.createdAt) + ' · Booking request via ' + (TYPE_LABEL[r.via] || r.via)))
        const t = el('dl', 'crm-dl')
        const add = (k, v) => { if (v) { t.append(el('dt', '', k), el('dd', '', v)) } }
        add('Event', r.type); add('Date', r.date); add('Place', r.place); add('Contact', r.contact); add('Details', r.message)
        row.append(t)
      } else {
        const c = it.c
        row.append(el('div', 'crm-time', fmt(c.updatedAt) + ' · Chat'))
        const msgs = el('div', 'crm-chat'); msgs.textContent = 'Last: ' + (c.lastMessage || '')
        const more = el('button', 'btn btn-ghost btn-small', 'Show full chat'); more.type = 'button'
        more.addEventListener('click', async () => {
          more.disabled = true
          const s = await getDocs(query(collection(db, 'chats', c.id, 'messages'), orderBy('createdAt')))
          msgs.textContent = ''
          s.forEach((d) => { const m = d.data(); msgs.append(el('div', m.from === 'band' ? 'crm-m band' : 'crm-m', '[' + fmt(m.createdAt) + '] ' + (m.from === 'band' ? 'Band' : g.name) + ': ' + m.text)) })
          more.remove()
        })
        row.append(msgs, more)
      }
      tl.append(row)
    }
    body.append(tl)

    const edit = el('div', 'crm-edit')
    const sel = el('select', 'admin-input'); for (const [k, v] of Object.entries(STATUS)) { const o = el('option', '', v); o.value = k; if (k === status) o.selected = true; sel.append(o) }
    const note = el('textarea', 'admin-input'); note.rows = 3; note.maxLength = 2000; note.placeholder = 'Our private note (price quoted, what they asked, next step...)'; note.value = g.meta.note || ''
    const row = el('div', 'flex gap-2 flex-wrap')
    const save = el('button', 'btn btn-solid btn-small', 'Save note'); save.type = 'button'
    save.addEventListener('click', async () => {
      await setDoc(doc(db, 'customers', idOf(g.key)), { name: g.name || '', status: sel.value, note: note.value.trim(), updatedAt: new Date() }, { merge: true })
      flash('Saved note for ' + (g.name || 'customer') + '.')
    })
    const cp = el('button', 'btn btn-ghost btn-small', 'Copy as note'); cp.type = 'button'
    cp.addEventListener('click', async () => { await navigator.clipboard.writeText(textNote({ ...g, meta: { ...g.meta, status: sel.value, note: note.value.trim() } })); flash('Copied. Paste it into Notes, Docs or Notion.') })
    row.append(save, cp)
    edit.append(sel, note, row); body.append(edit)
    det.append(body); box.append(det)
  }
}

function flash(m) { $('crmMsg').textContent = m; setTimeout(() => { if ($('crmMsg').textContent === m) $('crmMsg').textContent = '' }, 4000) }
$('crmSearch').addEventListener('input', draw)
$('crmFilter').addEventListener('change', draw)
$('crmCopyAll').addEventListener('click', async () => { await navigator.clipboard.writeText(visible(group()).map(textNote).join('\n\n' + '='.repeat(40) + '\n\n')); flash('All customers copied as one note.') })
$('crmCsv').addEventListener('click', () => {
  const rows = [['Customer', 'Contact', 'Status', 'Note', 'Sent at', 'Via', 'Event type', 'Event date', 'Place', 'Details']]
  for (const g of group()) {
    if (!g.requests.length) rows.push([g.name, '', STATUS[g.meta.status || 'new'], g.meta.note || '', '', 'chat', '', '', '', ''])
    g.requests.slice().sort((a, b) => ms(a.createdAt) - ms(b.createdAt)).forEach((r) => rows.push([g.name, r.contact, STATUS[g.meta.status || 'new'], g.meta.note || '', fmt(r.createdAt), r.via, r.type, r.date, r.place, r.message]))
  }
  const csv = '﻿' + rows.map((r) => r.map((c) => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'dynamites-customers.csv'; a.click(); URL.revokeObjectURL(a.href)
})
