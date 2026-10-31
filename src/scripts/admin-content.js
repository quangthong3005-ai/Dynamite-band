import { db } from './firebase.js'
import { config } from './config.js'
import { DEFAULT_MEMBERS } from './members-data.js'
import { TEXT_FIELDS } from './site-text.js'
import { resizeToDataUrl } from './image-utils.js'
import { collection, query, orderBy, onSnapshot, doc, setDoc, addDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

const $ = (id) => document.getElementById(id)
const off = []
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e }
function flash(id, msg) { $(id).textContent = msg; setTimeout(() => { if ($(id).textContent === msg) $(id).textContent = '' }, 4000) }

window.addEventListener('admin-state', (e) => {
  off.forEach((u) => u()); off.length = 0
  if (e.detail.ok) { watchVideos(); watchMembers(); watchTexts() }
})

// ====================== VIDEOS ======================
function ytId(input) {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  try {
    const u = new URL(s)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1, 12)
    if (u.searchParams.get('v')) return u.searchParams.get('v').slice(0, 11)
    const m = u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/)
    if (m) return m[1]
  } catch { /* not a url */ }
  return ''
}

$('videoForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const id = ytId($('videoUrl').value)
  if (!id) return flash('videoMsg', 'That does not look like a YouTube link.')
  await addDoc(collection(db, 'videos'), { ytId: id, title: $('videoTitle').value.trim() || 'Live video', createdAt: serverTimestamp() })
  $('videoForm').reset()
  flash('videoMsg', 'Video added.')
})

function watchVideos() {
  off.push(onSnapshot(query(collection(db, 'videos'), orderBy('createdAt', 'desc')), (snap) => {
    const box = $('videoList'); box.innerHTML = ''
    if (snap.empty) {
      box.append(el('p', 'text-stone-400 text-sm mb-3', 'You have not added any videos here yet, so the website shows the default one from config.js.'))
      const b = el('button', 'btn btn-ghost btn-small', 'Copy the default videos here so I can edit them')
      b.type = 'button'
      b.addEventListener('click', async () => { for (const v of [...config.videos].reverse()) await addDoc(collection(db, 'videos'), { ytId: v.id, title: v.title, createdAt: serverTimestamp() }) })
      box.append(b)
      return
    }
    snap.docs.forEach((d, i) => {
      const v = d.data()
      const card = el('div', 'video-admin-card')
      const img = el('img'); img.src = 'https://i.ytimg.com/vi/' + v.ytId + '/mqdefault.jpg'; img.alt = ''
      const t = el('input', 'admin-input'); t.value = v.title || ''; t.maxLength = 100
      t.addEventListener('change', () => updateDoc(doc(db, 'videos', d.id), { title: t.value.trim() || 'Live video' }))
      const row = el('div', 'flex gap-2 flex-wrap')
      if (i === 0) row.append(el('span', 'mm-soon', 'Featured on home page'))
      else {
        const f = el('button', 'btn btn-ghost btn-small', 'Make featured'); f.type = 'button'
        f.addEventListener('click', () => updateDoc(doc(db, 'videos', d.id), { createdAt: serverTimestamp() }))
        row.append(f)
      }
      const x = el('button', 'btn btn-ghost btn-small', 'Delete'); x.type = 'button'
      x.addEventListener('click', () => { if (confirm('Delete this video?')) deleteDoc(doc(db, 'videos', d.id)) })
      row.append(x)
      card.append(img, t, row); box.append(card)
    })
  }))
}

// ====================== MEMBERS ======================
let overrides = {}

$('memberAdd').addEventListener('click', async () => {
  const ref = await addDoc(collection(db, 'members'), { name: 'New member', role: 'Role', bio: '', portfolio: '', order: 100 })
  flash('memberMsg', 'New member added. Fill in the details below.')
})

function watchMembers() {
  off.push(onSnapshot(collection(db, 'members'), (snap) => {
    overrides = {}
    snap.forEach((d) => { overrides[d.id] = d.data() })
    drawMembers()
  }))
}

function drawMembers() {
  const box = $('memberList'); box.innerHTML = ''
  const defaults = DEFAULT_MEMBERS.map((m, i) => ({ ...m, order: (i + 1) * 10, isDefault: true }))
  const custom = Object.entries(overrides).filter(([id]) => !DEFAULT_MEMBERS.some((m) => m.id === id)).map(([id, o]) => ({ id, pos: 'center', ...o }))
  ;[...defaults, ...custom].forEach((base) => {
    const m = { ...base, ...(overrides[base.id] || {}) }
    const card = el('form', 'member-admin-card')
    const pic = el('img'); pic.src = m.photo || 'images/logo-symbol.png'; pic.alt = ''
    const file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.className = 'text-stone-300 text-xs'
    const name = el('input', 'admin-input'); name.value = m.name || ''; name.maxLength = 60; name.placeholder = 'Name'; name.required = true
    const role = el('input', 'admin-input'); role.value = m.role || ''; role.maxLength = 60; role.placeholder = 'Role'
    const bio = el('textarea', 'admin-input'); bio.value = m.bio || ''; bio.maxLength = 600; bio.rows = 4; bio.placeholder = 'Short description'
    const pf = el('input', 'admin-input'); pf.type = 'url'; pf.value = m.portfolio || ''; pf.placeholder = 'Personal portfolio link (https://...)'
    const order = el('input', 'admin-input'); order.type = 'number'; order.value = m.order ?? 100; order.title = 'Lower numbers show first'; order.style.width = '5.5rem'
    const hid = el('label', 'text-stone-300 text-sm flex items-center gap-2'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!m.hidden; hid.append(cb, 'Hidden')
    const save = el('button', 'btn btn-solid btn-small', 'Save'); save.type = 'submit'
    const actions = el('div', 'flex gap-2 flex-wrap items-center')
    actions.append(el('span', 'text-stone-500 text-xs', 'Order'), order, hid, save)
    if (base.isDefault && overrides[base.id]) {
      const r = el('button', 'btn btn-ghost btn-small', 'Reset to original'); r.type = 'button'
      r.addEventListener('click', () => { if (confirm('Go back to the original details for ' + base.name + '?')) deleteDoc(doc(db, 'members', base.id)) })
      actions.append(r)
    }
    if (!base.isDefault) {
      const x = el('button', 'btn btn-ghost btn-small', 'Delete'); x.type = 'button'
      x.addEventListener('click', () => { if (confirm('Delete ' + (m.name || 'this member') + '?')) deleteDoc(doc(db, 'members', base.id)) })
      actions.append(x)
    }
    let newPhoto = null
    file.addEventListener('change', async () => {
      if (!file.files[0]) return
      try { newPhoto = await resizeToDataUrl(file.files[0], 1000); pic.src = newPhoto } catch { flash('memberMsg', 'Could not use that photo.') }
    })
    card.addEventListener('submit', async (e) => {
      e.preventDefault()
      const data = { name: name.value.trim(), role: role.value.trim(), bio: bio.value.trim(), portfolio: pf.value.trim(), order: Number(order.value) || 0, hidden: cb.checked }
      if (newPhoto) data.photo = newPhoto
      await setDoc(doc(db, 'members', base.id), data, { merge: true })
      flash('memberMsg', 'Saved ' + data.name + '.')
    })
    const left = el('div', 'flex flex-col gap-2'); left.append(pic, file)
    const right = el('div', 'flex flex-col gap-2'); right.append(name, role, bio, pf, actions)
    card.append(left, right)
    box.append(card)
  })
}

// ====================== TEXTS ======================
function watchTexts() {
  off.push(onSnapshot(doc(db, 'site', 'texts'), (snap) => {
    const saved = snap.exists() ? snap.data() : {}
    const box = $('textList'); box.innerHTML = ''
    TEXT_FIELDS.forEach((f) => {
      const wrap = el('div', 'text-admin-row')
      wrap.append(el('label', 'text-stone-300 text-sm', f.label))
      const inp = el(f.multi ? 'textarea' : 'input', 'admin-input'); if (f.multi) inp.rows = 3
      inp.maxLength = 500; inp.value = typeof saved[f.key] === 'string' && saved[f.key] ? saved[f.key] : f.default
      const row = el('div', 'flex gap-2')
      const s = el('button', 'btn btn-solid btn-small', 'Save'); s.type = 'button'
      s.addEventListener('click', async () => { await setDoc(doc(db, 'site', 'texts'), { [f.key]: inp.value.trim() }, { merge: true }); flash('textMsg', 'Saved.') })
      const r = el('button', 'btn btn-ghost btn-small', 'Reset'); r.type = 'button'
      r.addEventListener('click', async () => { await setDoc(doc(db, 'site', 'texts'), { [f.key]: '' }, { merge: true }); flash('textMsg', 'Back to the original text.') })
      row.append(s, r); wrap.append(inp, row); box.append(wrap)
    })
  }))
}
