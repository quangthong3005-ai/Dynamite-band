import '../css/style.css'
import { auth, db } from './firebase.js'
import { resizeToDataUrl } from './image-utils.js'
import { adminEmails } from './firebase-config.js'
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, onSnapshot, doc, setDoc, addDoc, getDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

const $ = (id) => document.getElementById(id)
let currentChat = null
let unsubChats = null
let unsubMsgs = null

$('signIn').addEventListener('click', () => signInWithPopup(auth, new GoogleAuthProvider()).catch(() => {}))
$('signOut').addEventListener('click', () => signOut(auth))

let unsubPhotos = null
let unsubEditors = null

async function isAllowed(user) {
  if (!user || user.isAnonymous || !user.email) return { ok: false }
  if (adminEmails.includes(user.email)) return { ok: true, owner: true }
  try {
    const s = await getDoc(doc(db, 'editors', user.email.toLowerCase()))
    return { ok: s.exists(), owner: false }
  } catch { return { ok: false } }
}

onAuthStateChanged(auth, async (user) => {
  const { ok, owner } = await isAllowed(user)
  $('loginBox').hidden = ok
  $('app').hidden = !ok
  $('signOut').hidden = !ok
  $('teamTab').hidden = !owner
  $('loginMsg').textContent = user && !user.isAnonymous && !ok ? user.email + ' is not allowed to use this page.' : ''
  if (unsubChats) { unsubChats(); unsubChats = null }
  if (unsubPhotos) { unsubPhotos(); unsubPhotos = null }
  if (unsubEditors) { unsubEditors(); unsubEditors = null }
  if (ok) { watchChats(); watchPhotos(); if (owner) watchEditors() }
  window.dispatchEvent(new CustomEvent('admin-state', { detail: { ok } }))
})

// ---------- tabs ----------
document.querySelectorAll('.admin-tab').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.admin-tab').forEach((x) => x.classList.toggle('active', x === b))
  document.querySelectorAll('.admin-tab').forEach((x) => { $('tab-' + x.dataset.tab).hidden = x !== b })
}))

// ---------- photos ----------
$('photoForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const files = Array.from($('photoFile').files)
  if (!files.length) return
  $('photoBtn').disabled = true
  let done = 0
  for (const f of files) {
    $('photoMsg').textContent = 'Uploading ' + (done + 1) + ' / ' + files.length + '...'
    try {
      const src = await resizeToDataUrl(f)
      await addDoc(collection(db, 'photos'), { src, caption: $('photoCaption').value.trim(), createdAt: serverTimestamp() })
      done++
    } catch (err) { $('photoMsg').textContent = 'Could not upload ' + f.name + '.'; $('photoBtn').disabled = false; return }
  }
  $('photoMsg').textContent = 'Done: ' + done + ' photo(s) added.'
  $('photoForm').reset()
  $('photoBtn').disabled = false
})

function watchPhotos() {
  unsubPhotos = onSnapshot(query(collection(db, 'photos'), orderBy('createdAt', 'desc')), (snap) => {
    const box = $('photoList')
    box.innerHTML = ''
    if (snap.empty) box.textContent = 'No uploaded photos yet.'
    snap.forEach((d) => {
      const p = d.data()
      const card = document.createElement('div'); card.className = 'photo-card'
      const img = document.createElement('img'); img.src = p.src; img.alt = ''
      const cap = document.createElement('input'); cap.value = p.caption || ''; cap.maxLength = 80; cap.placeholder = 'Caption'; cap.className = 'admin-input'
      cap.addEventListener('change', () => updateDoc(doc(db, 'photos', d.id), { caption: cap.value.trim() }))
      const del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-ghost btn-small'; del.textContent = 'Delete'
      del.addEventListener('click', () => { if (confirm('Delete this photo?')) deleteDoc(doc(db, 'photos', d.id)) })
      card.append(img, cap, del)
      box.appendChild(card)
    })
  })
}

// ---------- editors (owner only) ----------
$('editorForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = $('editorEmail').value.trim().toLowerCase()
  if (!email) return
  await setDoc(doc(db, 'editors', email), { email, addedAt: serverTimestamp() })
  $('editorForm').reset()
})

function watchEditors() {
  unsubEditors = onSnapshot(collection(db, 'editors'), (snap) => {
    const ul = $('editorList')
    ul.innerHTML = ''
    if (snap.empty) ul.textContent = 'No extra editors yet.'
    snap.forEach((d) => {
      const li = document.createElement('li'); li.className = 'flex items-center justify-between gap-3 py-2 border-b border-white/10'
      const s = document.createElement('span'); s.textContent = d.id
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-small'; b.textContent = 'Remove'
      b.addEventListener('click', () => deleteDoc(doc(db, 'editors', d.id)))
      li.append(s, b); ul.appendChild(li)
    })
  })
}

function watchChats() {
  unsubChats = onSnapshot(query(collection(db, 'chats'), orderBy('updatedAt', 'desc')), (snap) => {
    const list = $('chatsList')
    list.innerHTML = ''
    if (snap.empty) list.textContent = 'No conversations yet.'
    snap.forEach((d) => {
      const c = d.data()
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'admin-chat' + (d.id === currentChat ? ' active' : '')
      const n = document.createElement('strong'); n.textContent = c.name || 'Guest'
      const l = document.createElement('span'); l.textContent = c.lastMessage || ''
      b.append(n, l)
      b.addEventListener('click', () => openChat(d.id, c.name))
      list.appendChild(b)
    })
  })
}

function openChat(id, name) {
  currentChat = id
  $('chatTitle').textContent = name || 'Guest'
  $('replyForm').hidden = false
  if (unsubMsgs) unsubMsgs()
  unsubMsgs = onSnapshot(query(collection(db, 'chats', id, 'messages'), orderBy('createdAt')), (snap) => {
    const box = $('adminMsgs')
    box.innerHTML = ''
    snap.forEach((d) => {
      const m = d.data()
      const el = document.createElement('div')
      el.className = 'chat-msg ' + (m.from === 'band' ? 'me' : 'band')
      el.textContent = m.text
      box.appendChild(el)
    })
    box.scrollTop = box.scrollHeight
  })
  document.querySelectorAll('.admin-chat').forEach((b) => b.classList.remove('active'))
}

$('replyForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const text = $('replyInput').value.trim()
  if (!text || !currentChat) return
  $('replyInput').value = ''
  await setDoc(doc(db, 'chats', currentChat), { lastMessage: 'Band: ' + text.slice(0, 110), updatedAt: serverTimestamp(), fromBand: true }, { merge: true })
  await addDoc(collection(db, 'chats', currentChat, 'messages'), { text, from: 'band', createdAt: serverTimestamp() })
})
